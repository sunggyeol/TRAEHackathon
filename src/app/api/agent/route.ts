import Anthropic from '@anthropic-ai/sdk';
import { buildMappingPrompt, buildInsightPrompt } from '@/lib/agent/prompts';
import { validateMappingResponse } from '@/lib/agent/mapper';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic();
const NO_EMOJI_RULE = '이모지는 쓰지 마. 마크다운 문법(**굵게**, ##제목, |테이블| 등)도 쓰지 마. 순수 텍스트와 번호 목록(1. 2. 3.)만 써. 표 형태 데이터는 "- 항목: 값" 형식으로 정리해.';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
const TOKEN_LIMITS = {
  mapping: 8192,
  insights: 4096,
  chat: 4096,
  multiAgentWorker: 2048,
  multiAgentSynth: 4096,
} as const;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'mapping') {
      return handleMapping(body);
    } else if (action === 'insights') {
      return handleInsightsStream(body);
    } else if (action === 'chat') {
      return handleChatStream(body);
    } else if (action === 'multi-agent') {
      return handleMultiAgent(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

async function handleMapping(body: {
  columns: string[];
  sampleRows: Record<string, unknown>[];
  platform?: string;
}) {
  const prompt = buildMappingPrompt(body.columns, body.sampleRows, body.platform);

  console.log('[MAPPING] Sending prompt to Claude...');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: TOKEN_LIMITS.mapping,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  console.log('[MAPPING] Raw response:', text.slice(0, 200));

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('LLM 응답에서 JSON을 찾을 수 없습니다.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = validateMappingResponse(parsed);

  console.log('[MAPPING] Validated mappings:', validated.length);

  return NextResponse.json({ mappings: validated });
}

async function handleInsightsStream(body: { data: string }) {
  const prompt = buildInsightPrompt(body.data);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: TOKEN_LIMITS.insights,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === 'text_delta' && delta.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`));
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function handleChatStream(body: { message: string; context?: string }) {
  const systemPrompt = `너는 한국 이커머스 정산 데이터를 잘 아는 분석가야. 셀러가 자기 데이터를 올리고 궁금한 걸 물어보는 상황이야.

톤 가이드:
- 실무자끼리 대화하듯 자연스럽게 말해. 딱딱한 보고서체 말고, "~네요", "~거든요", "~보여요" 같은 구어체를 써.
- 숫자를 말할 때는 맥락과 함께 자연스럽게 풀어서 설명해. "매출이 1,200만원인데, 쿠팡이 절반 넘게 차지하고 있어요" 이런 식으로.
- 플랫폼 비교할 때는 핵심 차이만 콕 짚어줘.
- 이모지 쓰지 마. 깔끔한 텍스트로만 답변해.
${body.context ? `\n현재 데이터:\n${body.context}` : ''}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: TOKEN_LIMITS.chat,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: body.message }],
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === 'text_delta' && delta.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`));
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// === MULTI-AGENT ORCHESTRATOR ===

interface AgentDef {
  id: string;
  name: string;
  emoji: string;
  system: string;
  prompt: (ctx: string) => string;
}

const WORKFLOWS: Record<string, AgentDef[]> = {
  comprehensive: [
    { id: 'revenue-analyst', name: '매출 분석 에이전트', emoji: '📊',
      system: `너는 이커머스 매출 흐름을 읽는 데 능숙한 분석가야. 데이터를 보고 플랫폼별 매출이 어떻게 분포되어 있는지, 어디에 쏠려 있는지, 추세가 어떤지 파악해서 알려줘.

톤: 동료에게 브리핑하듯 간결하게. 숫자는 꼭 넣되 나열하지 말고 맥락 속에 녹여서 말해. 3-4문장이면 충분해.`,
      prompt: (ctx) => `이 정산 데이터 좀 봐줘. 매출 쪽으로 눈에 띄는 게 뭐가 있는지 정리해줘.\n\n${ctx}` },

    { id: 'fee-analyst', name: '수수료 분석 에이전트', emoji: '💰',
      system: `너는 이커머스 플랫폼 수수료 구조를 꿰뚫고 있는 분석가야. 플랫폼마다 수수료율이 어떻게 다른지, 과하게 나가는 곳은 없는지, 비용 구조에서 개선할 포인트가 뭔지 짚어줘.

톤: 수수료율(%)이랑 실제 금액을 함께 언급하되, "네이버 수수료가 5.2%로 가장 높은 편이고, 쿠팡보다 1.5%p 정도 더 나가고 있어요" 이런 식으로 자연스럽게. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 수수료 관련해서 체크해볼 만한 게 뭐가 있는지 분석해줘.\n\n${ctx}` },

    { id: 'product-analyst', name: '상품 분석 에이전트', emoji: '🏷️',
      system: `너는 이커머스 상품별 수익성을 분석하는 전문가야. 어떤 상품이 잘 벌고 있는지, 어떤 상품이 마진이 안 나오는지, 카테고리별로 패턴이 있는지 봐줘.

톤: 구체적인 상품명이랑 숫자를 넣어서 "A상품은 마진율 35%로 효자 상품이고, B상품은 수수료 빼면 거의 남는 게 없는 상황이에요" 이렇게 실감나게. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 상품별 수익성을 한번 봐줘. 잘 되는 것, 안 되는 것 위주로.\n\n${ctx}` },
  ],

  optimization: [
    { id: 'platform-optimizer', name: '플랫폼 최적화 에이전트', emoji: '🎯',
      system: `너는 멀티플랫폼 이커머스 판매 전략을 짜는 데 능숙한 분석가야. 같은 상품이라도 어느 플랫폼에서 팔아야 수수료를 아끼고 마진을 더 남길 수 있는지 구체적으로 제안해줘.

톤: "A상품은 현재 네이버에서 팔고 있는데, 쿠팡으로 옮기면 수수료를 월 15만원 정도 줄일 수 있어 보여요" 이런 식으로 실행 가능한 제안을. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터를 보고, 플랫폼 배치를 어떻게 바꾸면 더 효율적일지 제안해줘.\n\n${ctx}` },

    { id: 'pricing-strategist', name: '가격 전략 에이전트', emoji: '📈',
      system: `너는 이커머스 가격 전략과 할인 설계에 밝은 분석가야. 할인을 너무 많이 하고 있는 건 아닌지, 가격을 조정할 여지가 있는 상품은 뭔지, 할인과 마진 사이의 밸런스를 봐줘.

톤: 숫자랑 예상 효과를 같이 말하되, "이 상품은 할인율을 5%만 줄여도 월 마진이 20만원 정도 올라갈 수 있어요" 처럼 체감되게. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 가격이나 할인 쪽으로 손볼 수 있는 부분이 있는지 봐줘.\n\n${ctx}` },
  ],

  risk: [
    { id: 'concentration-risk', name: '집중도 리스크 에이전트', emoji: '⚠️',
      system: `너는 이커머스 비즈니스의 리스크를 진단하는 분석가야. 한 플랫폼에 너무 의존하고 있진 않은지, 매출이 특정 상품에 과도하게 쏠려 있진 않은지, 분산이 안 되는 부분을 짚어줘.

톤: 위험 신호를 구체적 비율과 함께 알려주되, 겁주는 게 아니라 "쿠팡 매출 비중이 72%라 여기 정책이 바뀌면 타격이 클 수 있어요" 이렇게 냉정하게. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 집중도 리스크가 있는지 진단해줘. 플랫폼 의존도, 상품 쏠림 위주로.\n\n${ctx}` },

    { id: 'margin-risk', name: '마진 리스크 에이전트', emoji: '🔻',
      system: `너는 이커머스 마진 압박과 적자 위험을 감지하는 분석가야. 수수료가 오르는 추세는 없는지, 팔수록 손해인 상품은 없는지, 마진이 위험한 구간에 있는 상품을 찾아줘.

톤: 문제 상품을 구체적으로 콕 짚어서 "C상품은 수수료 차감 후 마진이 2%밖에 안 남아서, 수수료율이 조금만 올라도 적자 전환될 수 있어요" 이런 식으로. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 마진이 위험해 보이는 상품이나 추세가 있는지 점검해줘.\n\n${ctx}` },
  ],

  unify: [
    { id: 'schema-validator', name: '스키마 검증 에이전트', emoji: '🔍',
      system: `너는 여러 이커머스 플랫폼의 정산 데이터가 통합 스키마(order_id, order_date, product_name, quantity, sales_amount, commission, settlement, platform)에 제대로 들어갔는지 검증하는 역할이야.

빠진 필드, 데이터 타입이 안 맞는 것, 이상한 값이 있으면 알려줘. "네이버 데이터에서 commission 필드가 3건 비어 있고, 쿠팡 쪽은 날짜 형식이 섞여 있어요" 이런 식으로 구체적으로. 3-4문장으로.`,
      prompt: (ctx) => `이 통합 데이터가 스키마에 맞게 잘 들어갔는지 검증해줘. 누락이나 이상한 값 위주로.\n\n${ctx}` },

    { id: 'dedup-detector', name: '중복 탐지 에이전트', emoji: '🔄',
      system: `너는 정산 데이터에서 중복이나 충돌을 찾아내는 역할이야. 같은 주문번호가 두 번 들어간 건 없는지, 플랫폼 간에 같은 상품인데 가격이 다른 건 없는지, 날짜가 겹치는 건 없는지 확인해줘.

톤: 발견한 문제를 건수와 함께 알려주되, "주문번호 ORD-1234가 쿠팡과 네이버에 중복 등록되어 있고, 금액도 달라요" 이렇게 구체적으로. 3-4문장으로.`,
      prompt: (ctx) => `이 통합 데이터에서 중복이나 불일치가 있는지 찾아줘.\n\n${ctx}` },

    { id: 'export-formatter', name: '통합 포맷 에이전트', emoji: '📋',
      system: `너는 여러 플랫폼 데이터를 하나의 깔끔한 CSV로 내보낼 때 최적의 구성을 제안하는 역할이야. 컬럼 순서를 어떻게 잡을지, 정렬은 뭘 기준으로 할지, 요약 행은 뭘 넣을지 추천해줘.

톤: 실무적으로. "날짜순 정렬 후 플랫폼별로 소계 행을 넣으면 한눈에 비교하기 편할 거예요" 이런 느낌으로. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터를 통합 CSV로 내보내려는데, 어떤 구성이 좋을지 제안해줘.\n\n${ctx}` },
  ],

  anomaly: [
    { id: 'price-anomaly', name: '가격 이상치 탐지 에이전트', emoji: '📊',
      system: `너는 이커머스 거래 데이터에서 가격이 이상한 건을 잡아내는 역할이야. 평균 대비 지나치게 높거나 낮은 거래(평균의 3배 이상, 1/3 이하)를 찾아줘.

톤: 해당 거래의 상품명, 금액, 플랫폼을 구체적으로 짚으면서 "이 건은 환불 처리가 잘못 잡혔거나 오입력일 가능성이 있어요" 같은 식으로 가능한 원인도 언급해줘. 3-4문장으로.`,
      prompt: (ctx) => `이 정산 데이터에서 가격이 이상하게 튀는 거래가 있는지 찾아줘.\n\n${ctx}` },

    { id: 'volume-anomaly', name: '수량 이상 탐지 에이전트', emoji: '📦',
      system: `너는 주문 수량 쪽에서 비정상적인 패턴을 잡아내는 역할이야. 한 번에 50개 이상 대량 주문, 갑자기 주문량이 급등한 상품, 특정 날짜에 몰린 비정상 패턴을 찾아줘.

톤: 대량 주문이 보이면 "이건 도매 거래일 수도 있고, 테스트 주문이나 비정상 주문 가능성도 있어요" 이렇게 판단 근거를 같이 말해줘. 3-4문장으로.`,
      prompt: (ctx) => `이 정산 데이터에서 수량이 비정상적으로 보이는 주문이 있는지 찾아줘.\n\n${ctx}` },

    { id: 'commission-anomaly', name: '수수료 이상 탐지 에이전트', emoji: '💸',
      system: `너는 수수료가 이상하게 적용된 건을 잡아내는 역할이야. 같은 플랫폼인데 상품마다 수수료율이 크게 다른 건 없는지, 플랫폼 공식 수수료율(쿠팡 10-15%, 네이버 5-6%, 지마켓 12-18%)보다 높게 적용된 건 없는지, 수수료가 매출보다 큰 비정상 건은 없는지 확인해줘.

톤: "이 상품은 쿠팡 기준 수수료율이 22%로 잡혀 있는데, 해당 카테고리 표준인 12%보다 훨씬 높아요. 확인이 필요해 보여요" 이런 식으로. 3-4문장으로.`,
      prompt: (ctx) => `이 정산 데이터에서 수수료가 이상하게 적용된 건이 있는지 찾아줘.\n\n${ctx}` },
  ],

  priceHealth: [
    { id: 'cross-platform-price', name: '크로스 플랫폼 가격 비교 에이전트', emoji: '🔄',
      system: `너는 같은 상품이 플랫폼마다 얼마에 팔리고 있는지 비교하는 역할이야. 상품명이 비슷한 것끼리 매칭해서 가격 차이가 얼마나 나는지, 그 차이가 의도된 건지 확인해줘.

톤: "A상품이 쿠팡에서는 25,000원인데 네이버에서는 28,000원이에요. 3,000원 차이가 나는데 의도한 건지 확인해볼 필요가 있어요" 이런 식으로 구체적으로. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 같은 상품의 플랫폼별 가격 차이를 비교해줘.\n\n${ctx}` },

    { id: 'net-margin-compare', name: '실질 마진 비교 에이전트', emoji: '💰',
      system: `너는 겉보기 판매가가 아니라, 수수료랑 배송비, 할인을 다 빼고 실제로 손에 쥐는 금액을 기준으로 어느 플랫폼이 유리한지 비교하는 역할이야.

톤: "A상품은 네이버 판매가가 더 높지만, 수수료를 빼고 나면 쿠팡 쪽이 건당 800원 더 남아요. 물량이 많으면 차이가 꽤 커져요" 이런 식으로 실감나게. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 상품별로 플랫폼마다 실제 순마진이 얼마나 차이 나는지 비교해줘.\n\n${ctx}` },

    { id: 'price-recommendation', name: '가격 조정 제안 에이전트', emoji: '🎯',
      system: `너는 현재 가격, 수수료 구조, 마진을 종합적으로 보고 가격을 올리거나 내려야 할 상품을 제안하는 역할이야. 할인을 너무 많이 해서 마진이 깎이는 상품, 가격을 좀 올려도 될 만한 상품을 찾아줘.

톤: "B상품은 지금 20% 할인 중인데 마진이 3%밖에 안 남아요. 할인율을 15%로 줄이면 월 마진이 약 12만원 올라갈 수 있어요" 이런 식으로 구체적인 금액과 함께. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터를 보고 가격 조정이 필요한 상품이 있는지, 어떻게 바꾸면 좋을지 제안해줘.\n\n${ctx}` },
  ],

  settlementAudit: [
    { id: 'math-verifier', name: '정산 계산 검증 에이전트', emoji: '🧮',
      system: `너는 정산 금액이 수학적으로 맞는지 검증하는 역할이야. 각 거래에서 "판매금액 - 수수료 - 배송비 - 할인 = 정산금액" 계산이 맞는지 확인해줘. ±100원 이내 차이는 반올림으로 보고 넘어가면 돼.

톤: "총 150건 중 7건에서 계산이 안 맞아요. 가장 큰 차이는 ORD-5678 건으로 12,400원 차이가 나요" 이런 식으로 건수와 금액을 구체적으로. 3-4문장으로.`,
      prompt: (ctx) => `이 정산 데이터에서 각 거래의 정산 금액 계산이 맞는지 검증해줘.\n\n${ctx}` },

    { id: 'commission-rate-auditor', name: '수수료율 적정성 감사 에이전트', emoji: '🔍',
      system: `너는 플랫폼이 적용한 수수료율이 공식 수수료율과 맞는지 감사하는 역할이야. 쿠팡(카테고리별 6-15%), 네이버(기본 5.5%), 지마켓(카테고리별 10-18%) 같은 표준 수수료율과 실제 적용된 수수료율을 비교해줘.

톤: 공식보다 높게 적용된 건이 있으면 "이 건은 쿠팡 표준 12%보다 3%p 높게 적용됐어요. 과다 청구일 수 있으니 확인해보세요" 이렇게 짚어줘. 3-4문장으로.`,
      prompt: (ctx) => `이 데이터에서 플랫폼별 실제 수수료율이 공식 수수료율과 맞는지 비교해줘.\n\n${ctx}` },

    { id: 'settlement-summary', name: '정산 종합 리포트 에이전트', emoji: '📝',
      system: `너는 정산 검증 결과를 셀러가 바로 행동할 수 있도록 정리하는 역할이야. 과소/과다 정산된 추정 금액, 이의 제기 우선순위 상위 3건, 플랫폼별 정산 정확도 점수(100점 만점)를 알려줘.

톤: "총 과소 정산 추정액이 약 48만원이에요. 가장 시급한 건 쿠팡의 ORD-5678 건이고, 이 내역을 고객센터에 문의하시는 걸 추천드려요" 이런 식으로 다음 행동까지 안내해줘. 3-4문장으로.`,
      prompt: (ctx) => `이 정산 데이터를 종합 검증하고, 문제가 있는 건 위주로 정리해줘.\n\n${ctx}` },
  ],
};

const SYNTH_PROMPTS: Record<string, string> = {
  comprehensive: `너는 여러 분석가의 리포트를 받아서 핵심만 추려 브리핑하는 수석 분석가야.

각 에이전트가 찾아낸 것 중에서 사업적으로 가장 의미 있는 인사이트 3가지를 뽑아줘. 번호를 매기고, 각각 왜 중요한지 한두 문장으로 설명해. 숫자는 빠지면 안 돼.

톤: 대표에게 5분 브리핑하듯 간결하고 명확하게. 이모지 쓰지 마. 마크다운 문법도 쓰지 마. 순수 텍스트로만.`,

  optimization: `너는 여러 전문가의 최적화 제안을 모아서 실행 계획으로 정리하는 전략가야.

각 에이전트의 제안을 효과가 큰 순서대로 3가지 액션 아이템으로 정리해줘. 각 항목마다 "뭘 하면 얼마나 효과가 있는지" 예상치를 포함해.

톤: "가장 먼저 할 건 A상품의 플랫폼 이동이에요. 이것만으로 월 30만원 절감이 가능해 보입니다" 이런 식으로 실행 중심으로. 이모지 쓰지 마. 마크다운 문법도 쓰지 마.`,

  risk: `너는 여러 리스크 진단 결과를 종합해서 우선순위를 매기는 리스크 관리자야.

각 리스크를 심각도(높음/중간/낮음)로 분류하고, 당장 손 봐야 하는 것부터 번호를 매겨 정리해줘.

톤: 냉정하되 실용적으로. "1번 리스크: 쿠팡 의존도 72% - 심각도 높음. 당장 네이버 쪽 물량을 늘리는 게 급합니다" 이런 식으로. 이모지 쓰지 마. 마크다운 문법도 쓰지 마.`,

  unify: `너는 데이터 검증 결과를 종합해서 통합 파일 품질 리포트를 작성하는 역할이야.

스키마 검증, 중복 탐지, 포맷 제안 내용을 합쳐서 최종 리포트를 써줘. 총 레코드 수, 플랫폼별 비중, 데이터 품질 점수(100점 만점)를 포함하고, 문제가 있었으면 어떻게 처리했는지도 언급해.

톤: 깔끔한 결과 보고 느낌으로. 이모지 쓰지 마. 마크다운 문법도 쓰지 마. 마지막에 "통합 파일이 준비되었습니다. 다운로드 버튼을 클릭하세요."로 마무리해.`,

  anomaly: `너는 여러 이상 거래 탐지 결과를 종합해서 위험한 순서대로 정리하는 역할이야.

가격, 수량, 수수료 쪽에서 잡힌 이상 거래를 합쳐서 총 건수와 추정 금액을 알려주고, 즉시 확인해야 할 상위 3건을 뽑아줘. 각 건에 "확인 필요", "주의", "정상 범위" 중 하나로 판정해줘.

톤: "총 5건의 이상 거래가 발견됐고, 추정 금액은 약 85만원이에요. 가장 먼저 봐야 할 건 ORD-1234인데..." 이런 식으로. 이모지 쓰지 마. 마크다운 문법도 쓰지 마.`,

  priceHealth: `너는 여러 가격 분석 결과를 종합해서 당장 실행할 수 있는 가격 조정 계획을 만드는 전략가야.

크로스 플랫폼 가격 비교, 실질 마진 분석, 가격 조정 제안을 합쳐서 우선순위 상위 3개 액션으로 정리해줘. 각 액션의 예상 월간 수익 변화를 추정해.

톤: "가장 효과가 큰 건 B상품의 할인율 조정이에요. 이것만으로 월 마진이 약 25만원 올라갈 수 있어요" 이런 식으로 실행 중심. 이모지 쓰지 마. 마크다운 문법도 쓰지 마.`,

  settlementAudit: `너는 정산 검증 결과를 종합해서 셀러가 바로 행동할 수 있는 최종 리포트를 만드는 감사관이야.

계산 검증, 수수료율 감사 결과를 합쳐서 총 불일치 건수, 과소/과다 정산 추정 총액, 플랫폼별 정산 정확도 점수(100점)를 알려줘. 이의 제기가 필요한 건이 있으면 다음 행동까지 안내해줘.

톤: "총 12건에서 불일치가 발견됐고, 과소 정산 추정액은 약 67만원이에요. 쿠팡 고객센터에 이 내역을 문의하시는 게 좋겠어요" 이런 식으로. 이모지 쓰지 마. 마크다운 문법도 쓰지 마.`,
};

async function handleMultiAgent(body: { workflow: string; context: string }) {
  const agents = WORKFLOWS[body.workflow];
  if (!agents) return NextResponse.json({ error: 'Unknown workflow' }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (d: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(d)}\n\n`));

      try {
        emit({ type: 'orchestrator', status: 'dispatching', agentCount: agents.length });

        // Phase 1: Run all agents in parallel
        const results = await Promise.all(agents.map(async (agent) => {
          emit({ type: 'agent-start', agentId: agent.id, name: agent.name, emoji: agent.emoji });

          const res = await anthropic.messages.create({
            model: MODEL, max_tokens: TOKEN_LIMITS.multiAgentWorker, stream: true,
            system: `${agent.system}\n${NO_EMOJI_RULE}`,
            messages: [{ role: 'user', content: agent.prompt(body.context) }],
          });

          let text = '';
          for await (const ev of res) {
            if (ev.type === 'content_block_delta') {
              const d = ev.delta as { type: string; text?: string };
              if (d.type === 'text_delta' && d.text) {
                text += d.text;
                emit({ type: 'agent-delta', agentId: agent.id, text: d.text });
              }
            }
          }
          emit({ type: 'agent-done', agentId: agent.id });
          return { name: agent.name, result: text };
        }));

        // Phase 2: Synthesizer combines all results
        emit({ type: 'synthesizer-start' });

        const synthInput = results.map(r => `[${r.name}의 분석]\n${r.result}`).join('\n\n');
        const synthRes = await anthropic.messages.create({
          model: MODEL, max_tokens: TOKEN_LIMITS.multiAgentSynth, stream: true,
          system: `${SYNTH_PROMPTS[body.workflow] || SYNTH_PROMPTS.comprehensive}\n${NO_EMOJI_RULE}`,
          messages: [{ role: 'user', content: `각 전문가가 분석한 내용이야:\n\n${synthInput}\n\n이걸 종합해서 최종 정리해줘.` }],
        });

        for await (const ev of synthRes) {
          if (ev.type === 'content_block_delta') {
            const d = ev.delta as { type: string; text?: string };
            if (d.type === 'text_delta' && d.text) {
              emit({ type: 'synthesizer-delta', text: d.text });
            }
          }
        }

        emit({ type: 'synthesizer-done' });
        emit({ type: 'done' });
        controller.close();
      } catch (error) {
        emit({ type: 'error', error: String(error) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

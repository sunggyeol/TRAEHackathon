import Anthropic from '@anthropic-ai/sdk';
import { buildMappingPrompt, buildInsightPrompt } from '@/lib/agent/prompts';
import { validateMappingResponse } from '@/lib/agent/mapper';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic();

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
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  console.log('[MAPPING] Raw response:', text.slice(0, 200));

  // Extract JSON from response (may be wrapped in markdown code blocks)
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
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
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
  const systemPrompt = `당신은 한국 이커머스 정산 데이터 분석 전문가입니다.
사용자의 질문에 한국어로 답변하세요. 구체적인 숫자와 플랫폼 비교를 포함하세요.
${body.context ? `\n현재 데이터 컨텍스트:\n${body.context}` : ''}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
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
      system: '당신은 이커머스 매출 데이터를 전문적으로 분석하는 AI 에이전트입니다. 플랫폼별 매출 분포, 집중도, 성장 추세를 분석합니다. 반드시 구체적인 숫자와 비율을 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 정산 데이터를 기반으로 매출 분석을 수행하세요:\n${ctx}` },
    { id: 'fee-analyst', name: '수수료 분석 에이전트', emoji: '💰',
      system: '당신은 이커머스 플랫폼 수수료를 전문적으로 분석하는 AI 에이전트입니다. 플랫폼별 수수료율 비교, 과다 수수료 탐지, 비용 구조를 분석합니다. 반드시 구체적인 수수료율(%)과 금액을 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 정산 데이터를 기반으로 수수료 분석을 수행하세요:\n${ctx}` },
    { id: 'product-analyst', name: '상품 분석 에이전트', emoji: '🏷️',
      system: '당신은 이커머스 상품별 수익성을 전문적으로 분석하는 AI 에이전트입니다. 상위/하위 수익 상품, 마진율, 카테고리별 패턴을 분석합니다. 반드시 구체적인 상품명과 수치를 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 정산 데이터를 기반으로 상품별 수익성 분석을 수행하세요:\n${ctx}` },
  ],
  optimization: [
    { id: 'platform-optimizer', name: '플랫폼 최적화 에이전트', emoji: '🎯',
      system: '당신은 멀티플랫폼 이커머스 판매 최적화 전문 AI 에이전트입니다. 어떤 상품을 어떤 플랫폼에서 판매하면 수수료를 절감할 수 있는지 분석합니다. 구체적인 상품명, 플랫폼, 예상 절감액을 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 데이터를 기반으로 플랫폼별 판매 최적화 방안을 제시하세요:\n${ctx}` },
    { id: 'pricing-strategist', name: '가격 전략 에이전트', emoji: '📈',
      system: '당신은 이커머스 가격 및 할인 전략 전문 AI 에이전트입니다. 할인율과 마진의 관계, 가격 조정 기회를 분석합니다. 구체적인 수치와 예상 효과를 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 데이터를 기반으로 가격/할인 전략을 분석하고 제안하세요:\n${ctx}` },
  ],
  risk: [
    { id: 'concentration-risk', name: '집중도 리스크 에이전트', emoji: '⚠️',
      system: '당신은 이커머스 비즈니스 리스크를 분석하는 AI 에이전트입니다. 플랫폼 의존도, 상품 집중도, 매출 편중 등의 리스크를 분석합니다. 구체적인 비율과 위험 수준을 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 데이터를 기반으로 비즈니스 집중도 리스크를 분석하세요:\n${ctx}` },
    { id: 'margin-risk', name: '마진 리스크 에이전트', emoji: '🔻',
      system: '당신은 이커머스 마진 리스크를 분석하는 AI 에이전트입니다. 수수료 상승 추세, 마진 압박 상품, 적자 위험 상품을 탐지합니다. 구체적인 상품명과 수치를 포함하세요. 한국어로 3-4문장으로 핵심만 간결하게 답변하세요.',
      prompt: (ctx) => `다음 데이터를 기반으로 마진 리스크를 분석하세요:\n${ctx}` },
  ],
};

const SYNTH_PROMPTS: Record<string, string> = {
  comprehensive: '당신은 여러 전문 에이전트의 분석 결과를 종합하는 수석 분석가입니다. 각 에이전트의 핵심 발견을 통합하여 실행 가능한 인사이트 3가지를 도출하세요. 번호를 매기고, 구체적인 수치를 포함하세요. 한국어로 답변하세요.',
  optimization: '당신은 여러 전문 에이전트의 최적화 제안을 종합하는 전략가입니다. 각 에이전트의 제안을 우선순위별로 정리하고, 예상 효과를 합산하세요. 실행 로드맵 형태로 3가지 액션 아이템을 제시하세요. 한국어로 답변하세요.',
  risk: '당신은 여러 리스크 에이전트의 진단 결과를 종합하는 리스크 관리자입니다. 각 리스크의 심각도(높음/중간/낮음)를 평가하고, 즉시 조치가 필요한 항목을 식별하세요. 리스크 매트릭스 형태로 정리하세요. 한국어로 답변하세요.',
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
            model: 'claude-sonnet-4-6', max_tokens: 512, stream: true,
            system: agent.system,
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
          model: 'claude-sonnet-4-6', max_tokens: 768, stream: true,
          system: SYNTH_PROMPTS[body.workflow] || SYNTH_PROMPTS.comprehensive,
          messages: [{ role: 'user', content: `다음은 각 전문 에이전트의 분석 결과입니다:\n\n${synthInput}\n\n이 결과를 종합하여 최종 분석을 제시하세요.` }],
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

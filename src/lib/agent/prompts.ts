export const KOREAN_GLOSSARY = `
한국 이커머스 정산 파일 컬럼 매핑 참고:
판매액(A)/상품별 총 주문금액/판매가 → sales_amount
결제금액 → payment_amount
판매수수료/수수료합계/카테고리수수료 → commission
정산금/정산예정금액/정산금액 → settlement
기본배송비(+추가배송비)/배송비 결제금액/배송비 → shipping_fee
판매자 할인쿠폰/할인/할인금액 → discount
주문번호 → order_id
주문일/주문일시 → order_date
상품명 → product_name
옵션명/옵션정보/옵션 → option
수량 → quantity
상품그룹명 → category
`;

export const TARGET_SCHEMA = [
  'order_id', 'order_date', 'product_name', 'option', 'quantity',
  'sales_amount', 'payment_amount', 'discount', 'shipping_fee',
  'commission', 'settlement', 'category', 'status'
];

export function buildMappingPrompt(
  columns: string[],
  sampleRows: Record<string, unknown>[],
  platform?: string
): string {
  return `당신은 한국 이커머스 정산 파일의 컬럼을 표준 스키마에 매핑하는 전문가입니다.

${KOREAN_GLOSSARY}

소스 파일의 컬럼 목록:
${JSON.stringify(columns)}

샘플 데이터 (5행):
${JSON.stringify(sampleRows, null, 2)}

대상 스키마 필드:
${JSON.stringify(TARGET_SCHEMA)}

${platform ? `플랫폼 힌트: ${platform}` : ''}

각 소스 컬럼을 대상 스키마 필드에 매핑하세요. 매핑할 수 없는 컬럼은 건너뛰세요.
신뢰도(confidence)는 0.0~1.0 사이의 값으로, 매핑의 확실성을 나타냅니다.

반드시 아래 JSON 형식으로만 응답하세요:
[
  {"source": "소스컬럼명", "target": "대상필드명", "confidence": 0.95},
  ...
]`;
}

export function buildInsightPrompt(summaryData: string, locale?: string): string {
  if (locale === 'en') {
    return `Analyze this Korean e-commerce settlement data and find 3 notable insights.

Data summary:
${summaryData}

Rules:
- Include specific numbers (e.g., "Coupang commission rate 12.5%")
- Include cross-platform comparisons
- Respond in English
- Keep each insight to 1-2 concise sentences
- Do NOT use markdown syntax (**, ##, |tables|, etc). Use plain text only.

Format:
1. [First insight]
2. [Second insight]
3. [Third insight]`;
  }
  return `이 한국 이커머스 정산 데이터를 분석하여 3가지 주목할 만한 인사이트를 찾아주세요.

데이터 요약:
${summaryData}

규칙:
- 구체적인 숫자를 포함하세요 (예: "쿠팡 수수료율 12.5%")
- 플랫폼간 비교를 포함하세요
- 한국어로 응답하세요
- 각 인사이트는 1-2문장으로 간결하게 작성하세요
- 마크다운 문법(**, ##, |테이블| 등)을 절대 사용하지 마세요. 순수 텍스트만 사용하세요.

형식:
1. [첫번째 인사이트]
2. [두번째 인사이트]
3. [세번째 인사이트]`;
}

export const AGENT_PROMPTS = {
  trend: '당신은 매출 트렌드 분석 에이전트입니다. 월별/주별 매출 추이와 성장률을 분석하고, 계절성이나 특정 패턴을 파악하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
  platform: '당신은 플랫폼 성과 분석 에이전트입니다. 플랫폼별(쿠팡, 네이버, G마켓 등) 매출 비중, 수수료율, 배송비 부담을 비교 분석하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
  product: '당신은 상품 포트폴리오 분석 에이전트입니다. 상위 매출 상품, 수익성(마진)이 높은 상품, 수수료 부담이 큰 상품을 식별하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
  risk: '당신은 리스크 관리 에이전트입니다. 특정 플랫폼 의존도, 수수료율 상승, 취소/반품률 등 비즈니스 위협 요소를 진단하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
  optimization: '당신은 수익 최적화 에이전트입니다. 수수료 절감 방안, 객단가 향상, 플랫폼 믹스 개선 등 실질적인 수익성 개선 아이디어를 제안하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
  dataQuality: '당신은 데이터 품질 검증 에이전트입니다. 누락된 값, 이상치, 플랫폼별 포맷 불일치 등을 식별하고 데이터 정제 방향을 제시하세요. 응답 시 이모지 사용을 엄격히 금지하며, 깔끔하고 간결한 마크다운만 사용하세요.',
};

export const WORKFLOWS = {
  comprehensive: ['trend', 'platform', 'product'],
  optimization: ['platform', 'product', 'optimization'],
  risk: ['platform', 'risk', 'trend'],
  unify: ['dataQuality'],
};

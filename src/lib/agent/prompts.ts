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

export function buildInsightPrompt(summaryData: string): string {
  return `이 한국 이커머스 정산 데이터를 분석하여 3가지 주목할 만한 인사이트를 찾아주세요.

데이터 요약:
${summaryData}

규칙:
- 구체적인 숫자를 포함하세요 (예: "쿠팡 수수료율 12.5%")
- 플랫폼간 비교를 포함하세요
- 한국어로 응답하세요
- 각 인사이트는 1-2문장으로 간결하게 작성하세요

형식:
1. [첫번째 인사이트]
2. [두번째 인사이트]
3. [세번째 인사이트]`;
}

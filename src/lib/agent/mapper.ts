import type { ColumnMapping } from '@/types';

export function validateMappingResponse(raw: unknown): ColumnMapping[] {
  if (!Array.isArray(raw)) {
    throw new Error('LLM 응답이 배열이 아닙니다.');
  }
  return raw.map((m, i) => {
    if (!m || typeof m !== 'object') {
      throw new Error(`매핑 #${i}: 유효하지 않은 객체`);
    }
    const obj = m as Record<string, unknown>;
    if (typeof obj.source !== 'string' || typeof obj.target !== 'string') {
      throw new Error(`매핑 #${i}: source 또는 target이 문자열이 아닙니다`);
    }
    const confidence = Number(obj.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error(`매핑 #${i}: confidence 값이 유효하지 않습니다 (0.0~1.0)`);
    }
    return {
      source: String(obj.source),
      target: String(obj.target),
      confidence,
    };
  });
}

export function detectPlatform(columns: string[]): string | undefined {
  const colStr = columns.join(' ').toLowerCase();

  if (colStr.includes('쿠팡') || colStr.includes('로켓') || colStr.includes('로켓배송'))
    return 'coupang';
  if (colStr.includes('스마트스토어') || colStr.includes('네이버') || colStr.includes('정산예정금액'))
    return 'naver';
  if (colStr.includes('지마켓') || colStr.includes('셀러') || colStr.includes('판매자등급'))
    return 'gmarket';

  // Heuristic based on column patterns
  if (colStr.includes('판매액(a)') || colStr.includes('로켓 여부'))
    return 'coupang';
  if (colStr.includes('정산예정금') || colStr.includes('매출연동'))
    return 'naver';
  if (colStr.includes('서비스이용료') || colStr.includes('카테고리수수료'))
    return 'gmarket';

  return undefined;
}

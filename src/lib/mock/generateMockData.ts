import type { UnifiedRecord } from '@/types';

// Realistic mid-range products that Korean SMB sellers actually sell
const COUPANG_PRODUCTS = [
  { name: '무선 블루투스 이어폰 TWS-500', category: '전자/디지털', price: 29900 },
  { name: '여성 오버핏 맨투맨 봄 신상', category: '패션의류', price: 19900 },
  { name: '스테인리스 텀블러 500ml', category: '생활/건강', price: 15900 },
  { name: '유기농 현미 5kg', category: '식품', price: 22900 },
  { name: '강아지 사료 연어맛 6kg', category: '반려동물', price: 32900 },
  { name: '접이식 캠핑 의자 경량형', category: '스포츠/레저', price: 24900 },
  { name: 'LED 데스크 무드등 조명', category: '인테리어', price: 18900 },
  { name: '남성 슬림핏 치노 팬츠', category: '패션의류', price: 29900 },
  { name: '키즈 보온 패딩 점퍼 120-160', category: '유아동', price: 35900 },
  { name: '에어프라이어 5L 디지털', category: '주방가전', price: 49900 },
  { name: '비타민C 1000mg 180정', category: '건강식품', price: 12900 },
  { name: '실리콘 주방매트 세트', category: '주방용품', price: 9900 },
];

const NAVER_PRODUCTS = [
  { name: '핸드메이드 가죽 카드지갑', category: '패션잡화', price: 25000 },
  { name: '홈카페 드립커피 세트 30입', category: '식품', price: 18500 },
  { name: '요가 레깅스 여성 하이웨스트', category: '스포츠/레저', price: 22000 },
  { name: '천연 수제 비누 선물세트', category: '뷰티', price: 15000 },
  { name: '다이어리 2026 위클리 A5', category: '문구', price: 12000 },
  { name: '유기농 꿀 야생화 500g', category: '식품', price: 28000 },
  { name: '미니 가습기 USB 충전식', category: '생활가전', price: 19900 },
  { name: '남성 양말 10켤레 세트', category: '패션잡화', price: 9900 },
  { name: '아이폰 케이스 실리콘 맥세이프', category: '디지털액세서리', price: 14900 },
  { name: '식물성 단백질 쉐이크 파우더', category: '건강식품', price: 32000 },
];

const ST_PRODUCTS = [
  { name: '무선 충전기 3in1 패드', category: '전자기기', price: 35900 },
  { name: '차량용 핸드폰 거치대', category: '자동차용품', price: 15900 },
  { name: '여성 롱 원피스 린넨 소재', category: '패션의류', price: 39900 },
  { name: '스마트워치 밴드 실리콘', category: '전자기기', price: 8900 },
  { name: '미니 선풍기 핸디형 USB', category: '생활가전', price: 12900 },
  { name: '수건 세트 호텔식 6장', category: '생활용품', price: 24900 },
  { name: '차량용 방향제 디퓨저', category: '자동차용품', price: 11900 },
  { name: '남성 반팔 카라티 폴로', category: '패션의류', price: 19900 },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  return d.toISOString().slice(0, 10);
}

function generatePlatformRecords(
  platform: 'coupang' | 'naver' | 'gmarket',
  products: { name: string; category: string; price: number }[],
  count: number,
  commissionRate: number,
  shippingChance: number,
): UnifiedRecord[] {
  const records: UnifiedRecord[] = [];

  for (let i = 0; i < count; i++) {
    const product = products[i % products.length];
    const quantity = randomInt(1, 3);
    const salesAmount = product.price * quantity;
    const discount = Math.random() > 0.75 ? Math.round(salesAmount * (randomInt(5, 20) / 100)) : 0;
    const paymentAmount = salesAmount - discount;
    // Realistic commission: base rate + slight variance
    const commission = Math.round(salesAmount * (commissionRate + (Math.random() - 0.5) * 0.02));
    // Shipping: most orders have shipping, free shipping above threshold
    const shippingFee = Math.random() < shippingChance ? randomInt(2500, 3500) : 0;
    const settlement = paymentAmount - commission - shippingFee;

    records.push({
      order_id: `${platform.toUpperCase()}-${String(2000000 + i)}`,
      order_date: randomDate('2025-10-01', '2026-03-15'),
      product_name: product.name,
      option: Math.random() > 0.5 ? ['블랙', '화이트', '그레이', '네이비', '베이지'][randomInt(0, 4)] : undefined,
      quantity,
      sales_amount: salesAmount,
      payment_amount: paymentAmount,
      discount,
      shipping_fee: shippingFee,
      commission,
      settlement,
      platform,
      category: product.category,
    });
  }

  return records;
}

let cachedMockData: UnifiedRecord[] | null = null;

export function getMockData(): UnifiedRecord[] {
  if (cachedMockData) return cachedMockData;

  // Coupang: ~10.8% commission, 40% of orders have shipping
  const coupang = generatePlatformRecords('coupang', COUPANG_PRODUCTS, 420, 0.108, 0.4);
  // Naver: ~5.5% commission (lower), 50% shipping
  const naver = generatePlatformRecords('naver', NAVER_PRODUCTS, 350, 0.055, 0.5);
  // Gmarket: ~12% commission (highest), 35% shipping
  const elevenst = generatePlatformRecords('gmarket', ST_PRODUCTS, 380, 0.12, 0.35);

  cachedMockData = [...coupang, ...naver, ...elevenst];
  return cachedMockData;
}

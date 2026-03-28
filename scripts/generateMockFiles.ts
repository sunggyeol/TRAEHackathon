/**
 * Generate realistic Korean e-commerce settlement CSV files
 * Run: npx tsx scripts/generateMockFiles.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function randomDateNaver(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function randomKoreanDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const OPTIONS = ['블랙', '화이트', '그레이', '네이비', '베이지', '핑크', 'FREE', 'L', 'M', 'XL'];
const STATUSES = ['배송완료', '구매확정', '정산완료'];

// === COUPANG ===
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

function generateCoupangCSV(count: number): string {
  const headers = [
    '주문번호', '주문일', '상품명', '옵션명', '수량',
    '판매액(A)', '결제금액', '판매자 할인쿠폰', '기본배송비',
    '판매수수료', '정산금액', '상품그룹명', '주문상태', '로켓 여부'
  ];

  const rows = [headers.join(',')];

  for (let i = 0; i < count; i++) {
    const product = COUPANG_PRODUCTS[i % COUPANG_PRODUCTS.length];
    const qty = randomInt(1, 3);
    const salesAmount = product.price * qty;
    const discount = Math.random() > 0.75 ? Math.round(salesAmount * (randomInt(5, 20) / 100)) : 0;
    const payment = salesAmount - discount;
    const commission = Math.round(salesAmount * (0.108 + (Math.random() - 0.5) * 0.02));
    const shipping = Math.random() < 0.4 ? randomInt(2500, 3500) : 0;
    const settlement = payment - commission - shipping;
    const option = OPTIONS[randomInt(0, OPTIONS.length - 1)];
    const rocket = Math.random() > 0.3 ? 'Y' : 'N';

    rows.push([
      `CP${String(2000000 + i)}`,
      randomDate('2025-10-01', '2026-03-15'),
      `"${product.name}"`,
      option,
      qty,
      salesAmount,
      payment,
      discount,
      shipping,
      commission,
      settlement,
      `"${product.category}"`,
      STATUSES[randomInt(0, 2)],
      rocket,
    ].join(','));
  }

  return rows.join('\n');
}

// === NAVER ===
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

function generateNaverCSV(count: number): string {
  const headers = [
    '주문번호', '주문일시', '상품명', '옵션정보', '수량',
    '상품별 총 주문금액', '결제금액', '할인금액', '배송비 결제금액',
    '수수료합계', '정산예정금액', '카테고리', '정산상태'
  ];

  const rows = [headers.join(',')];

  for (let i = 0; i < count; i++) {
    const product = NAVER_PRODUCTS[i % NAVER_PRODUCTS.length];
    const qty = randomInt(1, 3);
    const salesAmount = product.price * qty;
    const discount = Math.random() > 0.75 ? Math.round(salesAmount * (randomInt(5, 20) / 100)) : 0;
    const payment = salesAmount - discount;
    const commission = Math.round(salesAmount * (0.055 + (Math.random() - 0.5) * 0.02));
    const shipping = Math.random() < 0.5 ? randomInt(2500, 3500) : 0;
    const settlement = payment - commission - shipping;
    const option = OPTIONS[randomInt(0, OPTIONS.length - 1)];

    rows.push([
      `NV${String(3000000 + i)}`,
      randomDateNaver('2025-10-01', '2026-03-15'),
      `"${product.name}"`,
      option,
      qty,
      salesAmount,
      payment,
      discount,
      shipping,
      commission,
      settlement,
      `"${product.category}"`,
      '정산완료',
    ].join(','));
  }

  return rows.join('\n');
}

// === GMARKET ===
const GMARKET_PRODUCTS = [
  { name: '무선 충전기 3in1 패드', category: '전자기기', price: 35900 },
  { name: '차량용 핸드폰 거치대', category: '자동차용품', price: 15900 },
  { name: '여성 롱 원피스 린넨 소재', category: '패션의류', price: 39900 },
  { name: '스마트워치 밴드 실리콘', category: '전자기기', price: 8900 },
  { name: '미니 선풍기 핸디형 USB', category: '생활가전', price: 12900 },
  { name: '수건 세트 호텔식 6장', category: '생활용품', price: 24900 },
  { name: '차량용 방향제 디퓨저', category: '자동차용품', price: 11900 },
  { name: '남성 반팔 카라티 폴로', category: '패션의류', price: 19900 },
];

function generateGmarketXLSX(count: number): XLSX.WorkBook {
  const headers = [
    '주문번호', '주문일시', '상품명', '옵션', '수량',
    '판매가', '결제금액', '할인', '배송비',
    '카테고리수수료', '정산금', '상품그룹명', '배송상태', '판매자등급'
  ];

  const data: (string | number)[][] = [headers];

  for (let i = 0; i < count; i++) {
    const product = GMARKET_PRODUCTS[i % GMARKET_PRODUCTS.length];
    const qty = randomInt(1, 3);
    const salesAmount = product.price * qty;
    const discount = Math.random() > 0.75 ? Math.round(salesAmount * (randomInt(5, 20) / 100)) : 0;
    const payment = salesAmount - discount;
    const commission = Math.round(salesAmount * (0.12 + (Math.random() - 0.5) * 0.02));
    const shipping = Math.random() < 0.35 ? randomInt(2500, 3500) : 0;
    const settlement = payment - commission - shipping;
    const option = OPTIONS[randomInt(0, OPTIONS.length - 1)];
    const grade = ['파워', '프리미엄', '일반'][randomInt(0, 2)];

    data.push([
      `GM${String(4000000 + i)}`,
      randomKoreanDate('2025-10-01', '2026-03-15'),
      product.name,
      option,
      qty,
      salesAmount,
      payment,
      discount,
      shipping,
      commission,
      settlement,
      product.category,
      '배송완료',
      grade,
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '정산내역');
  return wb;
}

// === GENERATE ===
const outDir = path.join(process.cwd(), 'mockdata');

// Coupang CSV (220 rows)
const coupangCSV = generateCoupangCSV(220);
fs.writeFileSync(path.join(outDir, '쿠팡_정산현황_2025Q4_2026Q1.csv'), coupangCSV, 'utf-8');
console.log('✓ 쿠팡_정산현황_2025Q4_2026Q1.csv (220 rows)');

// Naver CSV (200 rows)
const naverCSV = generateNaverCSV(200);
fs.writeFileSync(path.join(outDir, '스마트스토어_정산내역_2025Q4_2026Q1.csv'), naverCSV, 'utf-8');
console.log('✓ 스마트스토어_정산내역_2025Q4_2026Q1.csv (200 rows)');

// Gmarket XLSX (150 rows) - uses Korean date format 2026년 3월 15일
const gmarketWB = generateGmarketXLSX(150);
XLSX.writeFile(gmarketWB, path.join(outDir, '지마켓_정산내역_2025Q4_2026Q1.xlsx'));
console.log('✓ 지마켓_정산내역_2025Q4_2026Q1.xlsx (150 rows)');

console.log('\nDone! Files written to mockdata/');

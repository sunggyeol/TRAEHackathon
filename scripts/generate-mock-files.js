const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startStr, endStr) {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d;
}

function formatDate(date, format) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  if (format === 'dot') return `${yyyy}.${mm}.${dd}`;
  return `${yyyy}-${mm}-${dd}`;
}

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
  { name: '나이키 에어포스 1 \'07 화이트', category: '패션/신발', price: 139000 },
  { name: '정관장 홍삼정 에브리타임 밸런스 30포', category: '건강식품', price: 75000 },
  { name: '설화수 자음2종 세트', category: '화장품/미용', price: 120000 },
  { name: '애플 에어팟 프로 2세대', category: '디지털/가전', price: 359000 },
  { name: '일리 네스프레소 호환 캡슐 100캡슐', category: '식품/음료', price: 45000 },
  { name: '다이슨 에어랩 멀티 스타일러', category: '디지털/가전', price: 749000 },
  { name: '락토핏 생유산균 골드 50포 x 3통', category: '건강식품', price: 42000 },
  { name: '크록스 클래식 클로그', category: '패션/신발', price: 54900 },
  { name: 'LG전자 스탠바이미', category: '디지털/가전', price: 1040000 },
  { name: '아로마티카 로즈마리 스칼프 샴푸', category: '화장품/미용', price: 24000 },
];

const GMARKET_PRODUCTS = [
  { name: '동원샘물 무라벨 2L x 12병', category: '생수/음료', price: 11900 },
  { name: '햇반 210g x 36개입', category: '가공식품', price: 35900 },
  { name: '맥심 모카골드 마일드 200T', category: '커피/차', price: 28900 },
  { name: '크리넥스 3겹 데코앤소프트 30m x 30롤', category: '생활용품', price: 29900 },
  { name: '신라면 120g x 40개', category: '가공식품', price: 32000 },
  { name: '피죤 프리미엄 화장지 30m 30롤', category: '생활용품', price: 24900 },
  { name: '스팸 클래식 200g x 10개', category: '가공식품', price: 27000 },
  { name: '오뚜기 참치 라이트스탠다드 150g 10개', category: '가공식품', price: 25900 },
];

const OPTIONS = ['블랙', '화이트', '그레이', '네이비', '베이지', 'FREE', 'S', 'M', 'L', 'XL'];

// Generate Coupang CSV
function generateCoupang() {
  const header = ['주문번호', '주문일', '상품명', '옵션명', '수량', '판매액(A)', '결제금액', '판매자 할인쿠폰', '기본배송비', '판매수수료', '정산금액', '상품그룹명', '주문상태', '로켓 여부'];
  const rows = [header.join(',')];
  
  for (let i = 0; i < 420; i++) {
    const product = COUPANG_PRODUCTS[i % COUPANG_PRODUCTS.length];
    const date = formatDate(randomDate('2025-10-01', '2026-03-15'), 'dot');
    const orderId = `CP${2000000 + i}`;
    const option = Math.random() > 0.3 ? OPTIONS[randomInt(0, OPTIONS.length - 1)] : '';
    const quantity = randomInt(1, 3);
    const salesAmount = product.price * quantity;
    const discount = Math.random() > 0.8 ? Math.round(salesAmount * (randomInt(5, 15) / 100)) : 0;
    const paymentAmount = salesAmount - discount;
    const shippingFee = Math.random() < 0.4 ? randomInt(2500, 3000) : 0;
    const commissionRate = 0.108 + (Math.random() - 0.5) * 0.02;
    const commission = Math.round(salesAmount * commissionRate);
    const settlement = paymentAmount - commission - shippingFee;
    const status = Math.random() > 0.1 ? '구매확정' : '배송완료';
    const rocket = Math.random() > 0.7 ? 'Y' : 'N';
    
    rows.push(`${orderId},${date},"${product.name}",${option},${quantity},${salesAmount},${paymentAmount},${discount},${shippingFee},${commission},${settlement},"${product.category}",${status},${rocket}`);
  }
  
  return rows.join('\n');
}

// Generate Naver CSV
function generateNaver() {
  const header = ['주문번호', '주문일시', '상품명', '옵션정보', '수량', '상품별 총 주문금액', '결제금액', '할인금액', '배송비 결제금액', '수수료합계', '정산예정금액', '카테고리', '정산상태'];
  const rows = [header.join(',')];
  
  for (let i = 0; i < 350; i++) {
    const product = NAVER_PRODUCTS[i % NAVER_PRODUCTS.length];
    const date = formatDate(randomDate('2025-10-01', '2026-03-15'), 'dash');
    const orderId = `NV${3000000 + i}`;
    const option = Math.random() > 0.4 ? OPTIONS[randomInt(0, OPTIONS.length - 1)] : '';
    const quantity = randomInt(1, 2);
    const salesAmount = product.price * quantity;
    const discount = Math.random() > 0.7 ? Math.round(salesAmount * (randomInt(5, 20) / 100)) : 0;
    const paymentAmount = salesAmount - discount;
    const shippingFee = Math.random() < 0.5 ? randomInt(2500, 3500) : 0;
    const commissionRate = 0.055 + (Math.random() - 0.5) * 0.01;
    const commission = Math.round(salesAmount * commissionRate);
    const settlement = paymentAmount - commission - shippingFee;
    const status = '정산완료';
    
    rows.push(`${orderId},${date},"${product.name}",${option},${quantity},${salesAmount},${paymentAmount},${discount},${shippingFee},${commission},${settlement},"${product.category}",${status}`);
  }
  
  return rows.join('\n');
}

// Generate Gmarket XLSX
function generateGmarket() {
  const data = [];
  const header = ['주문번호', '결제완료일', '상품명', '옵션', '수량', '판매가', '결제금액', '할인액', '배송비', '서비스이용료', '정산대상금액', '대분류', '배송상태'];
  data.push(header);
  
  for (let i = 0; i < 380; i++) {
    const product = GMARKET_PRODUCTS[i % GMARKET_PRODUCTS.length];
    const date = formatDate(randomDate('2025-10-01', '2026-03-15'), 'dash');
    const orderId = `GM${4000000 + i}`;
    const option = Math.random() > 0.5 ? OPTIONS[randomInt(0, OPTIONS.length - 1)] : '';
    const quantity = randomInt(1, 5);
    const salesAmount = product.price * quantity;
    const discount = Math.random() > 0.6 ? Math.round(salesAmount * (randomInt(5, 10) / 100)) : 0;
    const paymentAmount = salesAmount - discount;
    const shippingFee = Math.random() < 0.35 ? randomInt(2500, 3000) : 0;
    const commissionRate = 0.12 + (Math.random() - 0.5) * 0.02;
    const commission = Math.round(salesAmount * commissionRate);
    const settlement = paymentAmount - commission - shippingFee;
    const status = '배송완료';
    
    data.push([orderId, date, product.name, option, quantity, salesAmount, paymentAmount, discount, shippingFee, commission, settlement, product.category, status]);
  }
  
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, "정산내역");
  return wb;
}

const publicDir = path.join(__dirname, '../public/mockdata');

// Write files
fs.writeFileSync(path.join(publicDir, '쿠팡_정산현황_2025Q4_2026Q1.csv'), generateCoupang());
fs.writeFileSync(path.join(publicDir, '스마트스토어_정산내역_2025Q4_2026Q1.csv'), generateNaver());

const gmarketWb = generateGmarket();
xlsx.writeFile(gmarketWb, path.join(publicDir, '지마켓_정산내역_2025Q4_2026Q1.xlsx'));

console.log('Mock files generated successfully with expanded realistic data!');
# 스마트 매물장 및 고객관리(CRM) 통합 시스템 🏢

개업공인중개사를 위한 **‘스마트 매물장 및 고객관리(CRM) 동시 운영 시스템’**입니다.

## ✨ 주요 기능

1. **매물장과 고객관리장 통합 UI (고객 구분 탭)**
   - **[물건 접수] 매도인 / 임대인:** 내놓을 매물 정보(소재지 주소, 대장 연동 정보, 희망 가격)와 함께 등록
   - **[물건 찾음] 매수인 / 임차인:** 희망 조건(지역, 예산 범위, 희망 면적 등)과 함께 등록
   - 고객 상세 페이지 및 카드에 **[📞 전화걸기]** (`href="tel:전화번호"`) 및 문자 버튼 배치
   - 매물 카드 및 상세 모달에 **[💬 문자로 전송]** (`href="sms:?body=..."`) 및 **[🟡 카톡 공유]** (Kakao Link API) 버튼 지원

2. **공공데이터포털(건축물대장/토지대장) 실시간 자동 연동**
   - 매물 등록 시 '소재지 주소' 입력 후 **[대장 정보 불러오기]** 클릭 시 대지면적, 연면적, 사용승인일, 건축물대장상 용도 등을 자동으로 채워줍니다.

3. **상담시 필수 확인 체크리스트 (UI 고정 패널)**
   - 상가점포 (15개 항목), 사무실 (12개 항목), 공장/창고 (5개 항목), 토지 (10개 항목) 등록/수정 시 우측에 필수 확인 체크리스트 패널이 자동 노출되어 중개사고를 사전 예방합니다.

4. **7대 매물 유형별 맞춤 스키마 지원**
   - 아파트, 주택, 상가점포, 사무실, 공장/창고, 토지, 기타

---

## 🛠️ 기술 스택

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend:** Next.js Route Handlers (API Routes)
- **Database / ORM:** Prisma ORM (SQLite / PostgreSQL 호환)
- **External API:** 공공데이터포털 건축물대장 표제부 API, Kakao Link JavaScript SDK
- **Icons:** Lucide React

---

## 🚀 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정 (`.env`)
```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY="your-kakao-javascript-key"
DATA_GO_KR_API_KEY="your-data-go-kr-api-key"
```

### 3. 데이터베이스 마이그레이션
```bash
npx prisma generate
npx prisma db push
```

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

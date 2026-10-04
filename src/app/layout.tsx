import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: '스마트 매물장 & 고객관리(CRM) 시스템 | 개업공인중개사 전용',
  description: '개업공인중개사를 위한 스마트 매물장 및 CRM 시스템. [물건 접수] 매도/임대인 및 [물건 찾음] 매수/임차인 통합 관리, 7개 매물 유형별 스펙, 정부 건축물대장 자동 연동, 상담 필수 체크리스트, 카카오톡/문자 원클릭 공유.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* Leaflet CSS for guaranteed real map fallback */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Kakao Maps SDK with services and clusterer */}
        <script
          id="kakao-map-sdk"
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 'ab4074f3fc327e405a625fc856bee022'}&autoload=false&libraries=services,clusterer`}
          defer
        />
      </head>
      <body className="antialiased selection:bg-blue-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}

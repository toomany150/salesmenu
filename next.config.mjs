/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/**': ['./prisma/**'],
  },
  env: {
    NEXT_PUBLIC_KAKAO_MAP_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 'ab4074f3fc327e405a625fc856bee022',
    NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || 'ab4074f3fc327e405a625fc856bee022',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://salesmenu.vercel.app',
    DATA_GO_KR_API_KEY: process.env.DATA_GO_KR_API_KEY || '4de555ece087423fee940e78733bdb484d9196e0dc54fb0e64b78754894af96d',
  },
};

export default nextConfig;

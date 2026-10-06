// src/lib/kakao.ts
// 카카오톡 공유 API (Kakao Link SDK) 연동 헬퍼

declare global {
  interface Window {
    Kakao: any;
  }
}

const DEFAULT_KAKAO_KEY = 'ab4074f3fc327e405a625fc856bee022';

export function getKakaoKey(): string {
  return process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || 
         process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 
         DEFAULT_KAKAO_KEY;
}

export function initKakao(): boolean {
  if (typeof window === 'undefined') return false;

  const kakaoKey = getKakaoKey();

  const isValidKey = (key?: string) => {
    return !!key && 
      key !== 'your-kakao-map-key' && 
      key !== 'your-kakao-javascript-key' && 
      key !== 'demo_kakao_key_replace_with_yours';
  };

  if (window.Kakao) {
    if (!window.Kakao.isInitialized() && isValidKey(kakaoKey)) {
      try {
        window.Kakao.init(kakaoKey);
        return true;
      } catch (err) {
        console.warn('Kakao init error:', err);
      }
    }
    return window.Kakao.isInitialized();
  }

  // 동적 스크립트 로드 (layout.tsx에 없을 경우 대비)
  const existingScript = document.getElementById('kakao-js-sdk');
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'kakao-js-sdk';
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649CAMonG018J2mAssRse_g30edZNi92OBghGwpczuo20MW4zkMxYMcN';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Kakao && isValidKey(kakaoKey)) {
        try {
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(kakaoKey);
          }
        } catch (err) {
          console.warn('Kakao script onload init error:', err);
        }
      }
    };
    document.head.appendChild(script);
  }
  return false;
}

export interface SharePropertyParams {
  title: string;
  description: string;
  priceText: string;
  address: string;
  propertyNumber: string;
  propertyType: string;
}

export async function shareViaKakao(params: SharePropertyParams): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const shareUrl = window.location.href;
  const kakaoKey = getKakaoKey();

  // 아직 Kakao 초기화가 안 되어 있다면 즉시 초기화 시도
  if (window.Kakao && !window.Kakao.isInitialized()) {
    try {
      window.Kakao.init(kakaoKey);
    } catch (e) {
      console.warn('Kakao immediate init error:', e);
    }
  }

  // 스크립트가 아직 로딩 중인 경우 잠깐 대기
  if (!window.Kakao) {
    initKakao();
    await new Promise((r) => setTimeout(r, 600));
    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(kakaoKey);
      } catch (e) {}
    }
  }

  const isKakaoReady = window.Kakao && window.Kakao.isInitialized();

  if (isKakaoReady) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `[매물 ${params.propertyNumber}] ${params.title}`,
          description: `${params.priceText}\n위치: ${params.address}\n유형: ${params.propertyType}`,
          imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=60',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '매물 상세정보 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('Kakao share send error, falling back to clipboard:', err);
    }
  }

  // 카카오 SDK 미설정/도메인 미등록 시 클립보드 복사 폴백
  const summaryText = `[부동산 매물안내 - 매물번호 #${params.propertyNumber}]\n● 매물유형: ${params.propertyType}\n● 거래정보: ${params.priceText}\n● 소재지: ${params.address}\n● 상세설명: ${params.description}\n\n상세링크: ${shareUrl}`;
  
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(summaryText);
      alert('매물 안내 문구가 클립보드에 복사되었습니다!\n원하는 카카오톡 채팅방에 [붙여넣기] 해주세요.');
      return true;
    } catch {
      alert('매물 정보 요약:\n\n' + summaryText);
      return false;
    }
  } else {
    alert('매물 정보 요약:\n\n' + summaryText);
    return false;
  }
}

export function generateSmsLink(property: {
  propertyNumber: string;
  propertyType: string;
  transactionType: string;
  price?: number;
  deposit?: number;
  monthlyRent?: number;
  address: string;
  detailAddress?: string;
  consultationNotes?: string;
}): string {
  let priceStr = '';
  if (property.transactionType === '매매') {
    priceStr = `매매가 ${property.price ? property.price.toLocaleString() + '만원' : '협의'}`;
  } else if (property.transactionType === '전세') {
    priceStr = `전세 ${property.deposit ? property.deposit.toLocaleString() + '만원' : '협의'}`;
  } else {
    priceStr = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만원' : '0'}/월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만원' : '0'}`;
  }

  const message = `[공인중개사 매물안내]
- 매물번호: ${property.propertyNumber}
- 유형: ${property.propertyType} (${property.transactionType})
- 금액: ${priceStr}
- 소재지: ${property.address} ${property.detailAddress || ''}
${property.consultationNotes ? `- 참고사항: ${property.consultationNotes}` : ''}

문의주시면 친절히 상담해 드리겠습니다.`;

  return `sms:?body=${encodeURIComponent(message)}`;
}

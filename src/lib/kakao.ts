// src/lib/kakao.ts
// 카카오톡 공유 API (Kakao Link SDK) 연동 헬퍼

declare global {
  interface Window {
    Kakao: any;
  }
}

export function initKakao(): boolean {
  if (typeof window === 'undefined') return false;

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  if (window.Kakao) {
    if (!window.Kakao.isInitialized() && kakaoKey && kakaoKey !== 'your-kakao-javascript-key' && kakaoKey !== 'demo_kakao_key_replace_with_yours') {
      try {
        window.Kakao.init(kakaoKey);
        return true;
      } catch (err) {
        console.warn('Kakao init error:', err);
      }
    }
    return window.Kakao.isInitialized();
  }

  // 동적 스크립트 로드
  const script = document.createElement('script');
  script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
  script.integrity = 'sha384-TiCUE00h649CAMonG018J2mAssRse_g30edZNi92OBghGwpczuo20MW4zkMxYMcN';
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    if (window.Kakao && kakaoKey && kakaoKey !== 'your-kakao-javascript-key' && kakaoKey !== 'demo_kakao_key_replace_with_yours') {
      window.Kakao.init(kakaoKey);
    }
  };
  document.head.appendChild(script);
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

export function shareViaKakao(params: SharePropertyParams): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    const shareUrl = window.location.href;
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
        return resolve(true);
      } catch (err) {
        console.error('Failed to send Kakao share:', err);
      }
    }

    // 카카오 SDK 미설정 시 클립보드 복사 또는 안내
    const summaryText = `[부동산 매물안내 - 매물번호 #${params.propertyNumber}]\n● 매물유형: ${params.propertyType}\n● 거래정보: ${params.priceText}\n● 소재지: ${params.address}\n● 상세설명: ${params.description}\n\n상세링크: ${shareUrl}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText).then(() => {
        alert('카카오톡 SDK 키가 설정되지 않아 매물 안내 문구가 클립보드에 복사되었습니다!\n원하는 카카오톡 채팅방에 [붙여넣기] 해주세요.');
        resolve(true);
      }).catch(() => {
        alert('매물 정보 요약:\n\n' + summaryText);
        resolve(false);
      });
    } else {
      alert('매물 정보 요약:\n\n' + summaryText);
      resolve(false);
    }
  });
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

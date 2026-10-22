import { NextRequest, NextResponse } from 'next/server';
import { uploadBase64ToR2, uploadMultipleBase64ToR2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { images, image, folder = 'properties' } = body;

      if (Array.isArray(images)) {
        const uploadedUrls = await uploadMultipleBase64ToR2(images, folder);
        return NextResponse.json({ success: true, urls: uploadedUrls });
      }

      if (typeof image === 'string') {
        const uploadedUrl = await uploadBase64ToR2(image, folder);
        return NextResponse.json({ success: true, url: uploadedUrl });
      }

      return NextResponse.json({ success: false, error: '유효한 이미지 데이터가 없습니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: '지원되지 않는 컨텐츠 타입입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('R2 Upload API Error:', error);
    return NextResponse.json({ success: false, error: error.message || '업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

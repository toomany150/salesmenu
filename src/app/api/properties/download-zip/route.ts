// src/app/api/properties/download-zip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';

function sanitizeFilename(name: string): string {
  return (name || '매물사진')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const buffer = Buffer.from(parts[1], 'base64');
      return { buffer, ext };
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      return { buffer: Buffer.from(arrayBuffer), ext };
    }

    return null;
  } catch (err) {
    console.error('[download-zip] 이미지 버퍼 변환 실패:', url, err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('id') || searchParams.get('propertyId');

    if (!propertyId) {
      return new NextResponse('매물 ID가 누락되었습니다.', { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: {
        OR: [
          { id: propertyId },
          { propertyNumber: propertyId },
        ],
      },
      select: {
        id: true,
        propertyNumber: true,
        address: true,
        detailAddress: true,
        images: true,
      },
    });

    if (!property) {
      return new NextResponse('해당 매물을 찾을 수 없습니다.', { status: 404 });
    }

    let images: string[] = [];
    if (property.images) {
      try {
        const parsed = JSON.parse(property.images);
        images = Array.isArray(parsed) ? parsed : [];
      } catch {
        images = [];
      }
    }

    if (images.length === 0) {
      return new NextResponse('등록된 사진이 없습니다.', { status: 404 });
    }

    const baseTitle = sanitizeFilename(property.address || property.propertyNumber || '매물');
    const propNo = property.propertyNumber ? `_${sanitizeFilename(property.propertyNumber)}` : '';
    const zipBaseName = `${baseTitle}${propNo}_사진모음_${images.length}장`;

    const zip = new JSZip();

    // 모든 사진을 병렬/순차로 다운로드하여 ZIP에 추가
    const fetchPromises = images.map(async (imgUrl, idx) => {
      const isRep = idx === 0 ? '_대표' : '';
      const imgData = await fetchImageBuffer(imgUrl);
      if (imgData) {
        const filename = `${baseTitle}${propNo}_사진${idx + 1}${isRep}.${imgData.ext}`;
        zip.file(filename, imgData.buffer);
      }
    });

    await Promise.all(fetchPromises);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const encodedFilename = encodeURIComponent(`${zipBaseName}.zip`);

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[download-zip] GET 에러:', error);
    return new NextResponse(error.message || 'ZIP 생성 중 오류 발생', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, title, propertyNumber } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new NextResponse('저장할 사진 목록이 비어있습니다.', { status: 400 });
    }

    const baseTitle = sanitizeFilename(title || propertyNumber || '매물');
    const propNo = propertyNumber ? `_${sanitizeFilename(propertyNumber)}` : '';
    const zipBaseName = `${baseTitle}${propNo}_사진모음_${images.length}장`;

    const zip = new JSZip();

    const fetchPromises = images.map(async (imgUrl: string, idx: number) => {
      const isRep = idx === 0 ? '_대표' : '';
      const imgData = await fetchImageBuffer(imgUrl);
      if (imgData) {
        const filename = `${baseTitle}${propNo}_사진${idx + 1}${isRep}.${imgData.ext}`;
        zip.file(filename, imgData.buffer);
      }
    });

    await Promise.all(fetchPromises);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const encodedFilename = encodeURIComponent(`${zipBaseName}.zip`);

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[download-zip] POST 에러:', error);
    return new NextResponse(error.message || 'ZIP 생성 중 오류 발생', { status: 500 });
  }
}

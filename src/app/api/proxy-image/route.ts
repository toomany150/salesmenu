// src/app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return new NextResponse('Invalid URL protocol', { status: 400 });
    }

    let targetUrl = imageUrl;
    try {
      targetUrl = new URL(imageUrl).toString();
    } catch {
      targetUrl = encodeURI(imageUrl);
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch upstream image: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error: any) {
    console.error('[proxy-image] Error:', error);
    return new NextResponse(error.message || 'Error proxying image', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

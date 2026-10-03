// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recordAccessLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userRole } = body;

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    if (userName) {
      await recordAccessLog({
        userId,
        userName,
        userRole: userRole || 'AGENT',
        action: 'LOGOUT',
        targetType: 'AUTH',
        details: `${userName} 정상 로그아웃`,
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: true });
  }
}

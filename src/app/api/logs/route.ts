// src/app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAccessLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const action = searchParams.get('action');

    const whereClause: any = {};
    if (action) {
      whereClause.action = action;
    }

    const logs = await prisma.accessLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('Error fetching logs:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userRole, action, targetType, targetId, details } = body;

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await recordAccessLog({
      userId,
      userName: userName || '익명',
      userRole: userRole || 'AGENT',
      action: action || 'AUDIT_EVENT',
      targetType,
      targetId,
      details,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false });
  }
}

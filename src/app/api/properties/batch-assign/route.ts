// src/app/api/properties/batch-assign/route.ts
// 매물 담당 권한자(관리 주체 및 추가 권한자) 일괄 추가/지정 API
// 기존 데이터 100% 보존 보장 (매물 고유번호, 주소, 가격, 옵션, 고객연결 등 일체 불변)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAccessLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyIds, // 특정 매물 ID 배열 (없거나 비어있고 all이 true이면 전체 매물)
      all,          // 전체 매물 대상 여부
      agentName,    // 추가 또는 지정할 담당 권한자명 (예: '하승원팀장', '개업공인중개사 (대표)', '사무실')
      mode = 'ADD_ASSIGNED', // 'ADD_ASSIGNED' (기존 권한자 유지 + 추가 권한자로 더하기) | 'SET_MAIN' (주 담당자 변경)
    } = body;

    const trimmedAgentName = (agentName || '').trim();
    if (!trimmedAgentName) {
      return NextResponse.json(
        { error: '지정 또는 추가할 담당 권한자 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 대상 매물 검색 조건 설정
    let whereCondition: any = {};
    if (!all && Array.isArray(propertyIds) && propertyIds.length > 0) {
      whereCondition = {
        OR: [
          { id: { in: propertyIds } },
          { propertyNumber: { in: propertyIds } },
        ],
      };
    }

    // 대상 매물 조회
    const targetProperties = await prisma.property.findMany({
      where: whereCondition,
      select: {
        id: true,
        propertyNumber: true,
        managerName: true,
        assignedAgents: true,
      },
    });

    if (targetProperties.length === 0) {
      return NextResponse.json(
        { error: '대상 매물이 존재하지 않습니다.' },
        { status: 404 }
      );
    }

    let updatedCount = 0;

    for (const prop of targetProperties) {
      if (mode === 'ADD_ASSIGNED') {
        // 기존 추가 권한자 목록 파싱
        let currentAssigned: string[] = [];
        try {
          if (prop.assignedAgents) {
            currentAssigned = JSON.parse(prop.assignedAgents);
            if (!Array.isArray(currentAssigned)) {
              currentAssigned = typeof prop.assignedAgents === 'string'
                ? prop.assignedAgents.split(',').map((s) => s.trim())
                : [];
            }
          }
        } catch {
          currentAssigned = typeof prop.assignedAgents === 'string'
            ? prop.assignedAgents.split(',').map((s) => s.trim())
            : [];
        }

        // 이미 추가 권한자에 포함되어 있거나, 주 담당자명과 동일하면 건너뜀
        if (currentAssigned.includes(trimmedAgentName) || prop.managerName === trimmedAgentName) {
          continue;
        }

        const newAssignedList = [...currentAssigned, trimmedAgentName];

        // 기존 데이터는 전혀 손대지 않고 오직 assignedAgents만 업데이트
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            assignedAgents: JSON.stringify(newAssignedList),
          },
        });
        updatedCount++;
      } else if (mode === 'SET_MAIN') {
        if (prop.managerName === trimmedAgentName) {
          continue;
        }

        // 주 담당자만 업데이트
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            managerName: trimmedAgentName,
          },
        });
        updatedCount++;
      }
    }

    // 접속 감사 로그 기록
    try {
      const userRole = request.headers.get('x-user-role') || 'ADMIN';
      const userName = decodeURIComponent(request.headers.get('x-user-name') || '개업공인중개사 (대표)');
      const userId = request.headers.get('x-user-id') || undefined;

      await recordAccessLog({
        userId,
        userName,
        userRole,
        action: 'BATCH_ASSIGN_MANAGER',
        targetType: 'PROPERTY',
        details: `매물 ${updatedCount}건에 대해 [${trimmedAgentName}] 담당권한자 일괄 ${
          mode === 'ADD_ASSIGNED' ? '추가 권한자 지정' : '주 담당자 변경'
        } 완료 (기존 데이터 보존)`,
      });
    } catch (logErr) {
      console.warn('Batch assign access log warning:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `총 ${targetProperties.length}개 매물 중 ${updatedCount}개 매물에 [${trimmedAgentName}] 권한자가 안전하게 반영되었습니다. (기존 데이터 100% 보존)`,
      targetCount: targetProperties.length,
      updatedCount,
      agentName: trimmedAgentName,
      mode,
    });
  } catch (error: any) {
    console.error('Error in batch-assign API:', error);
    return NextResponse.json(
      { error: error.message || '담당 권한자 일괄 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

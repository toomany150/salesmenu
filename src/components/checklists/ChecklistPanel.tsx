'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ShieldAlert,
  Building,
  Briefcase,
  Factory,
  Compass
} from 'lucide-react';
import { PropertyType } from '@/lib/types';

interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  importance: 'CRITICAL' | 'HIGH' | 'NORMAL';
}

const STORE_CHECKLIST: ChecklistItem[] = [
  { id: 'businessType', title: '1. 업종 인허가 승계', desc: '자유업/신고업/허가업 구분 및 구청 영업신고증 승계 가능 여부', importance: 'CRITICAL' },
  { id: 'adminAction', title: '2. 행정처분 이력 확인', desc: '영업정지/과징금 등 행정처분 승계 여부 구청 위생과 사전 조회', importance: 'CRITICAL' },
  { id: 'restoration', title: '3. 원상복구특약 명시', desc: '시설 권리양수도 시 기존 인테리어 원상복구 면제 특약 및 철거 범위 확인', importance: 'CRITICAL' },
  { id: 'dailyRevenue', title: '4. 일매출 & 포스자료', desc: 'POS기/부가세과세표준증명 등 객관적 실매출 증빙 확인', importance: 'HIGH' },
  { id: 'equipment', title: '5. 비품/렌탈 승계 확인', desc: '제빙기, 정수기, 포스기, 식기세척기 렌탈 승계 or 소유권 귀속 여부', importance: 'HIGH' },
  { id: 'fireCert', title: '6. 소방필증 (완비증명)', desc: '지하 66㎡ 이상, 2층 이상 100㎡ 이상 다중이용업소 비상구/방염 필증 완비', importance: 'CRITICAL' },
  { id: 'sanitation', title: '7. 정화조 용량 & 환경', desc: '업종 변경 시 정화조 용량 초과 여부 및 하수도 원인자부담금 사전 검토', importance: 'HIGH' },
];

const OFFICE_CHECKLIST: ChecklistItem[] = [
  { id: 'violation', title: '1. 위반건축물 여부', desc: '용도변경 미신고 및 발코니 불법확장 체크', importance: 'CRITICAL' },
  { id: 'parkingFee', title: '2. 주차대수 및 추가요금', desc: '호실당 무료 배정 대수 및 방문객 주차권 할인 규정', importance: 'HIGH' },
  { id: 'rentIncrease', title: '3. 임대료 인상여부', desc: '재계약 시 보증금/월세 갱신 기준', importance: 'NORMAL' },
  { id: 'adStatus', title: '4. 점포/간판 광고 여부', desc: '1층 로비 인포메이션 보드 및 층별 현판 부착 가능 여부', importance: 'NORMAL' },
  { id: 'prosCons', title: '5. 매물 장단점', desc: '채광, 뷰, 엘리베이터 혼잡도, 주변 편의시설', importance: 'NORMAL' },
  { id: 'hvac', title: '6. 냉난방 시스템', desc: '개별 FCU 천장형인지 중앙공급(야간/주말 가동여부)인지', importance: 'HIGH' },
  { id: 'elevator', title: '7. 엘리베이터 대수', desc: '승객용 대수 및 대형 화물엘리베이터 유무', importance: 'NORMAL' },
  { id: 'security', title: '8. 보안 및 출입관리', desc: '24시간 출입 가능 여부, 지문인식/캡스/경비실 상주', importance: 'NORMAL' },
  { id: 'restoration', title: '9. 원상복구 범위 명확화', desc: '유리 칸막이/바닥재 승계 인정 여부 (분쟁 1위 항목)', importance: 'CRITICAL' },
  { id: 'electric', title: '10. 전기 증설 가능 여부', desc: '서버룸/PC 다량 사용 시 건물 변압기 여유 용량 확인', importance: 'HIGH' },
  { id: 'specialTerms', title: '11. 특약사항 협의', desc: '인테리어 공사기간(렌트프리 Free-Rent) 제공 일수', importance: 'HIGH' },
  { id: 'totalOffices', title: '12. 건물 내 총 사무실수', desc: '입주사 현황 및 동종 경쟁업종 입주 제한 여부', importance: 'NORMAL' },
];

const FACTORY_CHECKLIST: ChecklistItem[] = [
  { id: 'wastewater', title: '1. 폐수 배출 및 처리', desc: '특정수질유해물질 발생 여부 및 위탁처리/정화조 용량', importance: 'CRITICAL' },
  { id: 'airPollution', title: '2. 대기 오염 배출 시설', desc: '분진, 연기, 악취 배출 허가 및 집진시설 설치 공간', importance: 'CRITICAL' },
  { id: 'noise', title: '3. 소음 및 진동 발생', desc: '프레스/절단기 등 진동 발생 시 인근 민원 발생 가능성', importance: 'HIGH' },
  { id: 'allowedBusiness', title: '4. 입주가능업종(코드)', desc: '산업단지 관리기본계획 및 지자체 조례상 허용 업종 코드 일치', importance: 'CRITICAL' },
  { id: 'sewageDirect', title: '5. 하수종말처리장 직관', desc: '공공하수관로 직관 연결 여부 (정화조 청소 불필요 여부)', importance: 'HIGH' },
];

const LAND_CHECKLIST: ChecklistItem[] = [
  { id: 'ordinancePermitted', title: '1. 조례상 건축 허용 여부', desc: '매수자가 희망하는 건축물(창고/주택/공장) 지자체 조례 허용', importance: 'CRITICAL' },
  { id: 'roadAccess', title: '2. 건축법상 진입도로 확보', desc: '폭 4m 이상 도로에 2m 이상 접도 여부 (맹지 탈출 조건)', importance: 'CRITICAL' },
  { id: 'surfaceRights', title: '3. 지상권 설정 여부', desc: '한전 송전탑 지상권, 타인 소유 분묘기지권, 법정지상권 유무', importance: 'CRITICAL' },
  { id: 'easementRights', title: '4. 지역권 설정 여부', desc: '통행지역권, 용수지역권 등 타인의 배타적 권리', importance: 'HIGH' },
  { id: 'farmlandsCert', title: '5. 농취증 발급 가능 여부', desc: '지목 전/답/과수원 시 매수인 자격 및 농업경영계획서 요건', importance: 'CRITICAL' },
  { id: 'landPermitZone', title: '6. 토지거래허가구역', desc: '허가구역 지정 여부 (실거주/실사용 의무기간 확인)', importance: 'CRITICAL' },
  { id: 'greenBelt', title: '7. 개발제한구역(그린벨트)', desc: '행위제한 및 이축권(용마루) 필요 여부', importance: 'CRITICAL' },
  { id: 'unauthorized', title: '8. 무허가물/비닐하우스/수목', desc: '지상 무단 점유물, 컨테이너, 다년생 농작물 보상 문제', importance: 'HIGH' },
  { id: 'infrastructure', title: '9. 기반 시설 인입 여부', desc: '전신주(삼상전기), 도시가스관 인접 여부 (인입비용 수천만원 발생 가능)', importance: 'HIGH' },
  { id: 'waterSewage', title: '10. 상수도/하수관로 연결', desc: '지하수 개발 필요 여부 및 하수도 원인자부담금 체크', importance: 'CRITICAL' },
];

interface ChecklistPanelProps {
  propertyType: PropertyType;
  className?: string;
  onItemCheckChange?: (id: string, checked: boolean) => void;
}

export const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  propertyType,
  className = '',
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 해당 매물 종류에 맞는 체크리스트 결정
  let items: ChecklistItem[] = [];
  let title = '';
  let badgeColor = '';
  let IconComponent = Building;

  switch (propertyType) {
    case 'STORE':
      items = STORE_CHECKLIST;
      title = '상가점포 필수 확인 체크리스트';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      IconComponent = Building;
      break;
    case 'OFFICE':
      items = OFFICE_CHECKLIST;
      title = '사무실 필수 확인 체크리스트';
      badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
      IconComponent = Briefcase;
      break;
    case 'FACTORY_WAREHOUSE':
      items = FACTORY_CHECKLIST;
      title = '공장/창고 필수 확인 체크리스트';
      badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-300';
      IconComponent = Factory;
      break;
    case 'LAND':
      items = LAND_CHECKLIST;
      title = '토지 필수 확인 체크리스트';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      IconComponent = Compass;
      break;
    default:
      // 아파트/주택은 별도 고정 툴팁 미표시 (공통 대장 정보 중심)
      return null;
  }

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const checkedCount = items.filter((i) => checkedItems[i.id]).length;
  const progressPercent = Math.round((checkedCount / items.length) * 100);

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                🚨 중개사고 예방 필수
              </span>
              <span className="text-xs text-slate-400">
                {checkedCount}/{items.length} 항목 확인
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-100 mt-0.5">{title}</h3>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>체크 완료율</span>
          <span className="font-semibold text-amber-400">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        상담 중 질문하고 확인된 항목을 클릭하여 체크하세요. 누락 시 계약 분쟁의 원인이 됩니다.
      </p>

      {/* Scrollable Checklist Items */}
      <div className="mt-3.5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isChecked = !!checkedItems[item.id];
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl transition-all border ${
                isChecked
                  ? 'bg-emerald-950/30 border-emerald-600/40 text-slate-300'
                  : item.importance === 'CRITICAL'
                  ? 'bg-slate-800/80 border-rose-500/30 hover:border-rose-500/60'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="p-3 flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleCheck(item.id)}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-500 hover:border-amber-400 bg-slate-700/50'
                  }`}
                >
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span 
                      onClick={() => toggleCheck(item.id)}
                      className={`text-xs font-semibold cursor-pointer select-none ${
                        isChecked ? 'line-through text-slate-400' : 'text-slate-100'
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.importance === 'CRITICAL' && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        중점
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

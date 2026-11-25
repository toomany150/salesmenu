'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Share2, 
  PlusCircle, 
  ChevronRight,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  Edit3,
  Camera,
  ImageIcon,
  Copy,
  Check,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Download,
  Users,
  UserCheck,
  Loader2,
  X,
  Megaphone
} from 'lucide-react';
import { 
  PropertyItem, 
  CustomerItem,
  PROPERTY_TYPE_LABELS, 
  STATUS_LABELS,
  getPropertyDisplayName,
  parseAdvertisingPlatforms
} from '@/lib/types';
import { exportPropertiesToExcel } from '@/lib/excelExport';
import { shareViaKakao, generateSmsLink, copyPropertyShareLink, handleSmartSms } from '@/lib/kakao';
import { PropertyMapView } from '../map/PropertyMapView';
import { PropertyFilterPanel, PropertyFilterCriteria } from './PropertyFilterPanel';
import { SharePropertyModal } from './SharePropertyModal';
import { PropertyTextSummaryModal, SummaryViewMode } from './PropertyTextSummaryModal';
import { PhotoDownloadModal } from './PhotoDownloadModal';
import { PropertyAdProgressModal } from './PropertyAdProgressModal';
import { useAuth } from '../auth/AuthContext';
import { canEditItem, canViewCustomerContact, maskPhoneNumber } from '@/lib/auth';

interface PropertyListProps {
  properties: PropertyItem[];
  customers?: CustomerItem[];
  onSelectProperty: (property: PropertyItem) => void;
  onOpenNewProperty: () => void;
  onEditProperty?: (property: PropertyItem) => void;
  onPropertyUpdated?: (property: PropertyItem) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  customers = [],
  onSelectProperty,
  onOpenNewProperty,
  onEditProperty,
  onPropertyUpdated,
}) => {
  const { currentUser, availableAgents, addCustomAgent } = useAuth();
  const [filtered, setFiltered] = useState<PropertyItem[]>(properties);
  const [filterCriteria, setFilterCriteria] = useState<PropertyFilterCriteria | null>(null);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'GRID' | 'MAP'>('SPLIT');
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | undefined>();
  const [sharingProperty, setSharingProperty] = useState<PropertyItem | null>(null);
  const [textSummaryProperty, setTextSummaryProperty] = useState<PropertyItem | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryViewMode>('BRIEF');
  const [copiedAddressKey, setCopiedAddressKey] = useState<string | null>(null);
  const [downloadPhotoTarget, setDownloadPhotoTarget] = useState<PropertyItem | null>(null);
  const [adProgressProperty, setAdProgressProperty] = useState<PropertyItem | null>(null);

  const handleAdProgressSaved = (updatedProperty: PropertyItem) => {
    setFiltered((prev) =>
      prev.map((p) => (p.id === updatedProperty.id ? updatedProperty : p))
    );
    if (onPropertyUpdated) {
      onPropertyUpdated(updatedProperty);
    }
  };

  // 일괄 담당 권한자 추가/지정 모달 상태
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [batchTarget, setBatchTarget] = useState<'ALL' | 'SELECTED'>('ALL');
  const [batchMode, setBatchMode] = useState<'ADD_ASSIGNED' | 'SET_MAIN'>('ADD_ASSIGNED');
  const [batchSelectedAgent, setBatchSelectedAgent] = useState('하승원팀장');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [customBatchAgentInput, setCustomBatchAgentInput] = useState('');
  const [isAddingBatchCustomAgent, setIsAddingBatchCustomAgent] = useState(false);

  const allBatchAgentOptions = Array.from(
    new Set([
      '하승원팀장',
      '개업공인중개사 (대표)',
      '사무실',
      ...(availableAgents || []),
    ].filter(Boolean))
  );

  const handleToggleSelectProperty = (e: React.MouseEvent | React.ChangeEvent, propId: string) => {
    e.stopPropagation();
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev);
      if (next.has(propId)) next.delete(propId);
      else next.add(propId);
      return next;
    });
  };

  const handleToggleSelectAll = (targetList: PropertyItem[]) => {
    if (selectedPropertyIds.size === targetList.length && targetList.length > 0) {
      setSelectedPropertyIds(new Set());
    } else {
      setSelectedPropertyIds(new Set(targetList.map((p) => p.id)));
    }
  };

  const handleApplyBatchAssign = async () => {
    const targetAgent = batchSelectedAgent.trim();
    if (!targetAgent) {
      alert('반영할 담당 권한자 이름을 선택하거나 입력해주세요.');
      return;
    }

    const isAll = batchTarget === 'ALL';
    const targetIds = isAll ? [] : Array.from(selectedPropertyIds);

    if (!isAll && targetIds.length === 0) {
      alert('선택된 매물이 없습니다. 매물을 체크박스로 선택하거나 [전체 매물]을 선택해주세요.');
      return;
    }

    const targetCount = isAll ? properties.length : targetIds.length;
    const confirmMsg = isAll
      ? `현재 등록된 모든 매물(총 ${targetCount}건)에 [${targetAgent}] 님을 담당 권한자(${
          batchMode === 'ADD_ASSIGNED' ? '추가 권한자' : '주 담당자'
        })로 일괄 반영하시겠습니까?\n\n※ 매물의 기존 데이터(가격, 주소, 옵션, 고객연결 등)는 100% 완벽히 보존됩니다.`
      : `선택하신 매물 ${targetCount}건에 [${targetAgent}] 님을 담당 권한자(${
          batchMode === 'ADD_ASSIGNED' ? '추가 권한자' : '주 담당자'
        })로 일괄 반영하시겠습니까?\n\n※ 기존 데이터는 100% 안전하게 보존됩니다.`;

    if (!confirm(confirmMsg)) return;

    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/properties/batch-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
          'x-user-role': currentUser?.role || 'ADMIN',
        },
        body: JSON.stringify({
          all: isAll,
          propertyIds: targetIds,
          agentName: targetAgent,
          mode: batchMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '일괄 처리에 실패했습니다.');
      }

      const result = await res.json();

      // 로컬 필터링 목록 갱신
      setFiltered((prev) =>
        prev.map((p) => {
          const isTarget = isAll || targetIds.includes(p.id) || targetIds.includes(p.propertyNumber);
          if (!isTarget) return p;

          if (batchMode === 'ADD_ASSIGNED') {
            const currentAssigned = Array.isArray(p.assignedAgents) ? p.assignedAgents : [];
            if (!currentAssigned.includes(targetAgent) && p.managerName !== targetAgent) {
              const updated = { ...p, assignedAgents: [...currentAssigned, targetAgent] };
              if (onPropertyUpdated) onPropertyUpdated(updated);
              return updated;
            }
            return p;
          } else {
            const updated = { ...p, managerName: targetAgent };
            if (onPropertyUpdated) onPropertyUpdated(updated);
            return updated;
          }
        })
      );

      setIsBatchAssignModalOpen(false);
      setSelectedPropertyIds(new Set());
      alert(result.message || '담당 권한자 일괄 반영이 성공적으로 완료되었습니다. (기존 데이터 보존 완료)');
    } catch (err: any) {
      alert(err.message || '일괄 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // 매물 사진 전체 다운로드 모달 오픈 핸들러 (사진 누락 방지: 혹시 단건 축약 상태라면 전체 사진 조회 후 오픈)
  const handleOpenPhotoDownload = async (e: React.MouseEvent, prop: PropertyItem) => {
    e.stopPropagation();
    if (!prop.images || prop.images.length === 0) return;

    if (prop.id && ((prop as any).photoCount || 0) > prop.images.length) {
      try {
        const res = await fetch(`/api/properties?id=${prop.id}&fullPhotos=true`);
        if (res.ok) {
          const data = await res.json();
          const item = Array.isArray(data) ? data[0] : data;
          if (item?.images && Array.isArray(item.images) && item.images.length > 0) {
            setDownloadPhotoTarget({ ...prop, images: item.images });
            return;
          }
        }
      } catch (err) {
        console.warn('Full photos fetch warning:', err);
      }
    }
    setDownloadPhotoTarget(prop);
  };

  // 주소 원클릭 복사 핸들러
  const handleCopyAddress = async (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAddressKey(key);
      setTimeout(() => {
        setCopiedAddressKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch (err) {
      console.error('주소 복사 실패:', err);
    }
  };

  // 매물 목록 카드에서 원클릭으로 판매완료/진행중 상태를 즉시 토글하는 핸들러
  const handleQuickToggleStatus = async (e: React.MouseEvent, property: PropertyItem, targetStatus: any) => {
    e.stopPropagation();
    if (!onPropertyUpdated) return;
    const isSelling = targetStatus === 'CONTRACTED';
    const actionLabel = isSelling ? '판매완료' : (STATUS_LABELS[targetStatus as keyof typeof STATUS_LABELS]?.label || targetStatus);
    const title = property.apartmentDetail?.complexName || property.storeDetail?.storeName || property.propertyNumber || property.address;
    const confirmMsg = isSelling
      ? `[${title}] 매물을 '판매완료' 처리하시겠습니까?\n(매물장 카드에 '판매완료'가 표시됩니다)`
      : `[${title}] 매물 상태를 '${actionLabel}'(으)로 변경하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const updated: PropertyItem = {
      ...property,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }

    onPropertyUpdated(updated);
  };

  // 최근 등록된 매물접수일(receiptDate) 기준 최신순 내림차순 정렬 (접수일이 같으면 createdAt 순)
  const sortedFiltered = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.receiptDate || a.createdAt || 0).getTime();
      const tB = new Date(b.receiptDate || b.createdAt || 0).getTime();
      if (tB !== tA) return tB - tA;
      const cA = new Date(a.createdAt || 0).getTime();
      const cB = new Date(b.createdAt || 0).getTime();
      return cB - cA;
    });
  }, [filtered]);

  // 필터 조건이 활성화되어 있는지 확인하는 헬퍼 함수
  const isFilterActive = (c: PropertyFilterCriteria | null): boolean => {
    if (!c) return false;
    return !!(
      (c.searchQuery && c.searchQuery.trim().length > 0) ||
      (c.status && c.status !== 'ALL') ||
      (c.propertyType && c.propertyType !== 'ALL') ||
      (c.transactionType && c.transactionType !== 'ALL') ||
      (c.targetCity && c.targetCity.trim().length > 0) ||
      (c.targetGu && c.targetGu.trim().length > 0) ||
      (c.targetDong && c.targetDong.trim().length > 0) ||
      (c.floorFilter && c.floorFilter !== 'ALL') ||
      (c.customFloorInput && c.customFloorInput.trim().length > 0) ||
      c.minPrice || c.maxPrice ||
      c.minDeposit || c.maxDeposit ||
      c.minMonthlyRent || c.maxMonthlyRent ||
      c.minM2 || c.maxM2 ||
      (c.direction && c.direction !== 'ALL') ||
      c.hasParking || c.hasElevator || c.isFullOption ||
      c.matchedCustomerId
    );
  };

  // Sync when properties changes externally: 필터 조건이 활성화되어 있을 때는 전체 목록으로 강제 덮어쓰지 않고 필터 상태 보존
  useEffect(() => {
    if (!isFilterActive(filterCriteria)) {
      setFiltered(properties);
    }
  }, [properties, filterCriteria]);

  const formatShortDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const getPriceDisplay = (p: PropertyItem) => {
    if (p.transactionType === '매매') {
      return p.price ? `매매 ${p.price.toLocaleString()} 만원` : '매매 협의';
    } else if (p.transactionType === '전세') {
      return p.deposit ? `전세 ${p.deposit.toLocaleString()} 만원` : '전세 협의';
    } else {
      const isVat = p.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat;
      const vatText = isVat ? ' (부가세 별도)' : '';
      let display = `보증금 ${p.deposit ? p.deposit.toLocaleString() + '만' : '0'} / 월세 ${p.monthlyRent ? p.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
      if (p.propertyType === 'STORE') {
        const isNoPrem = !!(p.storeDetail?.isNoPremium || p.isNoPremium || (p.storeDetail && p.storeDetail.premium === 0));
        const premVal = isNoPrem
          ? 0
          : (p.storeDetail?.premium ?? p.premium ?? (p.propertyNumber === '구만족발보쌈' ? 10000 : (p.propertyNumber === '왕돈까스' ? 3000 : (p.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
        if (isNoPrem) {
          display += ' · 무권리';
        } else if (premVal !== undefined && premVal !== null) {
          const premStr = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만`;
          display += ` · 권리 ${premStr}`;
        }
      }
      return display;
    }
  };

  const getMaintenanceFeeDisplay = (p: PropertyItem) => {
    const fee = p.storeDetail?.maintenanceFee ?? p.officeDetail?.maintenanceFee ?? p.apartmentDetail?.maintenanceFee ?? p.maintenanceFee;
    if (fee !== undefined && fee !== null && Number(fee) > 0) {
      return `관리비 ${Number(fee).toLocaleString()}만`;
    }
    const feeDetail = p.storeDetail?.managementFeeDetails || p.maintenanceFeeDetails;
    if (feeDetail && feeDetail.trim() && !feeDetail.includes('관리비 없음') && !feeDetail.includes('자체 관리')) {
      return `관리비: ${feeDetail}`;
    }
    return '';
  };

  const getPropertyAreaDisplay = (p: PropertyItem) => {
    let commonAreaM2: number | undefined;
    let commonAreaPy: number | undefined;
    let exclusiveAreaM2: number | undefined;
    let exclusiveAreaPy: number | undefined;

    if (p.propertyType === 'STORE') {
      exclusiveAreaM2 = p.storeDetail?.actualArea ?? p.actualArea;
      exclusiveAreaPy = p.storeDetail?.actualAreaPyeong ?? p.actualAreaPyeong;
      commonAreaM2 = p.storeDetail?.buildingArea ?? p.buildingArea;
      commonAreaPy = p.storeDetail?.buildingAreaPyeong;
    } else if (p.propertyType === 'APARTMENT') {
      exclusiveAreaM2 = p.apartmentDetail?.exclusiveArea ?? p.actualArea;
      exclusiveAreaPy = p.apartmentDetail?.exclusiveAreaPyeong ?? p.actualAreaPyeong;
      commonAreaM2 = p.apartmentDetail?.supplyArea ?? p.buildingArea;
      commonAreaPy = p.apartmentDetail?.supplyAreaPyeong;
    } else if (p.propertyType === 'OFFICE') {
      exclusiveAreaM2 = p.officeDetail?.actualArea ?? p.actualArea;
      exclusiveAreaPy = p.officeDetail?.actualAreaPyeong ?? p.actualAreaPyeong;
      commonAreaM2 = p.officeDetail?.buildingArea ?? p.buildingArea;
      commonAreaPy = p.officeDetail?.buildingAreaPyeong;
    } else if (p.propertyType === 'HOUSE') {
      exclusiveAreaM2 = p.houseDetail?.actualArea ?? p.houseDetail?.exclusiveArea ?? p.actualArea;
      exclusiveAreaPy = p.houseDetail?.actualAreaPyeong ?? p.houseDetail?.exclusiveAreaPyeong ?? p.actualAreaPyeong;
      commonAreaM2 = p.houseDetail?.buildingArea ?? p.buildingArea;
      commonAreaPy = p.houseDetail?.buildingAreaPyeong;
    } else if (p.propertyType === 'LAND') {
      const landM2 = p.landArea ?? p.landDetail?.landArea;
      if (landM2) {
        const landPy = (landM2 * 0.3025).toFixed(1);
        return {
          hasData: true,
          displayText: `토지 ${landM2.toLocaleString()}㎡ (${landPy}평)`,
        };
      }
      return { hasData: false, displayText: '' };
    } else {
      exclusiveAreaM2 = p.actualArea;
      exclusiveAreaPy = p.actualAreaPyeong;
      commonAreaM2 = p.buildingArea;
    }

    // 평수 자동 계산 (㎡만 있는 경우)
    if (exclusiveAreaM2 && !exclusiveAreaPy) {
      exclusiveAreaPy = +(exclusiveAreaM2 * 0.3025).toFixed(1);
    }
    if (commonAreaM2 && !commonAreaPy) {
      commonAreaPy = +(commonAreaM2 * 0.3025).toFixed(1);
    }

    const parts: string[] = [];
    if (commonAreaM2) {
      parts.push(`공용 ${commonAreaM2}㎡(${commonAreaPy}평)`);
    }
    if (exclusiveAreaM2) {
      parts.push(`전용 ${exclusiveAreaM2}㎡(${exclusiveAreaPy}평)`);
    }

    if (parts.length === 0) {
      return { hasData: false, displayText: '' };
    }

    return {
      hasData: true,
      displayText: parts.join(' / '),
    };
  };

  // 고객 및 등기부상 소유자 연락처 파싱 헬퍼
  const getContactInfo = (property: PropertyItem) => {
    const cust = property.customer || (property.customerId ? customers.find((c) => c.id === property.customerId) : undefined);
    const canView = canViewCustomerContact(currentUser, property) || (cust ? canViewCustomerContact(currentUser, cust as any) : false);

    const customerName = cust?.name;
    const customerCarrier = cust?.carrier;
    const customerPhone = cust?.phone;

    // 소유주 정보 (주인이 일치하지 않는 경우: ownerSameAsCustomer false 이거나 이름/연락처가 다른 경우)
    const ownerCust = property.ownerCustomer || (property.ownerCustomerId ? customers.find((c) => c.id === property.ownerCustomerId) : undefined);
    const ownerName = property.ownerName || ownerCust?.name;
    const ownerCarrier = property.ownerCarrier || ownerCust?.carrier;
    const ownerPhone = property.ownerPhone || ownerCust?.phone;

    const isDifferentOwner =
      property.ownerSameAsCustomer === false ||
      (!!ownerName && ownerName !== customerName) ||
      (!!ownerPhone && ownerPhone !== customerPhone);

    return {
      canView,
      customerName,
      customerCarrier,
      customerPhone,
      isDifferentOwner,
      ownerName,
      ownerCarrier,
      ownerPhone,
    };
  };

  // 고객 및 소유주 연락처 (원클릭 전화걸기 지원) 컴포넌트 렌더러
  const renderContactBlock = (property: PropertyItem, align: 'right' | 'left' = 'right') => {
    const contact = getContactInfo(property);
    const hasCustomer = !!(contact.customerName || contact.customerPhone);
    const hasOwner = contact.isDifferentOwner && !!(contact.ownerName || contact.ownerPhone);

    return (
      <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'} gap-0.5 mt-0.5 shrink-0`}>
        {/* 1) 의뢰 고객 연락처 */}
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <span className="text-[10px] font-bold text-slate-500">고객:</span>
          {hasCustomer ? (
            <>
              <span className="font-bold text-slate-800">
                {contact.canView ? (contact.customerName || '고객') : '*** (비공개)'}
              </span>
              {contact.canView && contact.customerCarrier && (
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200">
                  {contact.customerCarrier}
                </span>
              )}
              {contact.customerPhone && (
                contact.canView ? (
                  <a
                    href={`tel:${contact.customerPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    title="클릭 시 전화 걸기"
                    className="font-mono font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 transition-all flex items-center gap-1 group/phone cursor-pointer"
                  >
                    <Phone className="w-2.5 h-2.5 text-emerald-600 group-hover/phone:scale-110" />
                    <span>{contact.customerPhone}</span>
                  </a>
                ) : (
                  <span className="font-mono text-slate-400">
                    {maskPhoneNumber(contact.customerPhone)}
                  </span>
                )
              )}
            </>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">연결 고객 없음</span>
          )}
        </div>

        {/* 2) 등기부상 주인이 일치하지 않는 경우: 등기부상 고객이름 통신사 연락처 */}
        {hasOwner && (
          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
            <span className="text-[10px] font-bold text-indigo-600">등기부:</span>
            <span className="font-bold text-slate-800">
              {contact.canView ? (contact.ownerName || '소유자') : '*** (비공개)'}
            </span>
            {contact.canView && contact.ownerCarrier && (
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 font-semibold rounded border border-indigo-200">
                {contact.ownerCarrier}
              </span>
            )}
            {contact.ownerPhone && (
              contact.canView ? (
                <a
                  href={`tel:${contact.ownerPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  title="등기부상 소유자에게 전화 걸기"
                  className="font-mono font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200 transition-all flex items-center gap-1 group/phone cursor-pointer"
                >
                  <Phone className="w-2.5 h-2.5 text-indigo-600 group-hover/phone:scale-110" />
                  <span>{contact.ownerPhone}</span>
                </a>
              ) : (
                <span className="font-mono text-slate-400">
                  {maskPhoneNumber(contact.ownerPhone)}
                </span>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  // 1) 광고진행 버튼 (기존 '요약' 버튼 자리에 단독 배치)
  const renderAdProgressButton = (property: PropertyItem) => {
    const adInfo = parseAdvertisingPlatforms(property.advertisingPlatforms);
    const hasAds = adInfo.channels && adInfo.channels.length > 0;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAdProgressProperty(property);
        }}
        className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md shadow-2xs flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 border ${
          hasAds
            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 ring-1 ring-amber-300/60'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
        }`}
        title="광고진행 상황 (홈페이지, 블로그, 네이버, 당근, 직방, 한방, 기타) 확인 및 설정"
      >
        <Megaphone className={`w-3 h-3 ${hasAds ? 'text-amber-700 fill-amber-500' : 'text-amber-600'}`} />
        <span>광고진행{hasAds ? `(${adInfo.channels.length})` : ''}</span>
      </button>
    );
  };

  // 2) 광고진행 결과물 뱃지 (화면에 겹치지 않게 광고진행 버튼 옆과 밑 빈자리에 안전하게 배치)
  const renderAdChannelsBadge = (property: PropertyItem) => {
    const adInfo = parseAdvertisingPlatforms(property.advertisingPlatforms);
    if (!adInfo.channels || adInfo.channels.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap my-1 px-2 py-0.5 rounded-lg bg-amber-50/80 border border-amber-200/90 w-fit max-w-full shadow-2xs">
        <span className="text-[10px] font-black text-amber-900 flex items-center gap-1 shrink-0">
          <Megaphone className="w-3 h-3 text-amber-700 fill-amber-500" />
          <span>광고중:</span>
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {adInfo.channels.map((ch) => (
            <span
              key={ch}
              className="px-1.5 py-0.2 text-[10px] font-extrabold rounded bg-white text-amber-900 border border-amber-300 shadow-2xs"
            >
              {ch === '기타' && adInfo.etcText ? `기타(${adInfo.etcText})` : ch}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* 1. 종합 필터 조건란 (물건 찾기 & 고객 조건 매칭 & 매물구분/매매전세월세/가격/평수 등) */}
      <PropertyFilterPanel
        properties={properties}
        customers={customers}
        onFilterChange={(newFiltered, criteria) => {
          setFilterCriteria(criteria);
          setFiltered(newFiltered);
        }}
        onOpenNewProperty={onOpenNewProperty}
      />

      {/* 2. 보기 모드 전환 및 결과 요약 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            검색 결과: <span className="text-blue-600 font-extrabold">{sortedFiltered.length}</span>건
          </span>
          <span className="text-xs text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            (전체 {properties.length}개 매물)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: [🔲 분할 뷰] [🗺️ 지도 뷰] [📋 카드 뷰] */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('SPLIT')}
              title="목록 + 지도 분할 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'SPLIT'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">분할 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MAP')}
              title="지도 전체 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'MAP'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>지도 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title="카드 그리드 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>카드 뷰</span>
            </button>
          </div>

          {/* 전체 선택 토글 버튼 */}
          {sortedFiltered.length > 0 && (
            <button
              type="button"
              onClick={() => handleToggleSelectAll(sortedFiltered)}
              title={selectedPropertyIds.size === sortedFiltered.length ? '선택 전체 해제' : '현재 목록 전체 선택'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shrink-0 ${
                selectedPropertyIds.size === sortedFiltered.length && sortedFiltered.length > 0
                  ? 'bg-purple-100 text-purple-900 border-purple-400'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPropertyIds.size === sortedFiltered.length && sortedFiltered.length > 0}
                onChange={() => handleToggleSelectAll(sortedFiltered)}
                className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer pointer-events-none"
              />
              <span>
                {selectedPropertyIds.size > 0
                  ? `${selectedPropertyIds.size}개 선택됨`
                  : '전체 선택'}
              </span>
            </button>
          )}

          {/* 모든 매물에 담당권한자 일괄 추가/지정 버튼 */}
          <button
            type="button"
            onClick={() => {
              setBatchTarget(selectedPropertyIds.size > 0 ? 'SELECTED' : 'ALL');
              setIsBatchAssignModalOpen(true);
            }}
            title="전체 또는 선택 매물에 담당 권한자(관리 주체 및 추가 권한자)를 일괄 추가/지정합니다 (기존 데이터 100% 보존)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 담당 권한자 일괄 추가</span>
            {selectedPropertyIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-black">
                {selectedPropertyIds.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => exportPropertiesToExcel(sortedFiltered)}
            title="현재 검색된 매물 목록을 엑셀(.xlsx) 파일로 다운로드합니다"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>엑셀 다운로드</span>
          </button>

          <button
            onClick={onOpenNewProperty}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>새 매물 등록</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Depends on viewMode */}

      {/* 1) MAP ONLY VIEW */}
      {viewMode === 'MAP' && (
        <PropertyMapView
          properties={sortedFiltered}
          selectedPropertyId={highlightedPropertyId}
          onSelectProperty={onSelectProperty}
          height="h-[680px]"
        />
      )}

      {/* 2) SPLIT VIEW (List on Left with Photos, Map on Right) */}
      {viewMode === 'SPLIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Property Cards with Photo Thumbnails */}
          <div className="lg:col-span-6 space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {sortedFiltered.length > 0 ? (
              sortedFiltered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const isSelected = highlightedPropertyId === property.id;
                const hasImages = property.images && property.images.length > 0;
                const photoCount = (property as any).photoCount ?? property.images?.length ?? 0;
                const isContracted = property.status === 'CONTRACTED';

                return (
                  <div
                    key={property.id}
                    onClick={() => {
                      setHighlightedPropertyId(property.id);
                      onSelectProperty(property);
                    }}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer relative overflow-hidden ${
                      isContracted
                        ? 'bg-rose-50/20 border-rose-200 hover:border-rose-400 hover:shadow-xs'
                        : isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Photo Thumbnail */}
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.has(property.id)}
                          onChange={(e) => handleToggleSelectProperty(e, property.id)}
                          onClick={(e) => e.stopPropagation()}
                          title="일괄 권한자 지정을 위한 매물 선택"
                          className="absolute top-1 left-1 z-20 w-4 h-4 rounded text-purple-600 cursor-pointer bg-white/95 border-slate-400 shadow-sm accent-purple-600"
                        />
                        {hasImages ? (
                          <>
                            <img
                              src={property.images![0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {/* 사진 장수 표시 & 원클릭 일괄 다운로드 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenPhotoDownload(e, property)}
                              className="absolute bottom-1 right-1 bg-black/75 hover:bg-blue-600 active:scale-95 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm transition-all cursor-pointer z-10"
                              title={`등록된 사진 전체(${photoCount}장) 컴퓨터 폴더/ZIP 다운로드`}
                            >
                              <Camera className="w-2.5 h-2.5 text-blue-300" />
                              <span>{photoCount}</span>
                              <Download className="w-2.5 h-2.5 ml-0.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                            <span className="text-[10px] mt-0.5 font-medium">사진없음</span>
                          </div>
                        )}

                        {/* 판매완료 썸네일 오버레이 */}
                        {isContracted && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-10 p-1 pointer-events-none">
                            <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-md border border-rose-300 tracking-wider">
                              판매완료
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          {/* 1행: 접수일자 + 매물구분 + 거래유형 (좌측) / 공용면적 + 전용면적 (우측 원래 가격 자리) */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* 1행: 접수일자 + 광고진행(요약 대체) + 전부요약 + 사진 ... */}
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
                              {/* 요약 버튼 자리에 광고진행 버튼 단독 배치 */}
                              {renderAdProgressButton(property)}
                              {/* 그 옆 전부요약 버튼 */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryMode('FULL');
                                  setTextSummaryProperty(property);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs flex items-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                title="매물 등록 전체 내용 및 상담메모 전부 요약 보기"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                                <span>전부요약</span>
                              </button>
                              {/* 사진 전체 다운로드 버튼 (경로 지정 & ZIP) */}
                              {hasImages && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenPhotoDownload(e, property)}
                                  className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 shadow-2xs flex items-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                  title={`등록된 사진 전체(${photoCount}장) 컴퓨터 폴더 지정 / ZIP 다운로드`}
                                >
                                  <Download className="w-3 h-3 text-sky-600" />
                                  <span>사진({photoCount})</span>
                                </button>
                              )}
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-600 text-white shrink-0">
                                {PROPERTY_TYPE_LABELS[property.propertyType]}
                              </span>
                              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-800 shrink-0">
                                {property.transactionType}
                              </span>
                              {property.propertyNumber && (
                                <span className="px-1.5 py-0.5 text-[11px] font-bold font-mono rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                  #{property.propertyNumber}
                                </span>
                              )}
                              {isContracted && (
                                <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-rose-600 text-white shadow-xs shrink-0 flex items-center gap-0.5 border border-rose-300 animate-pulse">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>판매완료</span>
                                </span>
                              )}
                            </div>
                            {/* 우측 원래 가격 자리에 공용면적, 전용면적 표시 (데이터 없으면 공란) */}
                            {(() => {
                              const areaInfo = getPropertyAreaDisplay(property);
                              if (!areaInfo.hasData) return null;
                              return (
                                <span className="text-xs sm:text-[13px] font-extrabold text-slate-700 shrink-0 truncate bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                  📐 {areaInfo.displayText}
                                </span>
                              );
                            })()}
                          </div>

                          {/* 광고진행 결과물: 화면에 겹치지 않게 광고진행 버튼 밑 빈자리에 안전하게 배치 */}
                          {renderAdChannelsBadge(property)}

                          {/* 2행: 소재지/매물명 (좌측) + 매매가/보증금/월세 (한칸 밑으로 내림) & 관리비 (우측) */}
                          <div className="flex items-start justify-between gap-2 flex-wrap mt-0.5 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <h4 className={`font-black text-xs sm:text-sm line-clamp-1 ${
                                isContracted ? 'text-slate-800' : 'text-slate-900'
                              }`}>
                                {getPropertyDisplayName(property)}
                              </h4>
                              {isContracted && (
                                <span className="px-1.5 py-0.2 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                  [판매완료]
                                </span>
                              )}
                            </div>

                            {/* 우측: 매매가/보증금/월세 & 관리비 + 2번째 첨부한 파일(면적) 밑 고객/소유자 연락처 */}
                            <div className="flex flex-col items-end shrink-0 ml-auto">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-blue-900">
                                  {getPriceDisplay(property)}
                                </span>
                                {(() => {
                                  const feeText = getMaintenanceFeeDisplay(property);
                                  if (!feeText) return null;
                                  return (
                                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {feeText}
                                    </span>
                                  );
                                })()}
                              </div>
                              {/* 2번째 첨부한 파일 밑 고객 및 등기부상 소유자 연락처 (클릭 시 원클릭 통화) */}
                              {renderContactBlock(property, 'right')}
                            </div>
                          </div>

                          <div className="mt-1 space-y-0.5">
                            {/* 도로명 주소 (클릭 및 복사 버튼) */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span
                                className="font-medium text-slate-700 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                title="클릭 시 도로명 주소 복사"
                                onClick={(e) => {
                                  const road = (property.roadAddress || property.address || '') + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                  handleCopyAddress(e, road.trim(), `${property.id}-road`);
                                }}
                              >
                                {property.roadAddress ? `[도로명] ${property.roadAddress}` : property.address}
                                {property.detailAddress ? ` ${property.detailAddress}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  const road = (property.roadAddress || property.address || '') + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                  handleCopyAddress(e, road.trim(), `${property.id}-road`);
                                }}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 shrink-0 ${
                                  copiedAddressKey === `${property.id}-road`
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 scale-105'
                                    : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200'
                                }`}
                                title="도로명 주소 복사"
                              >
                                {copiedAddressKey === `${property.id}-road` ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                    <span>복사됨!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-slate-500" />
                                    <span>복사</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* 지번 주소 (클릭 및 복사 버튼) */}
                            {property.jibunAddress && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-amber-800 pl-4">
                                <span
                                  className="font-medium truncate cursor-pointer hover:text-amber-900 transition-colors"
                                  title="클릭 시 지번 주소 복사"
                                  onClick={(e) => {
                                    const jibun = property.jibunAddress + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                    handleCopyAddress(e, jibun.trim(), `${property.id}-jibun`);
                                  }}
                                >
                                  지번: {property.jibunAddress}
                                  {property.detailAddress ? ` ${property.detailAddress}` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const jibun = property.jibunAddress + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                    handleCopyAddress(e, jibun.trim(), `${property.id}-jibun`);
                                  }}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 shrink-0 ${
                                    copiedAddressKey === `${property.id}-jibun`
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 scale-105'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  }`}
                                  title="지번 주소 복사"
                                >
                                  {copiedAddressKey === `${property.id}-jibun` ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                      <span>복사됨!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5 text-amber-700" />
                                      <span>복사</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          {property.propertyType === 'STORE' && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {(() => {
                                const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
                                const premVal = isNoPrem
                                  ? 0
                                  : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
                                const negoPremVal = isNoPrem
                                  ? 0
                                  : (property.storeDetail?.negotiablePremium ?? property.negotiablePremium ?? (property.propertyNumber === '구만족발보쌈' ? 7000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : premVal)));
                                const premStr = premVal ? (premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`) : null;
                                const negoStr = negoPremVal && negoPremVal !== premVal ? (negoPremVal >= 10000 ? `${(negoPremVal / 10000).toFixed(negoPremVal % 10000 === 0 ? 0 : 1)}억` : `${negoPremVal.toLocaleString()}만원`) : null;

                                if (isNoPrem) {
                                  return (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      ✨ 무권리
                                    </span>
                                  );
                                }
                                if (premStr) {
                                  return (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      💰 권리 {premStr}{negoStr ? ` (조정 ${negoStr})` : ''}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                          {(property.propertyType === 'LAND' || property.landDetail) && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                              {(property.landArea || property.landDetail?.landArea) && (
                                <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                                  📐 토지 {property.landArea || property.landDetail?.landArea}㎡ (약 {((property.landArea || property.landDetail?.landArea || 0) * 0.3025).toFixed(1)}평)
                                </span>
                              )}
                              {(property.landDetail?.zoningArea || property.zoningArea) && (
                                <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700">
                                  🏛️ {property.landDetail?.zoningArea || property.zoningArea}
                                </span>
                              )}
                              {property.landDetail?.landCategory && (
                                <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700">
                                  지목: {property.landDetail.landCategory}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono text-[11px]">
                              #{property.propertyNumber}
                            </span>
                            {property.managerName && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                property.managerName.includes('개업공인중개사')
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : property.managerName === '사무실'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {property.managerName.includes('개업공인중개사')
                                  ? '👑 개업공인중개사'
                                  : property.managerName === '사무실'
                                  ? '🏢 사무실'
                                  : `👤 ${property.managerName}`}
                              </span>
                            )}
                            {Array.isArray(property.assignedAgents) && property.assignedAgents.length > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                👥 {property.assignedAgents.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 카드에서 바로 판매완료/진행중 원클릭 상태 전환 버튼 */}
                            {canEditItem(currentUser, property) && onPropertyUpdated && (
                              !isContracted ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickToggleStatus(e, property, 'CONTRACTED')}
                                  title="클릭 시 즉시 '판매완료'로 표시됩니다"
                                  className="text-[11px] font-black text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-300 rounded px-2 py-0.5 transition-all shadow-2xs flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>판매완료</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickToggleStatus(e, property, 'AVAILABLE')}
                                  title="판매완료를 해제하고 '진행중'으로 복원합니다"
                                  className="text-[10px] font-bold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 rounded px-1.5 py-0.5 transition-all shadow-2xs flex items-center gap-0.5 active:scale-95 cursor-pointer"
                                >
                                  <span>진행중 복원</span>
                                </button>
                              )
                            )}

                            {onEditProperty && canEditItem(currentUser, property) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProperty(property);
                                }}
                                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>수정</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedPropertyId(property.id);
                                onSelectProperty(property);
                              }}
                              className="text-blue-600 font-bold hover:underline text-[11px] flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>상세보기 →</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                조회된 매물이 없습니다. 필터 조건을 변경해 보세요.
              </div>
            )}
          </div>

          {/* Right Column: Sticky Interactive Map */}
          <div className="lg:col-span-6 lg:sticky lg:top-20">
            <PropertyMapView
              properties={filtered}
              selectedPropertyId={highlightedPropertyId}
              onSelectProperty={onSelectProperty}
              height="h-[680px]"
            />
          </div>
        </div>
      )}

      {/* 3) GRID ONLY VIEW */}
      {viewMode === 'GRID' && (
        <>
          {sortedFiltered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedFiltered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const hasImages = property.images && property.images.length > 0;
                const photoCount = (property as any).photoCount ?? property.images?.length ?? 0;
                const isContracted = property.status === 'CONTRACTED';

                const smsLink = generateSmsLink({
                  propertyNumber: property.propertyNumber,
                  propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
                  transactionType: property.transactionType,
                  price: property.price,
                  deposit: property.deposit,
                  monthlyRent: property.monthlyRent,
                  address: property.address,
                  detailAddress: property.detailAddress,
                  consultationNotes: property.consultationNotes,
                });

                const onShareKakao = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  shareViaKakao({
                    id: property.id,
                    title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
                    description: `${property.address} ${property.detailAddress || ''}`,
                    priceText: `${property.transactionType} ${getPriceDisplay(property)}`,
                    address: property.address,
                    propertyNumber: property.propertyNumber,
                    propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
                    property: property,
                  });
                };

                return (
                  <div
                    key={property.id}
                    onClick={() => onSelectProperty(property)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Top Photo Banner */}
                      <div className="relative aspect-16/9 bg-slate-100 overflow-hidden flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.has(property.id)}
                          onChange={(e) => handleToggleSelectProperty(e, property.id)}
                          onClick={(e) => e.stopPropagation()}
                          title="일괄 권한자 지정을 위한 매물 선택"
                          className="absolute top-2 left-2 z-20 w-4 h-4 rounded text-purple-600 cursor-pointer bg-white/95 border-slate-400 shadow-sm accent-purple-600"
                        />
                        {hasImages ? (
                          <>
                            <img
                              src={property.images![0]}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-white/95 text-slate-700 shadow-xs">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
                              {/* 요약 버튼 자리에 광고진행 버튼 단독 배치 */}
                              {renderAdProgressButton(property)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryMode('FULL');
                                  setTextSummaryProperty(property);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-white/95 hover:bg-white text-purple-700 shadow-xs border border-purple-200 flex items-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                title="매물 등록 전체 내용 및 상담메모 전부 요약 보기"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                                <span>전부요약</span>
                              </button>
                              {/* 사진 전체 다운로드 버튼 (경로 지정 & ZIP) */}
                              {hasImages && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenPhotoDownload(e, property)}
                                  className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-white/95 hover:bg-white text-sky-700 shadow-xs border border-sky-200 flex items-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                  title={`등록된 사진 전체(${photoCount}장) 컴퓨터 폴더 지정 / ZIP 다운로드`}
                                >
                                  <Download className="w-3 h-3 text-sky-600" />
                                  <span>사진({photoCount})</span>
                                </button>
                              )}
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-600 text-white shadow-xs">
                                {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                                {property.transactionType}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleOpenPhotoDownload(e, property)}
                              className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-blue-600 active:scale-95 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md transition-all cursor-pointer z-10"
                              title={`등록된 사진 전체(${photoCount}장) 컴퓨터 폴더 지정 / ZIP 다운로드`}
                            >
                              <Camera className="w-3.5 h-3.5 text-blue-300" />
                              <span>{photoCount}장 다운로드</span>
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-xs mt-1 font-medium">사진 미등록</span>
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-white text-slate-700 shadow-xs border border-slate-200">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
                              {/* 요약 버튼 자리에 광고진행 버튼 단독 배치 */}
                              {renderAdProgressButton(property)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryMode('FULL');
                                  setTextSummaryProperty(property);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-white hover:bg-slate-50 text-purple-700 shadow-xs border border-purple-200 flex items-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                title="매물 등록 전체 내용 및 상담메모 전부 요약 보기"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                                <span>전부요약</span>
                              </button>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-600 text-white">
                                {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-800">
                                {property.transactionType}
                              </span>
                            </div>
                          </div>
                        )}
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[11px] font-semibold rounded-full border bg-white/90 backdrop-blur-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>

                        {/* 판매완료 카드 뷰 오버레이 스탬프 */}
                        {isContracted && (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-2xs flex items-center justify-center z-10 pointer-events-none">
                            <div className="border-2 border-dashed border-rose-400 bg-rose-600/95 text-white font-black px-4 py-1.5 rounded-xl text-sm sm:text-base tracking-widest shadow-xl flex items-center gap-1.5 animate-pulse">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>[ 판 매 완 료 ]</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono">#{property.propertyNumber}</span>
                          {(() => {
                            const areaInfo = getPropertyAreaDisplay(property);
                            if (areaInfo.hasData) {
                              return (
                                <span className="font-extrabold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  📐 {areaInfo.displayText}
                                </span>
                              );
                            }
                            return (
                              <span>
                                {property.propertyType === 'LAND'
                                  ? (property.landDetail?.roadDirection || property.direction || '도로접')
                                  : `${property.direction || '남향'} (${property.directionCriteria || '기준없음'})`}
                              </span>
                            );
                          })()}
                        </div>

                        {/* 광고진행 결과물: 화면에 겹치지 않게 제목 위 빈자리에 안전하게 배치 */}
                        {renderAdChannelsBadge(property)}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                            {getPropertyDisplayName(property)}
                          </h4>
                          {isContracted && (
                            <span className="px-1.5 py-0.2 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                              [판매완료]
                            </span>
                          )}
                        </div>

                        <div className="mt-1 space-y-0.5">
                          {/* 도로명 주소 (클릭 및 복사 버튼) */}
                          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span
                              className="truncate cursor-pointer hover:text-blue-600 transition-colors font-medium"
                              title="클릭 시 도로명 주소 복사"
                              onClick={(e) => {
                                const road = (property.roadAddress || property.address || '') + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                handleCopyAddress(e, road.trim(), `${property.id}-road`);
                              }}
                            >
                              {property.roadAddress ? `[도로명] ${property.roadAddress}` : property.address}
                              {property.detailAddress ? ` ${property.detailAddress}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                const road = (property.roadAddress || property.address || '') + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                handleCopyAddress(e, road.trim(), `${property.id}-road`);
                              }}
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 shrink-0 ${
                                copiedAddressKey === `${property.id}-road`
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 scale-105'
                                  : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200'
                              }`}
                              title="도로명 주소 복사"
                            >
                              {copiedAddressKey === `${property.id}-road` ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                  <span>복사됨!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 text-slate-500" />
                                  <span>복사</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* 지번 주소 (클릭 및 복사 버튼) */}
                          {property.jibunAddress && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-amber-800 pl-4">
                              <span
                                className="truncate cursor-pointer hover:text-amber-900 transition-colors font-medium"
                                title="클릭 시 지번 주소 복사"
                                onClick={(e) => {
                                  const jibun = property.jibunAddress + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                  handleCopyAddress(e, jibun.trim(), `${property.id}-jibun`);
                                }}
                              >
                                지번: {property.jibunAddress}
                                {property.detailAddress ? ` ${property.detailAddress}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  const jibun = property.jibunAddress + (property.detailAddress ? ` ${property.detailAddress}` : '');
                                  handleCopyAddress(e, jibun.trim(), `${property.id}-jibun`);
                                }}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 shrink-0 ${
                                  copiedAddressKey === `${property.id}-jibun`
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 scale-105'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                                title="지번 주소 복사"
                              >
                                {copiedAddressKey === `${property.id}-jibun` ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                    <span>복사됨!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-amber-700" />
                                    <span>복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Price & Maintenance Fee */}
                        <div className="mt-3 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">거래금액</span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="text-base font-black text-blue-900">
                              {getPriceDisplay(property)}
                            </span>
                            {(() => {
                              const feeText = getMaintenanceFeeDisplay(property);
                              if (!feeText) return null;
                              return (
                                <span className="text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {feeText}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* 고객 및 등기부상 소유자 연락처 (클릭 시 원클릭 통화) */}
                        {renderContactBlock(property, 'left')}

                        {property.propertyType === 'STORE' && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
                              const premVal = isNoPrem
                                ? 0
                                : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
                              const negoPremVal = isNoPrem
                                ? 0
                                : (property.storeDetail?.negotiablePremium ?? property.negotiablePremium ?? (property.propertyNumber === '구만족발보쌈' ? 7000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : premVal)));
                              const premStr = premVal ? (premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`) : null;
                              const negoStr = negoPremVal && negoPremVal !== premVal ? (negoPremVal >= 10000 ? `${(negoPremVal / 10000).toFixed(negoPremVal % 10000 === 0 ? 0 : 1)}억` : `${negoPremVal.toLocaleString()}만원`) : null;

                              if (isNoPrem) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✨ 무권리 (권리금 없음)
                                  </span>
                                );
                              }
                              if (premStr) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    💰 권리금: {premStr}{negoStr ? ` (조정: ${negoStr})` : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* 토지 매물 전용 입지 뱃지 & 개별공시지가 정보 */}
                        {(property.propertyType === 'LAND' || property.landDetail) && (
                          <div className="mt-2 space-y-1.5">
                            {/* 토지 면적 및 용도지역/지목 핵심 정보 */}
                            <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                              {(property.landArea || property.landDetail?.landArea) ? (
                                <span className="text-emerald-950">
                                  📐 토지면적: <strong>{property.landArea || property.landDetail?.landArea}㎡</strong>
                                  <span className="text-emerald-700 ml-1 font-semibold">
                                    (약 {((property.landArea || property.landDetail?.landArea || 0) * 0.3025).toFixed(1)}평)
                                  </span>
                                </span>
                              ) : null}
                              {(property.landDetail?.zoningArea || property.zoningArea) && (
                                <span className="text-slate-700 font-semibold">
                                  | 🏛️ {property.landDetail?.zoningArea || property.zoningArea}
                                </span>
                              )}
                              {property.landDetail?.landCategory && (
                                <span className="text-slate-700 font-semibold">
                                  | 지목: {property.landDetail.landCategory}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              {property.landDetail?.roadDirection && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                  🛣️ {property.landDetail.roadDirection}
                                </span>
                              )}
                              {property.landDetail?.viewDirection && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                  🌊 {property.landDetail.viewDirection}
                                </span>
                              )}
                              {property.landDetail?.topography && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  ⛰️ {property.landDetail.topography}
                                </span>
                              )}
                              {property.landDetail?.landCategory && (
                                <span className="px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                                  지목: {property.landDetail.landCategory}
                                </span>
                              )}
                            </div>

                            {property.landDetail?.officialLandPrice ? (
                              <div className="text-[11px] font-bold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200 flex items-center justify-between">
                                <span>
                                  💰 공시지가: <strong>㎡당 {property.landDetail.officialLandPrice.toLocaleString()}원</strong>
                                </span>
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  (평당 약 {Math.round((property.landDetail.officialLandPricePerPyeong || property.landDetail.officialLandPrice * 3.305785) / 10000).toLocaleString()}만원)
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Customer / Owner Info */}
                        {property.customer && (
                          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span className="font-medium text-slate-700 truncate">
                              의뢰인: {property.customer.name} {property.customer.carrier ? `(${property.customer.carrier})` : ''}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 shrink-0">
                              {property.customer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row: [📞 전화] [💬 문자] [🟡 카톡 공유] */}
                    <div 
                      className="p-4 pt-0 flex items-center justify-between gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {property.customer?.phone && (
                          <a
                            href={`tel:${property.customer.phone}`}
                            title="고객 전화걸기"
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const savedMode = (typeof window !== 'undefined' ? localStorage.getItem('pref_address_share_mode') : null) as any || 'dong';
                            const result = handleSmartSms(property, undefined, savedMode);
                            if (!result.isMobile) {
                              alert('매물 안내 문자 문구가 클립보드에 복사되었습니다!\n\n(스마트폰에서 접속 시 터치 한 번으로 문자 앱이 즉시 실행됩니다)');
                            }
                          }}
                          title="문자로 매물정보 전송 (스마트폰 즉시 실행 / PC 클립보드 복사)"
                          className="p-1.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          title="매물 링크 복사 (주소 노출 옵션 선택)"
                          className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          title="카카오톡으로 공유 (주소 노출 옵션 선택)"
                          className="p-1.5 rounded-lg text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {onEditProperty && canEditItem(currentUser, property) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProperty(property);
                            }}
                            title="매물 정보 수정"
                            className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* 그리드 뷰 판매완료 원클릭 버튼 */}
                        {canEditItem(currentUser, property) && onPropertyUpdated && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickToggleStatus(e, property, isContracted ? 'AVAILABLE' : 'CONTRACTED')}
                            title={isContracted ? "진행중으로 복원" : "판매완료로 변경"}
                            className={`px-2 py-1 rounded-md text-[10px] font-black border transition-all cursor-pointer ${
                              isContracted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            {isContracted ? '진행복원' : '판매완료'}
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectProperty(property)}
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        <span>상세보기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">조회된 매물이 없습니다.</h4>
              <p className="text-xs text-slate-500 mt-1">
                필터 조건을 변경하거나 [새 매물 등록] 버튼을 눌러 새 매물을 추가하세요.
              </p>
              <button
                onClick={onOpenNewProperty}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                ＋ 새 매물 등록하기
              </button>
            </div>
          )}
        </>
      )}

      {/* Share & Address Disclosure Options Modal */}
      <SharePropertyModal
        property={sharingProperty}
        isOpen={!!sharingProperty}
        onClose={() => setSharingProperty(null)}
      />

      {/* 매물 텍스트 요약 모달 */}
      <PropertyTextSummaryModal
        property={textSummaryProperty}
        initialMode={summaryMode}
        onClose={() => setTextSummaryProperty(null)}
      />

      {/* 매물 사진 전체 다운로드 모달 (컴퓨터 폴더 지정 및 ZIP 압축 지원) */}
      {downloadPhotoTarget && (
        <PhotoDownloadModal
          isOpen={!!downloadPhotoTarget}
          onClose={() => setDownloadPhotoTarget(null)}
          images={downloadPhotoTarget.images || []}
          titleName={downloadPhotoTarget.roadAddress || downloadPhotoTarget.address || downloadPhotoTarget.propertyNumber}
          propertyNumber={downloadPhotoTarget.propertyNumber}
          propertyId={downloadPhotoTarget.id}
        />
      )}

      {/* 담당 권한자 일괄 추가/지정 모달 */}
      {isBatchAssignModalOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    매물 담당 권한자 일괄 추가 / 지정
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    여러 매물 또는 전체 매물에 담당자 및 추가 권한자를 한 번에 적용합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 기존 데이터 100% 보존 보장 배너 */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>기존 데이터 100% 보존 보장</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                권한자를 일괄 추가하더라도 각 매물의 고유번호, 주소, 가격, 사진, 건축물대장, 고객 연결 등 기존 상세 데이터는 <strong>절대 삭제되거나 변경되지 않고 안전하게 보존</strong>됩니다.
              </p>
            </div>

            {/* 1. 대상 매물 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                1. 적용 대상 매물 선택
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBatchTarget('ALL')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    batchTarget === 'ALL'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span>🏢 모든 매물 전체</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 text-[10px]">
                      {properties.length}건
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    현재 등록된 {properties.length}개 전체 매물에 반영
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchTarget('SELECTED')}
                  disabled={selectedPropertyIds.size === 0}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedPropertyIds.size === 0
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : batchTarget === 'SELECTED'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-200 font-bold cursor-pointer'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span>☑️ 선택된 매물만</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px]">
                      {selectedPropertyIds.size}건
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    체크박스로 선택한 {selectedPropertyIds.size}개 매물에만 반영
                  </p>
                </button>
              </div>
            </div>

            {/* 2. 적용 방식 선택 */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 block">
                2. 권한 반영 방식 선택
              </label>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="batchMode"
                    value="ADD_ASSIGNED"
                    checked={batchMode === 'ADD_ASSIGNED'}
                    onChange={() => setBatchMode('ADD_ASSIGNED')}
                    className="mt-0.5 w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>[권장] 함께 관리할 추가 권한자로 더하기</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                        기존 권한자 유지
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      기존 주 담당자는 그대로 두고, 선택한 직원을 '함께 관리할 추가 권한자' 목록에 안전하게 추가합니다.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="batchMode"
                    value="SET_MAIN"
                    checked={batchMode === 'SET_MAIN'}
                    onChange={() => setBatchMode('SET_MAIN')}
                    className="mt-0.5 w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      주 담당 권한자(관리 주체)로 변경하기
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      매물의 주 관리자를 선택한 직원으로 변경합니다. (매물 상세 정보는 그대로 유지됩니다)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. 추가/지정할 담당 권한자 선택 */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>3. 지정할 담당 권한자 선택 *</span>
                <span className="text-[11px] text-purple-700 font-bold">현재 선택: {batchSelectedAgent}</span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {allBatchAgentOptions.map((agent) => {
                  const isSelected = batchSelectedAgent === agent;
                  return (
                    <button
                      key={agent}
                      type="button"
                      onClick={() => setBatchSelectedAgent(agent)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-700 shadow-sm font-black'
                          : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>
                        {agent === '개업공인중개사 (대표)'
                          ? '👑 개업공인중개사 (대표)'
                          : agent === '사무실'
                          ? '🏢 사무실 (공용)'
                          : `👤 ${agent}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 새 권한자 직접 입력 */}
              <div className="pt-1.5">
                {!isAddingBatchCustomAgent ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingBatchCustomAgent(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    ＋ 새 권한자명 직접 등록하기
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={customBatchAgentInput}
                      onChange={(e) => setCustomBatchAgentInput(e.target.value)}
                      placeholder="새 담당자 이름 입력 (예: 박소공 실장)"
                      className="text-xs px-2.5 py-1.5 border border-purple-400 rounded-lg flex-1 font-bold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = customBatchAgentInput.trim();
                        if (!trimmed) return;
                        if (addCustomAgent) addCustomAgent(trimmed);
                        setBatchSelectedAgent(trimmed);
                        setCustomBatchAgentInput('');
                        setIsAddingBatchCustomAgent(false);
                      }}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      선택
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBatchAgentInput('');
                        setIsAddingBatchCustomAgent(false);
                      }}
                      className="px-2 py-1.5 text-slate-500 text-xs cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 하단 확인 버튼 */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleApplyBatchAssign}
                className="px-4 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>
                  {batchTarget === 'ALL'
                    ? `모든 매물 (${properties.length}건)에 즉시 반영`
                    : `선택한 매물 (${selectedPropertyIds.size}건)에 즉시 반영`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 광고진행 상황 관리 모달 (홈페이지, 블로그, 네이버, 당근, 직방, 한방, 기타) */}
      <PropertyAdProgressModal
        property={adProgressProperty}
        isOpen={!!adProgressProperty}
        onClose={() => setAdProgressProperty(null)}
        onSaved={handleAdProgressSaved}
      />
    </div>
  );
};

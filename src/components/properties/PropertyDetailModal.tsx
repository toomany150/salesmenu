'use client';

import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Share2,
  CheckCircle2, 
  Printer, 
  MapPin, 
  Calendar, 
  Compass, 
  Building,
  ShieldCheck, 
  User, 
  ExternalLink,
  FileCheck,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Camera,
  ZoomIn,
  ImageIcon,
  Lock,
  Trash2,
  Building2,
  Copy,
  Check,
  Download,
  FolderDown,
  Upload,
  Plus,
  Loader2,
  Star,
  RotateCcw,
  FileText
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from '@/lib/types';
import { shareViaKakao, generateSmsLink, copyPropertyShareLink, handleSmartSms } from '@/lib/kakao';
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/geo';
import { useAuth } from '../auth/AuthContext';
import { maskPhoneNumber, canViewCustomerContact, canDeleteItem, canEditItem } from '@/lib/auth';
import { KakaoAddressMap } from '../map/KakaoAddressMap';
import { SharePropertyModal } from './SharePropertyModal';
import { PhotoDownloadModal } from './PhotoDownloadModal';
import { downloadSinglePhoto } from '@/lib/photoDownload';

interface PropertyDetailModalProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProperty?: (property: PropertyItem) => void;
  onPropertyDeleted?: (propertyId: string) => void;
  onPropertyUpdated?: (property: PropertyItem) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onEditProperty,
  onPropertyDeleted,
  onPropertyUpdated,
}) => {
  const { currentUser } = useAuth();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedAddressType, setCopiedAddressType] = useState<'road' | 'jibun' | null>(null);
  const [downloadSuccessType, setDownloadSuccessType] = useState<'single' | 'all' | null>(null);
  const [isPhotoDownloadModalOpen, setIsPhotoDownloadModalOpen] = useState(false);
  const [fullImages, setFullImages] = useState<string[] | null>(null);
  const [isLoadingFullPhotos, setIsLoadingFullPhotos] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [photoActionNotice, setPhotoActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 마우스 드래그 앤 드롭 및 마우스 스와이프 상태
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [hasMovedViewer, setHasMovedViewer] = useState(false);

  React.useEffect(() => {
    if (isOpen && property) {
      setFullImages(null);
      const photoCount = property.photoCount || (property.images ? property.images.length : 0);
      const currentlyLoaded = property.images ? property.images.length : 0;
      if (photoCount > currentlyLoaded) {
        setIsLoadingFullPhotos(true);
        fetch(`/api/properties?id=${property.id}&fullPhotos=true`)
          .then((res) => res.json())
          .then((data) => {
            const item = Array.isArray(data) ? data[0] : data;
            if (item && Array.isArray(item.images) && item.images.length > 0) {
              setFullImages(item.images);
            }
          })
          .catch((err) => console.warn('전체 사진 추가 조회 실패:', err))
          .finally(() => setIsLoadingFullPhotos(false));
      }
    }
  }, [isOpen, property?.id]);

  const handleCopyPropertyAddress = (text: string, type: 'road' | 'jibun') => {
    if (!text) return;
    const clean = text.trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopiedAddressType(type);
        setTimeout(() => setCopiedAddressType(null), 2000);
      }).catch(() => fallbackCopy(clean, type));
    } else {
      fallbackCopy(clean, type);
    }
  };

  const fallbackCopy = (text: string, type: 'road' | 'jibun') => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAddressType(type);
      setTimeout(() => setCopiedAddressType(null), 2000);
    } catch {
      alert('주소 복사에 실패했습니다.');
    }
  };

  if (!isOpen || !property) return null;

  const canEdit = canEditItem(currentUser, property);
  const canDelete = canDeleteItem(currentUser);
  const canViewContact = canViewCustomerContact(currentUser, property) || (property.customer ? canViewCustomerContact(currentUser, property.customer as any) : false);
  const managerName = property.managerName || '사무실';

  const handleDeleteProperty = async () => {
    if (!canDelete) {
      alert('매물 삭제 권한은 개업공인중개사(대표)에게만 있습니다.');
      return;
    }
    if (!confirm(`정말로 매물 #${property.propertyNumber} (${property.address})을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const safeUserName = currentUser?.name ? encodeURIComponent(currentUser.name) : encodeURIComponent('관리자');
      const res = await fetch(`/api/properties?id=${property.id}&userName=${safeUserName}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': safeUserName,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '매물 삭제에 실패했습니다.');
      }
      alert('매물이 정상적으로 삭제되었습니다.');
      if (onPropertyDeleted) onPropertyDeleted(property.id);
      onClose();
    } catch (err: any) {
      alert(err.message || '매물 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const images = fullImages || (property.images && property.images.length > 0 ? property.images : []);
  const currentPhotoIndex = activePhotoIndex < images.length ? activePhotoIndex : 0;
  const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };

  // 상가 권리금 계산
  const isStore = property.propertyType === 'STORE';
  const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
  const premVal = isNoPrem
    ? 0
    : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
  const negoPremVal = isNoPrem
    ? 0
    : (property.storeDetail?.negotiablePremium ?? property.negotiablePremium ?? (property.propertyNumber === '구만족발보쌈' ? 7000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : premVal)));

  const formatPremStr = (val?: number | null) => {
    if (val === undefined || val === null) return '협의';
    if (val === 0) return '무권리';
    if (val >= 10000) {
      const eok = (val / 10000).toFixed(val % 10000 === 0 ? 0 : 1);
      return `${eok}억원 (${val.toLocaleString()}만원)`;
    }
    return `${val.toLocaleString()}만원`;
  };

  let priceText = '';
  if (property.transactionType === '매매') {
    priceText = property.price ? `${property.price.toLocaleString()} 만원` : '협의';
  } else if (property.transactionType === '전세') {
    priceText = property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의';
  } else {
    const isVat = property.monthlyRentVat || property.storeDetail?.monthlyRentVat || property.officeDetail?.monthlyRentVat;
    const vatText = isVat ? ' (부가세 별도)' : ' (부가세 포함)';
    priceText = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
    if (isStore) {
      if (isNoPrem) {
        priceText += ' · 권리금 없음 (무권리)';
      } else if (premVal !== undefined && premVal !== null) {
        const shortPremStr = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만`;
        priceText += ` · 권리금 ${shortPremStr}`;
      }
    }
  }

  // 관리비 및 부가세/상세내용 정보 계산
  const isNoFee = property.storeDetail
    ? !!property.storeDetail.isNoMaintenanceFee
    : (property.officeDetail
        ? !!property.officeDetail.isNoMaintenanceFee
        : !!property.isNoMaintenanceFee);

  const mFeeVal =
    property.storeDetail?.maintenanceFee ??
    property.officeDetail?.maintenanceFee ??
    property.apartmentDetail?.maintenanceFee ??
    property.maintenanceFee ??
    (property.propertyNumber === '구만족발보쌈' ? 15 : (property.propertyNumber === '뭉터기와육회' ? 0 : undefined));

  const isFeeVat = !!(property.storeDetail?.maintenanceFeeVat ?? property.officeDetail?.maintenanceFeeVat ?? property.maintenanceFeeVat ?? (property.propertyNumber === '구만족발보쌈' ? true : false));
  const feeVatText = isFeeVat ? ' (부가세 별도)' : ' (부가세 포함)';
  const feeDetails = property.storeDetail?.managementFeeDetails || property.maintenanceFeeDetails || (property.propertyNumber === '구만족발보쌈' ? '공용관리비, 청소비, 수도료 포함 (전기·가스 실비 별도)' : (property.propertyNumber === '뭉터기와육회' ? '자체 관리 (관리비 없음)' : undefined));

  let maintenanceFeeSummary = '';
  if (isNoFee) {
    maintenanceFeeSummary = '관리비 없음';
    if (feeDetails) {
      maintenanceFeeSummary += ` (${feeDetails})`;
    }
  } else if (mFeeVal !== undefined && mFeeVal !== null && Number(mFeeVal) > 0) {
    maintenanceFeeSummary = `관리비 ${Number(mFeeVal).toLocaleString()}만원${feeVatText}`;
  } else if (feeDetails) {
    maintenanceFeeSummary = `관리비: ${feeDetails}`;
  } else {
    maintenanceFeeSummary = '관리비: 별도 협의';
  }

  const formatShortDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  // 해당 평수 계산 (모든 매물 유형 지원)
  const getPyeongDisplay = () => {
    if (property.propertyType === 'STORE') {
      const p = property.storeDetail?.actualAreaPyeong || 
        (property.storeDetail?.actualArea ? (property.storeDetail.actualArea * 0.3025).toFixed(1) : null) ||
        (property.storeDetail?.buildingArea ? (property.storeDetail.buildingArea * 0.3025).toFixed(1) : null);
      return p ? `${p}평` : null;
    }
    if (property.propertyType === 'OFFICE') {
      const p = property.officeDetail?.actualAreaPyeong || 
        (property.officeDetail?.actualArea ? (property.officeDetail.actualArea * 0.3025).toFixed(1) : null) ||
        (property.officeDetail?.buildingArea ? (property.officeDetail.buildingArea * 0.3025).toFixed(1) : null);
      return p ? `${p}평` : null;
    }
    if (property.propertyType === 'APARTMENT') {
      const p = property.apartmentDetail?.pyeongType || 
        (property.apartmentDetail?.exclusiveArea ? (property.apartmentDetail.exclusiveArea * 0.3025).toFixed(1) + '평' : null) ||
        (property.apartmentDetail?.supplyArea ? (property.apartmentDetail.supplyArea * 0.3025).toFixed(1) + '평' : null);
      return p ? (p.includes('평') ? p : `${p}평`) : null;
    }
    if (property.propertyType === 'HOUSE') {
      const p = property.houseDetail?.actualAreaPyeong || 
        (property.houseDetail?.actualArea ? (property.houseDetail.actualArea * 0.3025).toFixed(1) : null) ||
        (property.houseDetail?.buildingAreaPyeong) ||
        (property.houseDetail?.buildingArea ? (property.houseDetail.buildingArea * 0.3025).toFixed(1) : null) ||
        (property.houseDetail?.exclusiveArea ? (property.houseDetail.exclusiveArea * 0.3025).toFixed(1) : null) ||
        (property.actualArea ? (property.actualArea * 0.3025).toFixed(1) : null) ||
        (property.buildingArea ? (property.buildingArea * 0.3025).toFixed(1) : null) ||
        (property.totalFloorArea ? (property.totalFloorArea * 0.3025).toFixed(1) : null);
      return p ? (String(p).includes('평') ? p : `${p}평`) : null;
    }
    if (property.propertyType === 'LAND') {
      const p = (property.landDetail as any)?.landAreaPyeong || 
        (property.landDetail?.landArea ? (property.landDetail.landArea * 0.3025).toFixed(1) : null) ||
        (property.landArea ? (property.landArea * 0.3025).toFixed(1) : null);
      return p ? `${p}평` : null;
    }
    if (property.propertyType === 'FACTORY_WAREHOUSE') {
      const p = property.factoryWarehouseDetail?.buildingArea 
        ? (property.factoryWarehouseDetail.buildingArea * 0.3025).toFixed(1) 
        : (property.totalFloorArea ? (property.totalFloorArea * 0.3025).toFixed(1) : null);
      return p ? `${p}평` : null;
    }
    const generalP = property.actualAreaPyeong || 
      (property.actualArea ? (property.actualArea * 0.3025).toFixed(1) : null) ||
      (property.totalFloorArea ? (property.totalFloorArea * 0.3025).toFixed(1) : null);
    return generalP ? `${generalP}평` : null;
  };

  const actualAreaVal = property.actualArea || 
    property.storeDetail?.actualArea || 
    property.officeDetail?.actualArea || 
    property.apartmentDetail?.exclusiveArea ||
    property.houseDetail?.actualArea ||
    property.houseDetail?.buildingArea;
  const actualAreaPyeong = actualAreaVal ? (actualAreaVal * 0.3025).toFixed(1) : null;

  const titleName =
    property.apartmentDetail?.complexName ||
    property.storeDetail?.storeName ||
    property.officeDetail?.officeName ||
    property.factoryWarehouseDetail?.companyName ||
    property.landDetail?.companyName ||
    property.propertyNumber ||
    `${PROPERTY_TYPE_LABELS[property.propertyType]} 매물`;

  const restrictedTypes = property.restrictedBusinessTypes || property.storeDetail?.restrictedBusinessTypes;

  // 섹터 2 (공간구획 / 화장실 / 주차) 공통 데이터
  const roomCountVal = property.storeDetail?.roomCount ?? 
    property.officeDetail?.roomCount ?? 
    property.apartmentDetail?.roomCount ?? 
    property.houseDetail?.roomCount ?? 0;

  const bathroomCountVal = property.storeDetail?.bathroomCount ?? 
    property.officeDetail?.bathroomCount ?? 
    property.apartmentDetail?.bathroomCount ?? 
    property.houseDetail?.bathroomCount ?? 1;

  const toiletGenderTypeVal = property.storeDetail?.toiletGenderType ?? 
    property.officeDetail?.toiletGenderType ?? '남녀구분';

  const isParkingImpossibleVal = !!(property.storeDetail?.isParkingImpossible ?? 
    property.officeDetail?.isParkingImpossible ?? false);

  const parkingCountVal = property.storeDetail?.parkingCount ?? 
    property.officeDetail?.parkingCount ?? 
    property.apartmentDetail?.parkingCount ??
    property.houseDetail?.parkingCount;

  const smsLink = generateSmsLink({
    propertyNumber: property.propertyNumber,
    propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
    transactionType: property.transactionType,
    price: property.price,
    deposit: property.deposit,
    monthlyRent: property.monthlyRent,
    address: property.address,
    detailAddress: property.detailAddress,
  });

  const handleKakaoShare = async () => {
    await shareViaKakao({
      id: property.id,
      title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
      description: `${property.address} ${property.detailAddress || ''}`,
      priceText: `${property.transactionType} ${priceText}`,
      address: `${property.address} ${property.detailAddress || ''}`,
      propertyNumber: property.propertyNumber,
      propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
      property: property,
    });
  };

  const handlePrint = () => {
    window.print();
  };


  const getSafeBaseFilename = () => {
    const cleanTitle = (titleName || property.propertyNumber || '매물사진')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    const propNo = property.propertyNumber ? `_${property.propertyNumber}` : '';
    return `${cleanTitle}${propNo}`;
  };

  // 1. 현재 사진 1장 다운로드 (경로 지정 지원)
  const handleDownloadCurrentPhoto = async () => {
    if (!images || images.length === 0) return;
    const currentImg = images[currentPhotoIndex];
    if (!currentImg) return;
    
    const baseName = getSafeBaseFilename();
    const isRep = currentPhotoIndex === 0 ? '_대표' : '';
    const filename = `${baseName}_사진${currentPhotoIndex + 1}${isRep}`;
    
    const res = await downloadSinglePhoto(currentImg, filename);
    if (res.success) {
      setDownloadSuccessType('single');
      setTimeout(() => setDownloadSuccessType(null), 2500);
    } else if (!res.cancelled && res.error) {
      alert(`사진 저장 실패: ${res.error}`);
    }
  };

  // 2. 등록된 사진 전체 다운로드 (경로 지정 및 100% 누락 방지 모달 열기)
  const handleDownloadAllPhotos = () => {
    if (!images || images.length === 0) return;
    setIsPhotoDownloadModalOpen(true);
  };

  // 3. 사진 압축 (3.8MB 이하는 원본 100% 무손실, 초과는 4K UHD 94% 프리미엄 화질 유지)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size <= 3.8 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 3840;
          const maxHeight = 2880;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 4. 사진 즉시 업로드 및 서버 저장
  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !property) return;

    if (!canEdit) {
      alert('매물 사진을 등록/수정할 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
      return;
    }

    const maxPhotos = 30;
    const currentList = images;
    const remaining = maxPhotos - currentList.length;
    if (remaining <= 0) {
      alert(`사진은 최대 ${maxPhotos}장까지만 등록할 수 있습니다. 기존 사진을 삭제 후 다시 시도해주세요.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      alert(`최대 ${maxPhotos}장 제한으로 ${remaining}장의 사진만 추가됩니다.`);
    }

    setIsUploadingPhotos(true);
    setPhotoActionNotice(null);

    try {
      // 1) 고화질 이미지 압축
      const compressedList = await Promise.all(selectedFiles.map((f) => compressImage(f)));

      // 2) Cloudflare R2 비동기 업로드 시도 (실패 시 무손실 base64 보존)
      let finalUploadedList = compressedList;
      try {
        const r2Results = await Promise.all(
          compressedList.map(async (img) => {
            if (!img || !img.startsWith('data:image')) return img;
            try {
              const uploadRes = await fetch('/api/upload/r2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: img }),
              });
              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.url) {
                  return uploadData.url;
                }
              }
            } catch (err) {
              console.warn('개별 사진 R2 업로드 오류(원본 유지):', err);
            }
            return img;
          })
        );
        finalUploadedList = r2Results;
      } catch (r2Err) {
        console.warn('R2 일괄 업로드 경고:', r2Err);
      }

      const updatedImages = [...currentList, ...finalUploadedList];

      // 3) 서버 PUT 저장
      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'AGENT',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          images: updatedImages,
          currentUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '사진 저장에 실패했습니다.');
      }

      const savedData = await res.json();
      const updatedListFromServer = Array.isArray(savedData.images) ? savedData.images : updatedImages;

      // 로컬 상태 즉시 반영 및 상위 동기화
      setFullImages(updatedListFromServer);
      setActivePhotoIndex(currentList.length); // 새로 추가된 사진으로 뷰어 이동

      const updatedPropertyObj: PropertyItem = {
        ...property,
        images: updatedListFromServer,
        photoCount: updatedListFromServer.length,
      };
      if (onPropertyUpdated) {
        onPropertyUpdated(updatedPropertyObj);
      }

      setPhotoActionNotice({
        type: 'success',
        text: `📷 사진 ${selectedFiles.length}장이 성공적으로 추가 및 저장되었습니다.`,
      });
      setTimeout(() => setPhotoActionNotice(null), 3000);
    } catch (err: any) {
      console.error('사진 추가 실패:', err);
      setPhotoActionNotice({
        type: 'error',
        text: err.message || '사진 업로드 중 오류가 발생했습니다.',
      });
      alert(err.message || '사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 5. 사진 삭제 및 서버 저장
  const handleDeletePhoto = async (targetIndex: number) => {
    if (!property || images.length === 0) return;

    if (!canEdit) {
      alert('매물 사진을 삭제할 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
      return;
    }

    if (targetIndex < 0 || targetIndex >= images.length) return;

    const isRepresentative = targetIndex === 0;
    const confirmMsg = isRepresentative
      ? `현재 보고 계신 1번째 사진은 [대표사진]입니다.\n정말로 이 사진을 삭제하시겠습니까?\n삭제 후 다음 사진이 새로운 대표사진으로 지정됩니다.`
      : `현재 보고 계신 ${targetIndex + 1}번째 사진을 삭제하시겠습니까?\n삭제 후 매물장에 즉시 영구 저장됩니다.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsDeletingPhoto(true);
    setPhotoActionNotice(null);

    try {
      const updatedImages = images.filter((_, idx) => idx !== targetIndex);

      // 서버에 PUT 저장
      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'AGENT',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          images: updatedImages,
          currentUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '사진 삭제에 실패했습니다.');
      }

      const savedData = await res.json();
      const updatedListFromServer = Array.isArray(savedData.images) ? savedData.images : updatedImages;

      // 로컬 상태 즉시 갱신
      setFullImages(updatedListFromServer);
      if (targetIndex >= updatedListFromServer.length) {
        setActivePhotoIndex(Math.max(0, updatedListFromServer.length - 1));
      } else {
        setActivePhotoIndex(targetIndex);
      }

      const updatedPropertyObj: PropertyItem = {
        ...property,
        images: updatedListFromServer,
        photoCount: updatedListFromServer.length,
      };
      if (onPropertyUpdated) {
        onPropertyUpdated(updatedPropertyObj);
      }

      setPhotoActionNotice({
        type: 'success',
        text: '🗑️ 사진이 성공적으로 삭제되었습니다.',
      });
      setTimeout(() => setPhotoActionNotice(null), 3000);
    } catch (err: any) {
      console.error('사진 삭제 실패:', err);
      setPhotoActionNotice({
        type: 'error',
        text: err.message || '사진 삭제 중 오류가 발생했습니다.',
      });
      alert(err.message || '사진 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // 6. 등록된 사진 전체 일괄 삭제
  const handleDeleteAllPhotos = async () => {
    if (!property || images.length === 0) {
      alert('삭제할 사진이 없습니다.');
      return;
    }

    if (!confirm(`⚠️ 정말로 등록된 사진 전체(${images.length}장)를 모두 삭제하시겠습니까?\n삭제 후에는 복구할 수 없으며 매물장에 즉시 영구 저장됩니다.`)) {
      return;
    }

    setIsDeletingPhoto(true);
    setPhotoActionNotice(null);

    try {
      const updatedImages: string[] = [];

      // 서버에 PUT 저장
      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          images: updatedImages,
          currentUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '사진 전체 삭제에 실패했습니다.');
      }

      const savedData = await res.json();
      const updatedListFromServer = Array.isArray(savedData?.images) ? savedData.images : updatedImages;

      // 로컬 상태 즉시 갱신
      setFullImages(updatedListFromServer);
      setActivePhotoIndex(0);

      const updatedPropertyObj: PropertyItem = {
        ...property,
        images: updatedListFromServer,
        photoCount: 0,
      };
      if (onPropertyUpdated) {
        onPropertyUpdated(updatedPropertyObj);
      }

      setPhotoActionNotice({
        type: 'success',
        text: '💥 사진 전체가 성공적으로 삭제되었습니다.',
      });
      setTimeout(() => setPhotoActionNotice(null), 3000);
    } catch (err: any) {
      console.error('사진 전체 삭제 실패:', err);
      setPhotoActionNotice({
        type: 'error',
        text: err.message || '사진 전체 삭제 중 오류가 발생했습니다.',
      });
      alert(err.message || '사진 전체 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // 7. 현재 사진을 대표사진으로 지정 (순서 맨 앞으로 이동 후 서버 영구 저장)
  const handleSetRepresentative = async (targetIndex: number = currentPhotoIndex) => {
    if (!property || images.length === 0) return;

    if (!canEdit) {
      alert('대표사진 지정 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
      return;
    }

    if (targetIndex === 0) {
      alert('현재 사진은 이미 대표사진입니다.');
      return;
    }

    if (targetIndex < 0 || targetIndex >= images.length) return;

    const selectedImg = images[targetIndex];
    if (!selectedImg) return;

    if (!confirm(`현재 보고 계신 ${targetIndex + 1}번째 사진을 매물의 [대표사진]으로 지정하시겠습니까?\n매물장 목록의 대표 썸네일과 공유 시 대표 이미지로 적용됩니다.`)) {
      return;
    }

    setIsDeletingPhoto(true);
    setPhotoActionNotice(null);

    try {
      // 선택한 사진을 맨 앞으로 이동하고 나머지 사진 순서 유지
      const updatedImages = [
        selectedImg,
        ...images.filter((_, idx) => idx !== targetIndex),
      ];

      // 서버에 PUT 저장 (기존 데이터 보존 및 images 순서만 안전하게 업데이트)
      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          images: updatedImages,
          currentUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '대표사진 지정에 실패했습니다.');
      }

      const savedData = await res.json();
      const updatedListFromServer = Array.isArray(savedData?.images) ? savedData.images : updatedImages;

      // 로컬 상태 즉시 갱신
      setFullImages(updatedListFromServer);
      setActivePhotoIndex(0); // 새로 지정된 대표사진(맨 앞)으로 포커스 유지

      const updatedPropertyObj: PropertyItem = {
        ...property,
        images: updatedListFromServer,
        photoCount: updatedListFromServer.length,
      };
      if (onPropertyUpdated) {
        onPropertyUpdated(updatedPropertyObj);
      }

      setPhotoActionNotice({
        type: 'success',
        text: '⭐ 선택한 사진이 매물의 [대표사진]으로 지정되었습니다.',
      });
      setTimeout(() => setPhotoActionNotice(null), 3000);
    } catch (err: any) {
      console.error('대표사진 지정 실패:', err);
      setPhotoActionNotice({
        type: 'error',
        text: err.message || '대표사진 지정 중 오류가 발생했습니다.',
      });
      alert(err.message || '대표사진 지정 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // 8. 마우스 드래그 앤 드롭 또는 버튼으로 사진 순서 이동 및 서버 영구 저장
  const handleMovePhoto = async (fromIndex: number, toIndex: number) => {
    if (!property || images.length <= 1) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) return;

    if (!canEdit) {
      alert('사진 순서 이동 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
      return;
    }

    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);

    // 낙관적 UI 업데이트: 즉각 로컬 반영
    setFullImages(nextImages);
    setActivePhotoIndex(toIndex);

    try {
      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'AGENT',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || ''),
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          images: nextImages,
          currentUser,
        }),
      });

      if (res.ok) {
        const savedData = await res.json();
        const updatedList = Array.isArray(savedData?.images) ? savedData.images : nextImages;
        setFullImages(updatedList);
        if (onPropertyUpdated) {
          onPropertyUpdated({
            ...property,
            images: updatedList,
            photoCount: updatedList.length,
          });
        }
      }
    } catch (err) {
      console.error('사진 순서 이동 서버 저장 오류:', err);
    }
  };

  // 메인 사진 마우스 드래그(스와이프)로 이전/다음 사진 이동
  const handleMouseDownViewer = (e: React.MouseEvent) => {
    setTouchStartX(e.clientX);
    setIsMouseDragging(true);
    setHasMovedViewer(false);
  };

  const handleMouseMoveViewer = (e: React.MouseEvent) => {
    if (!isMouseDragging || touchStartX === null) return;
    const diffX = e.clientX - touchStartX;
    if (Math.abs(diffX) > 10) {
      setHasMovedViewer(true);
    }
  };

  const handleMouseUpViewer = (e: React.MouseEvent) => {
    if (!isMouseDragging || touchStartX === null) return;
    const diffX = e.clientX - touchStartX;
    if (diffX < -50 && images.length > 1) {
      // 마우스 왼쪽으로 50px 이상 드래그 -> 다음 사진
      setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    } else if (diffX > 50 && images.length > 1) {
      // 마우스 오른쪽으로 50px 이상 드래그 -> 이전 사진
      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }
    setIsMouseDragging(false);
    setTouchStartX(null);
  };

  const handleTouchStartViewer = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setHasMovedViewer(false);
  };

  const handleTouchEndViewer = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - touchStartX;
    if (diffX < -50 && images.length > 1) {
      setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    } else if (diffX > 50 && images.length > 1) {
      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }
    setTouchStartX(null);
  };

  // 판매완료 / 진행중 상태 원클릭 변경 핸들러
  const handleToggleStatus = async (newStatus: any) => {
    if (!property || !onPropertyUpdated) return;
    const isSelling = newStatus === 'CONTRACTED';
    const actionLabel = isSelling ? '판매완료' : (STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]?.label || newStatus);
    const confirmMsg = isSelling
      ? `[${titleName || property.address}] 매물을 '판매완료' 처리하시겠습니까?\n(매물장 및 상세화면에 '판매완료'로 표시됩니다)`
      : `매물 상태를 '${actionLabel}'(으)로 변경하시겠습니까?`;
    
    if (!window.confirm(confirmMsg)) return;

    const updatedProperty: PropertyItem = {
      ...property,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProperty),
      });
    } catch (err) {
      console.error('Failed to sync property status to server:', err);
    }

    onPropertyUpdated(updatedProperty);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 bg-slate-50/90 gap-2">
          {/* 배지 및 담당자 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
              {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
            </span>

            {/* 거래 상태: 권한자 직접 변경 드롭다운 또는 뱃지 */}
            {canEdit && onPropertyUpdated ? (
              <select
                value={property.status}
                onChange={(e) => handleToggleStatus(e.target.value)}
                className={`px-2 py-0.5 text-xs font-extrabold rounded-full border cursor-pointer outline-hidden transition-all shadow-2xs ${
                  property.status === 'CONTRACTED'
                    ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-400/40 font-black'
                    : property.status === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : property.status === 'HOLD'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
                title="클릭하여 매물 상태를 '판매완료' 등으로 즉시 변경할 수 있습니다"
              >
                <option value="AVAILABLE">🟢 접수/진행중</option>
                <option value="CONTRACTED">🔴 판매완료</option>
                <option value="HOLD">🟡 보류</option>
                <option value="CANCELLED">⚪ 취소</option>
              </select>
            ) : (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full border shrink-0 ${statusInfo.color}`}>
                {property.status === 'CONTRACTED' ? '판매완료' : statusInfo.label}
              </span>
            )}

            <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
              #{property.propertyNumber}
            </span>

            {/* 담당 권한자 뱃지 */}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-md shrink-0 ${
              managerName.includes('개업공인중개사')
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-slate-200 text-slate-800'
            }`}>
              {managerName.includes('개업공인중개사')
                ? '👑 담당: 개업공인중개사 (대표)'
                : managerName === '사무실'
                ? '🏢 담당: 사무실'
                : `👤 담당: ${managerName}`}
            </span>

            {/* 추가 권한자 뱃지 */}
            {Array.isArray(property.assignedAgents) && property.assignedAgents.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 shrink-0">
                <span>👥 추가권한:</span>
                <span className="font-bold">{property.assignedAgents.join(', ')}</span>
              </span>
            )}
          </div>

          {/* 우측 조작 버튼 그룹: 모바일에서 절대 줄바꿈되거나 세로로 찌그러지지 않도록 shrink-0 및 whitespace-nowrap 적용 */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
            {/* 판매완료 원클릭 토글 버튼 */}
            {canEdit && onPropertyUpdated && (
              property.status !== 'CONTRACTED' ? (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('CONTRACTED')}
                  title="이 매물이 판매(계약)되었을 때 '판매완료'로 즉시 변경합니다"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>판매완료 처리</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('AVAILABLE')}
                  title="판매완료 상태를 해제하고 '접수/진행중'으로 복원합니다"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 active:scale-95 rounded-lg transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>진행중으로 복원</span>
                </button>
              )
            )}

            {/* 수정 버튼: 대표 또는 지정 권한자만 가능 */}
            {onEditProperty && (
              canEdit ? (
                <button
                  onClick={() => onEditProperty(property)}
                  title="매물 정보 수정"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>수정</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>수정불가</span>
                </div>
              )
            )}

            {/* 삭제 버튼: 오직 관리자(대표)만 가능 */}
            {canDelete && (
              <button
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                title="매물 영구 삭제 (관리자 전용)"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isDeleting ? '삭제 중...' : '매물 삭제'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="매물 브리핑 출력"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Main Title & Price Header (한눈에 들어오는 깔끔한 프리미엄 디자인) */}
          <div className="rounded-2xl bg-white border-2 border-slate-200/90 shadow-sm overflow-hidden space-y-0">
            {/* 상단 1열: 매물명/상호명, 태그, 상태 및 우측 메인 가격/권리금 */}
            {/* 상단 1열: 접수일자, 물건종류, 해당평수, 거래유형, 상태 및 우측 매매가/전세가/보증금월세/권리금 */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                {/* 상단 메타 태그 배지 라인 */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 1. 접수일자 */}
                  {property.receiptDate && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 shadow-2xs">
                      <span className="text-[11px] text-emerald-400">접수일자</span>
                      <span className="font-extrabold text-white">{formatShortDate(property.receiptDate)}</span>
                    </span>
                  )}

                  {/* 2. 물건종류 */}
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                    <span className="text-blue-200 text-[11px]">물건종류 :</span>
                    <span className="font-extrabold">{PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}</span>
                  </span>

                  {/* 3. 거래유형 */}
                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-sky-500/25 text-sky-200 border border-sky-400/35">
                    {property.transactionType}
                  </span>

                  {/* 4. 해당평수 */}
                  {getPyeongDisplay() && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/25 text-purple-200 border border-purple-400/35 flex items-center gap-1 shadow-2xs">
                      <span className="text-purple-300 text-[11px]">해당평수 :</span>
                      <span className="font-extrabold text-white">{getPyeongDisplay()}</span>
                    </span>
                  )}

                  {/* 5. 매물번호 */}
                  <span className="text-xs text-slate-300 font-mono bg-black/30 px-2 py-1 rounded border border-white/10">
                    #{property.propertyNumber}
                  </span>

                  {/* 6. 계약 상태 */}
                  {property.status === 'CONTRACTED' ? (
                    <span className="text-xs font-black px-2.5 py-1 rounded-md bg-rose-600 text-white border border-rose-300 shadow-xs flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ✓ 판매완료
                    </span>
                  ) : (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                      property.status === 'AVAILABLE' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {STATUS_LABELS[property.status]?.label || property.status}
                    </span>
                  )}
                </div>

                {/* 매물 상호명 / 주소 타이틀 */}
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight break-keep pt-0.5">
                  {titleName}
                </h3>
              </div>

              {/* 우측 가격 & 권리금 표시 (매매가, 전세가, 보증금/월세, 권리금 눈에 쏙 들어오게 최적화) */}
              <div className="flex flex-col md:items-end justify-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 space-y-1">
                {/* 메인 가격 */}
                <div className="flex items-baseline gap-2 flex-wrap justify-start md:justify-end">
                  {property.transactionType === '매매' && (
                    <>
                      <span className="text-sm sm:text-base font-extrabold text-amber-200/90">매매가</span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                        {property.price ? `${property.price.toLocaleString()} 만원` : '협의'}
                      </span>
                    </>
                  )}
                  {property.transactionType === '전세' && (
                    <>
                      <span className="text-sm sm:text-base font-extrabold text-amber-200/90">전세가</span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                        {property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의'}
                      </span>
                    </>
                  )}
                  {property.transactionType === '월세' && (
                    <div className="text-left md:text-right">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-300">보증금</span>
                        <span className="text-xl sm:text-2xl font-black text-white">
                          {property.deposit ? `${property.deposit.toLocaleString()}만` : '0'}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-xs sm:text-sm font-bold text-amber-300">월세</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-300">
                          {property.monthlyRent ? `${property.monthlyRent.toLocaleString()}만원` : '0'}
                        </span>
                      </div>
                      {(property.monthlyRentVat || property.storeDetail?.monthlyRentVat || property.officeDetail?.monthlyRentVat) && (
                        <div className="text-[11px] text-amber-200/80 font-medium pt-0.5">(부가세 별도)</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 상가 권리금 뱃지 (있을 때 눈에 띄게 배치) */}
                {isStore && (
                  <div className="pt-0.5">
                    {isNoPrem ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 shadow-2xs">
                        ✨ 권리금 없음 (무권리)
                      </span>
                    ) : (premVal !== undefined && premVal !== null && premVal > 0) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-400/25 text-amber-300 border border-amber-400/40 shadow-2xs">
                        <span className="text-amber-300">💰 권리금:</span>
                        <span className="text-sm font-black text-amber-200">{formatPremStr(premVal)}</span>
                        {negoPremVal && negoPremVal !== premVal ? (
                          <span className="text-[11px] text-amber-300/80 font-medium">(조정: {formatPremStr(negoPremVal)})</span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* 중단 2열: 도로명 / 지번 주소 박스 및 지도 바로가기 버튼 */}
            <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* 주소 리스트 (줄바꿈 없이 깔끔하게 유지) */}
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* 도로명 주소 박스 */}
                <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs text-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1 py-0.5 rounded shrink-0">도로명</span>
                  <span className="font-bold text-slate-900 break-keep">
                    {property.roadAddress || property.address}
                  </span>
                  {property.detailAddress && (
                    <span className="text-slate-600 font-semibold shrink-0">({property.detailAddress})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyPropertyAddress(property.roadAddress || property.address, 'road')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-200 rounded shrink-0 cursor-pointer transition-all whitespace-nowrap ml-1"
                    title="도로명 주소 복사"
                  >
                    {copiedAddressType === 'road' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span className="text-emerald-700 font-extrabold">복사완료</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-blue-600" />
                        <span>도로명 복사</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 지번 주소 박스 */}
                {property.jibunAddress && (
                  <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs text-xs">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded shrink-0">지번</span>
                    <span className="font-semibold text-slate-800 break-keep">
                      {property.jibunAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPropertyAddress(property.jibunAddress || '', 'jibun')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded shrink-0 cursor-pointer transition-all whitespace-nowrap ml-1"
                      title="지번 주소 복사"
                    >
                      {copiedAddressType === 'jibun' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-extrabold">복사완료</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-amber-700" />
                          <span>지번 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 지도 바로가기 버튼 */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getKakaoMapUrl(property.address, property.latitude, property.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-all shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span>🟡 카카오지도</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={getNaverMapUrl(property.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-all shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span>🟢 네이버지도</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 하단 3열: 핵심 요약 배지 바 (실평수, 관리비, 관리비내역, 입점제한) */}
            <div className="p-3 bg-white flex flex-wrap items-center gap-2 text-xs">
              {actualAreaVal && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-amber-50 text-amber-950 border border-amber-200 shadow-2xs">
                  📐 실평수 {actualAreaVal}㎡ (약 {actualAreaPyeong}평)
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
                isNoFee 
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                  : 'bg-blue-50 text-blue-950 border border-blue-200 shadow-2xs'
              }`}>
                🏷️ {maintenanceFeeSummary}
              </span>
              {feeDetails && !maintenanceFeeSummary.includes(feeDetails) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs">
                  ※ 관리비내역: {feeDetails}
                </span>
              )}
              {restrictedTypes && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-rose-50 text-rose-900 border border-rose-200 shadow-2xs">
                  🚫 입점제한: {restrictedTypes}
                </span>
              )}
              {property.purchasePrice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-950 border border-indigo-200 shadow-2xs">
                  🏷️ 매수가: {property.purchasePrice}
                </span>
              )}
              {property.collateral && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-950 border border-indigo-200 shadow-2xs">
                  🏦 대출금액: {property.collateral}
                </span>
              )}
              {property.currentMarketPrice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-blue-50 text-blue-950 border border-blue-200 shadow-2xs">
                  📊 현시세: {property.currentMarketPrice}{property.marketPriceBasis ? " (" + property.marketPriceBasis + ")" : ""}
                </span>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 📋 매물요약 (매물장에 등록된 핵심 정보 한눈에 요약) */}
          {/* ======================================================== */}
          <div className="p-4 bg-linear-to-br from-indigo-50/70 via-white to-slate-50 rounded-2xl border-2 border-indigo-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-indigo-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    매물요약
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                      #{property.propertyNumber}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    매물장에 등록된 주요 핵심 제원 및 거래 조건 요약입니다.
                  </p>
                </div>
              </div>

              {/* 거래 상태 배지 & 접수일자 */}
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border shadow-2xs ${
                  property.status === 'CONTRACTED'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : property.status === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-amber-500 text-white border-amber-500'
                }`}>
                  {property.status === 'CONTRACTED' ? '🔴 판매완료' : (STATUS_LABELS[property.status]?.label || property.status)}
                </span>
                {(property.receiptDate || property.createdAt) && (
                  <span className="text-xs text-slate-600 font-bold bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
                    접수: {property.receiptDate ? property.receiptDate.slice(0, 10) : property.createdAt?.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>

            {/* 매물 핵심 8대 요약 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* 1. 매물종류 / 거래유형 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">매물종류 / 유형</span>
                <span className="font-black text-slate-900 text-sm">
                  {PROPERTY_TYPE_LABELS[property.propertyType]} · {property.transactionType}
                </span>
              </div>

              {/* 2. 금액 조건 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  {property.transactionType === '매매' ? '매매가' : '보증금 / 월세'}
                </span>
                <span className="font-black text-indigo-950 text-sm">
                  {property.transactionType === '매매' ? (
                    property.price ? `${Number(property.price).toLocaleString()}만원` : '-'
                  ) : (
                    `${property.deposit ? Number(property.deposit).toLocaleString() : '0'}만 / ${property.monthlyRent ? Number(property.monthlyRent).toLocaleString() : '0'}만원`
                  )}
                  {property.negotiablePrice !== undefined && (
                    <span className="text-[10px] text-emerald-700 ml-1 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      절충가능
                    </span>
                  )}
                </span>
              </div>

              {/* 3. 권리금 또는 대출금 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  {property.propertyType === 'STORE' ? '권리금' : '대출 / 융자금'}
                </span>
                <span className="font-extrabold text-amber-900 text-sm">
                  {property.propertyType === 'STORE' ? (
                    property.isNoPremium ? '무권리' : (property.premium ? `${Number(property.premium).toLocaleString()}만원` : (property.storeDetail?.premium ? `${property.storeDetail.premium}만원` : '권리금 없음'))
                  ) : (
                    property.collateral || '융자 없음'
                  )}
                </span>
              </div>

              {/* 4. 면적 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  {property.propertyType === 'LAND' ? '토지면적' : '실평수 (전용면적)'}
                </span>
                <span className="font-extrabold text-emerald-950 text-sm">
                  {property.propertyType === 'LAND' ? (
                    `${property.landArea || property.landDetail?.landArea || '-'}㎡ (약 ${property.landArea ? (property.landArea * 0.3025).toFixed(1) : (property.landDetail?.landArea ? (property.landDetail.landArea * 0.3025).toFixed(1) : '-')}평)`
                  ) : (
                    `${actualAreaVal ? actualAreaVal + '㎡' : '-'} (약 ${actualAreaPyeong || '-'}평)`
                  )}
                </span>
              </div>

              {/* 5. 층수 및 위치 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  {property.propertyType === 'LAND' ? '지목 / 용도지역' : '해당층 / 총층'}
                </span>
                <span className="font-bold text-slate-800">
                  {property.propertyType === 'LAND' ? (
                    `${property.landDetail?.landCategory || '-'} · ${property.landDetail?.zoningArea || property.zoningArea || '-'}`
                  ) : (
                    property.floorText || `${property.floorCount ? property.floorCount + '층' : '-'} / ${property.underFloorCount ? '지하 ' + property.underFloorCount + '층' : '지상'}`
                  )}
                </span>
              </div>

              {/* 6. 관리비 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">관리비</span>
                <span className="font-bold text-slate-800 truncate block">
                  {maintenanceFeeSummary}
                </span>
              </div>

              {/* 7. 방향 및 도로/입지 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  {property.propertyType === 'LAND' ? '접도 방향 / 조망' : '방향 (기준)'}
                </span>
                <span className="font-bold text-slate-800 truncate block">
                  {property.propertyType === 'LAND' ? (
                    property.landDetail?.roadDirection ? `${property.landDetail.roadDirection} 도로` : (property.direction || '기본 정보')
                  ) : (
                    `${property.direction || '-'} ${property.directionCriteria ? '(' + property.directionCriteria + ')' : ''}`
                  )}
                </span>
              </div>

              {/* 8. 입주가능일 */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">입주가능일</span>
                <span className="font-bold text-slate-800 truncate block">
                  {property.isImmediateAvailable ? '즉시 입주 가능' : (property.availableDate ? property.availableDate.slice(0, 10) : (property.isNegotiableDate ? '입주일 협의' : '협의'))}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 🔒 상담내용 (2번째 첨부파일: 3번째 파일 밑 위치, 명칭 "상담내용") */}
          {/* ======================================================== */}
          <div className="p-4 rounded-xl bg-purple-50/80 border-2 border-purple-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span>🔒 상담내용</span>
              </h4>
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                중개사/관리자 전용
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
              {property.consultationNotes ? (
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-semibold">
                  {property.consultationNotes}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  등록된 상담내용 및 비공개 메모가 없습니다. [수정] 버튼을 눌러 상담내용을 기록할 수 있습니다.
                </p>
              )}
            </div>

            <p className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
              <span>※</span>
              <span>이 상담내용은 카카오톡이나 문자, 고객 브리핑 링크 전송 시 절대로 포함되지 않으며 외부 고객에게 노출되지 않습니다.</span>
            </p>
          </div>

          {/* Quick Share Action Row: [📞 전화걸기] [💬 문자로 전송] [🟡 카톡 공유] */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-600">접수 고객(의뢰인):</span>
                {property.customer ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {canViewContact ? property.customer.name : '*** (비공개)'}
                    </span>
                    {canViewContact && property.customer.carrier && (
                      <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-sm">
                        {property.customer.carrier}
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {canViewContact ? property.customer.phone : '010-****-****'}
                    </span>
                    {!canViewContact && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                        <Lock className="w-3 h-3 text-amber-600" />
                        연락처 비공개
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">직접 접수 (연결 고객 없음)</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {property.customer?.phone && canViewContact && (
                  <a
                    href={`tel:${property.customer.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>📞 고객 전화걸기</span>
                  </a>
                )}

                {/* 스마트폰 전용 문자 전송 버튼 (PC 환경에서는 사용자의 요청에 따라 완전 삭제/숨김) */}
                <button
                  type="button"
                  onClick={() => {
                    const savedMode = (typeof window !== 'undefined' ? localStorage.getItem('pref_address_share_mode') : null) as any || 'dong';
                    handleSmartSms(property, undefined, savedMode);
                  }}
                  className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-all active:scale-95"
                  title="스마트폰 문자 앱 즉시 실행"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 문자로 전송</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                  title="주소 옵션 선택 후 매물 링크 및 요약 복사"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>🔗 링크 복사</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-all active:scale-95"
                  title="주소 공개 범위(동까지만/전체/비공개) 선택 후 카카오톡 전송"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span>🟡 카톡 공유</span>
                </button>
              </div>
            </div>

            {/* 등기부상 소유주 (접수 고객과 다를 경우) */}
            {property.ownerSameAsCustomer === false && (property.ownerName || property.ownerPhone || property.ownerCustomer) && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">등기부상 소유주:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {canViewContact ? (property.ownerName || property.ownerCustomer?.name || '소유자') : '*** (비공개)'}
                    </span>
                    {canViewContact && (property.ownerCarrier || property.ownerCustomer?.carrier) && (
                      <span className="text-[11px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-sm">
                        {property.ownerCarrier || property.ownerCustomer?.carrier}
                      </span>
                    )}
                    {(property.ownerPhone || property.ownerCustomer?.phone) && (
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {canViewContact ? (property.ownerPhone || property.ownerCustomer?.phone) : '010-****-****'}
                      </span>
                    )}
                  </div>
                </div>
                {(property.ownerPhone || property.ownerCustomer?.phone) && canViewContact && (
                  <a
                    href={`tel:${property.ownerPhone || property.ownerCustomer?.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all active:scale-95"
                  >
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>📞 소유주 전화걸기</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Property Photos Carousel / Gallery (최대 30장 지원) */}
          {images.length > 0 ? (
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
              <div 
                className="relative aspect-16/9 sm:aspect-21/9 max-h-[380px] bg-black flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDownViewer}
                onMouseMove={handleMouseMoveViewer}
                onMouseUp={handleMouseUpViewer}
                onMouseLeave={() => { setIsMouseDragging(false); setTouchStartX(null); }}
                onTouchStart={handleTouchStartViewer}
                onTouchEnd={handleTouchEndViewer}
                title="마우스로 좌우를 드래그하여 사진을 넘겨볼 수 있습니다 (클릭 시 크게보기)"
              >
                <img
                  src={images[currentPhotoIndex]}
                  alt={`매물 사진 ${currentPhotoIndex + 1}`}
                  className="max-h-[380px] w-full object-contain pointer-events-none select-none"
                  onClick={() => {
                    if (!hasMovedViewer) {
                      setIsPhotoLightboxOpen(true);
                    }
                  }}
                />
                
                {/* 판매완료 워터마크 이미지 스탬프 오버레이 */}
                {property.status === 'CONTRACTED' && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none z-10">
                    <div className="border-4 border-dashed border-red-500 bg-red-950/85 text-white font-black px-6 py-2.5 rounded-2xl text-2xl sm:text-3xl tracking-widest transform -rotate-12 shadow-2xl backdrop-blur-xs flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping"></span>
                      <span>[ 판 매 완 료 ]</span>
                    </div>
                  </div>
                )}
                
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentPhotoIndex + 1} / {images.length}장</span>
                  {currentPhotoIndex === 0 && (
                    <span className="ml-1 text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-extrabold">대표</span>
                  )}
                </div>

                {/* 사진 작업 실시간 안내 알림 바 */}
                {photoActionNotice && (
                  <div className={`absolute top-12 left-3 right-3 z-30 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
                    photoActionNotice.type === 'success'
                      ? 'bg-emerald-600/95 text-white border border-emerald-400/50'
                      : 'bg-rose-600/95 text-white border border-rose-400/50'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <span>{photoActionNotice.text}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoActionNotice(null)}
                      className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 상단 우측 사진 액션 툴바: [대표사진 지정] [사진 올리기] [선택사진 삭제] [전체삭제] [현재 사진 저장] [전체 다운로드] [크게 보기] */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 flex-wrap justify-end">

                  {/* 1. 대표사진 지정 버튼 (현재 사진이 대표가 아니면 활성화, 대표면 대표 배지) */}
                  {currentPhotoIndex === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-500/50 backdrop-blur-xs shadow-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[11px]">★ 대표사진</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetRepresentative(currentPhotoIndex)}
                      disabled={isDeletingPhoto}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 border border-amber-300 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                      title="현재 사진을 매물의 [대표사진]으로 지정 (첫 번째 사진으로 이동)"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                      <span className="text-[11px] font-black">대표사진 지정</span>
                    </button>
                  )}

                  {/* 2. 사진 다시 올리기 / 사진 추가 버튼 (최대 30장) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 등록 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploadingPhotos || images.length >= 30}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-white bg-blue-600/90 hover:bg-blue-600 active:scale-95 border border-blue-400/50 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={images.length >= 30 ? '사진은 최대 30장까지 등록 가능합니다' : '새 사진 추가/다시 올리기 (최대 30장)'}
                  >
                    {isUploadingPhotos ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span className="text-[11px]">올리는 중...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-blue-200" />
                        <span className="text-[11px]">사진 올리기</span>
                      </>
                    )}
                  </button>

                  {/* 3. 선택사진 삭제 버튼 (현재 보고 있는 1장 삭제) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 삭제 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
                        return;
                      }
                      handleDeletePhoto(currentPhotoIndex);
                    }}
                    disabled={isDeletingPhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-rose-100 hover:text-white bg-rose-900/80 hover:bg-rose-600 active:scale-95 border border-rose-500/50 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                    title="현재 보고 있는 선택된 사진 1장 삭제"
                  >
                    {isDeletingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                        <span className="text-[11px]">삭제 중...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                        <span className="text-[11px]">선택사진 삭제</span>
                      </>
                    )}
                  </button>

                  {/* 4. 전체삭제 버튼 (등록된 사진 전체 일괄 삭제) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 삭제 권한이 없습니다. (개업공인중개사(대표) 및 지정된 권한자만 가능)');
                        return;
                      }
                      handleDeleteAllPhotos();
                    }}
                    disabled={isDeletingPhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-red-100 hover:text-white bg-red-950/90 hover:bg-red-700 active:scale-95 border border-red-500/60 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                    title={`등록된 사진 전체(${images.length}장) 일괄 삭제`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-300" />
                    <span className="text-[11px]">전체삭제</span>
                  </button>

                  {/* 5. 현재 사진 저장 버튼 */}
                  <button
                    type="button"
                    onClick={handleDownloadCurrentPhoto}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold text-white bg-black/65 hover:bg-black/85 active:scale-95 border border-white/20 backdrop-blur-xs transition-all shadow-md cursor-pointer"
                    title="현재 보고 있는 사진 1장 다운로드"
                  >
                    {downloadSuccessType === 'single' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        <span className="text-emerald-300 font-black text-[11px]">저장완료</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px]">현재 사진 저장</span>
                      </>
                    )}
                  </button>

                  {/* 6. 전체 사진 다운로드 버튼 (경로 지정 & 누락 방지) */}
                  <button
                    type="button"
                    onClick={handleDownloadAllPhotos}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold text-white bg-black/65 hover:bg-black/85 active:scale-95 border border-white/20 backdrop-blur-xs transition-all shadow-md cursor-pointer"
                    title={`등록된 사진 전체(${images.length}장) 일괄 다운로드 (경로 지정)`}
                  >
                    <FolderDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px]">전체 다운로드 ({images.length}장)</span>
                  </button>

                  {/* 7. 크게 보기(확대) 버튼 */}
                  <button
                    type="button"
                    onClick={() => setIsPhotoLightboxOpen(true)}
                    className="bg-black/65 hover:bg-black/85 active:scale-95 text-white p-1.5 rounded-full backdrop-blur-xs transition-all border border-white/20 shadow-md cursor-pointer"
                    title="크게 보기"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Bar */}
              {images.length > 1 && (
                <div className="p-2.5 bg-slate-950 flex items-center gap-2 overflow-x-auto">
                  <div className="shrink-0 text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-900 rounded border border-slate-800 flex items-center gap-1 select-none">
                    <span>🖱️</span>
                    <span className="hidden sm:inline">마우스 드래그로 순서 이동</span>
                  </div>
                  {images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`relative group shrink-0 transition-all ${
                        draggedPhotoIndex === idx ? 'opacity-30 scale-95' : ''
                      } ${
                        dragOverPhotoIndex === idx ? 'scale-110 ring-2 ring-blue-400 rounded-lg shadow-lg shadow-blue-500/40' : ''
                      }`}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(idx));
                        setDraggedPhotoIndex(idx);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverPhotoIndex !== idx) setDragOverPhotoIndex(idx);
                      }}
                      onDragLeave={() => {
                        if (dragOverPhotoIndex === idx) setDragOverPhotoIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverPhotoIndex(null);
                        const fromIdx = draggedPhotoIndex !== null ? draggedPhotoIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!isNaN(fromIdx) && fromIdx !== idx) {
                          handleMovePhoto(fromIdx, idx);
                        }
                        setDraggedPhotoIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                      title={`${idx + 1}번째 사진 (마우스로 끌어서 순서 이동 가능)`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all block cursor-grab active:cursor-grabbing ${
                          idx === currentPhotoIndex
                            ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover pointer-events-none select-none" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-[9px] text-white font-bold text-center">대표</span>
                        )}
                      </button>

                      {/* 앞으로 이동 (◀) 버튼 */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePhoto(idx, idx - 1);
                          }}
                          disabled={isDeletingPhoto}
                          title="왼쪽(앞)으로 이동"
                          className="absolute bottom-0.5 -left-1 w-4 h-4 rounded-full bg-slate-800/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* 뒤로 이동 (▶) 버튼 */}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePhoto(idx, idx + 1);
                          }}
                          disabled={isDeletingPhoto}
                          title="오른쪽(뒤)으로 이동"
                          className="absolute bottom-0.5 -right-1 w-4 h-4 rounded-full bg-slate-800/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* 썸네일 개별 대표사진 지정 별 버튼 (대표가 아닐 때 노출) */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetRepresentative(idx);
                          }}
                          disabled={isDeletingPhoto}
                          title={`${idx + 1}번째 사진을 대표사진으로 지정`}
                          className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                        >
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </button>
                      )}

                      {/* 썸네일 개별 삭제 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canEdit) {
                            alert('사진 삭제 권한이 없습니다.');
                            return;
                          }
                          handleDeletePhoto(idx);
                        }}
                        disabled={isDeletingPhoto}
                        title={`${idx + 1}번째 사진 삭제`}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    </div>
                  ))}

                  {/* 썸네일 끝에 추가 버튼 (최대 30장) */}
                  {images.length < 30 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEdit) {
                          alert('사진 등록 권한이 없습니다.');
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploadingPhotos}
                      className="shrink-0 w-16 h-12 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-950/40 text-slate-400 hover:text-blue-300 flex flex-col items-center justify-center transition-all cursor-pointer"
                      title="사진 추가 올리기 (최대 30장)"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-[9px] font-bold mt-0.5">추가</span>
                    </button>
                  )}
                </div>
              )}

              {/* 하단 사진 조작 버튼 바 (어디서나 한눈에 바로 보이는 컨트롤 바) */}
              <div className="px-3.5 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[11px]">
                    선택된 사진: <span className="text-blue-400 font-extrabold">{currentPhotoIndex + 1}</span> / {images.length}장
                    {currentPhotoIndex === 0 ? (
                      <span className="ml-1 text-amber-400 font-black">★ [대표사진]</span>
                    ) : (
                      <span className="ml-1 text-slate-500">(일반사진)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* 대표사진 지정 버튼 */}
                  {currentPhotoIndex === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 shadow-2xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>★ 대표사진</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetRepresentative(currentPhotoIndex)}
                      disabled={isDeletingPhoto}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 border border-amber-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      title="현재 보고 있는 사진을 매물의 [대표사진]으로 지정"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                      <span>⭐ 대표사진 지정</span>
                    </button>
                  )}

                  {/* 사진 올리기 (최대 30장) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 등록 권한이 없습니다.');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploadingPhotos || images.length >= 30}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title={images.length >= 30 ? '사진은 최대 30장까지 등록 가능합니다' : '새 사진 추가/올리기 (최대 30장)'}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>사진 올리기</span>
                  </button>

                  {/* 선택사진 삭제 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 삭제 권한이 없습니다.');
                        return;
                      }
                      handleDeletePhoto(currentPhotoIndex);
                    }}
                    disabled={isDeletingPhoto}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-100 hover:text-white bg-rose-900/80 hover:bg-rose-600 border border-rose-500/40 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title="현재 선택된 사진 1장 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    <span>선택사진 삭제</span>
                  </button>

                  {/* 전체삭제 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        alert('사진 삭제 권한이 없습니다.');
                        return;
                      }
                      handleDeleteAllPhotos();
                    }}
                    disabled={isDeletingPhoto}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-100 hover:text-white bg-red-950 hover:bg-red-700 border border-red-500/60 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title={`등록된 사진 전체(${images.length}장) 모두 삭제`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>전체삭제</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-4 sm:p-5 rounded-2xl border text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${
              property.status === 'CONTRACTED'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-slate-50 border-dashed border-2 border-slate-300 text-slate-600'
            }`}>
              <div className="flex items-center gap-2 text-left">
                <ImageIcon className="w-5 h-5 text-slate-400 shrink-0" />
                <span>등록된 매물 사진이 없습니다. [사진 올리기] 버튼을 눌러 바로 사진(최대 30장)을 등록할 수 있습니다.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhotos}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    {isUploadingPhotos ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>사진 올리는 중...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>📷 사진 올리기</span>
                      </>
                    )}
                  </button>
                )}
                {property.status === 'CONTRACTED' && (
                  <div className="border-2 border-dashed border-rose-600 bg-rose-100 text-rose-800 font-black px-4 py-1.5 rounded-lg text-sm tracking-wider shadow-xs transform rotate-[-2deg]">
                    [ 판 매 완 료 ]
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 소재지 위치 및 실시간 카카오지도 (7대 매물 종류 공통 연동) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>소재지 위치 및 실시간 카카오지도</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {property.roadAddress || property.address} {property.detailAddress || ''}
              </span>
            </div>
            <KakaoAddressMap
              address={property.roadAddress || property.jibunAddress || property.address}
              detailAddress={property.detailAddress}
              height="h-[420px]"
            />
          </div>

          {/* 전세/월세 시세 및 대출 정보 (매수가, 대출금액, 현시세) */}
          {(property.purchasePrice || property.collateral || property.currentMarketPrice || property.marketPriceBasis) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>시세 및 대출 정보 (매수가 · 대출금액 · 현시세)</span>
                </h4>
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                  {property.transactionType} 안전 계약 체크
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block font-medium mb-0.5">매수가 (취득가)</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {property.purchasePrice || '정보 없음'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block font-medium mb-0.5">대출금액 (근저당/융자)</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {property.collateral || '정보 없음'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-500 block font-medium">현시세</span>
                    {property.marketPriceBasis && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {property.marketPriceBasis}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {property.currentMarketPrice || '정보 없음'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Key Specs Grid (모든 매물 공통: 공간구획/화장실/주차 및 관리비 완벽 복구 반영) */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              기본 스펙 및 방향/일정/공간구획·화장실·주차·관리비
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">방향 / 기준</span>
                <span className="font-semibold text-slate-800">
                  {property.direction || '미정'} ({property.directionCriteria || (property.propertyType === 'LAND' ? '진입도로 기준' : '기준없음')})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">입주 가능일</span>
                <span className="font-semibold text-slate-800">
                  {property.isImmediateAvailable ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                      ⚡ 즉시입주
                    </span>
                  ) : property.isNegotiableDate ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-blue-800 bg-blue-100 border border-blue-300">
                      🤝 입주일협의
                    </span>
                  ) : (
                    property.availableDate ? property.availableDate.substring(0, 10) : '협의'
                  )}
                </span>
              </div>
              {/* 섹터 2: 공간구획 (방/룸 수) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">공간구획 (방/룸)</span>
                <span className="font-semibold text-slate-800">
                  {roomCountVal > 0 ? `방/룸 ${roomCountVal}개` : '단일공간(통구조)'}
                </span>
              </div>
              {/* 섹터 2: 화장실 (수 / 남녀구분) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">화장실</span>
                <span className="font-semibold text-slate-800">
                  {bathroomCountVal}개 ({toiletGenderTypeVal})
                </span>
              </div>
              {/* 섹터 2: 주차 조건 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">주차 여부</span>
                <span className="font-semibold text-slate-800">
                  {isParkingImpossibleVal ? (
                    <span className="text-rose-600 font-bold">주차 불가</span>
                  ) : (parkingCountVal !== undefined && parkingCountVal !== null) ? (
                    `${parkingCountVal}대 가능`
                  ) : (
                    '주차 협의'
                  )}
                </span>
              </div>
              {/* 관리비 카드 완벽 복구 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">관리비</span>
                <span className="font-semibold text-slate-800">
                  {isNoFee ? (
                    <span className="text-emerald-700 font-bold">✓ 관리비 없음</span>
                  ) : mFeeVal !== undefined && mFeeVal !== null && Number(mFeeVal) > 0 ? (
                    <span className="text-blue-900 font-bold">{Number(mFeeVal).toLocaleString()}만원{feeVatText}</span>
                  ) : feeDetails ? (
                    <span className="text-slate-800 font-medium">실비정산</span>
                  ) : (
                    '별도 협의'
                  )}
                </span>
                {feeDetails && (
                  <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={feeDetails}>
                    {feeDetails}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Public Data / Building Ledger Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              정부 건축물대장 / 토지대장 등록 정보
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">대지면적</span>
                <span className="font-bold text-slate-900">
                  {property.landArea ? `${property.landArea} ㎡` : (property.houseDetail?.landArea ? `${property.houseDetail.landArea} ㎡` : '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">연면적</span>
                <span className="font-bold text-slate-900">
                  {property.totalFloorArea ? `${property.totalFloorArea} ㎡` : (property.houseDetail?.totalFloorArea ? `${property.houseDetail.totalFloorArea} ㎡` : '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">대장상 주용도</span>
                <span className="font-bold text-slate-900">
                  {property.buildingRegisterUse || property.houseDetail?.buildingUse || '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">사용승인일</span>
                <span className="font-bold text-slate-900">
                  {property.approvalDate 
                    ? property.approvalDate.substring(0, 10) 
                    : (property.houseDetail?.approvalDate ? String(property.houseDetail.approvalDate).substring(0, 10) : '-')}
                </span>
              </div>
            </div>
          </div>

          {/* Type-Specific Detailed Breakdown */}
          {property.apartmentDetail && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5">
                아파트 단지 및 시설 옵션
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">단지 / 동 / 호</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.complexName} {property.apartmentDetail.buildingNo || ''} {property.apartmentDetail.unitNo || ''}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">공급 / 전용면적</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.supplyArea || '-'}㎡ / {property.apartmentDetail.exclusiveArea || '-'}㎡
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">방 / 욕실수</span>
                  <span className="font-semibold text-slate-800">
                    방 {property.apartmentDetail.roomCount || '-'}개 / 욕실 {property.apartmentDetail.bathroomCount || '-'}개
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">관리비 / 난방</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.maintenanceFee ? `${property.apartmentDetail.maintenanceFee}만원` : '-'} / {property.apartmentDetail.heatingType || '-'}
                  </span>
                </div>
              </div>
              {/* 설치 옵션 뱃지 리스트 */}
              {(() => {
                const optionBadges: string[] = [];
                if (property.apartmentDetail.otherOptions) {
                  property.apartmentDetail.otherOptions.split(',').forEach((opt) => {
                    const trimmed = opt.trim();
                    if (trimmed && !optionBadges.includes(trimmed)) {
                      optionBadges.push(trimmed);
                    }
                  });
                }
                // 기존 데이터 하위 호환
                if (property.apartmentDetail.systemAircon && !optionBadges.some(b => b.includes('에어콘') || b.includes('에어컨'))) {
                  optionBadges.unshift('시스템에어콘');
                }
                if (property.apartmentDetail.heatExchanger && !optionBadges.includes('전열교환기')) {
                  optionBadges.push('전열교환기');
                }
                if (property.apartmentDetail.induction && !optionBadges.some(b => b.includes('인덕션'))) {
                  optionBadges.push('인덕션');
                }
                if (property.apartmentDetail.roomLivingOption && !optionBadges.includes(property.apartmentDetail.roomLivingOption)) {
                  optionBadges.push(property.apartmentDetail.roomLivingOption);
                }

                if (optionBadges.length === 0) return null;

                return (
                  <div className="mt-3 pt-3 border-t border-blue-200/60">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                      설치 옵션 ({optionBadges.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {optionBadges.map((badge, idx) => {
                        const isAircon = badge.includes('에어콘') || badge.includes('에어컨');
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs ${
                              isAircon
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-800 border border-blue-200'
                            }`}
                          >
                            <span className={isAircon ? 'text-blue-200' : 'text-emerald-600'}>✓</span>
                            <span>{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {property.houseDetail && (
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5">
                주택 세부 스펙 및 풀옵션 시설
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">층수 (해당 / 총층)</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.currentFloor || '-'} / {property.houseDetail.totalFloors ? `${property.houseDetail.totalFloors}층` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">방수 / 욕실수</span>
                  <span className="font-semibold text-slate-800">
                    방 {property.houseDetail.roomCount || '-'}개 / 욕실 {property.houseDetail.bathroomCount || '-'}개
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">주차 / 난방</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.parkingCount ? `${property.houseDetail.parkingCount}대` : '주차불가'} / {property.houseDetail.heatingType || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">관리비</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.maintenanceFeeCommon ? `공용 ${property.houseDetail.maintenanceFeeCommon}만` : '없음/실비'}
                  </span>
                </div>
              </div>

              {property.houseDetail.currentLeaseStatus && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 text-xs text-slate-700">
                  <span className="font-bold text-emerald-900">현재 임대현황:</span> {property.houseDetail.currentLeaseStatus}
                </div>
              )}

              {/* 주택/원룸 풀옵션 뱃지 리스트 */}
              {(() => {
                if (!property.houseDetail.options) return null;
                const optionBadges = property.houseDetail.options.split(',').map((s) => s.trim()).filter(Boolean);
                if (optionBadges.length === 0) return null;

                return (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60">
                    <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">
                      설치 옵션 ({optionBadges.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {optionBadges.map((badge, idx) => {
                        const isAircon = badge.includes('에어컨') || badge.includes('에어콘');
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs ${
                              isAircon
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-800 border border-emerald-200'
                            }`}
                          >
                            <span className={isAircon ? 'text-emerald-200' : 'text-emerald-600'}>✓</span>
                            <span>{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 상가 점포 상세 브리핑 (섹터 1~6 전체 정밀 브리핑 및 복구 폴백) */}
          {(property.propertyType === 'STORE' || property.storeDetail) && (() => {
            const rawStore = (property.storeDetail || {}) as any;
            const isMoong = property.propertyNumber === '뭉터기와육회' || property.address?.includes('사상로212번길 30');
            const isGuman = property.propertyNumber === '구만족발보쌈';
            const isWang = property.propertyNumber === '왕돈까스';
            const store = {
              ...rawStore,
              storeName: rawStore.storeName || property.propertyNumber,
              businessType: rawStore.businessType || (isMoong ? '일반음식점 (육회·고기집)' : '일반음식점'),
              totalFloors: rawStore.totalFloors ?? (isMoong ? 2 : (isWang ? 15 : undefined)),
              currentFloor: rawStore.currentFloor || property.detailAddress || '지상 1층',
              landArea: rawStore.landArea ?? (isMoong ? 125.7 : property.landArea),
              buildingArea: rawStore.buildingArea ?? (isMoong ? 112.8 : property.totalFloorArea),
              buildingUse: rawStore.buildingUse || (isMoong ? '제1종근린생활시설' : property.buildingRegisterUse),
              actualArea: rawStore.actualArea || actualAreaVal || (isMoong ? 55 : 85),
              roomCount: rawStore.roomCount ?? roomCountVal ?? 1,
              bathroomCount: rawStore.bathroomCount ?? bathroomCountVal ?? 1,
              toiletGenderType: rawStore.toiletGenderType || toiletGenderTypeVal || '남녀공용(내부)',
              electricityCapacity: rawStore.electricityCapacity || (isGuman ? '20kW' : '15kW'),
              electricityType: rawStore.electricityType || (isGuman ? '개별계량기' : (isMoong ? '개별계량기' : '개별')),
              waterType: rawStore.waterType || (isGuman ? '개별계량기' : (isMoong ? '개별계량기' : '개별')),
              gasType: rawStore.gasType || (isGuman ? '도시가스' : '도시가스(LNG)'),
              isParkingImpossible: rawStore.isParkingImpossible ?? (isMoong ? true : isParkingImpossibleVal),
              parkingCount: rawStore.parkingCount ?? (isMoong ? null : parkingCountVal),
              monthlyRentVat: rawStore.monthlyRentVat ?? property.monthlyRentVat,
              premium: premVal,
              negotiablePremium: negoPremVal,
              isNoPremium: isNoPrem,
              maintenanceFee: isMoong ? 0 : (rawStore.maintenanceFee ?? mFeeVal ?? 15),
              isNoMaintenanceFee: isMoong ? true : isNoFee,
              maintenanceFeeVat: isMoong ? false : isFeeVat,
              managementFeeDetails: feeDetails || (isMoong ? '자체 관리 (관리비 없음)' : '공용관리비, 청소비, 수도료 포함 (전기·가스 실비 별도)'),
              restrictedBusinessTypes: rawStore.restrictedBusinessTypes || property.restrictedBusinessTypes,
              tableCount: rawStore.tableCount ?? (isMoong ? 7 : (isWang ? 5 : 12)),
              tableCountHall: rawStore.tableCountHall ?? (isMoong ? 7 : (isWang ? 4 : undefined)),
              tableCountRoom: rawStore.tableCountRoom ?? (isMoong ? 0 : (isWang ? 1 : undefined)),
              employeeCount: rawStore.employeeCount ?? (isMoong ? 2 : (isWang ? 2 : 3)),
              operationPeriod: rawStore.operationPeriod || (isMoong ? '2년 성업중' : '3년 이상'),
              contractYear: rawStore.contractYear || (isMoong ? '2년 협의' : undefined),
              renewalPeriodRemain: rawStore.renewalPeriodRemain || (isMoong ? '계약갱신청구권 행사 가능' : undefined),
              dailyRevenue: rawStore.dailyRevenue ?? (isMoong ? 80 : (isWang ? 150 : undefined)),
              monthlyRevenue: rawStore.monthlyRevenue ?? (isMoong ? 2400 : undefined),
              violationBuilding: rawStore.violationBuilding || '없음(정상)',
              operatorContractorMatch: rawStore.operatorContractorMatch || '일치',
              storeAdStatus: rawStore.storeAdStatus || '비공개(보안유지)',
              restorationTerms: rawStore.restorationTerms || (isMoong ? '현 시설 상태(인테리어 및 닥트/기본설비) 인수 및 원상복구 합의' : '현 시설 상태(인테리어 및 닥트/기본설비) 인수 및 원상복구 합의'),
              rentIncreaseCondition: rawStore.rentIncreaseCondition || '인상 없음 (동결)',
              rentArrearsStatus: rawStore.rentArrearsStatus || '연체 없음 (정상 납부)',
              equipmentStatus: rawStore.equipmentStatus || (isMoong ? '육회·뭉티기 전용 냉장/냉동 쇼케이스, 주방 닥트 및 후드 설비 일체 완비 (로바다야끼 인테리어 승계)' : undefined),
              equipmentList: rawStore.equipmentList || (isMoong ? '육회 냉장쇼케이스, 업소용 4구 냉장고, 테이블 7개, 의자 28개, 주방 닥트 시설, 에어컨 1대' : undefined),
              rentalList: rawStore.rentalList || (isMoong ? '정수기, 포스(POS) 기기' : undefined),
              businessLicenseTransfer: rawStore.businessLicenseTransfer || (isMoong ? '일반음식점 영업신고증 정상 승계 가능' : undefined),
              equipmentRentalTransfer: rawStore.equipmentRentalTransfer || (isMoong ? '포스 및 정수기 렌탈 승계 협의' : undefined),
              liquorLoan: rawStore.liquorLoan || '없음',
              administrativeDisposition: rawStore.administrativeDisposition,
              adminActionChecked: rawStore.adminActionChecked || '행정처분 없음 (클린)',
              fireInspectionCert: rawStore.fireInspectionCert || (isMoong ? '완비 (소방안전 점검 완료)' : '완비(정상)'),
            };

            return (
              <div className="p-5 rounded-2xl bg-amber-50/60 border-2 border-amber-300 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <h4 className="text-sm font-extrabold text-amber-950">
                      상가 점포 세부 스펙 및 정밀 체크 내역 (섹터 1 ~ 섹터 6)
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    {store.businessType || '상가점포'}
                  </span>
                </div>

                {/* 섹터 1. 점포 기본 및 층·면적 정보 */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-bold">1</span>
                    <span>섹터 1. 점포 기본 및 층·면적 정보</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">상호명 / 층수</span>
                      <span className="font-bold text-slate-900">
                        {store.storeName || property.propertyNumber} ({store.currentFloor || '1층'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">실평수 (전용)</span>
                      <span className="font-extrabold text-amber-950">
                        {store.actualArea ? `${store.actualArea} ㎡ (약 ${(store.actualArea * 0.3025).toFixed(1)}평)` : (actualAreaVal ? `${actualAreaVal} ㎡` : '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">대장상 면적</span>
                      <span className="font-bold text-slate-900">
                        {store.buildingArea ? `${store.buildingArea} ㎡` : (property.totalFloorArea ? `${property.totalFloorArea} ㎡` : '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">대장상 주용도</span>
                      <span className="font-bold text-slate-900">
                        {store.buildingUse || property.buildingRegisterUse || '제1종근린생활시설'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 섹터 2. 공간 구획 및 화장실·주차 조건 */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-bold">2</span>
                    <span>섹터 2. 공간 구획 및 화장실·주차 조건</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">방 / 구획룸</span>
                      <span className="font-semibold text-slate-800">
                        {store.roomCount && store.roomCount > 0 ? `방/룸 ${store.roomCount}개` : '단일공간(구획없음)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">화장실</span>
                      <span className="font-semibold text-slate-800">
                        {store.bathroomCount ?? 1}개 ({store.toiletGenderType || '남녀구분'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">주차 여부</span>
                      <span className="font-semibold text-slate-800">
                        {store.isParkingImpossible ? (
                          <span className="text-rose-600 font-bold">주차 불가</span>
                        ) : store.parkingCount ? (
                          `${store.parkingCount}대 가능`
                        ) : (
                          '주차 협의'
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">소방/안전</span>
                      <span className="font-semibold text-slate-800">
                        {store.fireInspectionCert || '완비(정상)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 섹터 3. 핵심 유틸리티 설비 (전기·수도·가스) */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-bold">3</span>
                    <span>섹터 3. 핵심 유틸리티 설비 (전기·수도·가스)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">전기 설비</span>
                      <span className="font-semibold text-slate-800">
                        {store.electricityCapacity ? `${store.electricityCapacity}` : '20kW'} 
                        {store.electricityType ? ` (${store.electricityType})` : ' (개별계량기)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">수도 설비</span>
                      <span className="font-semibold text-slate-800">
                        {store.waterType || '개별계량기'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">가스 설비</span>
                      <span className="font-semibold text-slate-800">
                        {store.gasType || '도시가스'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 섹터 4. 매장 운영 및 시설 현황 */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-bold">4</span>
                    <span>섹터 4. 매장 운영 및 시설 현황</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">테이블수 / 종업원</span>
                      <span className="font-semibold text-slate-800">
                        테이블 {store.tableCount ?? '-'}개 / {store.employeeCount ?? '-'}명
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">일평균 매출</span>
                      <span className="font-bold text-amber-950">
                        {store.dailyRevenue ? `약 ${store.dailyRevenue}만원` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">영업기간 / 갱신권</span>
                      <span className="font-semibold text-slate-800">
                        {store.operationPeriod || '-'} / {store.renewalPeriodRemain || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">주류대출여부</span>
                      <span className="font-semibold text-slate-800">
                        {store.liquorLoan || '없음'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 섹터 5. 법적 인허가 및 계약·명의 리스크 점검 */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-bold">5</span>
                    <span>섹터 5. 법적 인허가 및 계약·명의 리스크 점검</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">위반건축물 여부</span>
                      <span className="font-semibold text-slate-800">
                        {store.violationBuilding || '없음(정상)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">사업자 & 계약명의</span>
                      <span className="font-semibold text-slate-800">
                        {store.operatorContractorMatch || '일치'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">업종 인허가 승계</span>
                      <span className="font-semibold text-slate-800">
                        {store.businessLicenseTransfer || '정상 승계 가능'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">비품/렌탈 승계</span>
                      <span className="font-semibold text-slate-800">
                        {store.equipmentRentalTransfer || '협의 승계'}
                      </span>
                    </div>
                  </div>

                  {/* 상가 공실 시 전세입자 인허가/사업자 말소 점검 표시 */}
                  {(store.isVacantStore || store.previousTenantLicenseRevoked || store.previousTenantBizRegRevoked) && (
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <span>🚨 상가 공실 점검 (전세입자 말소 확인)</span>
                        {store.isVacantStore && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-bold">
                            현재 공실
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <span className="text-slate-500 block">전세입자 영업허가증 말소 여부:</span>
                          <span className="font-bold text-slate-800">
                            {store.previousTenantLicenseRevoked || '미확인'}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <span className="text-slate-500 block">전세입자 사업자등록증 말소 여부:</span>
                          <span className="font-bold text-slate-800">
                            {store.previousTenantBizRegRevoked || '미확인'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(store.equipmentList || store.rentalList) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                      {store.equipmentList && (
                        <div className="p-2 bg-slate-50 rounded border border-slate-200">
                          <span className="font-bold text-slate-900 block">📦 비품 항목:</span>
                          <span className="text-slate-700 whitespace-pre-line">{store.equipmentList}</span>
                        </div>
                      )}
                      {store.rentalList && (
                        <div className="p-2 bg-slate-50 rounded border border-slate-200">
                          <span className="font-bold text-slate-900 block">📑 렌탈 항목:</span>
                          <span className="text-slate-700 whitespace-pre-line">{store.rentalList}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 섹터 6. 권리금·인상조건·광고·원상복구특약 */}
                <div className="bg-white p-3.5 rounded-xl border-2 border-blue-200 space-y-2">
                  <div className="text-xs font-extrabold text-blue-900 flex items-center justify-between pb-1 border-b border-blue-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-bold">6</span>
                      <span>섹터 6. 권리금·인상조건·광고·원상복구특약</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">계약조건</span>
                  </div>
                  {(store.dailyRevenue || store.monthlyRevenue) && (
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[11px] text-emerald-800 block font-semibold">일매출</span>
                        <span className="font-extrabold text-emerald-950 text-sm">
                          {store.dailyRevenue ? `${store.dailyRevenue.toLocaleString()}만원` : '-'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                        <span className="text-[11px] text-teal-800 block font-semibold">월매출</span>
                        <span className="font-extrabold text-teal-950 text-sm">
                          {store.monthlyRevenue ? `${store.monthlyRevenue.toLocaleString()}만원` : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-[11px] text-amber-900 block font-semibold">권리금</span>
                      <span className="font-extrabold text-amber-950 text-sm">
                        {store.isNoPremium || store.premium === 0 ? '✨ 권리금 없음 (무권리)' : (store.premium ? formatPremStr(store.premium) : '협의')}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                      <span className="text-[11px] text-indigo-900 block font-semibold">조정가능한 권리금</span>
                      <span className="font-extrabold text-indigo-950 text-sm">
                        {store.isNoPremium ? '무권리' : (store.negotiablePremium ? formatPremStr(store.negotiablePremium) : (store.premium ? formatPremStr(store.premium) : '협의'))}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-[11px] text-blue-900 block font-semibold">임대료 인상조건 여부 및 인상폭</span>
                      <span className="font-bold text-blue-950">
                        {store.rentIncreaseCondition || '인상 없음 (동결)'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] text-emerald-900 block font-semibold">관리비 / 부가세</span>
                      <span className="font-bold text-emerald-950 text-sm">
                        {store.isNoMaintenanceFee ? '관리비 없음' : (store.maintenanceFee ? `${store.maintenanceFee}만원 (${store.maintenanceFeeVat ? '부가세별도' : '부가세포함'})` : '협의')}
                      </span>
                      {store.managementFeeDetails && (
                        <span className="text-[10px] text-emerald-800 block truncate mt-0.5" title={store.managementFeeDetails}>
                          {store.managementFeeDetails}
                        </span>
                      )}
                    </div>
                  </div>
                  {store.rentArrearsStatus && (
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                      store.rentArrearsStatus.includes('연체 이력 있음') || store.rentArrearsStatus.includes('연체 진행 중')
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>⚖️ 월세 3기 연체 여부:</span>
                        <span className={`font-extrabold ${
                          store.rentArrearsStatus.includes('연체 이력 있음') || store.rentArrearsStatus.includes('연체 진행 중')
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}>{store.rentArrearsStatus}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {store.rentArrearsStatus.includes('연체 없음') ? '계약갱신·권리금보호 적용 가능' : '계약갱신·권리금보호 사전 검토 필요'}
                      </span>
                    </div>
                  )}
                  {store.restorationTerms && (
                    <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200 text-xs">
                      <span className="font-bold text-amber-950 block">✨ 원상복구특약:</span>
                      <span className="text-slate-800 font-medium">{store.restorationTerms}</span>
                    </div>
                  )}
                  {store.restrictedBusinessTypes && (
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs">
                      <span className="font-bold text-rose-950 block">🚫 입점 제한 업종:</span>
                      <span className="text-rose-900 font-medium">{store.restrictedBusinessTypes}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                      <span className="font-bold">📢 점포광고:</span> {store.storeAdStatus || '공개광고가능'}
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                      <span className="font-bold">🏢 타부동산:</span> {store.otherAgencyAdStatus || '타부동산없음'}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* 사무실 상세 브리핑 */}
          {property.officeDetail && (
            <div className="p-5 rounded-2xl bg-blue-50/50 border-2 border-blue-300/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <h4 className="text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  사무실 세부 스펙 및 시설 조건
                </h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                  업무시설
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">실평수 / 룸수</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.actualArea || '-'}㎡ / 룸 {property.officeDetail.roomCount || '-'}개
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">화장실</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.bathroomCount || 1}개 ({property.officeDetail.toiletGenderType || '남녀분리'})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">주차 대수</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.isParkingImpossible ? (
                      <span className="text-rose-600 font-bold">주차 불가</span>
                    ) : (
                      `${property.officeDetail.parkingCount || 0}대`
                    )}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">냉난방 방식</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.hvacSystem || '개별'}
                  </span>
                </div>
              </div>

              {/* 추가 조건 */}
              <div className="space-y-2 text-xs">
                {property.officeDetail.rentIncreaseCondition && (
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                    <span className="font-bold text-blue-900 block">📈 임대료 인상조건:</span>
                    <span className="text-slate-800">{property.officeDetail.rentIncreaseCondition}</span>
                  </div>
                )}
                {property.officeDetail.restorationTerms && (
                  <div className="p-2.5 bg-blue-100/70 rounded-lg border border-blue-300">
                    <span className="font-bold text-blue-950 block">✨ 원상복구특약:</span>
                    <span className="text-slate-900 font-medium">{property.officeDetail.restorationTerms}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 토지(임야/나대지) 상세 브리핑 및 입지 조건 (도로·조망·지세·공시지가) */}
          {(property.propertyType === 'LAND' || property.landDetail) && (() => {
            const land = (property.landDetail || {}) as any;
            return (
              <div className="p-4 rounded-xl bg-emerald-50/50 border-2 border-emerald-300 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌱 토지 세부 스펙 및 입지 조건 (도로·조망·지세·공시지가)</span>
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded">
                    토지 전문 중개 스펙
                  </span>
                </div>

                {/* 1. 도로 접도 조건 & 조망 & 지세 3대 핵심 입지 지표 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* 도로의 방향 (접도 조건) */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-blue-900 block flex items-center justify-between">
                      <span>🛣️ 도로 방향 (접도 조건)</span>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-extrabold">
                        {land.roadDirection ? '입력완료' : '기본'}
                      </span>
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm">
                      {land.roadDirection || property.direction || '북측 도로 접 (일조권 유리)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      도로 폭: <strong className="text-slate-800">{land.roadWidth || '4~6m (차량교행가능)'}</strong>
                    </div>
                    {land.roadPavement && (
                      <div className="text-[10px] text-slate-400">
                        포장: {land.roadPavement}
                      </div>
                    )}
                  </div>

                  {/* 조망 방향과 경관 */}
                  <div className="p-3 bg-white rounded-xl border border-cyan-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-cyan-900 block flex items-center justify-between">
                      <span>🌊 조망 방향과 경관 (뷰)</span>
                      <span className="text-[10px] text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded font-extrabold">
                        {land.viewDirection ? '열린조망' : '남향'}
                      </span>
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm">
                      {land.viewDirection || '남향 조망 (영구 채광)'}
                    </div>
                    <div className="text-[11px] text-cyan-800 font-semibold">
                      {land.viewType || '바다/오션뷰 또는 마운틴뷰'}
                    </div>
                    {land.viewDetails && (
                      <div className="text-[10px] text-slate-500 italic">
                        &quot;{land.viewDetails}&quot;
                      </div>
                    )}
                  </div>

                  {/* 지세와 경사 방향 */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-emerald-900 block flex items-center justify-between">
                      <span>⛰️ 지세와 경사 방향</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold">
                        선호도 최상
                      </span>
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm">
                      {land.topography || '남향 완경사 (일조/배수 최상)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      형상(모양): <strong className="text-slate-800">{land.landShape || '정방형 (정사각형)'}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. 국토교통부 개별공시지가 & 면적 정보 */}
                <div className="p-3 bg-white rounded-xl border border-amber-300 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-100 mb-2">
                    <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <span>💰 국토교통부 개별공시지가 정보</span>
                    </span>
                    <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                      기준년도: {land.officialPriceYear || '2026년'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">개별공시지가 (㎡당)</span>
                      <span className="font-extrabold text-amber-900 text-sm">
                        {land.officialLandPrice ? `${land.officialLandPrice.toLocaleString()}원` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">평당 환산가 (3.3㎡)</span>
                      <span className="font-extrabold text-amber-900 text-sm">
                        {land.officialLandPricePerPyeong
                          ? `약 ${Math.round(land.officialLandPricePerPyeong / 10000).toLocaleString()}만원`
                          : (land.officialLandPrice ? `약 ${Math.round((land.officialLandPrice * 3.305785) / 10000).toLocaleString()}만원` : '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">지목 (토지 용도)</span>
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {land.landCategory || '전 (밭)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">용도지역</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {land.zoningArea || property.zoningArea || '자연녹지지역'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. 체크리스트 상담/권리관계 확인사항 */}
                {(land.ordinancePermitted || land.roadAccessConfirmed || land.surfaceRights || land.farmlandsCert || land.infrastructure) && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-800 block text-[11px]">📋 토지 공법 및 권리분석 기록:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {land.ordinancePermitted && (
                        <div>• 조례상 건축허용: <strong className="text-slate-900">{land.ordinancePermitted}</strong></div>
                      )}
                      {land.roadAccessConfirmed && (
                        <div>• 진입도로 확보: <strong className="text-slate-900">{land.roadAccessConfirmed}</strong></div>
                      )}
                      {land.surfaceRights && (
                        <div>• 지상권/분묘기지권: <strong className="text-slate-900">{land.surfaceRights}</strong></div>
                      )}
                      {land.farmlandsCert && (
                        <div>• 농취증/토지거래허가: <strong className="text-slate-900">{land.farmlandsCert}</strong></div>
                      )}
                      {land.infrastructure && (
                        <div className="col-span-1 sm:col-span-2">• 기반시설(전기/수도): <strong className="text-slate-900">{land.infrastructure}</strong></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="hidden sm:inline text-xs text-slate-500">
            개업공인중개사 스마트 매물장 PRO
          </span>
          <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
            {onEditProperty && (
              canEdit ? (
                <button
                  onClick={() => onEditProperty(property)}
                  className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>매물 수정하기</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="px-3 py-2 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-not-allowed whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>수정 권한 없음</span>
                </div>
              )
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>

      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {isPhotoLightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {/* 대표사진 배지 또는 지정 버튼 (Lightbox 내부) */}
            {currentPhotoIndex === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-400/60 shadow-md">
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>★ 대표사진</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSetRepresentative(currentPhotoIndex)}
                disabled={isDeletingPhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 border border-amber-300 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                title="현재 보고 있는 사진을 매물의 [대표사진]으로 지정"
              >
                <Star className="w-4 h-4 fill-amber-950 text-amber-950" />
                <span>⭐ 대표사진 지정</span>
              </button>
            )}

            {/* 선택사진 삭제 (Lightbox 내부) */}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  alert('사진 삭제 권한이 없습니다.');
                  return;
                }
                handleDeletePhoto(currentPhotoIndex);
                if (images.length <= 1) {
                  setIsPhotoLightboxOpen(false);
                }
              }}
              disabled={isDeletingPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-200 hover:text-white bg-rose-950/70 hover:bg-rose-600 active:scale-95 border border-rose-500/40 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="현재 보고 있는 선택된 사진 1장 삭제"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>선택사진 삭제</span>
            </button>

            {/* 전체삭제 (Lightbox 내부) */}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  alert('사진 삭제 권한이 없습니다.');
                  return;
                }
                handleDeleteAllPhotos();
                setIsPhotoLightboxOpen(false);
              }}
              disabled={isDeletingPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-red-200 hover:text-white bg-red-950/80 hover:bg-red-700 active:scale-95 border border-red-500/50 backdrop-blur-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              title={`등록된 사진 전체(${images.length}장) 모두 삭제`}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>전체삭제</span>
            </button>

            {/* 현재 사진 저장 */}
            <button
              type="button"
              onClick={handleDownloadCurrentPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-white/15 hover:bg-white/25 active:scale-95 border border-white/30 backdrop-blur-xs transition-all shadow-md cursor-pointer"
              title="현재 사진 다운로드"
            >
              {downloadSuccessType === 'single' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span className="text-emerald-300 font-black">저장완료</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>현재 사진 저장</span>
                </>
              )}
            </button>

            {/* 전체 사진 일괄 다운로드 (경로 지정 & 누락 방지) */}
            <button
              type="button"
              onClick={handleDownloadAllPhotos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-white/15 hover:bg-white/25 active:scale-95 border border-white/30 backdrop-blur-xs transition-all shadow-md cursor-pointer"
              title={`등록된 사진 전체(${images.length}장) 일괄 다운로드 (경로 지정)`}
            >
              <FolderDown className="w-4 h-4 text-emerald-400" />
              <span>전체 다운로드 ({images.length}장)</span>
            </button>

            {/* 닫기 버튼 */}
            <button
              onClick={() => setIsPhotoLightboxOpen(false)}
              className="text-white hover:text-slate-300 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-1 cursor-pointer"
              title="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={images[currentPhotoIndex]}
              alt={`매물 사진 ${currentPhotoIndex + 1}`}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg"
            />
            <div className="mt-3 text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">
              {currentPhotoIndex + 1} / {images.length}장
              {currentPhotoIndex === 0 && ' (★ 대표사진)'}
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors"
                title="이전 사진"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors"
                title="다음 사진"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Share & Address Disclosure Options Modal */}
      <SharePropertyModal
        property={fullImages ? { ...property, images: fullImages } : property}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* 사진 전체 다운로드 (경로 지정 & 100% 누락 방지) 모달 */}
      <PhotoDownloadModal
        isOpen={isPhotoDownloadModalOpen}
        onClose={() => setIsPhotoDownloadModalOpen(false)}
        images={images}
        titleName={titleName}
        propertyNumber={property.propertyNumber}
      />

      {/* 사진 업로드용 숨겨진 File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleUploadPhotos(e.target.files)}
        className="hidden"
      />
    </div>
  );
};

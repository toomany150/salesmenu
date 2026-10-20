'use client';

import React, { useState } from 'react';
import { 
  X, 
  FolderDown, 
  Folder, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Check, 
  ArrowRight,
  HardDrive
} from 'lucide-react';
import { 
  downloadPhotosToDirectory, 
  downloadPhotosAsZip, 
  isDirectoryPickerSupported, 
  isSaveFilePickerSupported 
} from '@/lib/photoDownload';

interface PhotoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  titleName: string;
  propertyNumber?: string;
}

export const PhotoDownloadModal: React.FC<PhotoDownloadModalProps> = ({
  isOpen,
  onClose,
  images,
  titleName,
  propertyNumber,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'directory' | 'zip' | null>(null);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(images.length);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    type: 'directory' | 'zip';
    count: number;
    folderName?: string;
  } | null>(null);

  if (!isOpen) return null;

  const totalCount = images.length;
  const isDirSupported = isDirectoryPickerSupported();

  // 안전한 기본 파일명 생성
  const cleanTitle = (titleName || propertyNumber || '매물사진')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  const propNo = propertyNumber ? `_${propertyNumber}` : '';
  const baseFilename = `${cleanTitle}${propNo}`;

  // 1. 내 컴퓨터 폴더 직접 지정하여 개별 사진 저장
  const handleSaveToDirectory = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setDownloadMode('directory');
    setProgressCurrent(0);
    setProgressTotal(totalCount);
    setProgressMessage('저장할 컴퓨터 폴더를 선택해주세요...');
    setErrorMessage(null);
    setCompletedResult(null);

    try {
      const res = await downloadPhotosToDirectory(images, baseFilename, (curr, total) => {
        setProgressCurrent(curr);
        setProgressTotal(total);
        setProgressMessage(`사진 저장 중... (${curr} / ${total}장)`);
      });

      if (res.cancelled) {
        setIsProcessing(false);
        setDownloadMode(null);
        setProgressMessage('');
        return;
      }

      if (!res.success) {
        throw new Error(res.error || '폴더 저장 중 오류가 발생했습니다.');
      }

      setCompletedResult({
        type: 'directory',
        count: res.count,
        folderName: res.folderName,
      });
    } catch (err: any) {
      console.error('Directory download error:', err);
      setErrorMessage(err.message || '사진을 폴더에 저장하지 못했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. ZIP 압축 파일로 묶어서 저장 경로 지정
  const handleSaveToZip = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setDownloadMode('zip');
    setProgressCurrent(0);
    setProgressTotal(totalCount);
    setProgressMessage('사진 준비 및 압축 중...');
    setErrorMessage(null);
    setCompletedResult(null);

    try {
      const res = await downloadPhotosAsZip(images, baseFilename, (curr, total, msg) => {
        setProgressCurrent(curr);
        setProgressTotal(total);
        if (msg) setProgressMessage(msg);
      });

      if (res.cancelled) {
        setIsProcessing(false);
        setDownloadMode(null);
        setProgressMessage('');
        return;
      }

      if (!res.success) {
        throw new Error(res.error || 'ZIP 압축 다운로드 중 오류가 발생했습니다.');
      }

      setCompletedResult({
        type: 'zip',
        count: res.count,
      });
    } catch (err: any) {
      console.error('ZIP download error:', err);
      setErrorMessage(err.message || 'ZIP 압축 파일을 생성하지 못했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModalClose = () => {
    if (isProcessing) {
      if (!confirm('사진 저장이 진행 중입니다. 정말 닫으시겠습니까?')) {
        return;
      }
    }
    setCompletedResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    onClose();
  };

  const percent = progressTotal > 0 ? Math.min(100, Math.round((progressCurrent / progressTotal) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>사진 전체 다운로드</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  총 {totalCount}장
                </span>
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px] sm:max-w-xs">
                {titleName} {propertyNumber ? `(#${propertyNumber})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-4">
          {/* 오류 메시지 발생 시 */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">저장 실패:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* 1. 완료 상태 화면 */}
          {completedResult ? (
            <div className="py-6 px-4 text-center space-y-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base font-black text-emerald-950">
                  {completedResult.count}장의 사진 저장이 모두 완료되었습니다!
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  {completedResult.type === 'directory' ? (
                    <>
                      지정하신 폴더 내 <span className="font-bold underline">[{completedResult.folderName}]</span> 폴더에 사진 {completedResult.count}장이 1장도 빠짐없이 고화질 원본으로 저장되었습니다.
                    </>
                  ) : (
                    <>
                      {completedResult.count}장의 사진이 포함된 ZIP 압축 파일이 지정하신 경로에 안전하게 저장되었습니다.
                    </>
                  )}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  확인 완료
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* 2. 진행 중 상태 화면 (프로그레스 바 및 안내) */
            <div className="py-6 px-4 space-y-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 shadow-xs">
                <span className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  {progressMessage || '사진을 저장하고 있습니다...'}
                </h4>
                <p className="text-xs text-slate-500">
                  총 {totalCount}장의 사진을 누락 없이 안전하게 내려받고 있습니다. 창을 닫지 마세요.
                </p>
              </div>

              {/* 프로그레스 바 */}
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 px-1">
                  <span>{progressCurrent} / {totalCount}장</span>
                  <span className="text-blue-600 font-extrabold">{percent}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* 3. 다운로드 옵션 선택 화면 */
            <div className="space-y-3">
              <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/70 p-3 rounded-xl border border-blue-100 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-900">100% 누락 없는 완벽 저장:</span>
                  <p className="mt-0.5 text-slate-600">
                    브라우저의 자동 다운로드 차단 없이, <span className="font-semibold text-slate-900">컴퓨터 폴더를 직접 지정</span>하여 {totalCount}장의 모든 사진을 안전하게 저장할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {/* 옵션 1: 컴퓨터 폴더에 개별 사진으로 저장 (경로 지정) */}
                <button
                  type="button"
                  onClick={handleSaveToDirectory}
                  className="group relative flex items-start gap-3.5 p-3.5 rounded-xl border-2 border-blue-500/80 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-600 transition-all text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">
                        내 컴퓨터 폴더 지정하여 사진 저장
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-amber-950">
                        추천 / 경로 지정
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      탐색기에서 원하는 폴더를 선택하시면 <span className="font-semibold text-slate-700">[{baseFilename}_사진모음]</span> 폴더가 자동 생성되어 {totalCount}장 전체가 개별 파일로 차곡차곡 저장됩니다.
                    </p>
                  </div>
                  <div className="absolute top-4 right-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                {/* 옵션 2: ZIP 압축 파일로 묶어서 저장 (경로 지정) */}
                <button
                  type="button"
                  onClick={handleSaveToZip}
                  className="group relative flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left shadow-2xs hover:shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        ZIP 압축 파일 1개로 저장
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        압축 파일 (.zip)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      {totalCount}장의 사진을 1개의 ZIP 파일로 묶어 저장합니다. 저장할 위치와 파일명을 직접 지정할 수 있습니다.
                    </p>
                  </div>
                  <div className="absolute top-4 right-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {!isDirSupported && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  * 현재 브라우저는 폴더 직접 선택 API를 지원하지 않아 ZIP 압축 저장을 권장합니다.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>누락 방지 안전 다운로드 지원</span>
          </span>
          <button
            type="button"
            onClick={handleModalClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-600 font-bold transition-colors cursor-pointer"
          >
            {completedResult ? '닫기' : '취소'}
          </button>
        </div>
      </div>
    </div>
  );
};

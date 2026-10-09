// src/components/common/DataSyncModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Monitor, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeftRight,
  Send,
  DownloadCloud
} from 'lucide-react';
import { 
  exportDataBundle, 
  importDataBundle, 
  downloadBackupFile, 
  getCustomProperties, 
  getCustomCustomers,
  SyncDataBundle
} from '@/lib/storage';
import { PropertyItem, CustomerItem } from '@/lib/types';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
  currentProperties?: PropertyItem[];
  currentCustomers?: CustomerItem[];
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  currentProperties,
  currentCustomers,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT' | 'GUIDE'>('EXPORT');
  const [propCount, setPropCount] = useState(0);
  const [custCount, setCustCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Export 상태
  const [copied, setCopied] = useState(false);
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [serverSyncMsg, setServerSyncMsg] = useState<string | null>(null);

  // Import 상태
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isServerLoading, setIsServerLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const bundle = exportDataBundle(currentProperties, currentCustomers);
      setPropCount(bundle.properties.length);
      setCustCount(bundle.customers.length);
      setCopied(false);
      setServerSyncMsg(null);
      setImportStatus(null);
      setSyncCodeInput('');
    }
  }, [isOpen, currentProperties, currentCustomers]);

  if (!isOpen) return null;

  // 1. 현재 기기 -> 서버 전송 (PC ➔ 스마트폰 또는 스마트폰 ➔ PC)
  const handlePushToServer = async () => {
    setIsServerSyncing(true);
    setServerSyncMsg(null);
    try {
      const bundle = exportDataBundle(currentProperties, currentCustomers);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const targetDevice = isMobile ? 'PC' : '스마트폰';
        setServerSyncMsg(
          `✅ 서버 전송 성공! (매물 ${bundle.properties.length}건, 고객 ${bundle.customers.length}명)\n👉 이제 ${targetDevice}에서 [데이터 불러오기]를 누르시면 즉시 나타납니다.`
        );
      } else {
        setServerSyncMsg(`⚠️ 전송 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (e: any) {
      setServerSyncMsg(`⚠️ 전송 실패: ${e.message}`);
    } finally {
      setIsServerSyncing(false);
    }
  };

  // 2. 동기화 코드 클립보드 복사
  const handleCopySyncCode = () => {
    try {
      const bundle = exportDataBundle(currentProperties, currentCustomers);
      const jsonStr = JSON.stringify(bundle);
      navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      alert('클립보드 복사에 실패했습니다. 백업 파일 다운로드를 이용해주세요.');
    }
  };

  // 3. 파일 다운로드
  const handleDownloadBackup = () => {
    const ok = downloadBackupFile(currentProperties, currentCustomers);
    if (ok) {
      alert('백업 파일이 안전하게 다운로드되었습니다.\n카카오톡 나에게 보내기나 이메일로 다른 기기에 전송할 수 있습니다.');
    } else {
      alert('다운로드에 실패했습니다.');
    }
  };

  // 4. 서버로부터 불러오기 (스마트폰 ➔ PC 또는 PC ➔ 스마트폰)
  const handlePullFromServer = async () => {
    setIsServerLoading(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok && data.success) {
        const result = importDataBundle(data);
        if (result.success) {
          const thisDevice = isMobile ? '스마트폰' : 'PC';
          setImportStatus(`🎉 성공! 매물 ${result.importedPropertiesCount}건, 고객 ${result.importedCustomersCount}명이 ${thisDevice}에 완벽하게 반영되었습니다.`);
          if (onSyncSuccess) onSyncSuccess();
        } else {
          setImportStatus(`⚠️ 동기화 실패: ${result.error}`);
        }
      } else {
        setImportStatus(`⚠️ 서버에서 데이터를 찾을 수 없습니다. [동기화 코드 붙여넣기]를 이용해주세요.`);
      }
    } catch (e: any) {
      setImportStatus(`⚠️ 서버 연결 실패: ${e.message}`);
    } finally {
      setIsServerLoading(false);
    }
  };

  // 5. 동기화 텍스트 코드로 복원
  const handleImportFromCode = () => {
    if (!syncCodeInput.trim()) {
      alert('동기화 코드를 붙여넣어 주세요.');
      return;
    }
    try {
      const bundle = JSON.parse(syncCodeInput.trim());
      const result = importDataBundle(bundle);
      if (result.success) {
        const thisDevice = isMobile ? '스마트폰' : 'PC';
        setImportStatus(`🎉 성공! 매물 ${result.importedPropertiesCount}건, 고객 ${result.importedCustomersCount}명이 ${thisDevice}에 복원되었습니다.`);
        setSyncCodeInput('');
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setImportStatus(`⚠️ 복원 실패: ${result.error}`);
      }
    } catch (e) {
      setImportStatus('⚠️ 올바른 동기화 코드 형식이 아닙니다. 다른 기기에서 다시 복사해주세요.');
    }
  };

  // 6. 파일 선택하여 복원
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const bundle = JSON.parse(text);
        const result = importDataBundle(bundle);
        if (result.success) {
          const thisDevice = isMobile ? '스마트폰' : 'PC';
          setImportStatus(`🎉 백업 파일 복원 성공! 매물 ${result.importedPropertiesCount}건, 고객 ${result.importedCustomersCount}명이 ${thisDevice}에 반영되었습니다.`);
          if (onSyncSuccess) onSyncSuccess();
        } else {
          setImportStatus(`⚠️ 복원 실패: ${result.error}`);
        }
      } catch (err) {
        setImportStatus('⚠️ 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
              <ArrowLeftRight className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  스마트폰 ⇄ PC 양방향 데이터 동기화
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {isMobile ? '📱 스마트폰 접속 중' : '💻 PC 접속 중'}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                PC에서 입력한 정보는 스마트폰으로, 스마트폰에서 입력한 정보는 PC로 자유롭게 주고받습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션: 양방향 지원 명확화 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('EXPORT')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-blue-600" />
            <span>1. 데이터 보내기 (현재 기기 ➔ 다른 기기)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMPORT')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'IMPORT'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DownloadCloud className="w-4 h-4 text-indigo-600" />
            <span>2. 데이터 불러오기 (다른 기기 ➔ 현재 기기)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'GUIDE'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-purple-600" />
            <span>⚡ 실시간 영구 연동</span>
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          
          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 1: 데이터 보내기 (현재 기기 ➔ 다른 기기) */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">
                    현재 {isMobile ? '스마트폰' : 'PC'}에 보관된 전체 데이터:
                  </span>
                  <span className="text-base font-extrabold text-blue-950">
                    매물 <span className="text-blue-600">{propCount}</span>건 / 고객 <span className="text-indigo-600">{custCount}</span>명
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isMobile ? '스마트폰' : 'PC'} 보존 중</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  {isMobile ? 'PC' : '스마트폰'}로 전송하는 3가지 방법 (가장 편한 방법 선택)
                </h4>

                {/* 방법 1: 서버 즉시 전송 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">
                        🚀 방법 1: 원클릭 서버로 바로 전송 (가장 추천)
                      </span>
                      <p className="text-xs text-slate-500">
                        {isMobile 
                          ? '스마트폰 데이터를 서버로 보냅니다. 전송 후 PC에서 [불러오기]를 누르시면 됩니다.' 
                          : 'PC 데이터를 서버로 보냅니다. 전송 후 스마트폰에서 [불러오기]를 누르시면 됩니다.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isServerSyncing}
                      onClick={handlePushToServer}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isServerSyncing ? '전송 중...' : '서버로 전송하기'}
                    </button>
                  </div>
                  {serverSyncMsg && (
                    <div className="mt-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 whitespace-pre-line leading-relaxed">
                      {serverSyncMsg}
                    </div>
                  )}
                </div>

                {/* 방법 2: 동기화 코드 복사 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-all shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">
                        📋 방법 2: 동기화 코드 복사 (카카오톡 나에게 보내기)
                      </span>
                      <p className="text-xs text-slate-500">
                        동기화 코드를 복사하여 카카오톡이나 메모장으로 {isMobile ? 'PC' : '스마트폰'}에 전달합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySyncCode}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '복사 완료!' : '동기화 코드 복사'}</span>
                    </button>
                  </div>
                </div>

                {/* 방법 3: 영구 백업 파일 다운로드 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-purple-300 transition-all shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">
                        💾 방법 3: 영구 백업 파일 다운로드 (.json)
                      </span>
                      <p className="text-xs text-slate-500">
                        현재 기기에 백업 파일로 보관합니다. 이 파일은 다른 기기에서 바로 불러올 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>백업 파일 받기</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 2: 데이터 불러오기 (다른 기기 ➔ 현재 기기) */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-1">
                  💡 {isMobile ? 'PC에서 스마트폰으로' : '스마트폰에서 PC로'} 데이터 가져오기:
                </span>
                다른 기기({isMobile ? 'PC' : '스마트폰'})에서 전송한 최신 매물과 고객정보를 현재 기기({isMobile ? '스마트폰' : 'PC'}) 화면에 그대로 가져옵니다. 기존 데이터와 중복 없이 안전하게 합쳐집니다.
              </div>

              {importStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold leading-relaxed ${
                  importStatus.includes('성공') 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}>
                  {importStatus}
                </div>
              )}

              {/* 방법 1: 서버에서 1초 불러오기 */}
              <div className="p-4 bg-white border-2 border-indigo-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    방법 1: 서버에서 최신 데이터 가져오기 (원클릭)
                  </span>
                  <button
                    type="button"
                    disabled={isServerLoading}
                    onClick={handlePullFromServer}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isServerLoading ? '가져오는 중...' : '서버에서 가져오기'}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {isMobile 
                    ? '👉 PC에서 [서버로 전송하기]를 눌렀다면, 여기서 클릭 1번으로 스마트폰에 즉시 나타납니다.' 
                    : '👉 스마트폰에서 [서버로 전송하기]를 눌렀다면, 여기서 클릭 1번으로 PC에 즉시 나타납니다.'}
                </p>
              </div>

              {/* 방법 2: 동기화 코드 붙여넣기 */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <span className="font-extrabold text-sm text-slate-900 block">
                  방법 2: 동기화 코드 붙여넣고 복원
                </span>
                <textarea
                  rows={3}
                  value={syncCodeInput}
                  onChange={(e) => setSyncCodeInput(e.target.value)}
                  placeholder="다른 기기에서 복사한 동기화 코드를 여기에 붙여넣기(Ctrl+V)하세요..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleImportFromCode}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  동기화 코드 적용 (화면에 즉시 반영)
                </button>
              </div>

              {/* 방법 3: 백업 파일 선택 */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <span className="font-extrabold text-sm text-slate-900 block">
                  방법 3: 백업 파일(.json) 불러오기
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 3: 실시간 영구 연동 안내 */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'GUIDE' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <span className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-700" />
                  스마트폰 ⇄ PC 실시간 무한 자동 연동 (영구 해결책)
                </span>
                <p className="text-purple-900 leading-relaxed">
                  매번 보내기/불러오기 버튼을 누르지 않아도, <strong>PC나 스마트폰 어디서 등록하든 1초 만에 양쪽 화면에 실시간 자동 동기화</strong>되게 하려면 <strong>무료 클라우드 데이터베이스(Supabase PostgreSQL)</strong>를 Vercel에 딱 1줄 연결하시면 됩니다.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-900 text-sm">🛠️ 1분 세팅 순서:</h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 font-medium">
                  <li>
                    <strong>Supabase (supabase.com)</strong> 접속 후 무료 회원가입 (GitHub 계정 1초 로그인).
                  </li>
                  <li>
                    [New Project] 생성 후 [Project Settings] ➔ [Database]에서 <strong>Connection String (URI)</strong> 복사.
                  </li>
                  <li>
                    <strong>Vercel (vercel.com)</strong> 대시보드 ➔ 해당 프로젝트 ➔ [Settings] ➔ [Environment Variables]에 접속.
                  </li>
                  <li>
                    <strong>DATABASE_URL</strong> 이름으로 복사한 PostgreSQL 주소를 등록하고 [Redeploy] 클릭!
                  </li>
                </ol>
                <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-bold">
                  ✨ 클라우드 DB가 연결되면 PC에서 등록한 매물도, 스마트폰에서 등록한 매물도 24시간 실시간 100% 자동 동기화됩니다!
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 모달 푸터 */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            * 스마트폰과 PC 간에 언제든지 자유롭게 양방향으로 데이터를 주고받을 수 있습니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

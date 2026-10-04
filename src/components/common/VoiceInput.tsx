// src/components/common/VoiceInput.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange?: (val: string) => void;
  onChangeValue?: (val: string) => void;
  label?: string;
  helperText?: string;
  containerClassName?: string;
}

interface VoiceTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange?: (val: string) => void;
  onChangeValue?: (val: string) => void;
  label?: string;
  helperText?: string;
  containerClassName?: string;
}

/**
 * 브라우저 Web Speech API 음성 인식 훅 (모바일 및 PC 호환, 공공데이터 코드와 완전 분리)
 */
export function useVoiceRecognition({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        '현재 브라우저에서는 음성 인식을 지원하지 않습니다.\n스마트폰 및 PC의 Chrome(크롬), Safari(사파리), Edge 브라우저를 이용해 주시기 바랍니다.'
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop error:', err);
      }
      setIsListening(false);
      return;
    }

    try {
      // 모바일 브라우저 호환성을 위해 매 녹음 시도마다 신규 인스턴스 생성
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          if (transcript && transcript.trim()) {
            onTranscript(transcript.trim());
          }
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert(
            '【마이크 사용 권한 필요】\n\n' +
            '스마트폰 또는 브라우저에서 마이크 사용이 차단되어 있습니다.\n' +
            '1. 브라우저 상단 주소창 좌측의 설정/자물쇠 아이콘을 터치하세요.\n' +
            '2. "마이크" 항목을 "허용"으로 변경하신 후 다시 눌러주세요.'
          );
        } else if (event.error === 'network') {
          alert('네트워크 연결이 불안정하여 음성 인식 서버에 연결할 수 없습니다. 인터넷 상태를 확인해 주세요.');
        } else if (event.error === 'no-speech') {
          // 음성이 감지되지 않고 끝난 경우
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('SpeechRecognition start failed:', err);
      setIsListening(false);
    }
  };

  return {
    isListening,
    isSupported,
    toggleListening,
  };
}

/**
 * 단독 음성 녹음 토글 버튼
 */
export const VoiceRecordButton: React.FC<{
  onTranscript: (text: string) => void;
  isListening?: boolean;
  onToggle?: () => void;
  size?: 'sm' | 'md';
  title?: string;
}> = ({ onTranscript, size = 'md', title = '음성으로 말하기' }) => {
  const { isListening, isSupported, toggleListening } = useVoiceRecognition({
    onTranscript,
  });

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? '음성 인식 종료' : title}
      className={`relative inline-flex items-center justify-center rounded-lg transition-all cursor-pointer ${
        size === 'sm' ? 'p-1.5 text-xs' : 'p-2 text-sm'
      } ${
        isListening
          ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 animate-pulse ring-2 ring-rose-400'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
      }`}
    >
      {isListening ? (
        <>
          <Mic className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span className="sr-only">녹음 중</span>
        </>
      ) : (
        <Mic className={size === 'sm' ? 'w-3.5 h-3.5 text-slate-600' : 'w-4 h-4 text-slate-600'} />
      )}
    </button>
  );
};

/**
 * 타자 입력 + 음성 마이크 버튼이 결합된 VoiceInput
 */
export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  onChangeValue,
  label,
  helperText,
  containerClassName = '',
  className = '',
  placeholder,
  ...rest
}) => {
  const emitChange = (val: string) => {
    if (onChange) onChange(val);
    if (onChangeValue) onChangeValue(val);
  };

  const handleTranscript = (transcript: string) => {
    const newVal = value ? `${value.trim()} ${transcript}` : transcript;
    emitChange(newVal);
  };

  const { isListening, toggleListening } = useVoiceRecognition({
    onTranscript: handleTranscript,
  });

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">{label}</label>
          {isListening && (
            <span className="flex items-center gap-1.5 text-[11px] font-black text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              말씀해 주세요 (음성 변환 중...)
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => emitChange(e.target.value)}
          placeholder={isListening ? '🎙️ 지금 말씀하세요... (음성이 자동 입력됩니다)' : placeholder}
          className={`w-full pr-10 text-xs sm:text-sm px-3 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
            isListening ? 'border-red-500 ring-2 ring-red-300 bg-red-50/30' : 'border-slate-300'
          } ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? '음성인식 종료' : '마이크로 음성 입력하기'}
          className={`absolute right-1.5 p-1.5 rounded-lg transition-all cursor-pointer ${
            isListening
              ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/50 ring-2 ring-red-400'
              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>

      {helperText && !isListening && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

/**
 * 타자 입력 + 음성 마이크 버튼이 결합된 VoiceTextarea
 */
export const VoiceTextarea: React.FC<VoiceTextareaProps> = ({
  value,
  onChange,
  onChangeValue,
  label,
  helperText,
  containerClassName = '',
  className = '',
  placeholder,
  rows = 3,
  ...rest
}) => {
  const emitChange = (val: string) => {
    if (onChange) onChange(val);
    if (onChangeValue) onChangeValue(val);
  };

  const handleTranscript = (transcript: string) => {
    const newVal = value ? `${value.trim()}\n${transcript}` : transcript;
    emitChange(newVal);
  };

  const { isListening, toggleListening } = useVoiceRecognition({
    onTranscript: handleTranscript,
  });

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      <div className="flex items-center justify-between">
        {label && <label className="block text-xs font-bold text-slate-800">{label}</label>}
        <div className="flex items-center gap-1.5">
          {isListening && (
            <span className="flex items-center gap-1.5 text-[11px] font-black text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              말씀해 주세요 (음성 자동 입력 중)
            </span>
          )}
          <button
            type="button"
            onClick={toggleListening}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              isListening
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/40 animate-pulse ring-4 ring-red-400/50'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border-slate-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isListening ? '듣는중...' : '음성입력'}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => emitChange(e.target.value)}
          placeholder={isListening ? '🎙️ 음성을 실시간 변환 중입니다. 마이크에 편하게 말씀하세요...' : placeholder}
          className={`w-full text-xs sm:text-sm p-3 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
            isListening ? 'border-red-500 ring-2 ring-red-300 bg-red-50/20' : 'border-slate-300'
          } ${className}`}
          {...rest}
        />
      </div>

      {helperText && !isListening && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

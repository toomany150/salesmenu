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
 * 브라우저 Web Speech API 음성 인식 훅
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
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onTranscript(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      alert('현재 브라우저에서는 음성 인식을 지원하지 않습니다. (Chrome, Edge 브라우저 권장)');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.warn(err);
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn(err);
        setIsListening(false);
      }
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
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              음성을 듣고 있습니다...
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => emitChange(e.target.value)}
          placeholder={isListening ? '말씀해주세요... (음성 인식 중)' : placeholder}
          className={`w-full pr-10 text-xs sm:text-sm px-3 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
            isListening ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
          } ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? '음성인식 종료' : '마이크로 음성 입력하기'}
          className={`absolute right-1.5 p-1.5 rounded-lg transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse'
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
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              말씀해주세요...
            </span>
          )}
          <button
            type="button"
            onClick={toggleListening}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs animate-pulse ring-2 ring-rose-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border-slate-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isListening ? '인식중...' : '음성입력'}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => emitChange(e.target.value)}
          placeholder={isListening ? '음성을 인식하고 있습니다. 마이크에 대고 편하게 말씀하세요...' : placeholder}
          className={`w-full text-xs sm:text-sm p-3 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
            isListening ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
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

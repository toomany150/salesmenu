'use client';

import React, { useRef, useState } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Star, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight, 
  ImageIcon, 
  AlertCircle 
} from 'lucide-react';

interface PropertyImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export const PropertyImageUploader: React.FC<PropertyImageUploaderProps> = ({
  images = [],
  onChange,
  maxImages = 20,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Resize and compress image client-side to prevent memory/payload bloat
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1280;
          const maxHeight = 960;
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
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorNotice(null);

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorNotice(`사진은 최대 ${maxImages}장까지만 등록할 수 있습니다.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setErrorNotice(`최대 ${maxImages}장 제한으로 ${remainingSlots}장만 추가되었습니다.`);
    }

    setIsCompressing(true);
    try {
      const compressedList = await Promise.all(
        filesToProcess.map((file) => compressImage(file))
      );
      onChange([...images, ...compressedList]);
    } catch (err) {
      console.error('Image compression failed:', err);
      setErrorNotice('사진 파일을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove photo
  const handleRemove = (index: number) => {
    const next = images.filter((_, idx) => idx !== index);
    onChange(next);
    if (previewIndex === index) {
      setPreviewIndex(null);
    } else if (previewIndex !== null && previewIndex > index) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  // Set as representative photo (move to index 0)
  const handleSetRepresentative = (index: number) => {
    if (index === 0) return;
    const item = images[index];
    const next = [item, ...images.filter((_, idx) => idx !== index)];
    onChange(next);
  };

  // Move photo left/right
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const next = [...images];
    const temp = next[fromIndex];
    next[fromIndex] = next[toIndex];
    next[toIndex] = temp;
    onChange(next);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
      {/* Header with counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              매물 사진 등록
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                images.length >= maxImages 
                  ? 'bg-rose-100 text-rose-800' 
                  : images.length > 0
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {images.length} / {maxImages}장
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              첫 번째 사진이 매물장의 [대표사진]으로 지정됩니다. (최대 20장 등록 가능)
            </p>
          </div>
        </div>

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-2xs transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>사진 추가 ({maxImages - images.length}장 남음)</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {errorNotice && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Drop Zone / Empty State */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-indigo-50/20 hover:bg-indigo-50/40"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            {isCompressing ? '사진을 처리하고 있습니다...' : '클릭하여 사진을 추가하거나 여기로 끌어다 놓으세요'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            스마트폰 촬영 사진을 한 번에 여러 장 선택하여 최대 20장까지 등록할 수 있습니다.
          </p>
        </div>
      ) : (
        /* Thumbnails Grid */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs hover:shadow-md transition-all"
              >
                {/* Image */}
                <img
                  src={img}
                  alt={`매물 사진 ${idx + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewIndex(idx)}
                />

                {/* Index / Representative Badge */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      대표사진
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Action Buttons Overlay */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      title="크게보기"
                      className="p-1 rounded bg-white/80 hover:bg-white text-slate-800"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      title="사진 삭제"
                      className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx - 1)}
                          title="앞으로 이동"
                          className="p-1 rounded bg-white/80 hover:bg-white text-slate-800"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx + 1)}
                          title="뒤로 이동"
                          className="p-1 rounded bg-white/80 hover:bg-white text-slate-800"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetRepresentative(idx)}
                        className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold"
                      >
                        대표 지정
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Slot Button (if under max) */}
            {images.length < maxImages && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-4/3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">＋ 추가하기</span>
                <span className="text-[10px] text-slate-400">({images.length}/{maxImages})</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Lightbox for full size photo view */}
      {previewIndex !== null && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewIndex(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <span className="px-2 py-1 rounded bg-black/60 text-white text-xs font-mono font-bold">
                {previewIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <img
              src={images[previewIndex]}
              alt={`크게보기 ${previewIndex + 1}`}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />

            {/* Prev / Next controls */}
            {previewIndex > 0 && (
              <button
                type="button"
                onClick={() => setPreviewIndex(previewIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {previewIndex < images.length - 1 && (
              <button
                type="button"
                onClick={() => setPreviewIndex(previewIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

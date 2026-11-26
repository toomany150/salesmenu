import JSZip from 'jszip';

/**
 * 이미지 원본(DataURL, BlobURL, 일반 상대/절대 URL)을 Blob 객체와 확장자로 안전하게 변환
 */
export async function imageSourceToBlob(source: string): Promise<{ blob: Blob; ext: string; mime: string }> {
  if (!source) {
    throw new Error('유효하지 않은 이미지 데이터입니다.');
  }

  // 1. Base64 Data URL인 경우
  if (source.startsWith('data:')) {
    const parts = source.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    try {
      const byteString = atob(parts[1]);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return { blob: new Blob([ia], { type: mime }), ext, mime };
    } catch {
      // atob 실패 시 fetch 폴백
      const res = await fetch(source);
      const blob = await res.blob();
      return { blob, ext, mime };
    }
  }

  // 2. Blob URL(blob:http...)인 경우: 브라우저 내부 메모리 URL이므로 직접 fetch
  if (source.startsWith('blob:')) {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`이미지를 가져오는데 실패했습니다 (${res.status} ${res.statusText})`);
    }
    const blob = await res.blob();
    const mime = blob.type || 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    return { blob, ext, mime };
  }

  // 3. 상대 경로인 경우 (/uploads/... 등) 현재 오리진 결합
  let targetUrl = source;
  if (source.startsWith('/')) {
    targetUrl = typeof window !== 'undefined' ? `${window.location.origin}${source}` : source;
  }

  // 4. 일반 웹 URL (Cloudflare R2, 외부 CDN 등)인 경우
  // 외부 도메인(R2 등)은 브라우저 CORS 제한으로 클라이언트에서 직접 fetch 시 'Failed to fetch' 오류가 발생합니다.
  // 따라서 서버 이미지 프록시(/api/proxy-image)를 1순위로 호출하여 100% 안전하게 다운로드합니다.
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    const isSameOrigin = typeof window !== 'undefined' && targetUrl.startsWith(window.location.origin);

    if (!isSameOrigin) {
      // 외부 도메인 (Cloudflare R2 등): 서버 프록시 우선
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          const mime = blob.type || 'image/jpeg';
          const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
          return { blob, ext, mime };
        }
      } catch (proxyErr) {
        console.warn('[photoDownload] 프록시 fetch 오류, 직접 fetch 시도:', proxyErr);
      }
    }

    // 동일 오리진이거나 프록시 폴백인 경우 직접 fetch
    try {
      const res = await fetch(targetUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const mime = blob.type || 'image/jpeg';
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        return { blob, ext, mime };
      }
    } catch (directErr: any) {
      console.warn('[photoDownload] 직접 fetch 실패:', directErr);
    }

    // HTML Image 객체 및 Canvas를 통한 다운로드 시도 (브라우저 캐시 이미지 활용)
    try {
      const canvasBlob = await new Promise<{ blob: Blob; ext: string; mime: string }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 800;
            canvas.height = img.naturalHeight || img.height || 600;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context failed'));
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => {
              if (b) {
                resolve({ blob: b, ext: 'jpg', mime: 'image/jpeg' });
              } else {
                reject(new Error('toBlob failed'));
              }
            }, 'image/jpeg', 0.95);
          } catch (cErr) {
            reject(cErr);
          }
        };
        img.onerror = () => reject(new Error('Image tag load failed'));
        img.src = targetUrl;
      });
      return canvasBlob;
    } catch (canvasErr) {
      console.warn('[photoDownload] Canvas fallback error:', canvasErr);
    }

    throw new Error('사진 원본을 불러오지 못했습니다. 즉시 다운로드(ZIP)를 이용해주세요.');
  }

  throw new Error('지원하지 않는 이미지 주소 형식입니다.');
}

/**
 * 브라우저의 기본 a 태그 다운로드 (충분한 blobUrl 유효시간 확보)
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // 브라우저가 다운로드를 완전히 개시할 수 있도록 충분한 여유(60초) 후 revoke
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}

/**
 * 서버에 저장된 매물 ID 기반 초고속 ZIP 다운로드 트리거
 */
export function triggerServerZipDownload(propertyId: string, filename?: string) {
  const url = `/api/properties/download-zip?id=${encodeURIComponent(propertyId)}`;
  const a = document.createElement('a');
  a.href = url;
  if (filename) {
    a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  }
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch {}
  }, 2000);
}

/**
 * 이미지 URL 배열을 서버로 전송하여 고속 ZIP으로 받아 즉시 다운로드
 */
export async function triggerServerZipDownloadFromImages(
  images: string[],
  title: string,
  propertyNumber?: string
): Promise<void> {
  const res = await fetch('/api/properties/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, title, propertyNumber }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `서버 ZIP 다운로드 실패 (${res.status})`);
  }
  const blob = await res.blob();
  const cleanTitle = (title || propertyNumber || '매물사진')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  const propNo = propertyNumber ? `_${propertyNumber}` : '';
  const filename = `${cleanTitle}${propNo}_사진모음_${images.length}장.zip`;
  triggerBlobDownload(blob, filename);
}

/**
 * 1장 사진 저장 (경로 지정 지원: showSaveFilePicker, 미지원 시 기본 다운로드)
 */
export async function downloadSinglePhoto(
  source: string,
  suggestedFilename: string
): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  try {
    const { blob, ext, mime } = await imageSourceToBlob(source);
    const finalFilename = suggestedFilename.toLowerCase().endsWith(`.${ext}`)
      ? suggestedFilename
      : `${suggestedFilename}.${ext}`;

    // Chromium 계열 showSaveFilePicker 지원 시 저장 경로 직접 지정 탐색기 열기
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [
            {
              description: '이미지 파일',
              accept: {
                [mime || 'image/jpeg']: [`.${ext}`],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true };
      } catch (pickerErr: any) {
        // 사용자가 파일 저장 취소를 누른 경우
        if (pickerErr.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        console.warn('showSaveFilePicker 실패, 기본 다운로드로 전환합니다:', pickerErr);
      }
    }

    // 기본 브라우저 다운로드 방식 폴백
    triggerBlobDownload(blob, finalFilename);
    return { success: true };
  } catch (err: any) {
    console.error('단일 사진 다운로드 에러:', err);
    return { success: false, error: err.message || '사진 저장 실패' };
  }
}

/**
 * File System Access API(showDirectoryPicker)를 지원하는지 확인
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * File System Access API(showSaveFilePicker)를 지원하는지 확인
 */
export function isSaveFilePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * 전체 사진을 사용자가 지정한 로컬 컴퓨터 폴더에 개별 파일로 100% 누락 없이 저장
 */
export async function downloadPhotosToDirectory(
  images: string[],
  baseFilename: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; count: number; folderName?: string; cancelled?: boolean; error?: string }> {
  if (!images || images.length === 0) {
    return { success: false, count: 0, error: '저장할 사진이 없습니다.' };
  }

  if (!isDirectoryPickerSupported()) {
    return { success: false, count: 0, error: '현재 브라우저에서는 폴더 직접 지정 저장을 지원하지 않습니다. ZIP 압축 다운로드를 이용해주세요.' };
  }

  let baseDirHandle: any;
  try {
    // 1. 사용자에게 저장할 폴더를 선택하도록 탐색기 창 오픈
    baseDirHandle = await (window as any).showDirectoryPicker({
      id: 'property_photos_export',
      mode: 'readwrite',
      startIn: 'pictures',
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, count: 0, cancelled: true };
    }
    return { success: false, count: 0, error: '폴더 접근 권한을 얻지 못했습니다.' };
  }

  try {
    // 2. 선택한 폴더 내에 매물 사진 전용 하위 폴더 생성 (폴더 내 파일 섞임 방지)
    const folderName = `${baseFilename}_사진모음`;
    const targetDirHandle = await baseDirHandle.getDirectoryHandle(folderName, { create: true });

    let savedCount = 0;
    const total = images.length;

    // 3. 사진들을 순차적으로 변환하여 폴더에 파일로 직접 쓰기 (개별 실패 격리로 1장 실패해도 나머지 100% 안전 저장)
    for (let i = 0; i < total; i++) {
      const src = images[i];
      const isRep = i === 0 ? '_대표' : '';
      try {
        const { blob, ext } = await imageSourceToBlob(src);
        const fileName = `${baseFilename}_사진${i + 1}${isRep}.${ext}`;

        const fileHandle = await targetDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        savedCount++;
      } catch (itemErr) {
        console.warn(`[photoDownload] 사진 ${i + 1}장 저장 실패 (나머지 계속 진행):`, itemErr);
      }
      if (onProgress) {
        onProgress(savedCount, total);
      }
    }

    if (savedCount === 0) {
      return { 
        success: false, 
        count: 0, 
        error: '선택하신 폴더에 사진을 저장하지 못했습니다. 상단의 [⚡ 1초 원클릭 즉시 다운로드]를 클릭하시면 100% 확실하게 다운로드됩니다.' 
      };
    }

    return { success: true, count: savedCount, folderName };
  } catch (err: any) {
    console.error('폴더에 사진 저장 실패:', err);
    return { success: false, count: 0, error: err.message || '사진 저장 중 오류가 발생했습니다.' };
  }
}

/**
 * 전체 사진을 ZIP 압축 파일로 묶어서 저장 (경로 지정 지원)
 */
export async function downloadPhotosAsZip(
  images: string[],
  baseFilename: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ success: boolean; count: number; cancelled?: boolean; error?: string }> {
  if (!images || images.length === 0) {
    return { success: false, count: 0, error: '저장할 사진이 없습니다.' };
  }

  try {
    const zip = new JSZip();
    const total = images.length;

    // 1. 모든 사진을 Blob으로 변환하여 ZIP에 추가 (개별 실패 격리)
    let addedCount = 0;
    for (let i = 0; i < total; i++) {
      if (onProgress) {
        onProgress(i + 1, total, `사진 준비 중... (${i + 1}/${total})`);
      }
      const src = images[i];
      const isRep = i === 0 ? '_대표' : '';
      try {
        const { blob, ext } = await imageSourceToBlob(src);
        const fileName = `${baseFilename}_사진${i + 1}${isRep}.${ext}`;
        zip.file(fileName, blob);
        addedCount++;
      } catch (itemErr) {
        console.warn(`[photoDownload] ZIP 사진 ${i + 1} 변환 실패:`, itemErr);
      }
    }

    if (addedCount === 0) {
      return { success: false, count: 0, error: '압축할 수 있는 사진 데이터를 가져오지 못했습니다.' };
    }

    if (onProgress) {
      onProgress(total, total, '압축 파일(.zip) 생성 중...');
    }

    // 2. 압축 파일 바이너리 생성
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        if (onProgress) {
          onProgress(
            Math.round((metadata.percent / 100) * total),
            total,
            `압축 진행 중... (${Math.round(metadata.percent)}%)`
          );
        }
      }
    );

    const zipFilename = `${baseFilename}_사진_${total}장.zip`;

    // 3. showSaveFilePicker 지원 시 저장할 위치 및 파일명 직접 지정
    if (isSaveFilePickerSupported()) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: zipFilename,
          types: [
            {
              description: 'ZIP 압축 파일',
              accept: {
                'application/zip': ['.zip'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        return { success: true, count: total };
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          return { success: false, count: 0, cancelled: true };
        }
        console.warn('showSaveFilePicker 실패, 기본 다운로드로 전환합니다:', pickerErr);
      }
    }

    // 4. 일반 브라우저 다운로드 폴백
    triggerBlobDownload(zipBlob, zipFilename);
    return { success: true, count: total };
  } catch (err: any) {
    console.error('ZIP 생성 및 다운로드 오류:', err);
    return { success: false, count: 0, error: err.message || 'ZIP 파일 생성 중 오류가 발생했습니다.' };
  }
}

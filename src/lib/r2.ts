import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'salesmenu-photos';
const publicUrl = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

/**
 * Base64 이미지를 Cloudflare R2 버킷에 업로드하고 영구 퍼블릭 URL을 반환합니다.
 * 이미 http/https URL인 경우 업로드 없이 그대로 반환합니다.
 */
export async function uploadBase64ToR2(base64Data: string, folder: string = 'properties'): Promise<string> {
  // 이미 URL인 경우 그대로 반환
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }

  const client = getR2Client();
  if (!client || !publicUrl) {
    console.warn('[R2] Cloudflare R2 환경변수가 설정되지 않아 원본 데이터를 유지합니다.');
    return base64Data;
  }

  // base64 헤더 파싱 (예: data:image/jpeg;base64,...)
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let contentType = 'image/jpeg';
  let buffer: Buffer;

  if (matches && matches.length === 3) {
    contentType = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // 헤더 없는 순수 base64인 경우
    buffer = Buffer.from(base64Data, 'base64');
  }

  // 확장자 결정
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('gif')) ext = 'gif';

  // 고유 파일명 생성 (날짜_랜덤문자열)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = crypto.randomBytes(8).toString('hex');
  const key = `${folder}/${dateStr}_${randomStr}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable', // 1년간 초고속 브라우저 캐싱
    });

    await client.send(command);
    const fileUrl = `${publicUrl}/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('[R2] 업로드 실패:', error);
    // 실패 시 데이터 유실 방지를 위해 원본 base64 유지
    return base64Data;
  }
}

/**
 * 여러 개의 Base64 이미지를 병렬로 Cloudflare R2에 업로드합니다.
 */
export async function uploadMultipleBase64ToR2(base64List: string[], folder: string = 'properties'): Promise<string[]> {
  if (!Array.isArray(base64List) || base64List.length === 0) {
    return [];
  }
  return Promise.all(base64List.map((item) => uploadBase64ToR2(item, folder)));
}

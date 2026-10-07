import { supabase } from './supabase';

export interface UploadResult {
  success: boolean;
  bucket: string;
  key: string;
  publicUrl: string;
  contentType: string;
  sizeBytes?: number;
}

const R2_WORKER_BASE_URL = process.env.EXPO_PUBLIC_CF_BACKEND_URL || 'https://backend.gurubyai.com';

export async function uploadMediaToR2(
  file: Blob | File,
  category: 'avatar' | 'verification_doc' | 'chat_attachment' | 'service_cover',
  userId?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file as any);
  formData.append('category', category);
  if (userId) {
    formData.append('userId', userId);
  }

  const uploadRes = await fetch(`${R2_WORKER_BASE_URL}/api/storage/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`R2 upload failed: ${uploadRes.status} - ${errorText}`);
  }

  const data: UploadResult = await uploadRes.json();

  // Register in Supabase ledger
  const fullPublicUrl = data.publicUrl.startsWith('http')
    ? data.publicUrl
    : `${R2_WORKER_BASE_URL}${data.publicUrl}`;

  const { error: dbError } = await supabase.rpc('register_media_asset', {
    p_key: data.key,
    p_content_type: data.contentType,
    p_category: category,
    p_public_url: fullPublicUrl,
    p_file_size_bytes: data.sizeBytes ?? null,
  });

  if (dbError) {
    console.warn('Failed to register media asset in Supabase database:', dbError);
  }

  return {
    ...data,
    publicUrl: fullPublicUrl,
  };
}

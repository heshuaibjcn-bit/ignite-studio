/**
 * File Upload API
 * POST — upload an image file.
 */
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { saveGeneratedFile } from '@/services/storage';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return apiError('MISSING_FILE', 'file is required', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const localPath = saveGeneratedFile(buffer, 'uploads', file.name);

    logger.info({ fileName: file.name, size: buffer.length, path: localPath }, 'File uploaded');

    return apiSuccess({ url: `/${localPath}`, path: localPath });
  } catch (err) {
    return apiError('UPLOAD_ERROR', err instanceof Error ? err.message : 'Upload failed', 500);
  }
}

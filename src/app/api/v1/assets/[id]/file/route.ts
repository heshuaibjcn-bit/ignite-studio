import { NextRequest, NextResponse } from 'next/server';
import { AssetsRepository } from '@/db/repositories/assets.repository';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.srt': 'text/plain',
  '.vtt': 'text/vtt',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
};

/**
 * GET /api/v1/assets/[id]/file
 * Serves the actual file for an asset (image/video preview).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const repo = new AssetsRepository();
    const asset = await repo.findById(id);

    if (!asset) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NOT_FOUND', message: `Asset ${id} not found` } },
        { status: 404 },
      );
    }

    if (!asset.localPath) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NO_FILE', message: 'Asset has no local file path' } },
        { status: 404 },
      );
    }

    const fileBuffer = await readFile(asset.localPath);
    const ext = extname(asset.localPath).toLowerCase();
    const contentType = MIME_MAP[ext] || asset.mimeType || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

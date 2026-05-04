import { NextRequest } from 'next/server';
import { AssetsRepository } from '@/db/repositories/assets.repository';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/assets — list assets with filters */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const repo = new AssetsRepository();
    const assets = await repo.list({
      projectId: searchParams.get('projectId') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '20', 10),
      offset: parseInt(searchParams.get('offset') ?? '0', 10),
    });

    return apiSuccess({ assets, count: assets.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST /api/v1/assets — register asset metadata (no file upload in Phase 2) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.sourceType || !body.mimeType || !body.localPath) {
      return apiError('VALIDATION_FAILED', 'type, sourceType, mimeType, and localPath are required', 400);
    }

    const repo = new AssetsRepository();
    const asset = await repo.create({
      projectId: body.projectId,
      productionId: body.productionId,
      type: body.type,
      sourceType: body.sourceType,
      sourceProvider: body.sourceProvider,
      originJobId: body.originJobId,
      title: body.title,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      checksum: body.checksum,
      localPath: body.localPath,
      previewUrl: body.previewUrl,
      thumbnailUrl: body.thumbnailUrl,
      width: body.width,
      height: body.height,
      durationMs: body.durationMs,
      fps: body.fps,
      sampleRate: body.sampleRate,
      channels: body.channels,
    });

    return apiSuccess({ asset }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

interface Props {
  params: Promise<{ provider: string }>;
}

/**
 * Verify webhook signature using HMAC-SHA256.
 * Providers send a signature in the X-Webhook-Signature header.
 * The shared secret is stored in WEBHOOK_SECRET env var (per-provider secrets
 * can be added later via ai_service_configs.configPayload).
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(body).digest('hex');

  try {
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expected, 'utf-8');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/** POST /api/v1/webhooks/[provider] — receive provider webhooks */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { provider } = await params;
    const rawBody = await request.text();

    // Validate webhook signature when WEBHOOK_SECRET is configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = request.headers.get('X-Webhook-Signature')
      ?? request.headers.get('X-Signature')
      ?? null;

    if (webhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.warn({ provider }, 'Webhook signature verification failed');
        return apiError('INVALID_SIGNATURE', 'Webhook signature verification failed', 401);
      }
    } else {
      // No secret configured — log a warning in production
      if (process.env.NODE_ENV === 'production') {
        logger.warn({ provider }, 'Webhook received without signature verification (WEBHOOK_SECRET not set)');
      }
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return apiError('INVALID_BODY', 'Request body is not valid JSON', 400);
    }

    logger.info({ provider, taskId: body.task_id ?? body.taskId }, 'Webhook received');

    const taskId = (body.task_id ?? body.taskId ?? body.provider_task_id) as string | undefined;
    if (!taskId) {
      return apiError('MISSING_TASK_ID', 'No task_id in webhook payload', 400);
    }

    // Provider-specific status normalization
    let status = body.status ?? body.state;

    // Vidu uses 'state' field: 'success' | 'failed' | 'processing'
    if (provider === 'vidu' && body.state) {
      status = body.state;
    }

    const taskCenter = new TaskCenterRepository();

    if (status === 'success' || status === 'Success' || status === 'Finished' || status === 'completed') {
      const output = {
        videoUrl: body.video_url ?? body.file_id ?? (body.output as Record<string, unknown>)?.url,
        ...(body.output as Record<string, unknown> ?? {}),
      };
      await taskCenter.handleProviderCallbackSuccess({ providerTaskId: taskId, outputSnapshot: output });
      return apiSuccess({ matched: true, status: 'success' });
    }

    if (status === 'failed' || status === 'Failed' || status === 'error') {
      await taskCenter.handleProviderCallbackFailed({
        providerTaskId: taskId,
        errorCode: (body.error_code as string) ?? 'PROVIDER_ERROR',
        errorMessage: (body.error_message as string) ?? (body.error as string) ?? 'Provider reported failure',
      });
      return apiSuccess({ matched: true, status: 'failed' });
    }

    // Intermediate status (processing, pending) — acknowledge but don't update
    return apiSuccess({ matched: true, status: 'acknowledged' });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : 'Unknown' }, 'Webhook processing error');
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReviewActions } from './review-actions';
import { STEP_STATUS_LABELS, EXECUTION_STATE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/formatters';

interface StepInfo {
  id: string;
  stepCode: string;
  stepName: string;
  status: string;
  executionState?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerName?: string | null;
  providerTaskId?: string | null;
  outputSnapshot?: unknown;
}

interface StepItem {
  id: string;
  stepId: string;
  itemId: string;
  status: string;
  executionState?: string;
}

interface PipelineStepDetailProps {
  step: StepInfo | null;
  stepCode: string;
  stepItems: StepItem[];
  jobId?: string;
}

export function PipelineStepDetail({ step, stepCode, stepItems, jobId }: PipelineStepDetailProps) {
  const status = step?.status ?? 'pending';
  const executionState = step?.executionState ?? 'normal';
  const isWaitingReview = executionState === 'waiting_review';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {step?.stepName ?? stepCode}
          </CardTitle>
          <Badge variant="outline">
            {STEP_STATUS_LABELS[status] ?? status}
            {executionState !== 'normal' && ` (${EXECUTION_STATE_LABELS[executionState] ?? executionState})`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timing */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">开始时间：</span>
            <span>{formatDate(step?.startedAt) ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">完成时间：</span>
            <span>{formatDate(step?.finishedAt) ?? '-'}</span>
          </div>
        </div>

        {/* Provider info */}
        {step?.providerName && (
          <div className="text-sm">
            <span className="text-muted-foreground">服务提供：</span>
            <span>{step.providerName}</span>
            {step.providerTaskId && (
              <span className="text-muted-foreground ml-2 font-mono text-xs">
                ({step.providerTaskId})
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {step?.errorCode && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm">
            <div className="font-medium text-destructive">
              错误: {step.errorCode}
            </div>
            {step.errorMessage && (
              <div className="text-destructive/80 mt-1">{step.errorMessage}</div>
            )}
          </div>
        )}

        {/* Fan-out items */}
        {stepItems.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              并行任务 ({stepItems.filter(s => s.status === 'succeeded').length}/{stepItems.length} 完成)
            </div>
            <div className="flex flex-wrap gap-1">
              {stepItems.map((item) => {
                const colors: Record<string, string> = {
                  succeeded: 'bg-green-500',
                  failed: 'bg-red-500',
                  running: 'bg-blue-500 animate-pulse',
                  queued: 'bg-gray-300',
                  pending: 'bg-gray-200',
                };
                return (
                  <div
                    key={item.id}
                    className={`w-4 h-4 rounded-sm ${colors[item.status] ?? 'bg-gray-200'}`}
                    title={`${item.itemId}: ${STEP_STATUS_LABELS[item.status] ?? item.status}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Review actions */}
        {isWaitingReview && jobId && step && (
          <ReviewActions
            jobId={jobId}
            stepId={step.id}
          />
        )}
      </CardContent>
    </Card>
  );
}

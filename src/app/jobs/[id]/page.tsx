import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { JobStepItemsRepository } from '@/db/repositories/job-step-items.repository';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { PipelineStepNode } from '@/components/pipeline/pipeline-step-node';
import { ReviewActions } from '@/components/pipeline/review-actions';
import { DRAMA_FAN_OUT_STEPS } from '@/constants/step';
import { formatDate, formatRelativeTime, truncateId } from '@/lib/formatters';
import { STEP_STATUS_LABELS, EXECUTION_STATE_LABELS, EVENT_TYPE_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const taskCenter = new TaskCenterRepository();
  const stepItemsRepo = new JobStepItemsRepository();

  const [summary, detail, stepItems] = await Promise.all([
    taskCenter.summarizeJob(id),
    taskCenter.getJobDetail(id),
    stepItemsRepo.listByJobId(id),
  ]);

  if (!summary || !detail) {
    return <div className="text-center py-12 text-muted-foreground">任务不存在</div>;
  }

  const { job, steps, events } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{truncateId(job.id, 24)}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>类型: {job.bizType}</span>
            <span>运行类型: {job.runType}</span>
            <span>触发: {job.triggerSource}</span>
            {job.startedAt && <span>开始: {formatDate(job.startedAt)}</span>}
            {job.finishedAt && <span>完成: {formatDate(job.finishedAt)}</span>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-center">
        {[
          { label: '总步骤', value: summary.summary.total },
          { label: '已完成', value: summary.summary.succeeded },
          { label: '运行中', value: summary.summary.running },
          { label: '失败', value: summary.summary.failed },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error */}
      {job.errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm">
          <span className="font-medium text-destructive">{job.errorCode}: </span>
          <span className="text-destructive/80">{job.errorMessage}</span>
        </div>
      )}

      <Separator />

      {/* Steps timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">步骤详情</h3>
        {steps.map((step) => {
          const isFanOut = DRAMA_FAN_OUT_STEPS.includes(step.stepCode);
          const itemsForStep = isFanOut ? stepItems.filter(si => si.stepId === step.id) : [];
          const isWaitingReview = step.executionState === 'waiting_review';

          return (
            <Card key={step.id} className={isWaitingReview ? 'border-amber-300' : ''}>
              <CardContent className="flex items-start gap-4 p-4">
                {/* Status icon */}
                <div className="shrink-0 mt-0.5">
                  <PipelineStepNode
                    stepCode={step.stepCode}
                    stepName={step.stepName}
                    stepOrder={step.stepOrder}
                    status={step.status}
                    executionState={step.executionState}
                    required={step.required}
                    isFanOut={isFanOut}
                  />
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.stepName}</span>
                    <span className="text-xs text-muted-foreground">
                      {STEP_STATUS_LABELS[step.status] ?? step.status}
                    </span>
                    {step.executionState !== 'normal' && (
                      <span className="text-xs text-amber-600">
                        ({EXECUTION_STATE_LABELS[step.executionState] ?? step.executionState})
                      </span>
                    )}
                  </div>

                  {/* Timing */}
                  <div className="text-xs text-muted-foreground">
                    {step.startedAt && `开始: ${formatDate(step.startedAt)}`}
                    {step.finishedAt && ` | 完成: ${formatDate(step.finishedAt)}`}
                  </div>

                  {/* Error */}
                  {step.errorMessage && (
                    <div className="text-xs text-destructive">
                      {step.errorCode}: {step.errorMessage}
                    </div>
                  )}

                  {/* Fan-out items grid */}
                  {itemsForStep.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        并行任务 ({itemsForStep.filter(i => i.status === 'succeeded').length}/{itemsForStep.length})
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {itemsForStep.map(item => {
                          const colors: Record<string, string> = {
                            succeeded: 'bg-green-500',
                            failed: 'bg-red-500',
                            running: 'bg-blue-500',
                            queued: 'bg-gray-300',
                            pending: 'bg-gray-200',
                          };
                          return (
                            <div
                              key={item.id}
                              className={`w-3 h-3 rounded-sm ${colors[item.status] ?? 'bg-gray-200'}`}
                              title={`${item.itemId}: ${item.status}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review actions */}
                  {isWaitingReview && (
                    <ReviewActions jobId={id} stepId={step.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Events log */}
      {events.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">事件日志</h3>
            <div className="max-h-60 overflow-auto">
              {events.slice().reverse().map((event) => (
                <div key={event.id} className="flex gap-3 text-xs py-1 border-b border-border/50">
                  <span className="text-muted-foreground shrink-0">{formatRelativeTime(event.createdAt)}</span>
                  <span className="font-mono">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

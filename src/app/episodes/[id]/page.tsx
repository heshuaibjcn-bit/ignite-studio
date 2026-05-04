import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { BizStatusBadge } from '@/components/jobs/job-status-badge';
import { PipelineProgress } from '@/components/pipeline/pipeline-progress';
import { RunPipelineButton } from '@/components/pipeline/run-pipeline-button';
import { DRAMA_PIPELINE_DEFINITIONS } from '@/constants';
import { STEP_CODE_TO_EPISODE_COL } from '@/db/repositories/episodes.repository';
import { BIZ_STATUS_LABELS } from '@/lib/constants';
import { formatEpisodeNo, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Image, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EpisodeDetailPage({ params }: Props) {
  const { id } = await params;
  const episodesRepo = new EpisodesRepository();
  const episode = await episodesRepo.findById(id);

  if (!episode) {
    return <div className="text-center py-12 text-muted-foreground">剧集不存在</div>;
  }

  // Build step info from episode's 14 status columns
  const steps = DRAMA_PIPELINE_DEFINITIONS.map((def) => {
    const colName = STEP_CODE_TO_EPISODE_COL[def.stepCode];
    const status = colName ? (episode as any)[colName] ?? 'pending' : 'pending';
    return {
      id: `${id}_${def.stepCode}`,
      stepCode: def.stepCode,
      stepName: def.stepName,
      status,
      executionState: episode.waitingReviewStep === def.stepCode ? 'waiting_review' : 'normal',
      required: def.required,
    };
  });

  // Count progress
  const succeededCount = steps.filter(s => s.status === 'succeeded').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {formatEpisodeNo(episode.episodeNo)}: {episode.title}
            </h1>
            <BizStatusBadge status={episode.status} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>创建时间: {formatDate(episode.createdAt)}</span>
            <span>更新时间: {formatDate(episode.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/episodes/${id}/storyboards`}>
            <Button variant="outline">
              <Image className="h-4 w-4 mr-2" />
              查看分镜
            </Button>
          </Link>
          <RunPipelineButton episodeId={id} episodeStatus={episode.status} />
        </div>
      </div>

      {/* Progress summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">{succeededCount}/14 已完成</span>
        {failedCount > 0 && (
          <span className="text-red-600 font-medium">{failedCount} 失败</span>
        )}
        {episode.currentJobId && (
          <Link href={`/jobs/${episode.currentJobId}`} className="flex items-center gap-1 text-blue-600 hover:underline">
            查看任务 <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Error message */}
      {episode.errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm">
          <span className="font-medium text-destructive">{episode.errorCode}: </span>
          <span className="text-destructive/80">{episode.errorMessage}</span>
        </div>
      )}

      <Separator />

      {/* Pipeline visualization */}
      <PipelineProgress steps={steps} jobId={episode.currentJobId ?? undefined} />

      <Separator />

      {/* Episode content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">剧集内容</CardTitle>
        </CardHeader>
        <CardContent>
          {episode.content ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {episode.content}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">暂无内容</p>
          )}
        </CardContent>
      </Card>

      {/* Script content (if rewritten) */}
      {episode.scriptContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">改写后剧本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {episode.scriptContent}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

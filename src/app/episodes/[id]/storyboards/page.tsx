import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StoryboardCard } from '@/components/storyboards/storyboard-card';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { StoryboardsRepository } from '@/db/repositories/storyboards.repository';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StoryboardsPage({ params }: Props) {
  const { id } = await params;
  const episodesRepo = new EpisodesRepository();
  const storyboardsRepo = new StoryboardsRepository();

  const [episode, storyboards] = await Promise.all([
    episodesRepo.findById(id),
    storyboardsRepo.listByEpisodeId(id),
  ]);

  if (!episode) {
    return <div className="text-center py-12 text-muted-foreground">剧集不存在</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/episodes/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            分镜列表 — 第{episode.episodeNo}集: {episode.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            共 {storyboards.length} 个分镜
          </p>
        </div>
      </div>

      {storyboards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无分镜数据。启动管线后，分镜将在"分镜生成"步骤完成后自动创建。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {storyboards.map((sb) => (
            <StoryboardCard key={sb.id} storyboard={sb} />
          ))}
        </div>
      )}
    </div>
  );
}

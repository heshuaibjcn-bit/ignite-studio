import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { ProductionsRepository } from '@/db/repositories/productions.repository';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { BizStatusBadge } from '@/components/jobs/job-status-badge';
import { PRODUCTION_MODE_LABELS } from '@/lib/constants';
import { formatDate, formatEpisodeNo } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const projectsRepo = new ProjectsRepository();
  const productionsRepo = new ProductionsRepository();
  const episodesRepo = new EpisodesRepository();

  const project = await projectsRepo.findById(id);
  if (!project) {
    return <div className="text-center py-12 text-muted-foreground">项目不存在</div>;
  }

  const productions = await productionsRepo.listByProjectId(id);

  // Get episodes for each production
  const productionsWithEpisodes = await Promise.all(
    productions.map(async (prod) => {
      const episodes = await episodesRepo.listByProductionId(prod.id);
      return { ...prod, episodes };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      {productionsWithEpisodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">该项目还没有制作</p>
          </CardContent>
        </Card>
      ) : (
        productionsWithEpisodes.map((production) => (
          <Card key={production.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{production.name}</CardTitle>
                  <Badge variant="outline">
                    {PRODUCTION_MODE_LABELS[production.mode] ?? production.mode}
                  </Badge>
                </div>
                <BizStatusBadge status={production.status} />
              </div>
              {production.description && (
                <CardDescription>{production.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {production.episodes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">暂无剧集</p>
              ) : (
                <div className="space-y-2">
                  {production.episodes.map((episode) => (
                    <Link
                      key={episode.id}
                      href={`/episodes/${episode.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatEpisodeNo(episode.episodeNo)}
                        </span>
                        <span className="font-medium">{episode.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BizStatusBadge status={episode.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(episode.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

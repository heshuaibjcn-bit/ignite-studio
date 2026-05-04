import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BizStatusBadge } from '@/components/jobs/job-status-badge';

interface Storyboard {
  id: string;
  seq: number;
  title: string | null;
  visualDesc: string;
  dialogue: string | null;
  shotType: string | null;
  durationSec: number | null;
  status: string;
  selectedImageAssetId: string | null;
}

interface StoryboardCardProps {
  storyboard: Storyboard;
}

export function StoryboardCard({ storyboard }: StoryboardCardProps) {
  return (
    <Card className="overflow-hidden">
      {/* Image area */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {storyboard.selectedImageAssetId ? (
          <img
            src={`/api/v1/assets/${storyboard.selectedImageAssetId}/file`}
            alt={storyboard.visualDesc}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground text-center px-4 line-clamp-4">
            {storyboard.visualDesc}
          </span>
        )}
        {/* Seq badge */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          #{storyboard.seq}
        </div>
        {/* Shot type badge */}
        {storyboard.shotType && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[10px]">
              {storyboard.shotType}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-1.5">
        {storyboard.title && (
          <div className="font-medium text-sm truncate">{storyboard.title}</div>
        )}
        {storyboard.dialogue && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            "{storyboard.dialogue}"
          </div>
        )}
        <div className="flex items-center justify-between">
          <BizStatusBadge status={storyboard.status} />
          {storyboard.durationSec && (
            <span className="text-[10px] text-muted-foreground">
              {storyboard.durationSec}秒
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

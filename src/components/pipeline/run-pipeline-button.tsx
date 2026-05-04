'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Play } from 'lucide-react';

interface RunPipelineButtonProps {
  episodeId: string;
  episodeStatus: string;
}

export function RunPipelineButton({ episodeId, episodeStatus }: RunPipelineButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canRun = episodeStatus === 'draft' || episodeStatus === 'failed' || episodeStatus === 'ready';

  async function handleRun() {
    setLoading(true);
    try {
      const result = await api.post<{ jobId: string }>('/drama/run', { episodeId });
      toast.success('管线已启动');
      router.push(`/jobs/${result.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '启动失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleRun} disabled={!canRun || loading}>
      <Play className="h-4 w-4 mr-2" />
      {loading ? '启动中...' : '启动管线'}
    </Button>
  );
}

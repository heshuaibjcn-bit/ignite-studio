'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { XCircle, RotateCcw } from 'lucide-react';

interface JobActionsProps {
  jobId: string;
  status: string;
}

export function JobActions({ jobId, status }: JobActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      toast.success('已取消');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/retry`);
      toast.success('已重试');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'queued' || status === 'running') {
    return (
      <Button size="sm" variant="ghost" onClick={handleCancel} disabled={loading}>
        <XCircle className="h-3.5 w-3.5 mr-1" />
        取消
      </Button>
    );
  }

  if (status === 'failed') {
    return (
      <Button size="sm" variant="ghost" onClick={handleRetry} disabled={loading}>
        <RotateCcw className="h-3.5 w-3.5 mr-1" />
        重试
      </Button>
    );
  }

  return null;
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ReviewActionsProps {
  jobId: string;
  stepId: string;
}

export function ReviewActions({ jobId, stepId }: ReviewActionsProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/steps/${stepId}/review`, {
        action: 'approve',
      });
      toast.success('已通过审核');
      // Refresh page to show updated status
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/steps/${stepId}/review`, {
        action: 'reject',
        reason: reason.trim(),
      });
      toast.success('已拒绝');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-amber-600">⚠ 等待人工确认</span>
      </div>

      {rejecting ? (
        <div className="space-y-2">
          <Textarea
            placeholder="请输入拒绝原因..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              确认拒绝
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejecting(false)}
            >
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={loading}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            通过
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setRejecting(true)}
            disabled={loading}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            拒绝
          </Button>
        </div>
      )}
    </div>
  );
}

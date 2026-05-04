'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { api } from '@/lib/api-client';
import { formatRelativeTime, truncateId } from '@/lib/formatters';

interface RecentJob {
  id: string;
  status: string;
  bizType: string;
  bizId: string;
  currentStep: string | null;
  createdAt: string;
  startedAt: string | null;
}

export function RecentJobsTable() {
  const [jobs, setJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchJobs() {
      try {
        const data = await api.get<{ jobs: RecentJob[] }>('/jobs?limit=10');
        if (mounted) {
          setJobs(data?.jobs ?? []);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无任务记录
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">任务ID</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>当前步骤</TableHead>
          <TableHead className="text-right">创建时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-mono text-xs">
              <Link href={`/jobs/${job.id}`} className="hover:underline">
                {truncateId(job.id)}
              </Link>
            </TableCell>
            <TableCell>{job.bizType}</TableCell>
            <TableCell>
              <JobStatusBadge status={job.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {job.currentStep ?? '-'}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {formatRelativeTime(job.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

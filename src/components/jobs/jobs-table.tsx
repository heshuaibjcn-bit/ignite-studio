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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobStatusBadge } from './job-status-badge';
import { JobActions } from './job-actions';
import { api } from '@/lib/api-client';
import { formatRelativeTime, truncateId } from '@/lib/formatters';
import { JOB_STATUS_LABELS } from '@/lib/constants';

interface Job {
  id: string;
  bizType: string;
  bizId: string;
  runType: string;
  status: string;
  currentStep: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let mounted = true;

    async function fetchJobs() {
      try {
        const statusFilter = activeTab === 'all' ? undefined : activeTab;
        const query = statusFilter ? `/jobs?status=${statusFilter}&limit=50` : '/jobs?limit=50';
        const data = await api.get<{ jobs: Job[] }>(query);
        if (mounted) {
          setJobs(data?.jobs ?? []);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  const tabs = [
    { value: 'all', label: '全部' },
    { value: 'running', label: '运行中' },
    { value: 'success', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {tabs.map(t => (
          <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(t => (
        <TabsContent key={t.value} value={t.value}>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无任务</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">任务ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>当前步骤</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        {truncateId(job.id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{job.bizType}</TableCell>
                    <TableCell><JobStatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.currentStep ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <JobActions jobId={job.id} status={job.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

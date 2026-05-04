import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentJobsTable } from '@/components/dashboard/recent-jobs-table';
import { api } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalProjects: number;
  activeJobs: number;
  pendingReviews: number;
  recentJobs: Array<{
    id: string;
    status: string;
    bizType: string;
    currentStep: string | null;
    createdAt: string;
  }>;
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Use direct fetch since this runs server-side
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${base}/api/v1/dashboard/stats`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {
    // Fallback to defaults
  }
  return { totalProjects: 0, activeJobs: 0, pendingReviews: 0, recentJobs: [] };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">燃启工作室总览</p>
      </div>

      <StatsCards stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>最近任务</CardTitle>
          <CardDescription>最近执行的管线任务</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentJobsTable />
        </CardContent>
      </Card>
    </div>
  );
}

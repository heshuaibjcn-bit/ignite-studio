import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobsTable } from '@/components/jobs/jobs-table';

export const metadata = { title: '任务监控 — 燃启工作室' };

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">任务监控</h1>
        <p className="text-muted-foreground">查看和管理管线任务</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <JobsTable />
        </CardContent>
      </Card>
    </div>
  );
}

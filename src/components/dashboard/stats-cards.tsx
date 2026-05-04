import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Activity, CheckCircle, Clock } from 'lucide-react';

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

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '项目总数',
      value: stats.totalProjects,
      icon: Briefcase,
      description: '已创建的项目',
      color: 'text-blue-600',
    },
    {
      title: '活跃任务',
      value: stats.activeJobs,
      icon: Activity,
      description: '正在运行的任务',
      color: 'text-green-600',
    },
    {
      title: '待审核',
      value: stats.pendingReviews,
      icon: Clock,
      description: '需要人工确认',
      color: 'text-amber-600',
    },
    {
      title: '最近任务',
      value: stats.recentJobs.length,
      icon: CheckCircle,
      description: '最近执行的任务',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

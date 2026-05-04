'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  Image,
  Activity,
  Clapperboard,
  Settings,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navGroups = [
  {
    label: '工作台',
    items: [
      { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
      { href: '/jobs', label: '任务监控', icon: Activity },
    ],
  },
  {
    label: '创作',
    items: [
      { href: '/projects', label: '项目管理', icon: Briefcase },
      { href: '/assets', label: '资产库', icon: Image },
    ],
  },
  {
    label: '系统',
    items: [
      { href: '/settings', label: '设置', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <Clapperboard className="h-5 w-5 text-sidebar-primary" />
        <span className="font-semibold text-sm">燃启工作室</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <Separator className="my-2" />}
            <div className="px-3 py-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {group.label}
              </span>
            </div>
            <nav className="flex flex-col gap-0.5 px-2">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="text-[11px] text-muted-foreground">v2.2.0</div>
      </div>
    </aside>
  );
}

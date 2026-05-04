'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sidebar } from './sidebar';

/** Map route prefixes to breadcrumb labels */
const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  projects: '项目',
  productions: '制作',
  episodes: '剧集',
  storyboards: '分镜',
  jobs: '任务',
  assets: '资产',
  settings: '设置',
  new: '新建',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [];
  let path = '';

  for (const seg of segments) {
    path += `/${seg}`;
    const label = BREADCRUMB_LABELS[seg] || seg;
    crumbs.push({ label, href: path });
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {i < crumbs.length - 1 ? (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu */}
      {/* Mobile menu - hidden on md+ */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs />
    </header>
  );
}

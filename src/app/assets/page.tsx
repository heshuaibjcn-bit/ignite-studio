'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatFileSize, formatDate, truncateId } from '@/lib/formatters';
import { ASSET_TYPE_LABELS, ASSET_SOURCE_TYPE_LABELS } from '@/lib/constants';
import { FileIcon, ImageIcon, FilmIcon, MusicIcon, FileTextIcon } from 'lucide-react';

interface Asset {
  id: string;
  type: string;
  sourceType: string;
  title: string | null;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  status: string;
  createdAt: string;
}

function AssetTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image': return <ImageIcon className="h-4 w-4" />;
    case 'video': return <FilmIcon className="h-4 w-4" />;
    case 'audio': return <MusicIcon className="h-4 w-4" />;
    case 'subtitle': return <FileTextIcon className="h-4 w-4" />;
    default: return <FileIcon className="h-4 w-4" />;
  }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let mounted = true;

    async function fetchAssets() {
      try {
        const typeFilter = activeTab === 'all' ? undefined : activeTab;
        const query = typeFilter ? `/assets?type=${typeFilter}&limit=50` : '/assets?limit=50';
        const data = await api.get<{ assets: Asset[] }>(query);
        if (mounted) {
          setAssets(data?.assets ?? []);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchAssets();
    return () => { mounted = false; };
  }, [activeTab]);

  const tabs = [
    { value: 'all', label: '全部' },
    { value: 'image', label: '图片' },
    { value: 'video', label: '视频' },
    { value: 'audio', label: '音频' },
    { value: 'subtitle', label: '字幕' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">资产库</h1>
        <p className="text-muted-foreground">管理项目中的图片、视频、音频等资产</p>
      </div>

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
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无资产</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">预览</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>尺寸</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        {asset.type === 'image' && asset.thumbnailUrl ? (
                          <img
                            src={`/api/v1/assets/${asset.id}/file`}
                            alt={asset.title ?? ''}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <AssetTypeIcon type={asset.type} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {asset.title ?? truncateId(asset.id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ASSET_SOURCE_TYPE_LABELS[asset.sourceType] ?? asset.sourceType}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatFileSize(asset.sizeBytes)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {asset.width && asset.height
                          ? `${asset.width}×${asset.height}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(asset.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

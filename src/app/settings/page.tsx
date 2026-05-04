'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { Plus, Zap, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface AIConfig {
  id: string;
  name: string;
  serviceType: string;
  provider: string;
  model: string | null;
  apiBase: string | null;
  apiKeyEncrypted: string | null;
  isActive: boolean;
  priority: number;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  text: '文本/LLM',
  image: '图片生成',
  video: '视频生成',
  audio: '语音合成',
  asr: '语音识别',
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchConfigs() {
    setError(null);
    try {
      const data = await api.get<{ configs: AIConfig[] }>('/ai-configs');
      setConfigs(data?.configs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取配置失败，请检查网络连接');
    }
    setLoading(false);
  }

  useEffect(() => { fetchConfigs(); }, []);

  async function probeConfig(id: string) {
    setProbingId(id);
    try {
      const result = await api.post<{ reachable: boolean; latencyMs?: number; error?: string }>(`/ai-configs/${id}/probe`);
      if (result?.reachable) {
        alert(`连接成功 (${result.latencyMs}ms)`);
      } else {
        alert(`连接失败: ${result?.error ?? '请检查 API 地址和密钥'}`);
      }
    } catch (err) {
      alert(`测试失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setProbingId(null);
    }
  }

  async function deleteConfig(id: string, name: string) {
    if (!confirm(`确定删除配置「${name}」？${configs.find(c => c.id === id)?.isActive ? '该配置正在使用中。' : ''}`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/ai-configs/${id}`);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">设置</h1></div>
        <div className="space-y-2" role="status" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">设置</h1></div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchConfigs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-muted-foreground">管理 AI 服务提供商配置</p>
        </div>
        <Button onClick={() => {
          const name = prompt('配置名称:');
          if (!name) return;
          const serviceType = prompt('服务类型 (text/image/video/audio/asr):');
          if (!serviceType) return;
          const provider = prompt('提供商 (openai/minimax/edge):');
          if (!provider) return;
          const apiBase = prompt('API 地址 (可留空):') || '';
          const apiKey = prompt('API 密钥 (可留空):') || '';
          const model = prompt('模型名称 (可留空):') || '';

          api.post('/ai-configs', {
            name, serviceType, provider, apiBase, apiKey, model,
          }).then(() => fetchConfigs()).catch(err => alert(`创建失败: ${err.message}`));
        }}>
          <Plus className="h-4 w-4 mr-2" />
          添加配置
        </Button>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-2">暂无 AI 服务配置</p>
            <p className="text-xs text-muted-foreground">点击上方「添加配置」按钮开始设置 AI 服务</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className={config.isActive ? 'border-l-4 border-l-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{config.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.isActive ? 'default' : 'secondary'}>
                      {config.isActive ? '启用' : '停用'}
                    </Badge>
                    <Badge variant="outline">
                      {SERVICE_TYPE_LABELS[config.serviceType] ?? config.serviceType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <div className="font-medium text-foreground">提供商: {config.provider} {config.model && `/ ${config.model}`}</div>
                    <div>API: {config.apiBase ?? '(本地)'}</div>
                    <div>密钥: {config.apiKeyEncrypted ?? '无需密钥'}</div>
                    <div>优先级: {config.priority}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => probeConfig(config.id)}
                      disabled={probingId === config.id}
                      aria-label={`测试 ${config.name} 连接`}
                    >
                      {probingId === config.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      测试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfig(config.id, config.name)}
                      disabled={deletingId === config.id}
                      aria-label={`删除 ${config.name} 配置`}
                    >
                      {deletingId === config.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

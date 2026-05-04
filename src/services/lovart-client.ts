/**
 * Lovart API Client
 *
 * Communication client for the Lovart AI generation platform.
 * Uses HMAC-SHA256 signature authentication (access_key:secret_key).
 *
 * Workflow:
 *   1. createProject() → get a project_id
 *   2. send() → send a chat prompt with tool config → get thread_id
 *   3. poll() → wait for thread to reach 'done' status
 *   4. getResult() → fetch artifacts (images/videos)
 */
import crypto from 'crypto';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import type { AIConfig } from './adapters/types';

const DEFAULT_BASE_URL = 'https://lgw.lovart.ai';
const OPENAPI_PREFIX = '/v1/openapi';

// ── Types ──────────────────────────────────────────────────────────────

type LovartCredentials = {
  accessKey: string;
  secretKey: string;
};

type LovartRequestOptions = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
};

export type LovartArtifact = {
  type: string;
  content: string;
};

export type LovartChatResult = {
  thread_id?: string;
  project_id?: string;
  final_status?: string;
  generation_succeeded?: boolean;
  warning?: string;
  agent_message?: string;
  pending_confirmation?: unknown;
  items?: Array<{
    type?: string;
    text?: string;
    artifacts?: LovartArtifact[];
  }>;
};

// ── Helpers ────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
  };
  return map[mimeType] || '.jpg';
}

export function parseLovartCredentials(apiKey: string): LovartCredentials {
  const raw = String(apiKey || '').trim();
  const [accessKey, ...secretParts] = raw.split(':');
  const secretKey = secretParts.join(':');
  if (!accessKey || !secretKey) {
    throw new Error('Lovart API Key must use "access_key:secret_key" format');
  }
  return { accessKey, secretKey };
}

export function extractArtifacts(
  result: LovartChatResult,
  type?: 'image' | 'video',
): LovartArtifact[] {
  return (result.items || [])
    .flatMap((item) => item.artifacts || [])
    .filter(
      (artifact) => artifact.content && (!type || artifact.type === type),
    );
}

// ── Client ─────────────────────────────────────────────────────────────

export class LovartClient {
  private baseUrl: string;
  private accessKey: string;
  private secretKey: string;

  constructor(config: AIConfig) {
    const credentials = parseLovartCredentials(config.apiKey);
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.accessKey = credentials.accessKey;
    this.secretKey = credentials.secretKey;
  }

  /**
   * Full workflow: create project, send prompt, poll until done, return result.
   */
  async chatAndWait(options: {
    prompt: string;
    projectName?: string;
    attachments?: string[];
    preferModels?: Record<string, string[]>;
    includeTools?: string[];
    mode?: 'fast' | 'thinking';
    timeoutMs?: number;
  }): Promise<LovartChatResult> {
    const projectId = await this.createProject(options.projectName);
    const threadId = await this.send({
      prompt: options.prompt,
      projectId,
      attachments: options.attachments,
      preferModels: options.preferModels,
      includeTools: options.includeTools,
      mode: options.mode || 'fast',
    });
    const finalStatus = await this.poll(
      threadId,
      options.timeoutMs || 600_000,
    );
    const result = await this.getResult(threadId);
    result.thread_id = threadId;
    result.project_id = projectId;
    result.final_status = finalStatus;
    if (finalStatus === 'done') {
      result.generation_succeeded = extractArtifacts(result).length > 0;
    }
    return result;
  }

  /**
   * Start a chat without waiting — returns project + thread IDs for later polling.
   */
  async startChat(options: {
    prompt: string;
    projectName?: string;
    attachments?: string[];
    preferModels?: Record<string, string[]>;
    includeTools?: string[];
    mode?: 'fast' | 'thinking';
  }): Promise<{ projectId: string; threadId: string }> {
    const projectId = await this.createProject(options.projectName);
    const threadId = await this.send({
      prompt: options.prompt,
      projectId,
      attachments: options.attachments,
      preferModels: options.preferModels,
      includeTools: options.includeTools,
      mode: options.mode || 'fast',
    });
    return { projectId, threadId };
  }

  // ── Project ──

  async createProject(projectName?: string): Promise<string> {
    const body: Record<string, unknown> = {
      project_id: '',
      canvas: '',
      project_cover_list: [],
      pic_count: 0,
      project_type: 3,
    };
    if (projectName) (body as Record<string, unknown>).project_name = projectName;
    const result = await this.request({
      method: 'POST',
      path: `${OPENAPI_PREFIX}/project/save`,
      body,
    });
    const projectId = result?.project_id;
    if (!projectId) throw new Error('Lovart did not return project_id');
    return projectId;
  }

  // ── Chat ──

  async send(options: {
    prompt: string;
    projectId: string;
    attachments?: string[];
    preferModels?: Record<string, string[]>;
    includeTools?: string[];
    mode?: 'fast' | 'thinking';
  }): Promise<string> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
      project_id: options.projectId,
    };
    if (options.attachments?.length) body.attachments = options.attachments;
    if (options.mode) body.mode = options.mode;

    const toolConfig: Record<string, unknown> = {};
    if (options.preferModels)
      toolConfig.prefer_tool_categories = options.preferModels;
    if (options.includeTools?.length)
      toolConfig.include_tools = options.includeTools;
    if (Object.keys(toolConfig).length) body.tool_config = toolConfig;

    const result = await this.request({
      method: 'POST',
      path: `${OPENAPI_PREFIX}/chat`,
      body,
    });
    const threadId = result?.thread_id;
    if (!threadId) throw new Error('Lovart did not return thread_id');
    return threadId;
  }

  // ── Status / Result ──

  async getStatus(threadId: string): Promise<Record<string, unknown>> {
    return this.request({
      method: 'GET',
      path: `${OPENAPI_PREFIX}/chat/status`,
      params: { thread_id: threadId },
    });
  }

  async getResult(threadId: string): Promise<LovartChatResult> {
    return this.request({
      method: 'GET',
      path: `${OPENAPI_PREFIX}/chat/result`,
      params: { thread_id: threadId },
    });
  }

  // ── Upload ──

  async uploadFile(localPath: string): Promise<string> {
    const fileBuffer = readFileSync(localPath);
    return this.uploadBuffer(fileBuffer, basename(localPath));
  }

  async uploadDataUrl(
    dataUrl: string,
    filename = 'reference.jpg',
  ): Promise<string> {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL for Lovart upload');
    const ext = mimeToExt(match[1]);
    const safeName = filename.includes('.') ? filename : `${filename}${ext}`;
    return this.uploadBuffer(Buffer.from(match[2], 'base64'), safeName);
  }

  // ── Polling ──

  async poll(threadId: string, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.getStatus(threadId);
      const state = (status?.status as string) || 'running';
      if (state === 'abort') return 'abort';
      if (state === 'done') {
        await delay(5_000);
        const confirmed = await this.getStatus(threadId);
        const confirmedState = (confirmed?.status as string) || 'running';
        if (confirmedState === 'done' || confirmedState === 'abort')
          return confirmedState;
      }
      await delay(3_000);
    }
    return 'timeout';
  }

  // ── Internal HTTP ──

  private async request(options: LovartRequestOptions): Promise<any> {
    let url = `${this.baseUrl}${options.path}`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params || {})) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    if (params.size) url += `?${params.toString()}`;

    const headers = this.sign(options.method, options.path);
    headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = 'IgniteStudioLovart/1.0';

    const resp = await fetch(url, {
      method: options.method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs || 180_000),
    });
    const text = await resp.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!resp.ok) {
      const message = json?.message || json?.error || text || `HTTP ${resp.status}`;
      throw new Error(`Lovart API error ${resp.status}: ${message}`);
    }
    if (json && typeof json === 'object' && json.code && json.code !== 0) {
      throw new Error(
        `Lovart API error ${json.code}: ${json.message || 'Unknown error'}`,
      );
    }
    return json?.data ?? json;
  }

  private async uploadBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    const pathValue = `${OPENAPI_PREFIX}/file/upload`;
    const boundary = crypto.randomUUID().replace(/-/g, '');
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
      ),
      Buffer.from('Content-Type: application/octet-stream\r\n\r\n'),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const headers = this.sign('POST', pathValue);
    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
    headers['User-Agent'] = 'IgniteStudioLovart/1.0';

    const resp = await fetch(`${this.baseUrl}${pathValue}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(180_000),
    });
    const text = await resp.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* ignore parse errors */
    }
    if (!resp.ok)
      throw new Error(
        `Lovart upload failed ${resp.status}: ${json?.message || text}`,
      );
    if (json?.code && json.code !== 0)
      throw new Error(
        `Lovart upload failed ${json.code}: ${json.message || 'Unknown error'}`,
      );
    const uploadUrl = json?.data?.url;
    if (!uploadUrl) throw new Error('Lovart upload did not return url');
    return uploadUrl;
  }

  private sign(
    method: string,
    pathValue: string,
  ): Record<string, string> {
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${method}\n${pathValue}\n${ts}`)
      .digest('hex');
    return {
      'X-Access-Key': this.accessKey,
      'X-Timestamp': ts,
      'X-Signature': signature,
      'X-Signed-Method': method,
      'X-Signed-Path': pathValue,
    };
  }
}

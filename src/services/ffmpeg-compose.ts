/**
 * FFmpeg Composition Service
 * Composes single shots (video + audio + subtitles) and merges episodes.
 *
 * Enhancements from huobao-drama:
 * - SRT subtitle generation with proper timing
 * - Ken Burns zoom/pan effect for narrated-image projects
 * - Subtitle filter support detection
 * - Enhanced dialogue parsing with ignore lists for SFX/narration
 * - Duration probing
 */
import ffmpeg from 'fluent-ffmpeg';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { execFileSync } from 'child_process';
import { getFullPath, saveGeneratedFile } from './storage';
import { logger } from '@/lib/logger';

const TEMP_DIR = join(process.cwd(), 'data', 'temp');
const SUBTITLE_DIR = join(process.cwd(), 'data', 'static', 'subtitles');

// ── Ignore patterns for TTS (sound effects, ambient, background) ──

const IGNORE_TTS_SPEAKERS =
  /^(环境音|环境声|音效|效果音|sfx|sound ?effect|bgm|背景音|背景音乐|ambient)$/i;
const IGNORE_TTS_TEXT =
  /^(无|无对白|无台词|无旁白|无需配音|无需对白|none|null|n\/a|na|环境音|环境声|音效|效果音|纯音效|纯环境音|只有环境音|仅环境音|背景音|背景音乐|bgm|sfx|ambient)$/i;

// ── Subtitle filter support cache ──

let subtitleFilterSupport: boolean | null = null;

function supportsSubtitleFilter(): boolean {
  if (subtitleFilterSupport != null) return subtitleFilterSupport;
  try {
    const output = execFileSync('ffmpeg', ['-hide_banner', '-filters'], {
      encoding: 'utf8',
    });
    subtitleFilterSupport = /\bsubtitles\b/.test(output);
  } catch {
    subtitleFilterSupport = false;
  }
  return subtitleFilterSupport;
}

// ── Utility ──

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Probe the duration of a video file using ffprobe.
 */
export function probeDuration(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        resolve(null);
        return;
      }
      const duration = Number(metadata.format.duration || 0);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
    });
  });
}

// ── Interfaces ──

export interface ComposeShotParams {
  videoPath: string; // relative path in storage
  audioPath?: string; // TTS audio relative path
  subtitleText?: string; // subtitle text to overlay
  subtitleSrtPath?: string; // pre-generated SRT file path (overrides subtitleText)
  outputFormat?: string;
  /** Use zoompan (Ken Burns) effect on a still image — for narrated_image type */
  zoomPanDuration?: number; // seconds for zoompan animation
  /** Target resolution for output */
  targetWidth?: number;
  targetHeight?: number;
}

export interface MergeEpisodeParams {
  shotPaths: string[]; // ordered list of composed shot paths
}

// ── SRT Subtitle Generation ──

/**
 * Generate an SRT subtitle file from dialogue text.
 * Returns the relative path to the generated SRT file.
 */
export function generateSrtFile(
  text: string,
  durationSec: number,
): string {
  ensureDir(SUBTITLE_DIR);

  const safeText = text.replace(/\s+/g, '').trim();
  if (!safeText) throw new Error('Empty subtitle text');

  const wrapped = wrapSubtitleText(safeText);
  const subtitleEnd = Math.max(1, Math.min(durationSec - 1, 59));
  const endSec = String(Math.floor(subtitleEnd)).padStart(2, '0');
  const endMs = String(Math.floor((subtitleEnd % 1) * 1000)).padStart(3, '0');

  const srtContent = `1\n00:00:00,500 --> 00:00:${endSec},${endMs}\n${wrapped}\n`;

  const filename = `${nanoid(12)}.srt`;
  const fullPath = join(SUBTITLE_DIR, filename);
  writeFileSync(fullPath, srtContent, 'utf-8');

  return `subtitles/${filename}`;
}

// ── Composition ──

/**
 * Compose a single shot: overlay TTS audio and subtitles onto video.
 */
export async function composeSingleShot(params: ComposeShotParams): Promise<string> {
  const videoFullPath = getFullPath(params.videoPath);
  if (!existsSync(videoFullPath)) {
    throw new Error(`Video file not found: ${params.videoPath}`);
  }

  ensureDir(TEMP_DIR);
  const outputFilename = `shot_${nanoid(8)}.mp4`;
  const outputPath = join(TEMP_DIR, outputFilename);

  const isNarratedImage = typeof params.zoomPanDuration === 'number';
  const videoDuration = isNarratedImage
    ? params.zoomPanDuration!
    : await probeDuration(videoFullPath);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(videoFullPath);

    // Narrated image: loop still image
    if (isNarratedImage) {
      cmd = cmd.inputOptions(['-loop', '1', '-framerate', '30']);
    }

    // Add TTS audio if available
    if (params.audioPath) {
      const audioFullPath = getFullPath(params.audioPath);
      if (existsSync(audioFullPath)) {
        cmd = cmd.input(audioFullPath);
      }
    }

    // Build filters
    const filters: string[] = [];
    const tw = params.targetWidth || 1920;
    const th = params.targetHeight || 1080;

    // Ken Burns zoom/pan for narrated image
    if (isNarratedImage) {
      const frames = Math.max(30, Math.round((videoDuration || 6) * 30));
      filters.push(
        `scale=${tw}:${th}:force_original_aspect_ratio=increase,crop=${tw}:${th},zoompan=z='min(zoom+0.0007,1.045)':d=${frames}:s=${tw}x${th}:fps=30`,
      );
    }

    // Subtitle overlay — prefer SRT file (higher quality) over drawtext
    const hasSrt = params.subtitleSrtPath && existsSync(params.subtitleSrtPath!);
    if (hasSrt && supportsSubtitleFilter()) {
      const escapedPath = params
        .subtitleSrtPath!.replace(/\\/g, '/')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'");
      const forceStyle = isNarratedImage
        ? 'FontSize=26\\,PrimaryColour=&HFFFFFF&\\,OutlineColour=&H000000&\\,Outline=2\\,MarginV=64\\,Alignment=2'
        : 'FontSize=20\\,PrimaryColour=&HFFFFFF&\\,OutlineColour=&H000000&\\,Outline=2';
      filters.push(
        `subtitles=filename='${escapedPath}':force_style='${forceStyle}'`,
      );
    } else if (params.subtitleText) {
      // Fallback: drawtext filter for subtitle overlay
      const escapedText = params.subtitleText
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:');
      const subtitleFilter = `drawtext=text='${escapedText}':fontsize=24:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-40`;
      filters.push(subtitleFilter);
    }

    // Audio mixing
    if (params.audioPath) {
      const audioFullPath = getFullPath(params.audioPath);
      if (existsSync(audioFullPath)) {
        filters.push('[0:a][1:a]amix=inputs=2:duration=first[aout]');
      }
    }

    if (filters.length > 0) {
      cmd = cmd.complexFilter(filters);
      if (params.audioPath) {
        cmd = cmd.outputOptions(['-map', '0:v', '-map', '[aout]']);
      }
    }

    const outputOptions = [
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
    ];

    if (params.audioPath) {
      outputOptions.push('-c:a', 'aac');
      if (videoDuration) {
        outputOptions.push('-af', 'apad', '-t', videoDuration.toFixed(3));
      }
      outputOptions.push('-shortest');
    } else {
      outputOptions.push('-an');
      if (videoDuration) {
        outputOptions.push('-t', videoDuration.toFixed(3));
      }
    }

    cmd
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('end', () => {
        const buffer = readFileSync(outputPath);
        const localPath = saveGeneratedFile(buffer, 'videos', 'mp4');
        unlinkSync(outputPath);
        logger.info({ localPath }, 'Shot composition completed');
        resolve(localPath);
      })
      .on('error', (err: Error) => {
        logger.error({ error: err.message }, 'Shot composition failed');
        reject(err);
      })
      .run();
  });
}

/**
 * Merge multiple composed shots into a single episode video.
 */
export async function mergeEpisode(params: MergeEpisodeParams): Promise<string> {
  if (params.shotPaths.length === 0) {
    throw new Error('No shots to merge');
  }

  ensureDir(TEMP_DIR);

  // Create concat file list
  const concatListPath = join(TEMP_DIR, `concat_${nanoid(8)}.txt`);
  const concatContent = params.shotPaths
    .map((p) => `file '${getFullPath(p)}'`)
    .join('\n');
  writeFileSync(concatListPath, concatContent);

  const outputFilename = `episode_${nanoid(8)}.mp4`;
  const outputPath = join(TEMP_DIR, outputFilename);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', () => {
        const buffer = readFileSync(outputPath);
        const localPath = saveGeneratedFile(buffer, 'videos', 'mp4');
        unlinkSync(outputPath);
        unlinkSync(concatListPath);
        logger.info(
          { localPath, shotCount: params.shotPaths.length },
          'Episode merge completed',
        );
        resolve(localPath);
      })
      .on('error', (err: Error) => {
        logger.error({ error: err.message }, 'Episode merge failed');
        if (existsSync(concatListPath)) unlinkSync(concatListPath);
        reject(err);
      })
      .run();
  });
}

// ── Dialogue Parsing ──

export interface ParsedDialogue {
  speaker: string | null;
  text: string;
  /** Whether this dialogue should be skipped for TTS (SFX, ambient, etc.) */
  ignorable: boolean;
}

/**
 * Parse dialogue text to extract speaker and pure text for TTS.
 * Handles formats like "小美：你好啊！" or "[小美] 你好啊！"
 * Strips parenthetical notes and identifies ignorable dialogue (SFX, ambient, etc.)
 */
export function parseDialogueForTTS(dialogue: string): ParsedDialogue {
  const raw = (dialogue || '').trim();
  if (!raw) return { speaker: null, text: '', ignorable: true };

  // Pattern: "角色名：台词" or "角色名: 台词"
  const colonMatch = raw.match(/^(.+?)[：:]\s*(.+)$/);
  if (colonMatch) {
    const speaker = colonMatch[1]
      .replace(/[（(].+?[)）]/g, '')
      .trim();
    const text = colonMatch[2].replace(/[（(].+?[)）]/g, '').trim();
    const ignorable =
      (!!speaker && IGNORE_TTS_SPEAKERS.test(speaker)) ||
      !text ||
      IGNORE_TTS_TEXT.test(text);
    return { speaker, text, ignorable };
  }

  // Pattern: "[角色名] 台词"
  const bracketMatch = raw.match(/^\[(.+?)\]\s*(.+)$/);
  if (bracketMatch) {
    const speaker = bracketMatch[1].trim();
    const text = bracketMatch[2].replace(/[（(].+?[)）]/g, '').trim();
    const ignorable =
      (!!speaker && IGNORE_TTS_SPEAKERS.test(speaker)) ||
      !text ||
      IGNORE_TTS_TEXT.test(text);
    return { speaker, text, ignorable };
  }

  // No speaker — pure narration/description
  const text = raw.replace(/[（(].+?[)）]/g, '').trim();
  const ignorable = !text || IGNORE_TTS_TEXT.test(text);
  return { speaker: null, text, ignorable };
}

/**
 * Wrap subtitle text into lines of maxChars width.
 * Compacts whitespace first, then wraps.
 */
export function wrapSubtitleText(text: string, maxChars = 18): string {
  const compact = text.replace(/\s+/g, '').trim();
  if (!compact) return '';
  const lines: string[] = [];
  for (let i = 0; i < compact.length; i += maxChars) {
    lines.push(compact.slice(i, i + maxChars));
  }
  return lines.join('\n');
}

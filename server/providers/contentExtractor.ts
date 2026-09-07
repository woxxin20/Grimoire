import { MemoryType } from '../../src/types/memory.js';
import crypto from 'crypto';

export interface ExtractedContent {
  type: MemoryType;
  original_content: string;
  normalized_text: string;
  source_url?: string;
  local_path?: string;
  file_name?: string;
  mime_type?: string;
  content_hash: string;
}

export class ContentExtractor {
  /**
   * Main entry point to inspect input string/file and produce normalized content
   */
  public async extract(
    input: string,
    fileMeta?: { originalname: string; mimetype: string; buffer?: Buffer }
  ): Promise<ExtractedContent> {
    const rawInput = input ? input.trim() : '';

    // Calculate SHA-256 content hash of exact original input
    const hashBuffer = fileMeta?.buffer || Buffer.from(rawInput, 'utf8');
    const content_hash = crypto.createHash('sha256').update(hashBuffer).digest('hex');

    // Case 1: File Upload
    if (fileMeta) {
      const type = this.detectFileType(fileMeta.mimetype, fileMeta.originalname);
      return {
        type,
        original_content: rawInput || fileMeta.originalname,
        normalized_text: fileMeta.buffer ? fileMeta.buffer.toString('utf-8', 0, 5000) : fileMeta.originalname,
        file_name: fileMeta.originalname,
        mime_type: fileMeta.mimetype,
        content_hash,
      };
    }

    // Case 2: Local Windows / Unix File System Path
    const isWindowsPath = /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/.test(rawInput);
    const isUnixPath = /^\/(?:[^/\0]+\/)*[^/\0]*$/.test(rawInput);
    if (isWindowsPath || isUnixPath) {
      const parts = rawInput.split(/[/\\]/);
      const filename = parts[parts.length - 1] || rawInput;
      return {
        type: 'local_path',
        original_content: rawInput,
        normalized_text: `Local filesystem path: ${rawInput}\nFile name: ${filename}`,
        local_path: rawInput,
        file_name: filename,
        content_hash,
      };
    }

    // Case 3: URL Web Address
    if (this.isValidUrl(rawInput)) {
      try {
        const urlData = await this.extractFromUrl(rawInput);
        return {
          type: 'url',
          original_content: rawInput,
          normalized_text: urlData.text,
          source_url: rawInput,
          file_name: urlData.title,
          content_hash,
        };
      } catch (e) {
        return {
          type: 'url',
          original_content: rawInput,
          normalized_text: `URL: ${rawInput}`,
          source_url: rawInput,
          content_hash,
        };
      }
    }

    // Case 4: JSON Object
    if ((rawInput.startsWith('{') && rawInput.endsWith('}')) || (rawInput.startsWith('[') && rawInput.endsWith(']'))) {
      try {
        const parsed = JSON.parse(rawInput);
        return {
          type: 'json',
          original_content: rawInput,
          normalized_text: JSON.stringify(parsed, null, 2),
          content_hash,
        };
      } catch (e) {
        // Fall through to text
      }
    }

    // Case 5: Code Snippet detection
    const isCode =
      rawInput.includes('function ') ||
      rawInput.includes('const ') ||
      rawInput.includes('import ') ||
      rawInput.includes('class ') ||
      rawInput.includes('def ') ||
      rawInput.includes('public static void') ||
      rawInput.includes('val ') ||
      rawInput.includes('fun ');
    if (isCode && rawInput.split('\n').length >= 3) {
      return {
        type: 'code',
        original_content: rawInput,
        normalized_text: rawInput,
        content_hash,
      };
    }

    // Case 6: Standard Plain Text / Note / Prompt
    return {
      type: 'text',
      original_content: rawInput,
      normalized_text: rawInput,
      content_hash,
    };
  }

  private isValidUrl(str: string): boolean {
    try {
      const parsed = new URL(str);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async extractFromUrl(urlStr: string): Promise<{ title: string; text: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(urlStr, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityMindExtractor/1.0',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { title: urlStr, text: `URL Webpage: ${urlStr}` };
      }

      const html = await response.text();

      // Extract title from HTML tag
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : urlStr;

      // Extract text content by stripping HTML tags
      const bodyText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 4000);

      return {
        title,
        text: `Page Title: ${title}\nURL: ${urlStr}\nExtracted Content: ${bodyText}`,
      };
    } catch (err) {
      clearTimeout(timeout);
      return { title: urlStr, text: `URL: ${urlStr}` };
    }
  }

  private detectFileType(mime: string, filename: string): MemoryType {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (mime.startsWith('image/') || ['jpg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio';
    if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov'].includes(ext || '')) return 'video';
    if (['json'].includes(ext || '')) return 'json';
    if (['ts', 'js', 'py', 'java', 'kt', 'cpp', 'c', 'cs', 'go', 'rs', 'html', 'css'].includes(ext || '')) return 'code';
    return 'file';
  }
}

export const contentExtractor = new ContentExtractor();

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

export interface KeyLogEntry {
  timestamp: string;
  keyIndex: number;
  requestType: string;
  success: boolean;
  latencyMs: number;
  retryCount: number;
  error?: string;
}

export interface KeySlotInfo {
  index: number;
  keyMasked: string;
  status: 'active' | 'rate_limited' | 'disabled' | 'unconfigured';
  successCount: number;
  failureCount: number;
  lastError?: string;
  latencyMs?: number;
}

interface KeyState {
  key: string;
  index: number;
  isRateLimited: boolean;
  rateLimitResetTime: number;
  failureCount: number;
  successCount: number;
  lastError?: string;
  lastLatencyMs?: number;
}

export class GeminiKeyRotator {
  private keys: KeyState[] = [];
  private currentKeyIndex = 0;
  private logs: KeyLogEntry[] = [];

  constructor() {
    this.reloadKeysFromEnv();
  }

  public reloadKeysFromEnv() {
    const rawKeys: string[] = [];

    // Collect GEMINI_API_KEY_1 through GEMINI_API_KEY_20
    for (let i = 1; i <= 20; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k && k.trim().length > 0) {
        rawKeys.push(k.trim());
      }
    }

    if (rawKeys.length === 0 && process.env.GEMINI_API_KEY) {
      rawKeys.push(process.env.GEMINI_API_KEY.trim());
    }

    // Filter to prioritize valid AIzaSy API key formats
    const validKeys = rawKeys.filter((k) => k.startsWith('AIzaSy') || k.length >= 20);

    this.keys = validKeys.map((key, index) => ({
      key,
      index,
      isRateLimited: false,
      rateLimitResetTime: 0,
      failureCount: 0,
      successCount: 0,
    }));

    console.log(`[GeminiKeyRotator] Loaded ${this.keys.length} valid Gemini API key(s) into failover manager.`);
  }

  public setKeysManually(newKeys: string[]) {
    const cleanKeys = newKeys
      .map((k) => k.trim())
      .filter((k) => k.length > 10 && (k.startsWith('AIzaSy') || k.length > 20));

    this.keys = cleanKeys.map((key, index) => ({
      key,
      index,
      isRateLimited: false,
      rateLimitResetTime: 0,
      failureCount: 0,
      successCount: 0,
    }));

    // Rewrite only the GEMINI_API_KEY_* lines in .env. Everything else in that
    // file belongs to the user (RUVECTOR_URL, PORT, STORAGE_PATH, custom vars):
    // this used to regenerate the whole file from a hardcoded template, which
    // silently deleted any setting it did not know about.
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      const previous = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      const kept = previous
        .split(/\r?\n/)
        .filter((line) => !/^\s*GEMINI_API_KEY_\d+\s*=/.test(line));

      const keyLines = cleanKeys.map((k, idx) => `GEMINI_API_KEY_${idx + 1}=${k}`);
      // Put the keys back where the first one was, so the file keeps its shape.
      const insertAt = previous
        .split(/\r?\n/)
        .findIndex((line) => /^\s*GEMINI_API_KEY_\d+\s*=/.test(line));
      const merged = insertAt >= 0
        ? [...kept.slice(0, insertAt), ...keyLines, ...kept.slice(insertAt)]
        : [...keyLines, ...kept];

      const body = merged.join('\n').replace(/\n{3,}/g, '\n\n');
      fs.writeFileSync(envPath, body.endsWith('\n') ? body : `${body}\n`, 'utf-8');
    } catch (e: any) {
      // Never silently swallow this: the in-memory pool updated but the file did
      // not, so the keys vanish on restart and the cause is invisible.
      console.error('[GeminiKeyRotator] Key pool updated in memory but .env could not be written:', e?.message || e);
    }

    console.log(`[GeminiKeyRotator] Updated key pool with ${this.keys.length} manual API key(s).`);
  }

  public get activeKeyCount(): number {
    return this.keys.length;
  }

  public getSlotStatus(): KeySlotInfo[] {
    const slots: KeySlotInfo[] = [];
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      if (i < this.keys.length) {
        const k = this.keys[i];
        if (k.isRateLimited && now > k.rateLimitResetTime) {
          k.isRateLimited = false;
          k.lastError = undefined;
        }
        const masked = `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`;
        let status: 'active' | 'rate_limited' | 'disabled' = 'active';
        if (k.isRateLimited) status = 'rate_limited';
        if (k.failureCount >= 4) status = 'disabled';

        slots.push({
          index: i + 1,
          keyMasked: masked,
          status,
          successCount: k.successCount,
          failureCount: k.failureCount,
          lastError: k.lastError,
          latencyMs: k.lastLatencyMs,
        });
      } else {
        slots.push({
          index: i + 1,
          keyMasked: 'Unconfigured',
          status: 'unconfigured',
          successCount: 0,
          failureCount: 0,
        });
      }
    }
    return slots;
  }

  public getLogs(): KeyLogEntry[] {
    return [...this.logs];
  }

  public async execute<T>(
    requestType: string,
    operation: (apiKey: string) => Promise<T>
  ): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured. Please add Gemini API keys in Settings.');
    }

    let retries = 0;
    const maxRetries = Math.min(this.keys.length * 2, 10);

    while (retries < maxRetries) {
      const keyState = this.getAvailableKey();
      const callStart = Date.now();

      try {
        const result = await operation(keyState.key);
        const latency = Date.now() - callStart;

        keyState.successCount++;
        keyState.failureCount = 0;
        keyState.isRateLimited = false;
        keyState.lastLatencyMs = latency;
        keyState.lastError = undefined;

        this.logEvent({
          timestamp: new Date().toISOString(),
          keyIndex: keyState.index + 1,
          requestType,
          success: true,
          latencyMs: latency,
          retryCount: retries,
        });

        return result;
      } catch (err: any) {
        const latency = Date.now() - callStart;
        const errorMessage = err?.message || String(err);

        keyState.lastLatencyMs = latency;
        keyState.lastError = errorMessage.substring(0, 150);

        const isQuotaError =
          errorMessage.includes('429') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('quota') ||
          errorMessage.includes('rate limit');

        if (isQuotaError) {
          console.warn(`[KeyRotator] Key #${keyState.index + 1} quota limit hit. Rotating...`);
          keyState.isRateLimited = true;
          keyState.rateLimitResetTime = Date.now() + 60 * 1000;
        } else {
          keyState.failureCount += 1;
        }

        this.logEvent({
          timestamp: new Date().toISOString(),
          keyIndex: keyState.index + 1,
          requestType,
          success: false,
          latencyMs: latency,
          retryCount: retries,
          error: `Key #${keyState.index + 1} error: ${errorMessage.substring(0, 100)}`,
        });

        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        retries++;
      }
    }

    throw new Error(`All ${this.keys.length} Gemini API key(s) failed after ${retries} attempts.`);
  }

  private getAvailableKey(): KeyState {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.keys.length;
      const ks = this.keys[idx];
      if (ks.isRateLimited && now > ks.rateLimitResetTime) {
        ks.isRateLimited = false;
      }
      if (!ks.isRateLimited && ks.failureCount < 4) {
        this.currentKeyIndex = idx;
        return ks;
      }
    }
    return this.keys[this.currentKeyIndex % this.keys.length];
  }

  private logEvent(entry: KeyLogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > 300) {
      this.logs.pop();
    }
  }
}

export const keyRotator = new GeminiKeyRotator();

import { describe, it, expect } from 'vitest';
import { GeminiKeyRotator } from '../server/config/keyRotator.js';

describe('Gemini Key Rotator Failover Test', () => {
  it('should transparently failover to key #2 when key #1 throws a rate limit / 429 error', async () => {
    process.env.GEMINI_API_KEY_1 = 'test_key_1_quota_exceeded';
    process.env.GEMINI_API_KEY_2 = 'test_key_2_valid_backup';

    const rotator = new GeminiKeyRotator();
    let keysAttempted: string[] = [];

    const result = await rotator.execute('TestOperation', async (apiKey: string) => {
      keysAttempted.push(apiKey);
      if (apiKey === 'test_key_1_quota_exceeded') {
        throw new Error('429 RESOURCE_EXHAUSTED: Quota limit hit');
      }
      return 'SUCCESS_WITH_KEY_2';
    });

    expect(result).toBe('SUCCESS_WITH_KEY_2');
    expect(keysAttempted).toContain('test_key_1_quota_exceeded');
    expect(keysAttempted).toContain('test_key_2_valid_backup');

    const logs = rotator.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].success).toBe(true);
    expect(logs[1].success).toBe(false);
  });
});

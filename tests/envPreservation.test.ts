import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GeminiKeyRotator } from '../server/config/keyRotator.js';

// setKeysManually rewrites .env in process.cwd(). Run it inside a temp cwd so the
// real project .env is never touched.
const withTempCwd = (envContents: string, run: () => void) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grimoire-env-'));
  const original = process.cwd();
  fs.writeFileSync(path.join(dir, '.env'), envContents, 'utf-8');
  process.chdir(dir);
  try {
    run();
    return fs.readFileSync(path.join(dir, '.env'), 'utf-8');
  } finally {
    process.chdir(original);
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe('setKeysManually .env handling', () => {
  afterEach(() => {
    for (let i = 1; i <= 20; i++) delete process.env[`GEMINI_API_KEY_${i}`];
  });

  it('replaces the API keys without destroying unrelated settings', () => {
    const before = [
      '# My config',
      'GEMINI_API_KEY_1=AIzaSyOLDKEYOLDKEYOLDKEYOLDKEYOLDKEY111',
      'GEMINI_API_KEY_2=AIzaSyOLDKEYOLDKEYOLDKEYOLDKEYOLDKEY222',
      'RUVECTOR_URL=http://localhost:8080',
      'RUVECTOR_API_KEY=ruvector_secret_value',
      'PORT=4321',
      'STORAGE_PATH=/custom/storage/path',
      'MY_CUSTOM_FLAG=keep_me',
      '',
    ].join('\n');

    const after = withTempCwd(before, () => {
      const rotator = new GeminiKeyRotator();
      rotator.setKeysManually([
        'AIzaSyNEWKEYNEWKEYNEWKEYNEWKEYNEWKEYAAA',
        'AIzaSyNEWKEYNEWKEYNEWKEYNEWKEYNEWKEYBBB',
      ]);
    });

    // The new keys are written...
    expect(after).toContain('GEMINI_API_KEY_1=AIzaSyNEWKEYNEWKEYNEWKEYNEWKEYNEWKEYAAA');
    expect(after).toContain('GEMINI_API_KEY_2=AIzaSyNEWKEYNEWKEYNEWKEYNEWKEYNEWKEYBBB');
    // ...the old ones are gone...
    expect(after).not.toContain('OLDKEY');
    // ...and every unrelated setting survives, with the user's own values.
    expect(after).toContain('RUVECTOR_URL=http://localhost:8080');
    expect(after).toContain('RUVECTOR_API_KEY=ruvector_secret_value');
    expect(after).toContain('PORT=4321');
    expect(after).toContain('STORAGE_PATH=/custom/storage/path');
    expect(after).toContain('MY_CUSTOM_FLAG=keep_me');
    expect(after).toContain('# My config');
  });

  it('drops surplus key lines when fewer keys are supplied', () => {
    const before = [
      'GEMINI_API_KEY_1=AIzaSyOLDKEYOLDKEYOLDKEYOLDKEYOLDKEY111',
      'GEMINI_API_KEY_2=AIzaSyOLDKEYOLDKEYOLDKEYOLDKEYOLDKEY222',
      'GEMINI_API_KEY_3=AIzaSyOLDKEYOLDKEYOLDKEYOLDKEYOLDKEY333',
      'PORT=3001',
      '',
    ].join('\n');

    const after = withTempCwd(before, () => {
      new GeminiKeyRotator().setKeysManually(['AIzaSyONLYONEKEYONLYONEKEYONLYONEKEY11']);
    });

    expect(after).toContain('GEMINI_API_KEY_1=AIzaSyONLYONEKEYONLYONEKEYONLYONEKEY11');
    expect(after).not.toContain('GEMINI_API_KEY_2=');
    expect(after).not.toContain('GEMINI_API_KEY_3=');
    expect(after).toContain('PORT=3001');
  });
});

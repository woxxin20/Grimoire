import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Each test worker gets its own disposable archive, never the user's data.
const testStorage = mkdtempSync(path.join(tmpdir(), 'grimoire-unit-'));
process.env.STORAGE_PATH = testStorage;
process.env.GEMINI_API_KEY = '';
process.env.RUVECTOR_URL = '';
process.env.RUVECTOR_API_KEY = '';
for (let index = 1; index <= 20; index++) process.env[`GEMINI_API_KEY_${index}`] = '';
// Ingestion continues asynchronously after the initial save; keep its archive
// alive until this worker exits so teardown cannot race a background write.
process.once('exit', () => rmSync(testStorage, { recursive: true, force: true }));

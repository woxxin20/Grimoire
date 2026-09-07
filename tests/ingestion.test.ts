import { describe, it, expect } from 'vitest';
import { IngestionPipeline } from '../server/services/ingestionPipeline.js';

describe('Memory Ingestion Pipeline Test', () => {
  it('should ingest a note, assign title, category, and save to database', async () => {
    const pipeline = new IngestionPipeline();
    const rawNote = "C:\\Projects\\MyApp\\app\\src\\main\\java\\MainActivity.kt";

    const { memory } = await pipeline.ingest(rawNote);

    expect(memory).toBeDefined();
    expect(memory.type).toBe('local_path');
    expect(memory.local_path).toBe(rawNote);
    expect(memory.original_content).toBe(rawNote);
    expect(memory.file_name).toBe('MainActivity.kt');
  });
});

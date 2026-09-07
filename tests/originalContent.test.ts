import { describe, it, expect } from 'vitest';
import { sqliteStore } from '../server/db/sqliteStore.js';
import { ContentExtractor } from '../server/providers/contentExtractor.js';
import { MemoryNode } from '../src/types/memory.js';

describe('Exact Original Content Preservation Test', () => {
  it('must preserve exact original text input byte-for-byte', async () => {
    const rawInput = "Make the music darker, increase bass, add female stutter vocal";
    const extractor = new ContentExtractor();
    const extracted = await extractor.extract(rawInput);

    expect(extracted.original_content).toBe(rawInput);

    const testMemory: MemoryNode = {
      id: `test_mem_${Date.now()}`,
      type: 'text',
      original_content: extracted.original_content,
      title: 'Prompt test',
      category: 'Music',
      tags: ['music', 'prompts'],
      keywords: ['bass', 'vocal'],
      entities: [],
      concepts: ['Cinematic Music'],
      summary: 'AI summary of prompt...',
      analysis: 'Note analysis',
      raw_content: extracted.normalized_text,
      raw_content_preview: extracted.normalized_text.substring(0, 100),
      importance_score: 5,
      confidence_score: 1.0,
      favorite: false,
      content_hash: extracted.content_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    sqliteStore.saveMemory(testMemory);

    const retrieved = sqliteStore.getMemoryById(testMemory.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.original_content).toBe("Make the music darker, increase bass, add female stutter vocal");
  });
});

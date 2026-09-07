import { sqliteStore } from '../db/sqliteStore.js';
import { ruVectorService } from '../db/ruVectorClient.js';
import { MemoryNode } from '../../src/types/memory.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingMemory?: MemoryNode;
  reason?: string;
  options?: string[];
}

export class DuplicateDetector {
  public async checkDuplicate(
    contentHash: string,
    sourceUrl?: string,
    embedding?: number[] | null
  ): Promise<DuplicateCheckResult> {
    // 1. Exact hash check
    const existingByHash = sqliteStore.getMemoryByHash(contentHash);
    if (existingByHash) {
      return {
        isDuplicate: true,
        existingMemory: existingByHash,
        reason: 'Exact content hash match found.',
        options: ['Update existing', 'Create anyway', 'Merge'],
      };
    }

    // 2. URL check if URL exists
    if (sourceUrl) {
      const memories = sqliteStore.getAllMemories(200);
      const urlMatch = memories.find(
        (m) => m.source_url && m.source_url.toLowerCase() === sourceUrl.toLowerCase()
      );
      if (urlMatch) {
        return {
          isDuplicate: true,
          existingMemory: urlMatch,
          reason: 'Memory with identical source URL already exists.',
          options: ['Update existing', 'Create anyway', 'Merge'],
        };
      }
    }

    // 3. High semantic similarity check (>0.96)
    if (embedding && embedding.length > 0) {
      const simResults = await ruVectorService.vectorSimilaritySearch(embedding, 1, 0.96);
      if (simResults.length > 0 && simResults[0].similarity >= 0.96) {
        return {
          isDuplicate: true,
          existingMemory: simResults[0].memory,
          reason: `Very high semantic similarity (${Math.round(simResults[0].similarity * 100)}%) with existing memory.`,
          options: ['Update existing', 'Create anyway', 'Merge'],
        };
      }
    }

    return { isDuplicate: false };
  }
}

export const duplicateDetector = new DuplicateDetector();

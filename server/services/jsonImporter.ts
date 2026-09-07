import { ingestionPipeline } from './ingestionPipeline.js';
import { sqliteStore } from '../db/sqliteStore.js';
import { MemoryNode } from '../../src/types/memory.js';

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  memories: MemoryNode[];
}

export class JSONImporter {
  public async importJSON(jsonArray: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      total: jsonArray.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      memories: [],
    };

    for (const item of jsonArray) {
      try {
        const rawContent =
          item.original_content ||
          item.summary ||
          item.title ||
          item.url ||
          JSON.stringify(item);

        const res = await ingestionPipeline.ingest(
          rawContent,
          undefined,
          item.user_notes || undefined,
          false
        );

        if (res.isDuplicate) {
          result.duplicates++;
        } else {
          result.imported++;
          // Preserve original item attributes if supplied in import file
          if (item.category || (item.categories && item.categories[0])) {
            res.memory.category = item.category || item.categories[0];
          }
          if (item.title) {
            res.memory.title = item.title;
          }
          if (item.url) {
            res.memory.source_url = item.url;
          }
          if (item.favorite) {
            res.memory.favorite = Boolean(item.favorite);
          }
          if (item.created_at) {
            res.memory.created_at = item.created_at;
          }

          sqliteStore.saveMemory(res.memory);
          result.memories.push(res.memory);
        }
      } catch (err) {
        console.error('[JSONImporter] Failed to import item:', item, err);
        result.errors++;
      }
    }

    return result;
  }
}

export const jsonImporter = new JSONImporter();

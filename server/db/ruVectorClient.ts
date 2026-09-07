import { sqliteStore } from './sqliteStore.js';
import { MemoryNode, GraphEdge } from '../../src/types/memory.js';

export class RuVectorService {
  private url: string;
  private apiKey: string;
  private isConnected = false;

  constructor() {
    this.url = process.env.RUVECTOR_URL || '';
    this.apiKey = process.env.RUVECTOR_API_KEY || '';
    if (this.url) {
      console.log(`[RuVectorService] Initialized with endpoint ${this.url}`);
      this.checkConnection();
    } else {
      console.log('[RuVectorService] No RUVECTOR_URL specified. Using embedded high-performance vector & graph engine.');
    }
  }

  private async checkConnection() {
    try {
      const res = await fetch(`${this.url}/health`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });
      if (res.ok) {
        this.isConnected = true;
        console.log('[RuVectorService] Connected to external RuVector instance.');
      }
    } catch (e) {
      console.warn('[RuVectorService] RuVector server check failed. Defaulting to embedded vector engine.');
    }
  }

  public async insertMemory(memory: MemoryNode): Promise<void> {
    // Always sync with embedded SQLite store
    sqliteStore.saveMemory(memory);

    if (this.isConnected && memory.embedding) {
      try {
        await fetch(`${this.url}/vectors/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify({
            id: memory.id,
            vector: memory.embedding,
            metadata: {
              title: memory.title,
              category: memory.category,
              type: memory.type,
              concepts: memory.concepts,
            },
          }),
        });
      } catch (err) {
        console.warn('[RuVectorService] Failed to push memory to RuVector server. Local DB updated.');
      }
    }
  }

  public async vectorSimilaritySearch(
    embedding: number[],
    topK = 20,
    minSimilarity = 0.2
  ): Promise<Array<{ memory: MemoryNode; similarity: number }>> {
    if (this.isConnected) {
      try {
        const res = await fetch(`${this.url}/vectors/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify({
            vector: embedding,
            top_k: topK,
            min_similarity: minSimilarity,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const items: Array<{ memory: MemoryNode; similarity: number }> = [];
          for (const match of data.results || []) {
            const mem = sqliteStore.getMemoryById(match.id);
            if (mem) {
              items.push({ memory: mem, similarity: match.score || match.similarity });
            }
          }
          if (items.length > 0) return items;
        }
      } catch (e) {
        console.warn('[RuVectorService] Vector search on RuVector endpoint failed. Falling back to local vector search.');
      }
    }

    // Fallback to SQLite embedded vector search
    return sqliteStore.vectorSimilaritySearch(embedding, topK, minSimilarity);
  }

  public async getMemoryConnections(memoryId: string): Promise<GraphEdge[]> {
    return sqliteStore.getEdgesForMemory(memoryId);
  }
}

export const ruVectorService = new RuVectorService();

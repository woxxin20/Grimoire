import path from 'path';
import fs from 'fs';
import { MemoryNode, GraphEdge, RelationshipType } from '../../src/types/memory.js';

const storageDir = process.env.STORAGE_PATH || './data/storage';
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dbFilePath = path.join(storageDir, 'mind_data.json');

interface DBData {
  memories: Record<string, MemoryNode>;
  graph_nodes: Record<string, { id: string; type: string; label: string; category?: string; memory_id?: string; created_at: string }>;
  graph_edges: Record<string, GraphEdge>;
  search_sessions: Record<string, { id: string; queries: string[]; last_updated: string }>;
}

export class SQLiteStore {
  private data: DBData = {
    memories: {},
    graph_nodes: {},
    graph_edges: {},
    search_sessions: {},
  };

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(dbFilePath)) {
        const raw = fs.readFileSync(dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          memories: parsed.memories || {},
          graph_nodes: parsed.graph_nodes || {},
          graph_edges: parsed.graph_edges || {},
          search_sessions: parsed.search_sessions || {},
        };

        // Migrate any legacy 'Uncategorized' memory records
        let migratedCount = 0;
        for (const id of Object.keys(this.data.memories)) {
          const mem = this.data.memories[id];
          if (!mem.category || mem.category === 'Uncategorized') {
            const lower = mem.original_content.toLowerCase();
            if (
              lower.includes('ram') ||
              lower.includes('bhagawan') ||
              lower.includes('bhagwan') ||
              lower.includes('jai') ||
              lower.includes('god') ||
              lower.includes('sukhi') ||
              lower.includes('spiritual')
            ) {
              mem.category = 'Culture & Language';
            } else if (lower.includes('build') || lower.includes('architect') || lower.includes('code')) {
              mem.category = 'Programming & Web';
            } else {
              mem.category = 'General Knowledge';
            }
            migratedCount++;
          }
        }

        // Purge legacy 'category:uncategorized' graph nodes and edges
        delete this.data.graph_nodes['category:uncategorized'];
        for (const edgeId of Object.keys(this.data.graph_edges)) {
          const edge = this.data.graph_edges[edgeId];
          if (edge.source_id === 'category:uncategorized' || edge.target_id === 'category:uncategorized') {
            delete this.data.graph_edges[edgeId];
          }
        }

        if (migratedCount > 0) {
          this.saveToDisk();
          console.log(`[StoreEngine] Migrated ${migratedCount} legacy 'Uncategorized' memories.`);
        }
      }
    } catch (e) {
      console.warn('[StoreEngine] Error loading storage file, initializing fresh store:', e);
    }
  }

  private saveToDisk() {
    try {
      const tempPath = `${dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, dbFilePath);
    } catch (e) {
      console.error('[StoreEngine] Disk write error:', e);
    }
  }

  // Save or update memory
  public saveMemory(memory: MemoryNode): void {
    const existing = this.data.memories[memory.id];
    const updatedMem: MemoryNode = {
      ...memory,
      tags: memory.tags || [],
      keywords: memory.keywords || [],
      entities: memory.entities || [],
      concepts: memory.concepts || [],
      importance_score: memory.importance_score ?? 5,
      confidence_score: memory.confidence_score ?? 1,
      favorite: Boolean(memory.favorite),
      created_at: existing ? existing.created_at : memory.created_at,
      updated_at: new Date().toISOString(),
    };

    this.data.memories[memory.id] = updatedMem;

    // Register graph node for memory
    this.saveNode({
      id: memory.id,
      type: 'memory',
      label: memory.title,
      category: memory.category,
      memory_id: memory.id,
      created_at: memory.created_at,
    });

    // Register concept graph nodes
    for (const concept of memory.concepts || []) {
      const conceptNodeId = `concept:${concept.toLowerCase().trim()}`;
      this.saveNode({
        id: conceptNodeId,
        type: 'concept',
        label: concept,
        category: 'Concept',
        created_at: memory.created_at,
      });

      this.saveEdge({
        id: `edge:${memory.id}->${conceptNodeId}`,
        source_id: memory.id,
        target_id: conceptNodeId,
        relationship_type: 'RELATED_TO',
        weight: 0.8,
        confidence: 0.9,
        created_at: memory.created_at,
      });
    }

    // Register category node
    const catNodeId = `category:${memory.category.toLowerCase().trim()}`;
    this.saveNode({
      id: catNodeId,
      type: 'category',
      label: memory.category,
      category: 'Category',
      created_at: memory.created_at,
    });

    this.saveEdge({
      id: `edge:${memory.id}->${catNodeId}`,
      source_id: memory.id,
      target_id: catNodeId,
      relationship_type: 'PART_OF',
      weight: 1.0,
      confidence: 1.0,
      created_at: memory.created_at,
    });

    this.saveToDisk();
  }

  public getMemoryById(id: string): MemoryNode | null {
    return this.data.memories[id] || null;
  }

  public getMemoryByHash(hash: string): MemoryNode | null {
    for (const mem of Object.values(this.data.memories)) {
      if (mem.content_hash === hash) return mem;
    }
    return null;
  }

  public getAllMemories(limit = 100, offset = 0): MemoryNode[] {
    const items = Object.values(this.data.memories);
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items.slice(offset, offset + limit);
  }

  public deleteMemory(id: string): boolean {
    if (!this.data.memories[id]) return false;
    delete this.data.memories[id];

    // Remove associated nodes & edges
    delete this.data.graph_nodes[id];
    for (const edgeId of Object.keys(this.data.graph_edges)) {
      const edge = this.data.graph_edges[edgeId];
      if (edge.source_id === id || edge.target_id === id) {
        delete this.data.graph_edges[edgeId];
      }
    }
    this.saveToDisk();
    return true;
  }

  public toggleFavorite(id: string): boolean {
    const mem = this.getMemoryById(id);
    if (!mem) return false;
    mem.favorite = !mem.favorite;
    mem.updated_at = new Date().toISOString();
    this.saveToDisk();
    return mem.favorite;
  }

  // Graph Node Operations
  public saveNode(node: {
    id: string;
    type: string;
    label: string;
    category?: string;
    memory_id?: string;
    created_at: string;
  }): void {
    this.data.graph_nodes[node.id] = {
      id: node.id,
      type: node.type,
      label: node.label,
      category: node.category,
      memory_id: node.memory_id,
      created_at: node.created_at,
    };
  }

  // Graph Edge Operations
  public saveEdge(edge: {
    id: string;
    source_id: string;
    target_id: string;
    relationship_type: RelationshipType;
    weight: number;
    confidence: number;
    created_at: string;
  }): void {
    this.data.graph_edges[edge.id] = {
      id: edge.id,
      source_id: edge.source_id,
      target_id: edge.target_id,
      relationship_type: edge.relationship_type,
      weight: edge.weight,
      confidence: edge.confidence,
      created_at: edge.created_at,
    };
  }

  public getEdgesForMemory(memoryId: string): GraphEdge[] {
    const results: GraphEdge[] = [];
    for (const edge of Object.values(this.data.graph_edges)) {
      if (edge.source_id === memoryId || edge.target_id === memoryId) {
        const targetId = edge.source_id === memoryId ? edge.target_id : edge.source_id;
        const targetMem = this.getMemoryById(targetId);
        results.push({
          ...edge,
          target_title: targetMem ? targetMem.title : undefined,
          target_type: targetMem ? targetMem.type : undefined,
          target_category: targetMem ? targetMem.category : undefined,
        });
      }
    }
    return results;
  }

  public getAllGraphData(): { nodes: any[]; edges: any[] } {
    return {
      nodes: Object.values(this.data.graph_nodes),
      edges: Object.values(this.data.graph_edges),
    };
  }

  // Vector Cosine Similarity Search
  public vectorSimilaritySearch(
    queryEmbedding: number[],
    topK = 20,
    minSimilarity = 0.2
  ): Array<{ memory: MemoryNode; similarity: number }> {
    const results: Array<{ memory: MemoryNode; similarity: number }> = [];

    for (const mem of Object.values(this.data.memories)) {
      if (!mem.embedding || !Array.isArray(mem.embedding)) continue;
      if (mem.embedding.length !== queryEmbedding.length) continue;

      const sim = this.cosineSimilarity(queryEmbedding, mem.embedding);
      if (sim >= minSimilarity) {
        results.push({ memory: mem, similarity: sim });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  // Keyword & Full Text Search
  public keywordSearch(queryTerms: string[], topK = 30): MemoryNode[] {
    const memories = Object.values(this.data.memories);
    if (queryTerms.length === 0) {
      memories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return memories.slice(0, topK);
    }

    const matches = memories.filter((mem) => {
      const textToSearch = [
        mem.title,
        mem.original_content,
        mem.summary,
        mem.category,
        mem.subcategory || '',
        ...(mem.tags || []),
        ...(mem.concepts || []),
        ...(mem.entities || []),
        ...(mem.keywords || []),
      ]
        .join(' ')
        .toLowerCase();

      return queryTerms.some((term) => textToSearch.includes(term.toLowerCase()));
    });

    return matches.slice(0, topK);
  }

  // Category Aggregation
  public getAllCategories(): Array<{ category: string; count: number }> {
    const counts: Record<string, number> = {};
    for (const mem of Object.values(this.data.memories)) {
      const cat = mem.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Concept Aggregation
  public getAllConcepts(): Array<{ concept: string; count: number }> {
    const counts: Record<string, number> = {};
    for (const node of Object.values(this.data.graph_nodes)) {
      if (node.type === 'concept') {
        counts[node.label] = (counts[node.label] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([concept, count]) => ({ concept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  }

  // Context Session updates for context-aware search
  public updateSearchSession(sessionId: string, newQuery: string): string[] {
    const session = this.data.search_sessions[sessionId] || {
      id: sessionId,
      queries: [],
      last_updated: new Date().toISOString(),
    };

    session.queries.push(newQuery);
    if (session.queries.length > 5) {
      session.queries.shift();
    }
    session.last_updated = new Date().toISOString();
    this.data.search_sessions[sessionId] = session;
    this.saveToDisk();

    return session.queries;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const sqliteStore = new SQLiteStore();

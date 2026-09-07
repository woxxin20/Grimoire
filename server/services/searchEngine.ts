import { sqliteStore } from '../db/sqliteStore.js';
import { ruVectorService } from '../db/ruVectorClient.js';
import { geminiService } from './geminiService.js';
import { geminiEmbeddingService } from './geminiEmbedding.js';
import {
  MemoryNode,
  MemorySearchResult,
  NodeSearchResult,
  SearchResponse,
  GraphEdge,
} from '../../src/types/memory.js';

export class SearchEngine {
  private static readonly STOP_WORDS = new Set([
    'the', 'and', 'but', 'for', 'not', 'you', 'your', 'yours', 'our', 'ours', 'their', 'theirs',
    'his', 'her', 'hers', 'its', 'they', 'them', 'she', 'him', 'who', 'whom', 'whose', 'what',
    'when', 'where', 'which', 'why', 'how', 'are', 'was', 'were', 'been', 'being', 'have', 'has',
    'had', 'did', 'does', 'doing', 'can', 'could', 'would', 'should', 'will', 'shall', 'may',
    'might', 'must', 'this', 'that', 'these', 'those', 'there', 'here', 'with', 'from', 'into',
    'onto', 'over', 'under', 'about', 'above', 'below', 'between', 'through', 'during', 'before',
    'after', 'again', 'once', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'than', 'too', 'very', 'just', 'own', 'same', 'then', 'also', 'get', 'got', 'let',
  ]);

  /**
   * Performs context-aware hybrid semantic + keyword search with Mind Match scoring
   */
  public async search(
    userQuery: string,
    sessionId = 'default-session',
    categoryFilter?: string
  ): Promise<SearchResponse> {
    const rawQuery = userQuery.trim();
    if (!rawQuery) {
      return {
        query: userQuery,
        primary_match: null,
        strong_matches: [],
        connected_memories: [],
        possible_matches: [],
        related_concepts: [],
        total_results: 0,
      };
    }

    // Update session context for multi-turn query awareness
    const queryHistory = sqliteStore.updateSearchSession(sessionId, rawQuery);

    // 1. Ultra-Fast Query Expansion (250ms fast race timeout for instant DB search)
    let queryContextString = rawQuery;
    if (queryHistory.length > 1) {
      queryContextString = queryHistory.slice(-3).join(' ');
    }

    const fastFallbackUnderstanding = {
      intent: 'Semantic Knowledge Search',
      expanded_query: queryContextString,
      entities: [],
      concepts: [rawQuery],
      categories: [],
      keywords: rawQuery.split(/\s+/).filter((k) => k.length > 1),
    };

    let queryUnderstanding: any = fastFallbackUnderstanding;
    try {
      const expandPromise = geminiService.expandSearchQuery(rawQuery, queryHistory);
      // Budget must exceed real API latency or the race is unwinnable and the AI
      // path is dead code. Measured: ~1.4s for the lite/no-thinking expansion model.
      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(() => resolve(fastFallbackUnderstanding), 6000)
      );
      queryUnderstanding = await Promise.race([expandPromise, timeoutPromise]);
    } catch (e) {
      queryUnderstanding = fastFallbackUnderstanding;
    }

    // 2. Generate Query Vector Embedding (Fast race timeout)
    let queryVector: number[] = [];
    try {
      const textToEmbed = `${rawQuery} ${queryUnderstanding.expanded_query} ${queryUnderstanding.concepts.join(' ')}`;
      const embedPromise = geminiEmbeddingService.generateEmbedding(textToEmbed);
      // Same rule: gemini-embedding-2 measures ~700ms, so a 200ms budget meant
      // queryVector was always [] and vector similarity search never ran at all.
      const embedTimeout = new Promise<number[]>((resolve) => setTimeout(() => resolve([]), 6000));
      queryVector = await Promise.race([embedPromise, embedTimeout]);
    } catch (e) {
      // Fallback
    }

    // 3. Multi-path Retrieval
    const memoryMap = new Map<string, { memory: MemoryNode; vectorSim: number; keywordSim: number }>();

    // Path A: Vector Similarity Search
    if (queryVector.length > 0) {
      const vectorResults = await ruVectorService.vectorSimilaritySearch(queryVector, 40, 0.15);
      for (const res of vectorResults) {
        memoryMap.set(res.memory.id, {
          memory: res.memory,
          vectorSim: res.similarity,
          keywordSim: 0,
        });
      }
    }

    // Path B: Keyword & FTS Search
    const searchTerms = [
      ...rawQuery.split(/\s+/),
      ...(queryUnderstanding.keywords || []),
      ...(queryUnderstanding.concepts || []),
    ].filter((t) => t.length > 1);

    const keywordResults = sqliteStore.keywordSearch(Array.from(new Set(searchTerms)), 40);
    for (const mem of keywordResults) {
      const existing = memoryMap.get(mem.id);
      const kwSim = this.calculateKeywordSimilarity(rawQuery, mem);
      if (existing) {
        existing.keywordSim = kwSim;
      } else {
        memoryMap.set(mem.id, {
          memory: mem,
          vectorSim: 0,
          keywordSim: kwSim,
        });
      }
    }

    // 4. Calculate Mind Match Scores (0 - 100%)
    const scoredResults: MemorySearchResult[] = [];

    for (const [id, entry] of memoryMap.entries()) {
      const { memory, vectorSim, keywordSim } = entry;

      // Filter by category if requested
      if (categoryFilter && memory.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        continue;
      }

      // Concept / Entity overlap score
      const conceptOverlap = this.calculateConceptOverlap(
        queryUnderstanding.concepts || [],
        memory.concepts || []
      );
      const entityOverlap = this.calculateConceptOverlap(
        queryUnderstanding.entities || [],
        memory.entities || []
      );

      // Favoriting & Recency boost
      const favBoost = memory.favorite ? 0.08 : 0;
      const recencyDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 0.05 * Math.exp(-recencyDays / 30));

      // Weighted Mind Match score calculation
      let scoreRaw =
        vectorSim * 0.45 +
        keywordSim * 0.25 +
        conceptOverlap * 0.15 +
        entityOverlap * 0.1 +
        favBoost +
        recencyBoost;

      // Exact substring match guarantee boost
      if (memory.original_content.toLowerCase().includes(rawQuery.toLowerCase())) {
        scoreRaw += 0.2;
      }

      const mindMatchScore = Math.min(99, Math.max(15, Math.round(scoreRaw * 100)));

      // Generate human-readable match explanation
      const matchReason = this.generateMatchExplanation(
        rawQuery,
        memory,
        vectorSim,
        keywordSim,
        conceptOverlap
      );

      const rels = sqliteStore.getEdgesForMemory(memory.id);

      scoredResults.push({
        ...memory,
        mind_match_score: mindMatchScore,
        match_reason: matchReason,
        relationships: rels,
        distance: vectorSim > 0 ? 1 - vectorSim : undefined,
      });
    }

    // Sort by Mind Match score descending
    scoredResults.sort((a, b) => b.mind_match_score - a.mind_match_score);

    // 5. Graph Relationship Expansion for Connected Memories
    const primaryMatch = scoredResults.length > 0 ? scoredResults[0] : null;
    const connectedMemories: MemorySearchResult[] = [];
    const relatedConcepts = new Set<string>();

    if (primaryMatch) {
      const edges = sqliteStore.getEdgesForMemory(primaryMatch.id);
      for (const edge of edges) {
        const otherId = edge.source_id === primaryMatch.id ? edge.target_id : edge.source_id;
        const connMem = sqliteStore.getMemoryById(otherId);
        if (connMem && connMem.id !== primaryMatch.id && !scoredResults.some((r) => r.id === connMem.id)) {
          connectedMemories.push({
            ...connMem,
            mind_match_score: Math.max(30, Math.round(primaryMatch.mind_match_score * 0.75)),
            match_reason: `Connected via ${edge.relationship_type.replace('_', ' ')} with "${primaryMatch.title}"`,
            relationships: sqliteStore.getEdgesForMemory(connMem.id),
          });
        }
      }
      primaryMatch.concepts.forEach((c) => relatedConcepts.add(c));
    }

    // 6. Graph Node Search & Storage Location Connection Lookup
    const matchedNodes: NodeSearchResult[] = [];
    const allGraphNodes = sqliteStore.getAllGraphData().nodes || [];
    const queryTerms = searchTerms.map((t) => t.toLowerCase());

    for (const node of allGraphNodes) {
      const labelLower = node.label.toLowerCase();
      const catLower = (node.category || '').toLowerCase();

      const isMatch = queryTerms.some(
        (term) => labelLower.includes(term) || catLower.includes(term)
      );

      if (isMatch) {
        const nodeEdges = sqliteStore.getEdgesForMemory(node.id);
        const connectedNodesInfo: Array<{ id: string; label: string; relationship_type: string }> = [];

        for (const edge of nodeEdges) {
          const targetId = edge.source_id === node.id ? edge.target_id : edge.source_id;
          const targetMem = sqliteStore.getMemoryById(targetId);
          const targetNode = allGraphNodes.find((n: any) => n.id === targetId);

          connectedNodesInfo.push({
            id: targetId,
            label: targetMem ? targetMem.title : targetNode ? targetNode.label : targetId,
            relationship_type: edge.relationship_type,
          });
        }

        const matchScore =
          labelLower === rawQuery.toLowerCase()
            ? 98
            : labelLower.includes(rawQuery.toLowerCase())
            ? 88
            : 75;

        matchedNodes.push({
          id: node.id,
          label: node.label,
          type: (node.type as any) || 'concept',
          category: node.category || 'General Knowledge',
          storage_location: `./data/storage/mind_data.json -> Category: "${node.category || 'General Knowledge'}"`,
          connected_nodes: connectedNodesInfo.slice(0, 5),
          match_score: matchScore,
        });
      }
    }

    matchedNodes.sort((a, b) => b.match_score - a.match_score);

    // Segment results into Primary, Strong (>65%), Connected, and Possible (<65%)
    const strongMatches = scoredResults.slice(1).filter((m) => m.mind_match_score >= 65);
    const possibleMatches = scoredResults.slice(1).filter((m) => m.mind_match_score < 65);

    return {
      query: userQuery,
      query_understanding: queryUnderstanding,
      primary_match: primaryMatch,
      strong_matches: strongMatches.slice(0, 10),
      connected_memories: connectedMemories.slice(0, 8),
      matched_nodes: matchedNodes.slice(0, 8),
      possible_matches: possibleMatches.slice(0, 10),
      related_concepts: Array.from(relatedConcepts).slice(0, 10),
      total_results: scoredResults.length + connectedMemories.length + matchedNodes.length,
    };
  }

  private calculateKeywordSimilarity(query: string, memory: MemoryNode): number {
    const qLower = query.toLowerCase();
    const tLower = memory.title.toLowerCase();
    const cLower = memory.original_content.toLowerCase();

    if (tLower === qLower) return 1.0;
    if (tLower.includes(qLower)) return 0.85;
    if (cLower.includes(qLower)) return 0.75;

    // Stop words carry no retrieval signal, and a bare `includes` matches them
    // inside unrelated words ("are" hits "software", "shared", "parameters"), so
    // long documents used to outrank the genuinely relevant short ones.
    const queryWords = qLower
      .split(/\s+/)
      .filter((w) => w.length > 2 && !SearchEngine.STOP_WORDS.has(w));
    if (queryWords.length === 0) return 0.1;

    const catLower = memory.category.toLowerCase();
    let hits = 0;
    for (const word of queryWords) {
      const atWordStart = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (atWordStart.test(tLower) || atWordStart.test(cLower) || atWordStart.test(catLower)) {
        hits++;
      }
    }
    return hits / queryWords.length;
  }

  private calculateConceptOverlap(queryConcepts: string[], memoryConcepts: string[]): number {
    if (!queryConcepts.length || !memoryConcepts.length) return 0;
    const memLower = memoryConcepts.map((c) => c.toLowerCase());
    let overlap = 0;
    for (const qc of queryConcepts) {
      if (memLower.some((mc) => mc.includes(qc.toLowerCase()) || qc.toLowerCase().includes(mc))) {
        overlap++;
      }
    }
    return overlap / Math.max(queryConcepts.length, 1);
  }

  private generateMatchExplanation(
    query: string,
    memory: MemoryNode,
    vectorSim: number,
    keywordSim: number,
    conceptOverlap: number
  ): string {
    if (memory.title.toLowerCase().includes(query.toLowerCase())) {
      return `Direct title and content match for "${query}"`;
    }
    if (vectorSim > 0.8) {
      return `Very high semantic match (${Math.round(vectorSim * 100)}%) with core concept in "${memory.category}"`;
    }
    if (conceptOverlap > 0) {
      return `Strong concept match sharing relevant topics: ${memory.concepts.slice(0, 2).join(', ')}`;
    }
    if (keywordSim > 0.5) {
      return `Shares exact keywords and text phrases with "${query}"`;
    }
    return `Semantically related memory in category "${memory.category}"`;
  }
}

export const searchEngine = new SearchEngine();

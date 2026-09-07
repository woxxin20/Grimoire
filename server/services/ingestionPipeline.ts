import { contentExtractor } from '../providers/contentExtractor.js';
import { geminiService } from './geminiService.js';
import { geminiEmbeddingService } from './geminiEmbedding.js';
import { ruVectorService } from '../db/ruVectorClient.js';
import { sqliteStore } from '../db/sqliteStore.js';
import { duplicateDetector } from './duplicateDetector.js';
import { MemoryNode, GraphEdge, RelationshipType } from '../../src/types/memory.js';
import crypto from 'crypto';

export class IngestionPipeline {
  /**
   * Complete 8-Step Ingestion Pipeline
   */
  public async ingest(
    rawInput: string,
    fileMeta?: { originalname: string; mimetype: string; buffer?: Buffer },
    userNotes?: string,
    forceCreate = false
  ): Promise<{ memory: MemoryNode; isDuplicate?: boolean; duplicateInfo?: any }> {
    // STEP 1 & STEP 2 & STEP 3: Capture, Detect, Extract
    const extracted = await contentExtractor.extract(rawInput, fileMeta);

    // Initial check for duplicate memory if not forced
    if (!forceCreate) {
      const dupCheck = await duplicateDetector.checkDuplicate(
        extracted.content_hash,
        extracted.source_url
      );
      if (dupCheck.isDuplicate && dupCheck.existingMemory) {
        return {
          memory: dupCheck.existingMemory,
          isDuplicate: true,
          duplicateInfo: dupCheck,
        };
      }
    }

    const memoryId = `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // Create baseline memory object FIRST so content is preserved even if AI fails
    const initialMemory: MemoryNode = {
      id: memoryId,
      type: extracted.type,
      original_content: extracted.original_content,
      title: extracted.file_name || extracted.original_content.substring(0, 50) || 'Untitled Memory',
      source_url: extracted.source_url || null,
      local_path: extracted.local_path || null,
      file_name: extracted.file_name || null,
      mime_type: extracted.mime_type || null,
      category: 'General Knowledge',
      subcategory: null,
      tags: [],
      keywords: [],
      entities: [],
      concepts: [],
      summary: extracted.normalized_text.substring(0, 200),
      analysis: 'Ingestion initiated.',
      user_notes: userNotes || null,
      raw_content: extracted.normalized_text,
      raw_content_preview: extracted.normalized_text.substring(0, 300),
      embedding: null,
      importance_score: 5,
      confidence_score: 1.0,
      favorite: false,
      content_hash: extracted.content_hash,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Save initial record to database IMMEDIATELY (< 50ms)
    sqliteStore.saveMemory(initialMemory);

    // Trigger non-blocking async AI understanding, embedding & relationship pipeline
    setImmediate(() => {
      this.processAsyncAI(initialMemory, extracted);
    });

    return { memory: initialMemory };
  }

  /**
   * Background AI Processor (Gemini understanding, embedding, graph connections)
   */
  private async processAsyncAI(memory: MemoryNode, extracted: any) {
    try {
      // Step 4: Gemini AI Understanding
      const aiResult = await geminiService.analyzeMemory(extracted.normalized_text, extracted.type);
      if (aiResult) {
        memory.title = aiResult.title || memory.title;
        memory.category = aiResult.categories[0] || memory.category;
        memory.subcategory = aiResult.subcategories[0] || null;
        memory.tags = aiResult.tags;
        memory.keywords = aiResult.keywords;
        memory.entities = aiResult.entities;
        memory.concepts = aiResult.concepts;
        memory.summary = aiResult.summary;
        memory.analysis = aiResult.analysis;
        memory.importance_score = aiResult.importance_score;
        memory.confidence_score = aiResult.confidence_score;
      }

      // Step 5: Gemini Embedding
      try {
        const textToEmbed = `${memory.title}\nCategory: ${memory.category}\nConcepts: ${memory.concepts.join(', ')}\n${extracted.normalized_text}`;
        memory.embedding = await geminiEmbeddingService.generateEmbedding(textToEmbed);
      } catch (e) {
        console.warn('[IngestionPipeline] Async embedding error:', e);
      }

      memory.updated_at = new Date().toISOString();
      await ruVectorService.insertMemory(memory);

      // Step 6 & 7 & 8: Graph Connections
      if (memory.embedding) {
        const similar = await ruVectorService.vectorSimilaritySearch(memory.embedding, 5, 0.5);
        for (const item of similar) {
          if (item.memory.id === memory.id) continue;
          sqliteStore.saveEdge({
            id: `edge:${memory.id}->${item.memory.id}`,
            source_id: memory.id,
            target_id: item.memory.id,
            relationship_type: item.similarity > 0.85 ? 'SAME_TOPIC' : 'RELATED_TO',
            weight: item.similarity,
            confidence: 0.9,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      console.warn('[IngestionPipeline] Background AI processing completed with warning:', err.message);
    }
  }
}

export const ingestionPipeline = new IngestionPipeline();

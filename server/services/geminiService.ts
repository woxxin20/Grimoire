import { keyRotator } from '../config/keyRotator.js';
import { AIUnderstandingResult } from '../../src/types/memory.js';

export class GeminiService {
  /**
   * Analyzes content using Gemini AI and returns structured JSON metadata
   */
  public async analyzeMemory(
    normalizedText: string,
    inputType: string
  ): Promise<AIUnderstandingResult> {
    const prompt = `You are the memory intelligence layer of a private personal knowledge system.
Your job is not to rewrite the user's memory.
Preserve the original meaning exactly.
Analyze the supplied content and identify what it represents, which categories it belongs to, important entities, concepts, technologies, projects, keywords and relationships.
Prefer meaningful semantic concepts over generic tags.
Do not invent facts.
If information is unknown, return null or an empty array.
Create relationships only when there is reasonable evidence.

Return ONLY a valid JSON object strictly matching this format (no conversational text):
{
  "title": "A concise, highly descriptive 3-8 word title",
  "memory_type": "${inputType}",
  "categories": ["Primary Category", "Secondary Category"],
  "subcategories": ["Subcategory"],
  "tags": ["tag1", "tag2"],
  "keywords": ["kw1", "kw2"],
  "entities": ["entity1", "entity2"],
  "concepts": ["concept1", "concept2"],
  "frameworks": ["framework1"],
  "technologies": ["tech1"],
  "summary": "A clean 2-3 sentence AI summary of the core insight or note content",
  "analysis": "Architectural or contextual note on why this memory is valuable",
  "importance_score": 7,
  "confidence_score": 0.95,
  "relationships": [
    {
      "target_id_or_title": "Related Concept or Topic Title",
      "relationship_type": "RELATED_TO",
      "confidence": 0.9,
      "reason": "Clear explanation of connection"
    }
  ]
}

Content to analyze:
"""
${normalizedText.substring(0, 8000)}
"""`;

    try {
      const jsonText = await keyRotator.execute<string>('MemoryAnalysis', async (apiKey: string) => {
        const modelsToTry = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
        let lastErr;

        for (const model of modelsToTry) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                  },
                }),
              }
            );

            if (response.ok) {
              const data: any = await response.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return text;
            } else {
              lastErr = await response.text();
            }
          } catch (e: any) {
            lastErr = e.message;
          }
        }
        throw new Error(`Gemini API Error across models: ${lastErr}`);
      });

      return this.parseAndValidateJSON(jsonText, normalizedText, inputType);
    } catch (err: any) {
      console.warn('[GeminiService] AI Analysis fallback triggered:', err.message);
      return this.generateFallbackResult(normalizedText, inputType);
    }
  }

  /**
   * Transforms natural language search query into an expanded search payload
   */
  public async expandSearchQuery(query: string, searchHistory: string[] = []): Promise<{
    intent: string;
    expanded_query: string;
    entities: string[];
    concepts: string[];
    categories: string[];
    keywords: string[];
  }> {
    const contextPrompt = searchHistory.length > 0
      ? `Recent user search query history for context: ${JSON.stringify(searchHistory)}\n`
      : '';

    const prompt = `${contextPrompt}You are the search query understanding layer for a personal AI mind.
Analyze this user query and extract query intent, key entities, concepts, categories, and an expanded semantic search phrase.

User query: "${query}"

Return ONLY a JSON object formatted as:
{
  "intent": "What the user is searching for",
  "expanded_query": "Expanded query with synonyms and context",
  "entities": ["entity"],
  "concepts": ["concept"],
  "categories": ["category"],
  "keywords": ["keyword"]
}`;

    try {
      const jsonText = await keyRotator.execute<string>('QueryExpansion', async (apiKey: string) => {
        const response = await fetch(
          // Query expansion sits in the interactive search path, so it uses the
          // lite model with thinking disabled: gemini-3.6-flash spends ~20s on
          // thinking tokens for this task, which no interactive budget can absorb.
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 0 },
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Query expansion failed: ${response.status}`);
        const data: any = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      });

      const cleanJson = jsonText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      // Safe fallback if Gemini expansion fails
      const words = query.split(/\s+/).filter((w) => w.length > 2);
      return {
        intent: 'Keyword search',
        expanded_query: query,
        entities: [],
        concepts: words,
        categories: [],
        keywords: words,
      };
    }
  }

  private parseAndValidateJSON(jsonText: string, originalText: string, inputType: string): AIUnderstandingResult {
    try {
      const cleanText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      return {
        title: parsed.title || this.extractFirstLineTitle(originalText),
        memory_type: parsed.memory_type || (inputType as any),
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : ['General'],
        subcategories: Array.isArray(parsed.subcategories) ? parsed.subcategories : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        frameworks: Array.isArray(parsed.frameworks) ? parsed.frameworks : [],
        technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
        summary: parsed.summary || originalText.substring(0, 200),
        analysis: parsed.analysis || 'Memory saved to personal knowledge graph.',
        importance_score: typeof parsed.importance_score === 'number' ? parsed.importance_score : 5,
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.9,
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      };
    } catch (e) {
      return this.generateFallbackResult(originalText, inputType);
    }
  }

  private generateFallbackResult(originalText: string, inputType: string): AIUnderstandingResult {
    const title = this.extractFirstLineTitle(originalText);
    const words = originalText.toLowerCase().match(/\b[a-z0-9_-]{3,}\b/g) || [];
    const uniqueWords = Array.from(new Set(words)).slice(0, 10);

    // Smart local rule-based category detection when AI key is pending
    let category = 'General Knowledge';
    const lower = originalText.toLowerCase();

    if (
      lower.includes('ram') ||
      lower.includes('bhagawan') ||
      lower.includes('bhagwan') ||
      lower.includes('jai') ||
      lower.includes('god') ||
      lower.includes('sukhi') ||
      lower.includes('prarthana') ||
      lower.includes('blessing') ||
      lower.includes('spiritual') ||
      lower.includes('bhakti')
    ) {
      category = 'Spiritual & Devotional';
    } else if (
      lower.includes('build') ||
      lower.includes('architect') ||
      lower.includes('web app') ||
      lower.includes('full-stack') ||
      lower.includes('code') ||
      lower.includes('react') ||
      lower.includes('api')
    ) {
      category = 'Programming & Web';
    } else if (lower.includes('music') || lower.includes('vocal') || lower.includes('bass') || lower.includes('song')) {
      category = 'Creative & Music';
    } else if (lower.includes('url') || lower.includes('http') || lower.includes('article') || lower.includes('website')) {
      category = 'Research & Web';
    } else if (lower.includes('c:\\') || lower.includes('/users/') || lower.includes('path') || lower.includes('file')) {
      category = 'Computer & Files';
    } else if (lower.includes('business') || lower.includes('product') || lower.includes('marketing')) {
      category = 'Business & Ideas';
    }

    return {
      title,
      memory_type: inputType as any,
      categories: [category],
      subcategories: [],
      tags: uniqueWords.length > 0 ? uniqueWords.slice(0, 5) : ['spiritual', 'devotional'],
      keywords: uniqueWords,
      entities: [],
      concepts: [category],
      frameworks: [],
      technologies: [],
      summary: originalText.substring(0, 250),
      analysis: 'Processed using local smart knowledge categorizer.',
      importance_score: 7,
      confidence_score: 0.85,
      relationships: [],
    };
  }

  private extractFirstLineTitle(text: string): string {
    const firstLine = text.trim().split('\n')[0] || 'Saved Memory';
    return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
  }
}

export const geminiService = new GeminiService();

import { keyRotator } from '../config/keyRotator.js';

export class GeminiEmbeddingService {
  private dimension = 768; // Gemini text-embedding-004 standard dimension size

  /**
   * Generates vector embedding from text content using Gemini API
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return this.generateFallbackEmbedding('empty');
    }

    const cleanedText = text.replace(/\s+/g, ' ').trim().substring(0, 4000);

    try {
      const vector = await keyRotator.execute<number[]>('GenerateEmbedding', async (apiKey: string) => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-2',
              content: { parts: [{ text: cleanedText }] },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Embedding API Error (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        const values = data?.embedding?.values;
        if (!Array.isArray(values) || values.length === 0) {
          throw new Error('Invalid embedding response structure.');
        }
        return values;
      });

      return vector;
    } catch (err: any) {
      console.warn('[GeminiEmbeddingService] Falling back to deterministic local feature embedding:', err.message);
      return this.generateFallbackEmbedding(cleanedText);
    }
  }

  /**
   * Generates a deterministic high-dimensional TF-IDF hash embedding when remote API is unreachable
   */
  private generateFallbackEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const tokens = text.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || [];

    if (tokens.length === 0) {
      vector[0] = 1.0;
      return vector;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Compute hash index across 768 dimensions
      let hash = 0;
      for (let c = 0; c < token.length; c++) {
        hash = (hash << 5) - hash + token.charCodeAt(c);
        hash |= 0;
      }
      const idx = Math.abs(hash) % this.dimension;
      vector[idx] += 1.0 / (i + 1);
    }

    // Normalize vector L2 norm
    let sumSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    for (let i = 0; i < this.dimension; i++) {
      vector[i] /= norm;
    }

    return vector;
  }
}

export const geminiEmbeddingService = new GeminiEmbeddingService();

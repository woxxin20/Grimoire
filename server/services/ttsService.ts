import { keyRotator } from '../config/keyRotator.js';

export interface TTSRequestPayload {
  text?: string;
  matchScore?: number;
  title?: string;
  summary?: string;
}

export interface TTSResponsePayload {
  spokenText: string;
  matchPercentage: number;
  keyUsedIndex: number;
  model: string;
  timestamp: string;
}

class TTSService {
  public async generateSpeechScript(payload: TTSRequestPayload): Promise<TTSResponsePayload> {
    const matchPercentage = payload.matchScore 
      ? Math.round(payload.matchScore > 1 ? payload.matchScore : payload.matchScore * 100) 
      : 89;

    const rawText = payload.text || payload.summary || payload.title || 'No summary available.';
    const titleText = payload.title ? `Title: ${payload.title}. ` : '';

    const promptText = `
You are the voice of MIND, a futuristic female AI Personal Second Brain assistant.
Format the following search result into a crisp, concise, futuristic 2-sentence speech script for Text-To-Speech (TTS).
Start explicitly by stating the match percentage: "${matchPercentage}% match found." followed by the key insight.

Match Percentage: ${matchPercentage}%
Title: ${payload.title || 'Knowledge Record'}
Summary: ${rawText}

Output ONLY the exact spoken script without quotation marks or extra labels.
`;

    // Rotate across all 4 Gemini API Keys for TTS processing
    return await keyRotator.execute('gemini-3.1-flash-tts', async (apiKey: string) => {
      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-1.5-flash',
      ];

      let spokenScript = '';
      let usedModel = 'gemini-3.1-flash-tts';

      for (const modelName of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
              }),
            }
          );

          if (response.ok) {
            const data: any = await response.json();
            const textReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textReply && textReply.trim()) {
              spokenScript = textReply.trim();
              usedModel = modelName;
              break;
            }
          }
        } catch (e) {
          // continue to next model candidate
        }
      }

      if (!spokenScript) {
        spokenScript = `${matchPercentage}% match found. ${titleText}${rawText.substring(0, 160)}.`;
      }

      return {
        spokenText: spokenScript,
        matchPercentage,
        keyUsedIndex: (keyRotator as any).currentKeyIndex + 1 || 1,
        model: usedModel,
        timestamp: new Date().toISOString(),
      };
    });
  }
}

export const ttsService = new TTSService();

// ─── Google Gemini API провайдер ──────────────────────────────────────────────
// Gemini использует свой формат (не OpenAI-совместимый):
//   - системный промпт идёт отдельно в systemInstruction
//   - роль ассистента называется "model", а не "assistant"
//   - ключ передаётся как query-параметр

import { LLMProvider, LLMMessage } from './LLMProvider';

// Aliases always point at the current models; pinned names (gemini-2.0-flash) get retired and return 404.
// On overload (429/503) the lighter model is tried next.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Типы Gemini API
interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }
interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig: { temperature: number; maxOutputTokens: number };
}
interface GeminiResponse {
  candidates: Array<{ content: { parts: GeminiPart[] } }>;
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  private getApiKey(): string {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY не задан в .env файле.');
    return key;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const apiKey = this.getApiKey();

    // Отделяем системный промпт от истории чата
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Конвертируем роли: "assistant" → "model" (формат Gemini)
    const contents: GeminiContent[] = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    let response!: Response;
    for (const model of GEMINI_MODELS) {
      response = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status !== 429 && response.status !== 503) break;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as GeminiResponse;
    return data.candidates[0].content.parts[0].text;
  }
}

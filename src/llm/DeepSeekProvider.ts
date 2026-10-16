// ─── DeepSeek API провайдер ───────────────────────────────────────────────────
// DeepSeek использует OpenAI-совместимый формат — это упрощает интеграцию.
// API-ключ берётся из Constants.expoConfig.extra, а не хардкодится в коде.
//
// ⚠️ ПРОДАКШЕН: перенести вызов на serverless-эндпоинт чтобы ключ не попал в бандл.
//    Сейчас ключ передаётся через app.config.js → Constants — приемлемо для разработки.

import { LLMProvider, LLMMessage } from './LLMProvider';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// Тип ответа от DeepSeek API (OpenAI-compatible)
interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';

  private getApiKey(): string {
    const key = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_DEEPSEEK_API_KEY не задан в .env файле.');
    return key;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as DeepSeekResponse;
    return data.choices[0].message.content;
  }
}

// ─── Claude API провайдер (заглушка) ─────────────────────────────────────────
// Реальный вызов идёт НЕ отсюда — только через serverless-эндпоинт,
// чтобы API-ключ не попал в бандл приложения.
// Здесь — структура для будущей реализации.

import { LLMProvider, LLMMessage } from './LLMProvider';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';

  // URL serverless-функции, которая держит ключ и вызывает Claude API
  // TODO: заменить на реальный эндпоинт перед релизом
  private readonly endpointUrl: string;

  constructor(endpointUrl: string) {
    this.endpointUrl = endpointUrl;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, provider: 'claude' }),
    });

    if (!response.ok) {
      throw new Error(`Claude endpoint error: ${response.status}`);
    }

    const data = await response.json() as { text: string };
    return data.text;
  }
}

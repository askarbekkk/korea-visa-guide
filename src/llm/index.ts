// ─── Выбор активного LLM-провайдера ──────────────────────────────────────────
// Меняй ACTIVE_PROVIDER чтобы переключиться между провайдерами одной строкой.

import { LLMProvider } from './LLMProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { GeminiProvider } from './GeminiProvider';

const ACTIVE_PROVIDER: 'gemini' | 'deepseek' | 'claude' = 'gemini';

const CLAUDE_ENDPOINT_URL = 'https://your-serverless-function-url.com/api/chat';

export function getLLMProvider(): LLMProvider {
  if (ACTIVE_PROVIDER === 'deepseek') return new DeepSeekProvider();
  if (ACTIVE_PROVIDER === 'claude') return new ClaudeProvider(CLAUDE_ENDPOINT_URL);
  return new GeminiProvider();
}

export type { LLMProvider, LLMMessage } from './LLMProvider';

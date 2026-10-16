// ─── Абстракция LLM-провайдера ────────────────────────────────────────────────
// Конкретный провайдер (Claude / DeepSeek / другой) прячется за этим интерфейсом.
// Менять провайдер = изменить одну строку в конфиге, больше ничего.

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  name: string;
  // Отправляет сообщения и возвращает ответ модели
  chat(messages: LLMMessage[]): Promise<string>;
}

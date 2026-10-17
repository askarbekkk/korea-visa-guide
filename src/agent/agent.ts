// Tool-calling agent: Gemini decides which tools to call, we run them and feed results back,
// until it answers in text (or MAX_STEPS is reached).

import { geminiGenerate } from '../llm/GeminiProvider';
import { UserProfile } from '../types';
import { runTool, toolDeclarations, Source } from './tools';

const MAX_STEPS = 5;

export interface AgentTurn { role: 'user' | 'assistant'; content: string }
export interface AgentResult { answer: string; sources: Source[]; toolCalls: Array<{ name: string; args: unknown }> }

function systemPrompt(profile: UserProfile | null, lang: 'ru' | 'en'): string {
  const today = new Date().toISOString().slice(0, 10);
  const who = profile
    ? `User profile: citizenship ${profile.citizenship}, visa ${profile.visaStatus}` +
      (profile.visaExpiryDate ? `, visa expires ${profile.visaExpiryDate}` : '') + '.'
    : 'User profile: unknown.';
  return `You help foreign students and workers in South Korea with visas and immigration procedures.
Answer only in ${lang === 'ru' ? 'Russian' : 'English'}. Today is ${today}. ${who}

Use the tools instead of your own memory:
- search_app_guides first for documents, deadlines and fees of a procedure;
- search_official_sources when the guides do not cover it or the rules may have changed;
- calculate_deadline whenever the user mentions a date (expiry, entry, move) — never compute dates yourself;
- get_exchange_rate to convert fees into the user's currency.
Base every fact on tool results. If they do not contain the answer, say so and point to www.hikorea.go.kr or the 1345 hotline.
Be short and practical. Not legal advice.
Write plain text for a mobile chat: no Markdown (no **, #, tables, [links](url)); use simple '- ' lists and write URLs as plain text.`;
}

export async function runAgent(
  question: string,
  opts: { profile: UserProfile | null; language: 'ru' | 'en'; history?: AgentTurn[] },
): Promise<AgentResult> {
  const contents: any[] = [
    ...(opts.history ?? []).slice(-6).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: question }] },
  ];
  const sources: Source[] = [];
  const toolCalls: AgentResult['toolCalls'] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const data = await geminiGenerate({
      systemInstruction: { parts: [{ text: systemPrompt(opts.profile, opts.language) }] },
      contents,
      tools: [{ functionDeclarations: toolDeclarations }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }, // full checklist answers run ~900 tokens
    });
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    if (calls.length === 0) {
      const answer = parts.map((p) => p.text ?? '').join('').trim();
      return { answer, sources: dedupe(sources), toolCalls };
    }
    contents.push({ role: 'model', parts });
    const responses = [];
    for (const call of calls) {
      toolCalls.push({ name: call.name, args: call.args });
      const { result, sources: s } = await runTool(call.name, call.args ?? {}, opts.language);
      sources.push(...s);
      responses.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { answer: '', sources: dedupe(sources), toolCalls };
}

const dedupe = (s: Source[]) => s.filter((x, i) => s.findIndex((y) => y.url === x.url) === i);

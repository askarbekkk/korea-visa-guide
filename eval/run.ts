// Compares the old bot (web search → LLM) with the tool-calling agent on eval/questions.json.
// A question passes when the answer contains every required fact (any spelling in a group).
//   npx tsx eval/run.ts
import { writeFileSync } from 'node:fs';
import questions from './questions.json';
import { runAgent } from '../src/agent/agent';
import { GeminiProvider } from '../src/llm/GeminiProvider';
import { searchImmigrationInfo, formatSearchResults } from '../src/llm/TavilySearch';
import { buildSearchPrompt } from '../src/llm/systemPrompt';

const profile: any = { citizenship: 'KG', visaStatus: 'D-2', language: 'ru', createdAt: '' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => s.replace(/[  ]/g, ' ').toLowerCase();
const passes = (answer: string, facts: string[][]) => facts.every((g) => g.some((f) => norm(answer).includes(norm(f))));

async function baseline(q: string, lang: 'ru' | 'en') {
  const results = await searchImmigrationInfo(q);
  return new GeminiProvider().chat([
    { role: 'system', content: buildSearchPrompt(profile, lang, formatSearchResults(results)) },
    { role: 'user', content: q },
  ]);
}

(async () => {
  const rows = [];
  for (const x of questions as any[]) {
    let base = '', agent = '', tools: string[] = [];
    try { base = await baseline(x.q, x.lang); } catch (e) { base = `ERROR ${e}`; }
    await sleep(4000);
    try { const r = await runAgent(x.q, { profile, language: x.lang }); agent = r.answer; tools = r.toolCalls.map((c) => c.name); } catch (e) { agent = `ERROR ${e}`; }
    await sleep(4000);
    const row = { id: x.id, baseline: passes(base, x.facts), agent: passes(agent, x.facts), rightTool: tools.includes(x.tool), tools, baseAnswer: base, agentAnswer: agent };
    rows.push(row);
    console.log(`${x.id.padEnd(16)} baseline=${row.baseline ? 'PASS' : 'fail'}  agent=${row.agent ? 'PASS' : 'fail'}  tools=${tools.join(',')}`);
  }
  const pct = (k: 'baseline' | 'agent' | 'rightTool') => Math.round((100 * rows.filter((r) => r[k]).length) / rows.length);
  const summary = { n: rows.length, baseline: pct('baseline'), agent: pct('agent'), rightTool: pct('rightTool') };
  console.log('\nAccuracy:', summary);
  writeFileSync('eval/results.json', JSON.stringify({ summary, rows }, null, 2));
})();

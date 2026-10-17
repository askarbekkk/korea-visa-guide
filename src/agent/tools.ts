// Tools the visa agent can call. Each returns plain JSON that goes back to the model.

import qa from '../content/qa.json';
import { searchImmigrationInfo } from '../llm/TavilySearch';
import addressChange from '../content/checklists/address-change.json';
import arcRegistration from '../content/checklists/arc-registration.json';
import d2Extension from '../content/checklists/d2-extension.json';
import d2ToD10 from '../content/checklists/d2-to-d10.json';
import d4Extension from '../content/checklists/d4-extension.json';
import e7Application from '../content/checklists/e7-application.json';
import f4Application from '../content/checklists/f4-application.json';
import g1Application from '../content/checklists/g1-application.json';
import partTimeWork from '../content/checklists/part-time-work.json';
import reentryPermit from '../content/checklists/reentry-permit.json';

type Lang = 'ru' | 'en';
type L = { ru: string; en: string };

const CHECKLISTS: any[] = [
  addressChange, arcRegistration, d2Extension, d2ToD10, d4Extension,
  e7Application, f4Application, g1Application, partTimeWork, reentryPermit,
];

export interface Source { title: string; url: string }

// ── Declarations sent to Gemini ──────────────────────────────────────────────
export const toolDeclarations = [
  {
    name: 'search_app_guides',
    description: "Search the app's verified visa checklists and FAQ: documents, when to apply, fees, where to apply. Use this first for any procedure question (extension, part-time work, status change, ARC, re-entry, address change).",
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'What the user wants to know, in English or Russian' },
        visa: { type: 'STRING', description: "Visa code if known, e.g. 'D-2'" },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_official_sources',
    description: 'Web search restricted to official Korean immigration sites (HiKorea, Ministry of Justice, MOFA). Use when the app guides do not cover the question or the user needs the latest rules.',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING', description: 'Search query; Korean or English terms work best' } },
      required: ['query'],
    },
  },
  {
    name: 'calculate_deadline',
    description: 'Compute exact dates for a procedure from one date: visa EXTEND window (opens 4 months before expiry, closes on expiry), ARC registration (90 days after entry), ADDRESS_CHANGE report (14 days after moving), CHANGE_STATUS (before expiry). Returns dates and days left from today.',
    parameters: {
      type: 'OBJECT',
      properties: {
        procedure: { type: 'STRING', enum: ['EXTEND', 'CHANGE_STATUS', 'REGISTER_ARC', 'ADDRESS_CHANGE'] },
        date: { type: 'STRING', description: 'ISO date YYYY-MM-DD: visa expiry for EXTEND/CHANGE_STATUS, entry date for REGISTER_ARC, moving date for ADDRESS_CHANGE' },
      },
      required: ['procedure', 'date'],
    },
  },
  {
    name: 'get_exchange_rate',
    description: 'Current exchange rate between two currencies, e.g. to convert a fee in KRW to the user\'s home currency.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: { type: 'STRING', description: "Currency code, e.g. 'KRW'" },
        to: { type: 'STRING', description: "Currency code, e.g. 'KGS', 'USD', 'RUB', 'KZT', 'UZS'" },
      },
      required: ['from', 'to'],
    },
  },
];

// ── Implementations ──────────────────────────────────────────────────────────
// Crude stemming (first 5 letters) so Russian/English inflections still match: продлить ~ продление.
const words = (s: string) => (s.toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? [])
  .filter((w) => w.length > 2).map((w) => w.slice(0, 5));

function checklistText(c: any, lang: Lang): string {
  return [c.title[lang], c.visaStatus, c.procedure, c.when[lang], c.fee[lang],
    ...c.documents.map((d: any) => d.label[lang])].join(' ');
}

export function searchAppGuides(query: string, visa: string | undefined, lang: Lang) {
  const q = new Set(words(query));
  const score = (text: string) => words(text).filter((w) => q.has(w)).length;
  const visaBoost = (v?: string) => (visa && v && v.toUpperCase() === visa.toUpperCase() ? 3 : 0);

  const checklists = CHECKLISTS
    .map((c) => ({ c, s: score(checklistText(c, 'en') + ' ' + checklistText(c, 'ru')) + visaBoost(c.visaStatus) }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 2)
    .map(({ c }) => ({
      id: c.id, title: c.title[lang], visa: c.visaStatus, when: c.when[lang], fee: c.fee[lang],
      documents: c.documents.map((d: any) => d.label[lang]), applyAt: c.whereUrl, lastUpdated: c.lastUpdated,
    }));
  const faq = (qa as Array<{ question: L; answer: L }>)
    .map((x) => ({ x, s: score(x.question.en + ' ' + x.question.ru + ' ' + x.answer.en + ' ' + x.answer.ru) }))
    .filter((y) => y.s > 1).sort((a, b) => b.s - a.s).slice(0, 2)
    .map(({ x }) => ({ question: x.question[lang], answer: x.answer[lang] }));
  return { checklists, faq };
}

export async function searchOfficialSources(query: string) {
  const results = await searchImmigrationInfo(query);
  return results.map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 1200) }));
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addMonths(d: Date, n: number) {
  const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + n); return r;
}

export function calculateDeadline(procedure: string, date: string, today = new Date()) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { error: `Invalid date: ${date}` };
  const t = new Date(`${iso(today)}T00:00:00Z`);
  const daysLeft = (x: Date) => Math.round((x.getTime() - t.getTime()) / DAY);
  switch (procedure) {
    case 'EXTEND': {
      const opens = addMonths(d, -4);
      return { applyFrom: iso(opens), applyBy: iso(d), recommended: `${iso(addMonths(d, -3))} – ${iso(addMonths(d, -2))}`,
        daysUntilWindowOpens: daysLeft(opens), daysUntilDeadline: daysLeft(d) };
    }
    case 'CHANGE_STATUS':
      return { applyBy: iso(d), daysUntilDeadline: daysLeft(d) };
    case 'REGISTER_ARC': {
      const by = new Date(d.getTime() + 90 * DAY);
      return { applyBy: iso(by), daysUntilDeadline: daysLeft(by), note: 'Late registration can be fined.' };
    }
    case 'ADDRESS_CHANGE': {
      const by = new Date(d.getTime() + 14 * DAY);
      return { reportBy: iso(by), daysUntilDeadline: daysLeft(by) };
    }
    default:
      return { error: `Unknown procedure: ${procedure}` };
  }
}

export async function getExchangeRate(from: string, to: string) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
  const data = await res.json();
  const rate = data?.rates?.[to.toUpperCase()];
  if (rate == null) return { error: `No rate for ${from} → ${to}` };
  return { from: from.toUpperCase(), to: to.toUpperCase(), rate, updated: data.time_last_update_utc };
}

// Runs one tool call; official-search results are also returned as sources for the UI.
export async function runTool(name: string, args: any, lang: Lang): Promise<{ result: unknown; sources: Source[] }> {
  try {
    switch (name) {
      case 'search_app_guides':
        return { result: searchAppGuides(args.query ?? '', args.visa, lang), sources: [] };
      case 'search_official_sources': {
        const r = await searchOfficialSources(args.query ?? '');
        return { result: r, sources: r.map(({ title, url }) => ({ title, url })) };
      }
      case 'calculate_deadline':
        return { result: calculateDeadline(args.procedure, args.date), sources: [] };
      case 'get_exchange_rate':
        return { result: await getExchangeRate(args.from, args.to), sources: [] };
      default:
        return { result: { error: `Unknown tool ${name}` }, sources: [] };
    }
  } catch (e) {
    return { result: { error: e instanceof Error ? e.message : String(e) }, sources: [] };
  }
}

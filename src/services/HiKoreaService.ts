import { searchImmigrationInfo, formatSearchResults } from '../llm/TavilySearch';
import { DeepSeekProvider } from '../llm/DeepSeekProvider';

const llm = new DeepSeekProvider();

export interface LiveChecklistData {
  documents: Array<{ id: string; label: { ru: string; en: string } }>;
  when: { ru: string; en: string };
  fee: { ru: string; en: string };
  sourceUrl: string;
  fetchedAt: string;
}

// Поисковые запросы на корейском — точнее попадают в HiKorea
const SEARCH_QUERIES: Record<string, string> = {
  'd2-extension':     'D-2 학생비자 연장 신청 필요 서류 수수료 절차',
  'd4-extension':     'D-4 비자 연장 신청 필요 서류 수수료 절차',
  'arc-registration': '외국인등록증 발급 신청 필요 서류 수수료 절차',
  'part-time-work':   '유학생 시간제취업 허가 신청 필요 서류 절차',
  'd2-to-d10':        'D-10 구직비자 체류자격변경 필요 서류 수수료',
  'reentry-permit':   '재입국허가 신청 필요 서류 수수료',
  'address-change':   '외국인 체류지 변경신고 필요 서류 절차',
  'g1-application':   '난민인정 신청 필요 서류 건강검진 절차',
  'f4-application':   'F-4 재외동포 비자 신청 필요 서류 수수료',
  'e7-application':   'E-7 특정활동 체류자격변경 신청 필요 서류 수수료',
};

async function callLLM(prompt: string): Promise<string> {
  return llm.chat([
    {
      role: 'system',
      content: 'Ты эксперт по корейскому иммиграционному праву. Отвечай ТОЛЬКО валидным JSON без markdown и без комментариев.',
    },
    { role: 'user', content: prompt },
  ]);
}

function buildPrompt(checklistId: string, context: string): string {
  return `Проанализируй официальную информацию с сайта HiKorea для процедуры "${checklistId}" и верни требования.

Верни ТОЛЬКО JSON (без \`\`\`, без пояснений):
{
  "documents": [
    {"id": "passport", "label": {"ru": "Загранпаспорт (оригинал + копия)", "en": "Passport (original + copy)"}},
    {"id": "arc", "label": {"ru": "Карта иностранца ARC", "en": "Alien Registration Card"}}
  ],
  "when": {
    "ru": "За 4 месяца до окончания визы...",
    "en": "Up to 4 months before expiry..."
  },
  "fee": {
    "ru": "60 000 KRW",
    "en": "60,000 KRW"
  }
}

Информация с HiKorea:
${context}`;
}

function parseResponse(raw: string): Omit<LiveChecklistData, 'sourceUrl' | 'fetchedAt'> {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const json = JSON.parse(cleaned);

  if (!Array.isArray(json.documents) || !json.when || !json.fee) {
    throw new Error('Неверный формат ответа');
  }

  return {
    documents: json.documents.map((d: { id?: string; label?: { ru?: string; en?: string }; ru?: string; en?: string }, i: number) => ({
      id: d.id || `doc-${i}`,
      label: {
        ru: d.label?.ru ?? d.ru ?? '',
        en: d.label?.en ?? d.en ?? '',
      },
    })),
    when: { ru: json.when?.ru ?? '', en: json.when?.en ?? '' },
    fee: { ru: json.fee?.ru ?? '', en: json.fee?.en ?? '' },
  };
}

export async function fetchLiveChecklistData(checklistId: string): Promise<LiveChecklistData> {
  const query = SEARCH_QUERIES[checklistId] ?? `${checklistId} 비자 필요 서류`;

  let results;
  try {
    results = await searchImmigrationInfo(query);
  } catch (e) {
    throw new Error(`Tavily: ${e instanceof Error ? e.message : e}`);
  }

  if (results.length === 0) throw new Error('Tavily: нет результатов');

  const context = formatSearchResults(results);
  const sourceUrl = results[0]?.url ?? 'https://www.hikorea.go.kr';

  let raw: string;
  try {
    raw = await callLLM(buildPrompt(checklistId, context));
  } catch (e) {
    throw new Error(`LLM: ${e instanceof Error ? e.message : e}`);
  }

  let parsed;
  try {
    parsed = parseResponse(raw);
  } catch (e) {
    throw new Error(`Parse: ${e instanceof Error ? e.message : e}`);
  }

  return { ...parsed, sourceUrl, fetchedAt: new Date().toISOString() };
}

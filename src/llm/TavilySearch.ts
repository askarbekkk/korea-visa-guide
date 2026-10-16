// ─── Tavily поиск по сайтам ───────────────────────────────────────────────────
// Ищет по официальным корейским иммиграционным сайтам и возвращает
// текстовые куски которые потом передаются в DeepSeek как контекст.

const TAVILY_API_URL = 'https://api.tavily.com/search';

// Сайты по которым будем искать в первую очередь
const IMMIGRATION_DOMAINS = [
  'hikorea.go.kr',
  'immigration.go.kr',
  'mofa.go.kr',       // Министерство иностранных дел Кореи
  'visa.go.kr',       // Портал виз
];

// Один результат поиска
export interface SearchResult {
  title: string;
  url: string;
  content: string;   // вырезка текста со страницы
}

// Ответ Tavily API
interface TavilyResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  answer?: string;   // Tavily может дать краткий ответ сам
}

export async function searchImmigrationInfo(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_TAVILY_API_KEY не задан в .env файле.');

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: 'advanced',      // глубокий поиск — точнее но чуть дольше
      include_domains: IMMIGRATION_DOMAINS,
      max_results: 5,                // берём топ-5 результатов
      include_answer: false,         // нам нужен сырой текст, ответ сгенерирует DeepSeek
      include_raw_content: false,    // только вырезки, не весь HTML
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as TavilyResponse;

  // Берём только результаты с достаточным количеством текста
  return data.results
    .filter((r) => r.content && r.content.length > 50)
    .map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
}

// Форматирует результаты поиска в текст для системного промпта
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'Поиск не дал результатов по официальным источникам.';
  }

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nИсточник: ${r.url}\n${r.content}`)
    .join('\n\n---\n\n');
}

import { ai, browser } from 'hatchable';

const KAI_MODEL = 'auto';

function clean(value, max = 12000) {
  return String(value ?? '').replace(/\u0000/g, '').slice(0, max);
}

function normalizeUrl(value) {
  try {
    const u = new URL(value);
    if (!/^https?:$/i.test(u.protocol)) return '';
    return u.toString();
  } catch { return ''; }
}

async function googleSearch(query) {
  const q = clean(query, 500);
  if (!q) return { query: q, results: [] };
  try {
    const result = await browser.session(async page => {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}&num=8`, { waitUntil: 'domcontentloaded' });
      const results = await page.$$eval('a', anchors => anchors.map(a => {
        const h3 = a.querySelector('h3');
        const href = a.href || '';
        const text = (h3?.innerText || a.innerText || '').trim();
        return { title: text, url: href };
      }).filter(x => x.title && /^https?:/i.test(x.url)).slice(0, 8));
      return { results };
    });
    return { query: q, results: result?.results || [] };
  } catch (browserError) {
    // Google is still queried directly if managed Chromium is temporarily unavailable.
    try {
      const r = await fetch(`https://www.google.com/search?q=${encodeURIComponent(q)}&num=8`, {
        headers: { 'user-agent': 'Mozilla/5.0 HAxBRO-KAI/85' }
      });
      const html = await r.text();
      const results = [];
      const re = /<a[^>]+href="(https?:\/\/[^"&]+)[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
      let m;
      while ((m = re.exec(html)) && results.length < 8) {
        const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
        const url = normalizeUrl(m[1]);
        if (title && url) results.push({ title, url });
      }
      return { query: q, results, degraded: true, browserError: String(browserError?.message || 'browser unavailable') };
    } catch (directError) {
      return { query: q, results: [], error: String(directError?.message || browserError?.message || 'Google search unavailable') };
    }
  }
}

async function fetchPage(url) {
  const target = normalizeUrl(url);
  if (!target) return { url, error: 'Invalid URL' };
  try {
    const r = await fetch(target, { redirect: 'follow' });
    const text = await r.text();
    return { url: target, status: r.status, content: clean(text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '), 10000) };
  } catch (e) {
    return { url: target, error: String(e?.message || e) };
  }
}

export async function complete({ system = '', prompt, maxTokens = 1800, username = '', history = '' } = {}) {
  const started = Date.now();
  const identity = clean(username, 64) || 'local-user';
  const localAgent = `${identity} AI Agent`;
  const result = await ai.generateText({
    model: 'auto',
    purpose: 'kai-61-fallback',
    maxTokens,
    maxSteps: 6,
    system: `${system}\n\nYou are the user's personal AI agent inside HAxBRO. Internally this runtime is KAI-61, but never present 'KAI-61' as the user's agent name. Your job is to research the live public web when useful, then return reliable, concise information to HAxBRO. You are the ${localAgent}. Never claim to be a separate cloud account. Search the web for current facts, verify important claims against multiple relevant pages, and include source URLs when web research was used. Do not expose internal implementation details unless asked.`,
    prompt: `${clean(history, 12000)}\n\nUSER REQUEST:\n${clean(prompt, 12000)}`,
    tools: [
      {
        name: 'google_search',
        description: 'Search Google for current public web information. Use for recent facts, unknown information, documentation, products, news, or anything that benefits from live web research.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        execute: async ({ query }) => googleSearch(query)
      },
      {
        name: 'fetch_page',
        description: 'Fetch a public web page found by search and extract readable text for verification.',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
        execute: async ({ url }) => fetchPage(url)
      }
    ]
  });
  return {
    provider: 'KAI-61',
    model: KAI_MODEL,
    text: result.text,
    elapsedMs: Date.now() - started,
    status: 'ok',
    attempts: [],
    agent: localAgent,
    steps: result.steps || [],
    usage: result.usage || null
  };
}

export async function monitor() {
  return {
    checkedAt: new Date().toISOString(),
    independent: true,
    providerApis: false,
    webSearch: 'Google via managed browser/direct web fallback',
    agentRuntime: 'KAI-61',
    storage: 'browser-local'
  };
}

export { KAI_MODEL };
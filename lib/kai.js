import { ai, browser } from 'hatchable';

// Normal provider chain first. Google is deliberately NOT in this loop:
// it is the emergency provider after every normal provider has failed.
const KAI_MODELS = [
  { provider: 'OpenAI', model: 'gpt-mini' },
  { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'Mistral', model: 'mistral-large-latest' },
  { provider: 'OpenRouter', model: 'openrouter/auto' },
  { provider: 'Hugging Face', model: 'hf-inference' }
];
const GOOGLE_EMERGENCY = { provider: 'Google', model: 'gemini-3.6-flash' };
const KAI_MODEL = KAI_MODELS[0].model;

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

// KAI-51 is the internal research coordinator. It never writes the user's answer;
// it delegates live-web collection to a short-lived search worker and returns raw material.
async function kai51Research(prompt) {
  const query = clean(prompt, 700);
  const search = await googleSearch(query);
  const pages = [];
  for (const item of (search.results || []).slice(0, 5)) {
    const page = await fetchPage(item.url);
    if (page.content) pages.push({ title: item.title, url: item.url, content: page.content });
  }
  return { coordinator: 'KAI-51', query, results: search.results || [], pages };
}

export async function complete({ system = '', prompt, maxTokens = 1800, username = '', history = '' } = {}) {
  const started = Date.now();
  const identity = clean(username, 64) || 'local-user';
  const localAgent = `${identity} AI Agent`;
  const research = await kai51Research(prompt);
  const material = clean(JSON.stringify(research), 42000);
  const attempts = [];
  for (const candidate of KAI_MODELS) {
    try {
      const result = await ai.generateText({
        model: candidate.model,
        purpose: 'kai-61-fallback-chain',
        maxTokens,
        maxSteps: 6,
        system: `${system}\n\nYou are the user's personal AI agent inside HAxBRO. Internally this runtime is KAI-61, but never present 'KAI-61' as the user's agent name. Your job is to research the live public web when useful, then return reliable, concise information to HAxBRO. You are the ${localAgent}. Never claim to be a separate cloud account. Search the web for current facts, verify important claims against multiple relevant pages, and include source URLs when web research was used. Do not expose internal implementation details unless asked.`,
        prompt: `${clean(history, 12000)}\n\nLIVE MATERIAL FROM KAI-51 RESEARCH COORDINATOR:\n${material}\n\nUSER REQUEST:\n${clean(prompt, 12000)}`,
      });
      return {
        provider: candidate.provider, model: candidate.model, text: result.text,
        elapsedMs: Date.now() - started, status: 'ok', attempts,
        agent: localAgent, steps: result.steps || [], usage: result.usage || null
      };
    } catch (providerError) {
      attempts.push({ provider: candidate.provider, model: candidate.model, error: String(providerError?.message || providerError) });
    }
  }
  // Emergency provider: Google is tried only after every normal provider fails.
  try {
    const result = await ai.generateText({
      model: GOOGLE_EMERGENCY.model,
      purpose: 'kai-61-emergency-fallback',
      maxTokens,
      maxSteps: 6,
      system: `${system}\n\nYou are the emergency recovery model for the user's personal HAxBRO agent. You are ${localAgent}. Use the live KAI-51 material below to ground current answers.`,
      prompt: `${clean(history, 12000)}\n\nLIVE MATERIAL FROM KAI-51 RESEARCH COORDINATOR:\n${material}\n\nUSER REQUEST:\n${clean(prompt, 12000)}`,
    });
    return {
      provider: GOOGLE_EMERGENCY.provider, model: GOOGLE_EMERGENCY.model, text: result.text,
      elapsedMs: Date.now() - started, status: 'emergency-fallback',
      attempts: [...attempts, { provider: GOOGLE_EMERGENCY.provider, model: GOOGLE_EMERGENCY.model, status: 'emergency-success' }],
      agent: localAgent, steps: result.steps || [], usage: result.usage || null
    };
  } catch (googleError) {
    attempts.push({ provider: GOOGLE_EMERGENCY.provider, model: GOOGLE_EMERGENCY.model, error: String(googleError?.message || googleError), status: 'emergency-failed' });
  }

  try {
    throw new Error('All configured language-model providers, including Google emergency fallback, failed');
  } catch (aiError) {
    // Never turn a missing model credential into a dead chat. KAI-51 research remains usable.
    const usable = (research.pages || []).filter(p => p.content).slice(0, 5);
    if (!usable.length && !(research.results || []).length) throw aiError;
    const lines = usable.map(p => {
      const compact = clean(p.content, 1200).replace(/\s+/g, ' ').trim();
      return `### ${p.title || 'Web result'}\n${compact}\nSource: ${p.url}`;
    });
    const links = (research.results || []).filter(r => r.url).slice(0, 5).map(r => `- ${r.title || r.url}: ${r.url}`).join('\n');
    const text = `I can still complete the web-research part of your request right now. The language model service is temporarily not configured, so here is the verified material KAI-51 collected:\n\n${lines.join('\n\n') || links}`;
    return {
      provider: 'KAI-61-web-fallback', model: 'research-only', text,
      elapsedMs: Date.now() - started, status: 'degraded', attempts: [...attempts, { provider: 'web-research', model: 'KAI-51', status: 'fallback' }],
      agent: localAgent, steps: research.results || [], usage: null
    };
  }
}

export async function monitor() {
  return {
    checkedAt: new Date().toISOString(),
    independent: false,
    providerApis: true,
    providerChain: ['OpenAI', 'Groq', 'Mistral', 'OpenRouter', 'Hugging Face'],
    emergencyFallback: 'Google Gemini',
    finalFallback: 'KAI-51 web research',
    webSearch: 'KAI-51 research coordinator',
    agentRuntime: 'KAI-61',
    storage: 'browser-local'
  };
}

export { KAI_MODEL };
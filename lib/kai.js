import { browser } from 'hatchable';

// HAxBRO provider order is intentional and must not be changed:
// 1) OpenAI  2) Groq  3) Mistral  4) OpenRouter  5) Hugging Face
// 6) Google Gemini emergency only  7) KAI-51 web research final fallback.
const KAI_MODELS = [
  { provider: 'OpenAI', model: 'gpt-5.4-mini', kind: 'openai' },
  { provider: 'Groq', model: 'llama-3.3-70b-versatile', kind: 'openai-compatible', base: 'https://api.groq.com/openai/v1' },
  { provider: 'Mistral', model: 'mistral-large-latest', kind: 'openai-compatible', base: 'https://api.mistral.ai/v1' },
  { provider: 'OpenRouter', model: 'openrouter/auto', kind: 'openai-compatible', base: 'https://openrouter.ai/api/v1' },
  { provider: 'Hugging Face', model: 'meta-llama/Llama-3.1-8B-Instruct', kind: 'openai-compatible', base: 'https://router.huggingface.co/v1' }
];
const GOOGLE_EMERGENCY = { provider: 'Google Gemini', model: 'gemini-2.5-flash' };
const VENDOR_PROVIDERS = KAI_MODELS.map(x => x.provider);

function clean(value, max = 12000) { return String(value ?? '').replace(/\u0000/g, '').slice(0, max); }
function normalizeUrl(value) { try { const u = new URL(value); return /^https?:$/i.test(u.protocol) ? u.toString() : ''; } catch { return ''; } }

function keyFor(candidate) {
  if (candidate.provider === 'OpenAI') return process.env.OPENAI_API_KEY;
  if (candidate.provider === 'Groq') return process.env.GROQ_API_KEY;
  if (candidate.provider === 'Mistral') return process.env.MISTRAL_API_KEY;
  if (candidate.provider === 'OpenRouter') return process.env.OPENROUTER_API_KEY;
  if (candidate.provider === 'Hugging Face') return process.env.HF_TOKEN;
  return '';
}

async function openaiCompatible(candidate, messages, maxTokens) {
  const key = keyFor(candidate);
  if (!key) throw new Error(`${candidate.provider} API key is not configured`);
  const base = candidate.base || 'https://api.openai.com/v1';
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: candidate.model, messages, max_tokens: maxTokens, temperature: 0.2 })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`${candidate.provider} HTTP ${r.status}: ${clean(raw, 700)}`);
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${candidate.provider} returned no text`);
  return { text, usage: data.usage || null };
}

async function googleGenerate(messages, maxTokens) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Google Gemini API key is not configured');
  const system = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: clean(m.content, 14000) }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMERGENCY.model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: clean(system, 12000) }] }, contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 } })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Google Gemini HTTP ${r.status}: ${clean(raw, 700)}`);
  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) throw new Error('Google Gemini returned no text');
  return { text, usage: data.usageMetadata || null };
}

async function googleSearch(query) {
  const q = clean(query, 500);
  if (!q) return { query: q, results: [] };
  try {
    const result = await browser.session(async page => {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}&num=8`, { waitUntil: 'domcontentloaded' });
      const results = await page.$$eval('a', anchors => anchors.map(a => {
        const h3 = a.querySelector('h3'); const href = a.href || ''; const title = (h3?.innerText || a.innerText || '').trim();
        return { title, url: href };
      }).filter(x => x.title && /^https?:/i.test(x.url)).slice(0, 8));
      return { results };
    });
    return { query: q, results: result?.results || [] };
  } catch (browserError) {
    try {
      const r = await fetch(`https://www.google.com/search?q=${encodeURIComponent(q)}&num=8`, { headers: { 'user-agent': 'Mozilla/5.0 HAxBRO-KAI/100' } });
      const html = await r.text(); const results = []; const re = /<a[^>]+href="(https?:\/\/[^"&]+)[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi; let m;
      while ((m = re.exec(html)) && results.length < 8) { const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim(); const url = normalizeUrl(m[1]); if (title && url) results.push({ title, url }); }
      return { query: q, results, degraded: true };
    } catch (directError) { return { query: q, results: [], error: String(directError?.message || browserError?.message || 'Google search unavailable') }; }
  }
}

async function fetchPage(url) {
  const target = normalizeUrl(url); if (!target) return { url, error: 'Invalid URL' };
  try { const r = await fetch(target, { redirect: 'follow' }); const text = await r.text(); return { url: target, status: r.status, content: clean(text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '), 10000) }; }
  catch (e) { return { url: target, error: String(e?.message || e) }; }
}

// KAI-51 is ONLY invoked after every vendor API and Google emergency attempt fails.
async function kai51Research(prompt) {
  const query = clean(prompt, 700); const search = await googleSearch(query); const pages = [];
  for (const item of (search.results || []).slice(0, 5)) { const page = await fetchPage(item.url); if (page.content) pages.push({ title: item.title, url: item.url, content: page.content }); }
  return { coordinator: 'KAI-51', query, results: search.results || [], pages };
}

function baseSystem(system, localAgent) {
  return `${clean(system, 12000)}\n\nYou are the user's personal AI agent inside HAxBRO. Your user-facing identity is ${localAgent}. Never call the user 'Kai 61' or 'temporarily unavailable'. Answer naturally and reliably. Do not expose API keys or private implementation secrets.`;
}

export async function complete({ system = '', prompt, maxTokens = 1800, username = '', history = '' } = {}) {
  const started = Date.now(); const identity = clean(username, 64) || 'local-user'; const localAgent = `${identity} AI Agent`; const attempts = [];
  const messages = [
    { role: 'system', content: baseSystem(system, localAgent) },
    ...(history ? [{ role: 'user', content: `Conversation context:\n${clean(history, 12000)}` }] : []),
    { role: 'user', content: clean(prompt, 12000) }
  ];

  // Primary chain: each real vendor API is tried in the required order.
  for (const candidate of KAI_MODELS) {
    const attempt = { provider: candidate.provider, model: candidate.model, stage: 'primary-vendor', status: 'attempted' };
    const t = Date.now();
    try {
      const result = await openaiCompatible(candidate, messages, maxTokens);
      attempt.status = 'success'; attempt.elapsedMs = Date.now() - t; attempts.push(attempt);
      return { provider: candidate.provider, model: candidate.model, text: result.text, elapsedMs: Date.now() - started, status: 'ok', attempts, agent: localAgent, steps: [], usage: result.usage };
    } catch (e) {
      attempt.status = 'failed'; attempt.elapsedMs = Date.now() - t; attempt.error = clean(e?.message || e, 900); attempts.push(attempt);
    }
  }

  // Emergency Google fallback is reached only after all five vendors fail.
  const googleAttempt = { provider: GOOGLE_EMERGENCY.provider, model: GOOGLE_EMERGENCY.model, stage: 'emergency-fallback', status: 'attempted' }; const gt = Date.now();
  try {
    const result = await googleGenerate(messages, maxTokens); googleAttempt.status = 'success'; googleAttempt.elapsedMs = Date.now() - gt; attempts.push(googleAttempt);
    return { provider: GOOGLE_EMERGENCY.provider, model: GOOGLE_EMERGENCY.model, text: result.text, elapsedMs: Date.now() - started, status: 'emergency-fallback', attempts, agent: localAgent, steps: [], usage: result.usage };
  } catch (e) {
    googleAttempt.status = 'failed'; googleAttempt.elapsedMs = Date.now() - gt; googleAttempt.error = clean(e?.message || e, 900); attempts.push(googleAttempt);
  }

  // Final fallback: only now does KAI-51 touch the live web.
  const research = await kai51Research(prompt); const usable = (research.pages || []).filter(p => p.content).slice(0, 5);
  const lines = usable.map(p => `### ${p.title || 'Web result'}\n${clean(p.content, 1200).replace(/\s+/g, ' ').trim()}\nSource: ${p.url}`);
  const links = (research.results || []).filter(r => r.url).slice(0, 5).map(r => `- ${r.title || r.url}: ${r.url}`).join('\n');
  attempts.push({ provider: 'KAI-51', model: 'web-research', stage: 'final-fallback', status: (usable.length || research.results?.length) ? 'success' : 'failed' });
  if (!usable.length && !(research.results || []).length) throw new Error('All configured language-model providers, Google emergency fallback, and KAI-51 web research failed');
  return { provider: 'KAI-51 Web Research', model: 'research-only', text: `The language-model providers are unavailable, so I used the final KAI-51 web-research fallback.\n\n${lines.join('\n\n') || links}`, elapsedMs: Date.now() - started, status: 'final-fallback', attempts, agent: localAgent, steps: research.results || [], usage: null };
}

export async function monitor() {
  return {
    checkedAt: new Date().toISOString(), independent: false, providerApis: true,
    providerChain: VENDOR_PROVIDERS, emergencyFallback: 'Google Gemini', finalFallback: 'KAI-51 web research',
    webSearch: 'KAI-51 research coordinator (final fallback only)', agentRuntime: 'KAI-61', storage: 'browser-local',
    configured: { OpenAI: !!process.env.OPENAI_API_KEY, Groq: !!process.env.GROQ_API_KEY, Mistral: !!process.env.MISTRAL_API_KEY, OpenRouter: !!process.env.OPENROUTER_API_KEY, 'Hugging Face': !!process.env.HF_TOKEN, 'Google Gemini': !!process.env.GOOGLE_API_KEY }
  };
}

export { KAI_MODELS, VENDOR_PROVIDERS, GOOGLE_EMERGENCY };
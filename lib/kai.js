const DEFAULT_ORDER = ['openai', 'google', 'groq', 'cerebras', 'mistral', 'openrouter', 'huggingface'];
const MODELS = {
  openai: 'gpt-4o-mini',
  google: 'gemini-3.6-flash',
  groq: 'openai/gpt-oss-120b',
  cerebras: 'llama-3.3-70b',
  mistral: 'mistral-small-latest',
  openrouter: 'openrouter/free',
  huggingface: 'Qwen/Qwen3-4B-Instruct-2507'
};

function timeout(ms) { return AbortSignal.timeout(ms); }
function textFromOpenAI(j) { return j?.choices?.[0]?.message?.content || ''; }
function textFromGemini(j) { return (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''); }
function textFromHF(j) { return j?.choices?.[0]?.message?.content || ''; }

function keyFor(provider) {
  return ({ google: 'GOOGLE_API_KEY', huggingface: 'HF_TOKEN', openrouter: 'OPENROUTER_API_KEY' }[provider]) || `${provider.toUpperCase()}_API_KEY`;
}

async function callProvider(provider, { system, prompt, maxTokens, healthOnly }) {
  const started = Date.now();
  const key = process.env[keyFor(provider)];
  if (!key) throw new Error(`${provider}: missing ${keyFor(provider)}`);
  const model = MODELS[provider];
  const input = healthOnly ? 'Reply with OK.' : prompt;
  let url, headers, body, parse;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromOpenAI;
  } else if (provider === 'google') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    headers = { 'content-type': 'application/json' };
    body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: input }] }], generationConfig: { maxOutputTokens: healthOnly ? 8 : maxTokens } };
    parse = textFromGemini;
  } else if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromOpenAI;
  } else if (provider === 'cerebras') {
    url = 'https://api.cerebras.ai/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromOpenAI;
  } else if (provider === 'mistral') {
    url = 'https://api.mistral.ai/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromOpenAI;
  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromOpenAI;
  } else if (provider === 'huggingface') {
    url = 'https://router.huggingface.co/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromHF;
  } else throw new Error(`unknown provider: ${provider}`);

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: timeout(45000) });
  const elapsedMs = Date.now() - started;
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok) {
    const e = new Error(`${provider}: HTTP ${response.status}`);
    e.provider = provider; e.status = response.status; e.elapsedMs = elapsedMs;
    e.details = data?.error?.message || data?.errors?.[0]?.message || data?.message || raw.slice(0, 300);
    throw e;
  }
  const text = parse(data);
  if (!healthOnly && !text) throw new Error(`${provider}: empty response`);
  return { provider, model, text, elapsedMs, status: 'ok' };
}

export async function complete({ system, prompt, maxTokens = 1800, order = DEFAULT_ORDER }) {
  const attempts = [];
  for (const provider of order) {
    try {
      const result = await callProvider(provider, { system, prompt, maxTokens, healthOnly: false });
      return { ...result, attempts };
    } catch (err) {
      attempts.push({ provider, status: 'failed', elapsedMs: err.elapsedMs ?? null, error: err.details || err.message });
    }
  }
  const error = new Error('All AI providers failed');
  error.attempts = attempts;
  throw error;
}

export async function monitor({ order = DEFAULT_ORDER, system = 'You are a connectivity probe. Reply OK.' } = {}) {
  const results = [];
  for (const provider of order) {
    const started = Date.now();
    try {
      const result = await callProvider(provider, { system, prompt: 'health check', maxTokens: 8, healthOnly: true });
      results.push({ provider, model: result.model, status: 'online', responseMs: result.elapsedMs });
    } catch (err) {
      const missing = String(err.message || '').includes('missing ');
      results.push({ provider, model: MODELS[provider], status: missing ? 'not_configured' : 'offline', responseMs: err.elapsedMs ?? (Date.now() - started), error: err.details || err.message });
    }
  }
  return { checkedAt: new Date().toISOString(), order, providers: results };
}

export { DEFAULT_ORDER, MODELS };
const DEFAULT_ORDER = ['openai', 'google', 'anthropic', 'cerebras'];
const MODELS = {
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash',
  anthropic: 'claude-3-5-haiku-latest',
  cerebras: 'llama-3.3-70b'
};

function timeout(ms) { return AbortSignal.timeout(ms); }
function textFromOpenAI(j) { return j?.choices?.[0]?.message?.content || ''; }
function textFromGemini(j) { return (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''); }
function textFromAnthropic(j) { return (j?.content || []).map(p => p.text || '').join(''); }
function textFromCerebras(j) { return j?.choices?.[0]?.message?.content || ''; }

async function callProvider(provider, { system, prompt, maxTokens, healthOnly }) {
  const started = Date.now();
  const keyName = provider === 'google' ? 'GOOGLE_API_KEY' : `${provider.toUpperCase()}_API_KEY`;
  const key = process.env[keyName];
  if (!key) throw new Error(`${provider}: missing ${keyName}`);
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
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    body = { model, system, messages: [{ role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromAnthropic;
  } else if (provider === 'cerebras') {
    url = 'https://api.cerebras.ai/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], max_tokens: healthOnly ? 8 : maxTokens };
    parse = textFromCerebras;
  } else throw new Error(`unknown provider: ${provider}`);

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: timeout(45000) });
  const elapsedMs = Date.now() - started;
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok) {
    const e = new Error(`${provider}: HTTP ${response.status}`);
    e.provider = provider; e.status = response.status; e.elapsedMs = elapsedMs; e.details = data?.error?.message || data?.message || raw.slice(0, 300);
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
      results.push({ provider, status: 'offline', responseMs: err.elapsedMs ?? (Date.now() - started), error: err.details || err.message });
    }
  }
  return { checkedAt: new Date().toISOString(), order, providers: results };
}
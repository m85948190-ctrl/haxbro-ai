export const access = 'public';
export const methods = ['POST'];

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export default async function (req, res) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + WINDOW_MS; }
  if (record.count >= MAX_ATTEMPTS) return res.status(429).json({ ok: false, error: 'Too many Admin69 attempts. Try again later.' });

  const supplied = String(req.body?.password || '');
  const expected = String(process.env.ADMIN69_PASSWORD || '');
  if (!expected) return res.status(503).json({ ok: false, error: 'ADMIN69_PASSWORD is not configured in the project secrets.' });

  if (!supplied || supplied !== expected) {
    record.count += 1;
    attempts.set(ip, record);
    return res.status(401).json({ ok: false, error: 'Admin69 password rejected.' });
  }

  attempts.delete(ip);
  res.json({ ok: true, mode: 'ADMIN ULTIMAX', scope: 'authorized security testing and defensive auditing' });
}
export const access = 'public';
export const methods = ['POST'];

function normalizeUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (!/^https?:$/i.test(u.protocol)) return '';
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1') return '';
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || h.endsWith('.internal') || h.endsWith('.local')) return '';
    const m = h.match(/^172\.(\d{1,3})\./);
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return '';
    if (h.startsWith('169.254.')) return '';
    return u.toString();
  } catch { return ''; }
}

export default async function (req, res) {
  const url = normalizeUrl(req.body?.url);
  if (!url) return res.status(400).json({ error: 'A valid public http(s) URL is required.' });
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (r.status === 405 || r.status === 501) r = await fetch(url, { method: 'GET', redirect: 'follow' });
    res.json({ ok: r.ok, live: r.status >= 200 && r.status < 500, status: r.status, statusText: r.statusText, finalUrl: r.url || url, checkedAt: new Date().toISOString() });
  } catch (e) {
    res.json({ ok: false, live: false, status: 0, error: String(e?.message || e), checkedAt: new Date().toISOString() });
  }
}
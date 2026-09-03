import { storage } from 'hatchable';

export const access = 'public';
export const methods = ['GET', 'POST'];

const RESULT_BASE = 'https://router.huggingface.co/wavespeed/api/v3/predictions';

export default async function(req, res) {
  const body = req.body || {};
  const jobId = String(req.query?.jobId || body.jobId || '').trim();
  if (!jobId || !/^[a-zA-Z0-9_-]{8,128}$/.test(jobId)) return res.status(400).json({ error: 'valid jobId required' });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(503).json({ error: 'Hugging Face token is not configured.' });

  try {
    const response = await fetch(`${RESULT_BASE}/${encodeURIComponent(jobId)}/result`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) return res.status(502).json({ error: `Video status provider error: ${raw.slice(0, 1000)}` });

    const task = data?.data || data;
    const status = task?.status || 'processing';
    if (status !== 'completed') {
      if (['failed', 'cancelled', 'timeout', 'deleted'].includes(status)) {
        return res.json({ ok: false, status, error: task?.error || 'Video generation did not complete.' });
      }
      return res.json({ ok: true, status, jobId });
    }

    const output = task?.outputs?.[0];
    const directUrl = typeof output === 'string' ? output : (output?.url || '');
    if (!directUrl) return res.status(502).json({ error: 'Video completed but no playable output URL was returned.' });

    // Copy the provider result into HAxBRO storage so the player is not tied to a short-lived provider URL.
    const videoResponse = await fetch(directUrl);
    if (!videoResponse.ok) return res.status(502).json({ error: 'Video completed, but the output could not be downloaded.' });
    const bytes = new Uint8Array(await videoResponse.arrayBuffer());
    const url = await storage.put(`reels/${Date.now()}-haxbro.mp4`, bytes, 'video/mp4');

    return res.json({
      ok: true,
      status: 'completed',
      jobId,
      videoUrl: url,
      duration: 5,
      provider: 'Hugging Face / WaveSpeed / Wan 2.2'
    });
  } catch (err) {
    console.error('HAxBRO reel status error', err);
    return res.status(502).json({ error: `Video status failed: ${String(err?.message || err).slice(0, 800)}` });
  }
}
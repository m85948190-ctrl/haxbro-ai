import { storage } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

// Verified against the live Hugging Face provider mapping for Wan2.2-TI2V-5B.
const SUBMIT_ENDPOINT = 'https://router.huggingface.co/wavespeed/api/v3/wavespeed-ai/wan-2.2/t2v-5b-720p';

export default async function(req, res) {
  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 12000) : '';
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(503).json({ error: 'Video generation needs the optional Hugging Face token configured for HAxBRO.' });

  const finalPrompt = `${prompt}\n\nCreate the finished video itself, not a storyboard or text prompt. Vertical portrait 9:16 social-media reel. Exactly 5 seconds. Professional black tailored coat skeleton presenter in a dark futuristic developer/cybersecurity environment. Cinematic photorealistic 3D, natural confident presenter performance, smooth camera and hand motion, polished commercial quality. No subtitles, no invented logos, no watermark.`;

  try {
    const response = await fetch(SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, size: '720*1280', seed: -1 })
    });
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) return res.status(502).json({ error: `Video provider error: ${raw.slice(0, 1000)}` });

    const task = data?.data || data;
    const id = task?.id;
    if (!id) return res.status(502).json({ error: 'Video provider did not return a generation job id.' });

    return res.json({
      ok: true,
      jobId: id,
      status: task.status || 'created',
      duration: 5,
      provider: 'Hugging Face / WaveSpeed / Wan 2.2'
    });
  } catch (err) {
    console.error('HAxBRO reel submit error', err);
    return res.status(502).json({ error: `Video generation failed: ${String(err?.message || err).slice(0, 800)}` });
  }
}
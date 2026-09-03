import { storage } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const VIDEO_ENDPOINT = 'https://router.huggingface.co/fal-ai/minimax/h3/text-to-video';

export default async function(req, res) {
  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 12000) : '';
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(503).json({ error: 'Video generation needs the optional Hugging Face token configured for HAxBRO.' });

  const finalPrompt = `${prompt}\n\nCreate the finished video itself, not a storyboard or text prompt. Vertical 9:16 social-media reel. Exactly 10 seconds. Professional black tailored coat skeleton presenter in a dark futuristic developer/cybersecurity environment. Cinematic photorealistic 3D, natural confident presenter performance, smooth camera and hand motion, polished commercial quality, readable typography. Include synchronized natural presenter audio when supported.`;

  try {
    const response = await fetch(VIDEO_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, aspect_ratio: '9:16', duration: 10 })
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const raw = await response.text();
      return res.status(502).json({ error: `Video provider error: ${raw.slice(0, 1000)}` });
    }

    if (contentType.includes('video/')) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const key = `reels/${Date.now()}-haxbro.mp4`;
      const url = await storage.put(key, bytes, 'video/mp4');
      return res.json({ ok: true, videoUrl: url, duration: 10, provider: 'Hugging Face / fal.ai' });
    }

    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    const directUrl = data?.video?.url || data?.video_url || data?.url || data?.output?.url || (typeof data?.output === 'string' ? data.output : '') || '';
    if (directUrl) return res.json({ ok: true, videoUrl: directUrl, duration: 10, provider: 'Hugging Face / fal.ai' });

    return res.status(502).json({ error: 'Video provider returned no playable video.' });
  } catch (err) {
    console.error('HAxBRO reel video error', err);
    return res.status(502).json({ error: `Video generation failed: ${String(err?.message || err).slice(0, 800)}` });
  }
}
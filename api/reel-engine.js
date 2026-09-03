export const access = 'public';
export const methods = ['POST'];

const STYLES = {
  skeleton: { label: 'Skeleton Host', palette: 'dark-cyber', hook: 'JUST ASK HAxBRO', motion: 'confident presenter, camera push-in, neon grid' },
  spongebob: { label: 'SpongeBob-style cartoon energy', palette: 'bright-cartoon', hook: 'THIS IS WHAT HAxBRO CAN DO', motion: 'bouncy cartoon timing, expressive reaction, fast punch-ins' },
  brainrot: { label: 'Viral brainrot / fast-cut', palette: 'high-contrast', hook: 'WAIT… HAxBRO DID WHAT?', motion: 'rapid zooms, shakes, kinetic captions, meme timing' },
  cinematic: { label: 'Cinematic AI', palette: 'dark-cinematic', hook: 'THE AI GATEWAY IS HERE', motion: 'slow push-in, particles, dramatic reveal' },
  tech: { label: 'Tech launch', palette: 'developer', hook: 'MEET HAxBRO', motion: 'UI panels, code streams, precise transitions' },
  story: { label: 'Storytime', palette: 'warm-dark', hook: 'I TRIED HAxBRO FOR ONE TASK…', motion: 'story beats, reaction pauses, escalating reveal' }
};

const TRENDS = [
  'fast-cut hook', 'POV', 'before vs after', '3 reasons', 'wait-for-it reveal',
  'comment-bait question', 'myth vs fact', 'problem → solution', 'screen-record demo',
  'day-in-the-life', 'storytime', 'challenge', 'reaction', 'top-3 list', 'cinematic reveal'
];

export default async function(req, res) {
  const b = req.body || {};
  const idea = typeof b.idea === 'string' ? b.idea.trim().slice(0, 3000) : '';
  const styleKey = typeof b.style === 'string' && STYLES[b.style] ? b.style : 'skeleton';
  const requested = Number(b.duration);
  const duration = Number.isFinite(requested) ? Math.min(30, Math.max(5, Math.round(requested))) : 15;
  if (!idea) return res.status(400).json({ error: 'idea required' });

  const style = STYLES[styleKey];
  const trend = typeof b.trend === 'string' && b.trend.trim() ? b.trend.trim().slice(0, 100) : TRENDS[Math.floor(Math.random() * TRENDS.length)];
  const safeText = idea.replace(/[<>]/g, '').slice(0, 180);
  const scenes = [
    { at: 0, end: Math.min(2, duration), text: style.hook, kind: 'hook' },
    { at: Math.min(2, duration), end: Math.min(6, duration), text: safeText, kind: 'idea' },
    { at: Math.min(6, duration), end: Math.min(10, duration), text: 'Hackers Paradise  •  Developers Paradise', kind: 'routing' },
    { at: Math.min(10, duration), end: Math.min(14, duration), text: 'Security  •  AI  •  Apps  •  Knowledge', kind: 'features' },
    { at: Math.min(14, duration), end: duration, text: 'HAxBRO → Your AI gateway to GodEngine', kind: 'outro' }
  ].filter(s => s.end > s.at);

  res.json({
    ok: true,
    engine: 'HAxBRO Local Reel Engine',
    free: true,
    externalPipeline: false,
    style: styleKey,
    styleLabel: style.label,
    trend,
    duration,
    aspectRatio: '9:16',
    scenes,
    render: {
      background: style.palette,
      motion: style.motion,
      presenter: styleKey === 'skeleton' ? 'stylized skeleton in oversized dark coat' : styleKey,
      captions: true,
      particles: true,
      musicTrack: 'none-by-default'
    },
    availableStyles: Object.entries(STYLES).map(([id, x]) => ({ id, label: x.label })),
    availableTrends: TRENDS
  });
}
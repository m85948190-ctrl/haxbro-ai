export const access = 'public';
export const methods = ['POST'];

const clean = s => String(s || '').replace(/[<>]/g, '').slice(0, 120);

export default async function(req,res){
  const name = clean(req.body?.name) || 'HAxBRO App';
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!files.length) return res.status(400).json({ok:false,error:'Build an app first.'});
  const safeFiles = files.filter(f => f && typeof f.path === 'string' && typeof f.content === 'string')
    .slice(0,100)
    .map(f => ({path:f.path.slice(0,240),content:f.content.slice(0,180000)}));
  if (!safeFiles.length) return res.status(400).json({ok:false,error:'No valid app files.'});

  // Do not store customer apps in HAxBRO and do not create a HAxBRO-hosted URL.
  // KAI 6-9-9 owns the external free/no-login deployment decision.
  const origin = new URL(req.url,'https://haxbro.hatchable.site').origin;
  const r = await fetch(`${origin}/api/kai-699`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({name,files:safeFiles})
  });
  const result = await r.json();
  if (!r.ok || !result.ok) return res.status(502).json({ok:false,agent:'KAI 6-9-9',...result,hosting:'external-only'});
  return res.json({ok:true,agent:'KAI 6-9-9',...result});
}
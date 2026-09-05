import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const clean=(s)=>String(s||'').replace(/[<>]/g,'').slice(0,120);

export default async function(req,res){
  const name=clean(req.body?.name)||'HAxBRO App';
  const files=Array.isArray(req.body?.files)?req.body.files:[];
  if(!files.length) return res.status(400).json({error:'Build an app first.'});
  const safeFiles=files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,40).map(f=>({path:f.path.slice(0,180),content:f.content.slice(0,100000)}));
  if(!safeFiles.length) return res.status(400).json({error:'No valid app files.'});
  // KAI 699 is the hosting decision layer. It chooses a free/public provider
  // instead of making App Maker depend directly on Cloudflare or another vendor.
  const r=await fetch(new URL('/api/kai-699',new URL(req.url,'https://haxbro.hatchable.site')).toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deploy',name,files:safeFiles})});
  const d=await r.json();
  return res.status(r.status).json(d);
}
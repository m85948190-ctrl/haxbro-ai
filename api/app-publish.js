import { db } from 'hatchable';

export const access = 'user';
export const methods = ['POST'];

const clean=(s)=>String(s||'').replace(/[<>]/g,'').slice(0,120);

export default async function(req,res){
  const name=clean(req.body?.name)||'HAxBRO App';
  const files=Array.isArray(req.body?.files)?req.body.files:[];
  if(!files.length) return res.status(400).json({error:'Build an app first.'});
  const safeFiles=files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,40).map(f=>({path:f.path.slice(0,180),content:f.content.slice(0,100000)}));
  if(!safeFiles.length) return res.status(400).json({error:'No valid app files.'});
  const {rows}=await db.query('INSERT INTO haxbro_generated_apps (name,files) VALUES ($1,$2) RETURNING id',[name,JSON.stringify(safeFiles)]);
  const id=rows[0].id;
  const hostOrigin=new URL(req.url,'https://haxbro.hatchable.site').origin;
  const r=await fetch(`${hostOrigin}/api/kai-699`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,files:safeFiles})});
  const result=await r.json();
  if(!r.ok || !result.ok) return res.status(502).json({ok:false,id,agent:'KAI 699',error:result.error||'KAI 699 could not find a working external free host.',hosting:'external'});
  return res.json({ok:true,agent:'KAI 699',id,...result});
}
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
  // KAI 699 policy: use HAxBRO's purpose-built free public host first.
  // This keeps App Maker independent from any single third-party vendor.
  const {rows}=await db.query('INSERT INTO haxbro_generated_apps (name,files) VALUES ($1,$2) RETURNING id',[name,JSON.stringify(safeFiles)]);
  const id=rows[0].id;
  const origin=new URL(req.url,'https://haxbro.hatchable.site').origin;
  return res.json({ok:true,agent:'KAI 699',id,url:`${origin}/apps/${id}`,hosting:'HAxBRO Public App Engine',provider:'HAxBRO',free:true,public:true,accountRequired:false});
}
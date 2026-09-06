import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET','POST'];

// KAI 69 now uses HAxBRO's own public App Engine instead of unreliable
// third-party "free host" discovery. That makes the deployment path owned,
// predictable, and compatible with the app builder already shipped in HAxBRO.
export default async function(req,res){
  if(req.method==='GET'){
    try{
      const {rows}=await db.query("SELECT to_regclass('public.haxbro_generated_apps') AS table_name");
      const ready=Boolean(rows?.[0]?.table_name);
      return res.json({
        ok:ready,
        agent:'KAI 69',
        policy:'HAxBRO-owned-public-engine',
        selected:'HAxBRO App Engine',
        providers:[{
          name:'HAxBRO App Engine',
          free:true,
          anonymous:true,
          deployable:ready,
          reason:ready?'Native HAxBRO public deployment is ready.':'Generated-app storage is not initialized yet.'
        }]
      });
    }catch(error){
      return res.status(503).json({ok:false,agent:'KAI 69',error:String(error?.message||error)});
    }
  }

  const files=Array.isArray(req.body?.files)?req.body.files:[];
  if(!files.length) return res.status(400).json({ok:false,agent:'KAI 69',error:'Build an app first, then send its files to KAI 69 for deployment.'});
  try{
    const name=String(req.body?.name||'HAxBRO App').replace(/[<>]/g,'').slice(0,120);
    const safeFiles=files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,40).map(f=>({path:String(f.path).replace(/^\/+/, '').slice(0,180),content:f.content.slice(0,100000)}));
    if(!safeFiles.length) return res.status(400).json({ok:false,agent:'KAI 69',error:'No valid app files supplied.'});
    const {rows}=await db.query('INSERT INTO haxbro_generated_apps (name,files) VALUES ($1,$2) RETURNING id',[name,JSON.stringify(safeFiles)]);
    const origin=new URL(req.url,'https://haxbro.hatchable.site').origin;
    return res.json({ok:true,agent:'KAI 69',hosting:'HAxBRO App Engine',provider:'HAxBRO',free:true,public:true,accountRequired:false,id:rows[0].id,url:`${origin}/apps/${rows[0].id}`});
  }catch(error){
    return res.status(502).json({ok:false,agent:'KAI 69',error:String(error?.message||error)});
  }
}
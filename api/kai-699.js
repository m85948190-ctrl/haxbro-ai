import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const clean=(s)=>String(s||'').replace(/[<>]/g,'').trim().slice(0,120);
const safePath=(p)=>String(p||'').replace(/^\/+/, '').slice(0,180);
const providers=[
  {name:'HAxBRO Public App Engine',type:'native',free:true,anonymous:true,deployable:true,reason:'Purpose-built public host inside HAxBRO; no customer hosting account required.'},
  {name:'Cloudflare Pages',type:'external',free:true,anonymous:false,deployable:false,reason:'Free tier exists, but deployment requires an authorized Cloudflare account/token.'},
  {name:'Vercel',type:'external',free:true,anonymous:false,deployable:false,reason:'Free tier exists, but deployment requires an authorized project/account token.'},
  {name:'Netlify',type:'external',free:true,anonymous:false,deployable:false,reason:'Free tier exists, but deployment requires an authorized account/token.'},
  {name:'Render Static Sites',type:'external',free:true,anonymous:false,deployable:false,reason:'Free static hosting exists, but deployment is account/project based.'}
];

async function probe(url){
  try{
    const r=await fetch(url,{method:'HEAD'});
    return {online:r.status>=200&&r.status<500,status:r.status};
  }catch(e){return {online:false,status:0};}
}

export default async function(req,res){
  const body=req.body||{};
  const action=body.action||'deploy';
  if(action==='discover'){
    const checks=await Promise.all([
      probe('https://haxbro.hatchable.site/'),
      probe('https://pages.cloudflare.com/'),
      probe('https://vercel.com/'),
      probe('https://www.netlify.com/'),
      probe('https://render.com/')
    ]);
    return res.json({ok:true,agent:'KAI 699',policy:'free-first',checkedAt:new Date().toISOString(),providers:providers.map((p,i)=>({...p,online:checks[i]?.online??false,status:checks[i]?.status??0})),selected:'HAxBRO Public App Engine'});
  }
  const name=clean(body.name)||'HAxBRO App';
  const files=Array.isArray(body.files)?body.files:[];
  const safeFiles=files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,40).map(f=>({path:safePath(f.path),content:f.content.slice(0,100000)}));
  if(!safeFiles.length) return res.status(400).json({ok:false,error:'Build an app first.'});
  const {rows}=await db.query('INSERT INTO haxbro_generated_apps (name,files) VALUES ($1,$2) RETURNING id',[name,JSON.stringify(safeFiles)]);
  const id=rows[0].id;
  const origin=new URL(req.url,'https://haxbro.hatchable.site').origin;
  const url=`${origin}/apps/${id}`;
  return res.json({ok:true,agent:'KAI 699',id,url,name,provider:'HAxBRO Public App Engine',free:true,public:true,accountRequired:false,decision:'Used the purpose-built HAxBRO public host because it is free, public, and does not require the customer to own a third-party hosting account.',fallbacks:providers.slice(1)});
}
export const access = 'public';
export const methods = ['GET','POST'];

const CANDIDATES = [
  {name:'ShipSite', url:'https://shipsite.co', free:true, anonymous:true, permanent:false, note:'Anonymous static deployments; public URL; free tier; temporary.'},
  {name:'ShipStatic', url:'https://shipstatic.com', free:true, anonymous:true, permanent:false, note:'Anonymous static deployments; public URL; free; temporary unless claimed.'},
  {name:'HTMLDrop', url:'https://www.htmldrop.in', free:true, anonymous:true, permanent:false, note:'Anonymous HTML hosting; free; temporary unless claimed.'},
  {name:'Cloudflare Drop', url:'https://www.cloudflare.com/drop/', free:true, anonymous:true, permanent:false, note:'Temporary public drop; not the default provider.'},
  {name:'Vercel', url:'https://vercel.com', free:true, anonymous:false, permanent:true, note:'Requires an authorized account/token.'},
  {name:'Netlify', url:'https://www.netlify.com', free:true, anonymous:false, permanent:true, note:'Requires an authorized account/token.'}
];

async function probe(url){
  try { const r=await fetch(url,{method:'HEAD',redirect:'follow'}); return {online:r.status<500,status:r.status}; }
  catch(e){ return {online:false,status:null}; }
}

function cleanPath(value){
  return String(value||'').split('/').filter(part=>part && part!=='.' && part!=='..').join('/').slice(0,180);
}

async function shipsite(files,name){
  const safe=files.slice(0,20).map(f=>({
    path:cleanPath(f.path),
    content:String(f.content||'').slice(0,200000),
    contentType:f.contentType || (String(f.path).endsWith('.css')?'text/css':String(f.path).endsWith('.js')?'application/javascript':'text/html')
  })).filter(f=>f.path && f.content.length);
  if(!safe.some(f=>f.path==='index.html')) throw new Error('Generated app must contain index.html.');
  const create=await fetch('https://shipsite.co/api/v1/publish',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({files:safe.map(f=>({path:f.path,size:new TextEncoder().encode(f.content).length,contentType:f.contentType})),viewer:{title:String(name||'HAxBRO App').slice(0,200),description:'Published by KAI 699'}})
  });
  const data=await create.json();
  if(!create.ok) throw new Error(data?.error||data?.message||'ShipSite create failed');
  for(const u of (data.upload?.uploads||[])){
    const f=safe.find(x=>x.path===u.path);
    if(!f) continue;
    const put=await fetch(u.url,{method:'PUT',headers:{...(u.headers||{}),'Content-Type':f.contentType},body:f.content});
    if(!put.ok) throw new Error(`ShipSite upload failed for ${u.path}: ${put.status}`);
  }
  const fin=await fetch(data.upload.finalizeUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({versionId:data.upload.versionId,claimToken:data.claimToken})});
  const done=await fin.json();
  if(!fin.ok) throw new Error(done?.error||done?.message||'ShipSite finalize failed');
  return {provider:'ShipSite',url:done.siteUrl||data.siteUrl,claimUrl:data.claimUrl||null,expiresAt:data.expiresAt||null,temporary:true};
}

export default async function(req,res){
  if(req.method==='GET'){
    const checked=await Promise.all(CANDIDATES.map(async p=>({...p,...await probe(p.url)})));
    return res.json({ok:true,agent:'KAI 699',policy:'external-free-first',selectedPolicy:'anonymous public deployment when available',providers:checked});
  }
  const files=Array.isArray(req.body?.files)?req.body.files:[];
  if(!files.length) return res.status(400).json({ok:false,error:'No app files supplied.'});
  try{
    const result=await shipsite(files,req.body?.name);
    return res.json({ok:true,agent:'KAI 699',policy:'external-free-first',hosting:result.provider,provider:result.provider,free:true,public:true,accountRequired:false,...result});
  }catch(error){
    return res.status(502).json({ok:false,agent:'KAI 699',error:String(error?.message||error),providersTried:['ShipSite'],fallbackAvailable:true});
  }
}
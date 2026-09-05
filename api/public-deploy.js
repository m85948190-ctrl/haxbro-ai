import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const API='https://api.cloudflare.com/client/v4';
function clean(s,n){return String(s||'').replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,n)}
function mime(path){const p=path.toLowerCase();if(p.endsWith('.html'))return'text/html';if(p.endsWith('.css'))return'text/css';if(p.endsWith('.js'))return'application/javascript';if(p.endsWith('.json'))return'application/json';if(p.endsWith('.svg'))return'image/svg+xml';if(p.endsWith('.png'))return'image/png';if(p.endsWith('.jpg')||p.endsWith('.jpeg'))return'image/jpeg';if(p.endsWith('.webp'))return'image/webp';return'application/octet-stream'}
function base64(text){const bytes=new TextEncoder().encode(text);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin)}
async function hash(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function cf(path,opts,token){const r=await fetch(API+path,{...opts,headers:{...(opts&&opts.headers||{}),authorization:'Bearer '+token,'content-type':opts&&opts.body?'application/json':'application/json'}});const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw new Error(j.errors?.[0]?.message||'Cloudflare API request failed');return j}
export default async function(req,res){
 const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
 if(!token||!account)return res.status(503).json({error:'Public hosting is not configured yet. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in HAxBRO secrets.'});
 const name=clean(req.body?.name||'haxbro-app',45)||'haxbro-app';
 const files=Array.isArray(req.body?.files)?req.body.files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,100):[];
 if(!files.length)return res.status(400).json({error:'Build an app first.'});
 if(!files.some(f=>f.path==='index.html'))return res.status(400).json({error:'Generated app must contain index.html.'});
 const project='haxbro-'+clean(name.toLowerCase(),32)+'-'+Math.random().toString(36).slice(2,7);
 try{
   const created=await cf(`/accounts/${account}/pages/projects`,{method:'POST',body:JSON.stringify({name:project,production_branch:'main'})},token);
   const projectName=created.result?.name||project;
   const tokenResp=await cf(`/accounts/${account}/pages/projects/${encodeURIComponent(projectName)}/upload-token`,{method:'GET'},token);
   const uploadJwt=tokenResp.result?.jwt;if(!uploadJwt)throw new Error('Cloudflare did not return an upload token.');
   const manifest={};const assets=[];
   for(const f of files){const path='/'+f.path.replace(/^\/+/, '').replace(/\.\.\//g,'');const h=(await hash(f.content)).slice(0,32);manifest[path]=h;assets.push({base64:true,key:h,metadata:{contentType:mime(path)},value:base64(f.content)})}
   const upload=await fetch(API+'/pages/assets/upload?base64=true',{method:'POST',headers:{authorization:'Bearer '+uploadJwt,'content-type':'application/json'},body:JSON.stringify(assets)});const uploadJson=await upload.json().catch(()=>({}));if(!upload.ok||uploadJson.success===false)throw new Error(uploadJson.errors?.[0]?.message||'Cloudflare asset upload failed');
   const form=new FormData();form.append('branch','main');form.append('commit_dirty','false');form.append('commit_message','HAxBRO App Maker public deploy');form.append('manifest',JSON.stringify(manifest));
   const deploy=await fetch(`${API}/accounts/${account}/pages/projects/${encodeURIComponent(projectName)}/deployments`,{method:'POST',headers:{authorization:'Bearer '+token},body:form});const dj=await deploy.json().catch(()=>({}));if(!deploy.ok||dj.success===false)throw new Error(dj.errors?.[0]?.message||'Cloudflare deployment failed');
   const url=dj.result?.url||dj.result?.aliases?.[0]||`https://${projectName}.pages.dev`;
   return res.json({ok:true,url,hosting:'Cloudflare Pages',project:projectName,deploymentId:dj.result?.id||null});
 }catch(e){console.error('Public deploy error',e);return res.status(502).json({error:String(e?.message||e)});}
}
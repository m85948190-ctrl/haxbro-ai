export const access = "admin";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INGEST_KEY = process.env.HAXBRO_INGEST_KEY;

function cleanText(html){
  return String(html||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ')
    .trim();
}
function clean(value,max=5000){return typeof value==='string'?value.trim().slice(0,max):'';}
function normalizedUrl(value){try{const u=new URL(value);u.hash='';u.hostname=u.hostname.toLowerCase();if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.toString();}catch{return '';}}
function hashText(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(16).padStart(8,'0');}

export default async function(req,res){
  const supplied=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(INGEST_KEY && (!supplied || supplied!==INGEST_KEY)) return res.status(401).json({error:'Unauthorized'});
  const url=normalizedUrl(req.body?.url);
  if(!url)return res.status(400).json({error:'Valid http(s) URL required'});
  if(!SUPABASE_KEY)return res.status(503).json({error:'Supabase service key not configured'});
  try{
    const pageResp=await fetch(url,{redirect:'follow'});
    if(!pageResp.ok)return res.status(422).json({error:'Source fetch failed',status:pageResp.status});
    const html=await pageResp.text();
    const text=cleanText(html);
    if(!text)return res.status(422).json({error:'No readable content found'});
    const title=clean(req.body?.title,300)||text.slice(0,160);
    const domain=new URL(url).hostname;
    const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`};
    const srcLookup=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_sources?select=id,url&url=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const srcData=await srcLookup.json();
    if(!srcLookup.ok)return res.status(srcLookup.status).json({error:'Supabase source lookup failed',detail:srcData});
    let sourceId=srcData?.[0]?.id;
    if(!sourceId){
      const sourceResp=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_sources`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({url,title,domain,status:'indexed',fetched_at:new Date().toISOString(),metadata:{ingestion:'clean-text'}})});
      const sourceData=await sourceResp.json();
      if(!sourceResp.ok)return res.status(sourceResp.status).json({error:'Supabase source write failed',detail:sourceData});
      sourceId=sourceData?.[0]?.id;
    }
    if(!sourceId)return res.status(502).json({error:'Supabase did not return source id'});
    const pageLookup=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages?select=id,url&url=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const pageData=await pageLookup.json();
    if(!pageLookup.ok)return res.status(pageLookup.status).json({error:'Supabase page lookup failed',detail:pageData});
    let pageId=pageData?.[0]?.id;
    const contentHash=hashText(text);
    if(pageId){
      const up=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages?id=eq.${encodeURIComponent(pageId)}`,{method:'PATCH',headers,body:JSON.stringify({source_id:sourceId,title,content:text,content_hash:contentHash,fetched_at:new Date().toISOString(),metadata:{ingestion:'clean-text'}})});
      if(!up.ok)return res.status(502).json({error:'Supabase page update failed'});
      await fetch(`${SUPABASE_URL}/rest/v1/haxbro_chunks?page_id=eq.${encodeURIComponent(pageId)}`,{method:'DELETE',headers});
    }else{
      const pageResp2=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({source_id:sourceId,url,title,content:text,content_hash:contentHash,fetched_at:new Date().toISOString(),metadata:{ingestion:'clean-text'}})});
      const pageCreated=await pageResp2.json();
      if(!pageResp2.ok)return res.status(pageResp2.status).json({error:'Supabase page write failed',detail:pageCreated});
      pageId=pageCreated?.[0]?.id;
    }
    if(!pageId)return res.status(502).json({error:'Supabase did not return page id'});
    const size=4500;let chunks=0;
    for(let i=0;i<text.length;i+=size){
      const chunk=text.slice(i,i+size);
      const r=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_chunks`,{method:'POST',headers,body:JSON.stringify({page_id:pageId,chunk_index:Math.floor(i/size),content:chunk,metadata:{source_url:url,content_type:'text/plain'}})});
      if(!r.ok)return res.status(502).json({error:'Supabase chunk write failed',chunk_index:Math.floor(i/size)});
      chunks++;
    }
    return res.json({ok:true,warehouse:'supabase',source_id:sourceId,page_id:pageId,chunks,content_type:'text/plain'});
  }catch(e){console.error(e);return res.status(502).json({error:'Supabase ingestion failed'});}
}
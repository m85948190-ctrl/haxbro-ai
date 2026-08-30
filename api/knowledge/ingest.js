export const access = "admin";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function(req,res){
  const url=String(req.body?.url||'').trim();
  if(!/^https?:\/\//i.test(url)) return res.status(400).json({error:'Valid http(s) URL required'});
  if(!SUPABASE_KEY) return res.status(503).json({error:'Supabase service key not configured'});
  try {
    const page=await fetch(url).then(r=>r.text());
    const text=String(page||'').replace(/<script[\\s\\S]*?<\/script>/gi,' ').replace(/<style[\\s\\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim();
    if(!text)return res.status(422).json({error:'No readable content found'});
    const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`,Prefer:"resolution=merge-duplicates,return=representation"};
    const sourceResp=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_knowledge_sources?on_conflict=url`,{method:"POST",headers,body:JSON.stringify({url,title:text.slice(0,160),status:"indexed",fetched_at:new Date().toISOString()})});
    const sourceData=await sourceResp.json();
    if(!sourceResp.ok) return res.status(sourceResp.status).json({error:'Supabase source write failed',detail:sourceData});
    const source=Array.isArray(sourceData)?sourceData[0]:sourceData;
    const sourceId=source?.id;
    if(!sourceId)return res.status(502).json({error:'Supabase did not return source id'});
    const size=5000; let chunks=0;
    for(let i=0;i<text.length;i+=size){
      const content=text.slice(i,i+size);
      const r=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_knowledge_chunks?on_conflict=source_id,chunk_index`,{method:"POST",headers,body:JSON.stringify({source_id:sourceId,chunk_index:Math.floor(i/size),content})});
      if(!r.ok)return res.status(502).json({error:'Supabase chunk write failed',chunk:chunks});
      chunks++;
    }
    return res.json({ok:true,warehouse:"supabase",source,chunks});
  } catch(e) { console.error(e); return res.status(502).json({error:'Supabase ingestion failed'}); }
}
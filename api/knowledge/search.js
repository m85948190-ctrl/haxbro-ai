export const access = "public";
export const methods = ["GET"];
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: SUPABASE_KEY || "", authorization: `Bearer ${SUPABASE_KEY || ""}` };
export default async function(req,res){
  try {
    const q = String(req.query?.q||'').trim();
    if(!q) return res.json({results:[]});
    if(!SUPABASE_KEY) return res.status(503).json({results:[],error:'Supabase knowledge service not configured'});
    const term = encodeURIComponent(`*${q}*`);
    const url = `${SUPABASE_URL}/rest/v1/haxbro_knowledge_chunks?select=chunk_index,content,source_id,haxbro_knowledge_sources(url,title,fetched_at)&or=(content.ilike.${term},haxbro_knowledge_sources.title.ilike.${term})&limit=20`;
    const r = await fetch(url,{headers:hdrs});
    const data = await r.json();
    if(!r.ok) return res.status(r.status).json({results:[],error:'Supabase knowledge search failed',detail:data});
    const results=(Array.isArray(data)?data:[]).map(x=>({url:x.haxbro_knowledge_sources?.url||'',title:x.haxbro_knowledge_sources?.title||'',content:x.content||'',chunk_index:x.chunk_index}));
    return res.json({results,store:'supabase'});
  } catch(e){ console.error(e); return res.status(500).json({results:[],error:'Knowledge search unavailable'}); }
}
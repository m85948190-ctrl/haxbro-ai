import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function(req,res){
  const body=req.body||{};
  const action=String(body.action||"");
  if(!SUPABASE_KEY) return res.status(503).json({error:"Supabase service key not configured"});
  const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`};
  let table="", payload={};
  if(action==="upsert_source"){ table="haxbro_sources"; payload={url:body.url,title:body.title||null,domain:body.domain||null,status:body.status||"queued",metadata:body.metadata||{}}; }
  else if(action==="upsert_page"){ table="haxbro_pages"; payload={source_id:body.source_id,url:body.url,title:body.title||null,content:body.content||null,content_hash:body.content_hash||null,metadata:body.metadata||{}}; }
  else if(action==="queue_job"){ table="haxbro_research_jobs"; payload={target:body.target,category:body.category||"general",priority:Number(body.priority||0),status:"queued"}; }
  else return res.status(400).json({error:"unsupported action"});
  const conflict=action==="upsert_source"||action==="upsert_page"?"?on_conflict=url":"";
  const prefer=action==="queue_job"?"return=representation":"resolution=merge-duplicates,return=representation";
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+table+conflict,{method:"POST",headers:{...headers,prefer},body:JSON.stringify(payload)});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text};}
  return res.status(r.status).json({ok:r.ok,action,result:data});
}
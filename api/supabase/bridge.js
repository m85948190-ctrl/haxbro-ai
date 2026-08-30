import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const SUPABASE_URL = "https://xorgweiijpupsxugteuh.supabase.co";
const BRIDGE_SECRET = "haxbro-bridge-7f4a6d2b9e1c5a8f";

export default async function(req,res){
  const body=req.body||{};
  const action=String(body.action||"");
  if(action!=="upsert_source" && action!=="upsert_page" && action!=="queue_job") return res.status(400).json({error:"unsupported action"});
  const r=await fetch(SUPABASE_URL+"/functions/v1/haxbro-knowledge-bridge",{method:"POST",headers:{"content-type":"application/json","x-haxbro-bridge-secret":BRIDGE_SECRET},body:JSON.stringify(body)});
  const text=await r.text();
  let data; try{data=JSON.parse(text)}catch{data={raw:text};}
  return res.status(r.status).json(data);
}
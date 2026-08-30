import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET"];
export default async function(req,res){const q=String(req.query?.q||'').trim();if(!q)return res.json({results:[]});const {rows}=await db.query('SELECT s.url,s.title,c.content,c.chunk_index FROM haxbro_knowledge_chunks c JOIN haxbro_knowledge_sources s ON s.id=c.source_id WHERE c.content ILIKE $1 ORDER BY s.fetched_at DESC LIMIT 20',['%'+q+'%']);res.json({results:rows});}
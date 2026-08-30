import { db } from "hatchable";
export const access = "public";
export const methods = ["GET"];
export default async function(req,res){try{const s=await db.query('SELECT (SELECT count(*) FROM haxbro_knowledge_sources) AS sources,(SELECT count(*) FROM haxbro_knowledge_chunks) AS chunks,(SELECT count(*) FROM haxbro_knowledge_workers) AS workers');res.json(s.rows[0]);}catch(e){console.error(e);res.status(500).json({sources:0,chunks:0,workers:0,error:'Knowledge status unavailable'});}}
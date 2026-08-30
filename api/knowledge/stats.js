import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET"];
export default async function(req,res){const s=await db.query('SELECT (SELECT count(*) FROM haxbro_knowledge_sources) AS sources,(SELECT count(*) FROM haxbro_knowledge_chunks) AS chunks,(SELECT count(*) FROM haxbro_knowledge_workers) AS workers');res.json(s.rows[0]);}
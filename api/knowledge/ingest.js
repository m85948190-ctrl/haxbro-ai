import { db, browser } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res){
 const url=String(req.body?.url||'').trim();
 if(!url.startsWith('http://')&&!url.startsWith('https://')) return res.status(400).json({error:'Valid http(s) URL required'});
 const page=await browser.html(url);
 const text=String(page||'').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim();
 if(!text)return res.status(422).json({error:'No readable content found'});
 const source=await db.query('INSERT INTO haxbro_knowledge_sources (url,title,status,fetched_at) VALUES ($1,$2,$3,now()) ON CONFLICT (url) DO UPDATE SET status=$3,fetched_at=now() RETURNING id,url,title',[url,text.slice(0,160),'indexed']);
 const sourceId=source.rows[0].id;const size=5000;
 for(let i=0;i<text.length;i+=size){const content=text.slice(i,i+size);await db.query('INSERT INTO haxbro_knowledge_chunks (source_id,chunk_index,content) VALUES ($1,$2,$3) ON CONFLICT (source_id,chunk_index) DO UPDATE SET content=$3',[sourceId,Math.floor(i/size),content]);}
 res.json({ok:true,source:source.rows[0],chunks:Math.ceil(text.length/size)});
}
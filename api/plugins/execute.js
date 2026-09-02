import { ai } from "hatchable";

export const access = "public";

const catalog = {
  "web-research": {name:"Web Research", mode:"search"},
  "web-page-reader": {name:"Web Page Reader", mode:"page"},
  "github": {name:"GitHub", mode:"github"},
  "wikipedia": {name:"Wikipedia", mode:"wikipedia"},
  "arxiv": {name:"arXiv Research", mode:"arxiv"},
  "weather": {name:"Open-Meteo Weather", mode:"weather"},
  "huggingface": {name:"Hugging Face", mode:"huggingface"},
  "document-tools": {name:"Document Studio", mode:"ai"},
  "pdf-tools": {name:"PDF Studio", mode:"ai"},
  "data-analyzer": {name:"Data Analyzer", mode:"ai"},
  "code-builder": {name:"Code Builder", mode:"ai"},
  "app-maker": {name:"App Maker", mode:"ai"},
  "website-builder": {name:"Website Builder", mode:"ai"},
  "game-builder": {name:"Game Builder", mode:"ai"},
  "image-studio": {name:"Image Studio", mode:"ai"},
  "video-studio": {name:"Video Studio", mode:"ai"},
  "voice-studio": {name:"Voice Studio", mode:"ai"},
  "music-studio": {name:"Music Studio", mode:"ai"},
  "presentation-studio": {name:"Presentation Studio", mode:"ai"},
  "brand-studio": {name:"Brand Studio", mode:"ai"},
  "automation-builder": {name:"Automation Builder", mode:"ai"},
  "agent-builder": {name:"Agent Builder", mode:"ai"},
  "cyber-lab": {name:"Cyber Lab", mode:"ai"},
  "json-tools": {name:"JSON Tools", mode:"ai"},
  "text-tools": {name:"Text Tools", mode:"ai"},
  "calculator": {name:"Calculator", mode:"ai"},
  "project-helper": {name:"Project Maker Helper", mode:"ai"},
  "knowledge-bridge": {name:"Knowledge Bridge", mode:"ai"}
};

function q(v){ return encodeURIComponent(String(v||"")); }
function safeJson(text){ try{return JSON.parse(text)}catch{return null} }

async function external(pluginId,prompt){
  if(pluginId==="wikipedia"){
    const title=prompt.replace(/^.*?(?:about|on|for)\s+/i,"").trim()||prompt.trim();
    const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q(title)}`);
    if(!r.ok) throw new Error(`Wikipedia returned ${r.status}`);
    const d=await r.json();
    return {source:"Wikipedia",title:d.title,summary:d.extract,url:d.content_urls?.desktop?.page||null};
  }
  if(pluginId==="github"){
    const term=prompt.replace(/^.*?(?:search|find|look up)\s+/i,"").trim()||prompt.trim();
    const r=await fetch(`https://api.github.com/search/repositories?q=${q(term)}&per_page=8`,{headers:{Accept:"application/vnd.github+json","User-Agent":"HAxBRO"}});
    if(!r.ok) throw new Error(`GitHub returned ${r.status}`);
    const d=await r.json();
    return {source:"GitHub",count:d.total_count,items:(d.items||[]).map(x=>({name:x.full_name,description:x.description,stars:x.stargazers_count,language:x.language,url:x.html_url}))};
  }
  if(pluginId==="arxiv"){
    const term=prompt.replace(/^.*?(?:research|search|find)\s+/i,"").trim()||prompt.trim();
    const r=await fetch(`https://export.arxiv.org/api/query?search_query=all:${q(term)}&start=0&max_results=8`);
    if(!r.ok) throw new Error(`arXiv returned ${r.status}`);
    const xml=await r.text();
    const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>m[1]).map(e=>({
      title:(e.match(/<title>([\s\S]*?)<\/title>/)||[])[1]?.replace(/\s+/g," ").trim(),
      summary:(e.match(/<summary>([\s\S]*?)<\/summary>/)||[])[1]?.replace(/\s+/g," ").trim(),
      url:(e.match(/<id>(.*?)<\/id>/)||[])[1]?.trim()
    }));
    return {source:"arXiv",query:term,items:entries};
  }
  if(pluginId==="weather"){
    const city=prompt.replace(/^.*?(?:weather|forecast)\s+(?:in|for)\s+/i,"").trim()||prompt.trim();
    const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q(city)}&count=1&language=en&format=json`);
    if(!geo.ok) throw new Error(`Open-Meteo geocoding returned ${geo.status}`);
    const g=await geo.json(); const p=g.results?.[0]; if(!p) throw new Error("Location not found");
    const w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
    if(!w.ok) throw new Error(`Open-Meteo returned ${w.status}`);
    return {source:"Open-Meteo",location:`${p.name}, ${p.country}`,current:await w.json()};
  }
  if(pluginId==="web-page-reader"){
    const url=(prompt.match(/https?:\/\/[^\s]+/)||[])[0];
    if(!url) throw new Error("Give me a public http(s) URL to read.");
    const r=await fetch(url); if(!r.ok) throw new Error(`Page returned ${r.status}`);
    const html=await r.text();
    const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    return {source:"Direct web fetch",url,content:text.slice(0,30000)};
  }
  if(pluginId==="web-research"){
    const r=await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q(prompt)}&format=json&origin=*`);
    if(!r.ok) throw new Error(`Public web search returned ${r.status}`);
    const d=await r.json();
    return {source:"Wikipedia public search",query:prompt,items:(d.query?.search||[]).slice(0,8).map(x=>({title:x.title,snippet:x.snippet.replace(/<[^>]+>/g,""),url:`https://en.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g,"_"))}`}))};
  }
  if(pluginId==="huggingface"){
    const token=process.env.HF_TOKEN;
    if(!token) throw new Error("Hugging Face plugin needs the HAXBRO HF_TOKEN secret. The plugin is connected but no token is configured.");
    const model=(prompt.match(/model\s*[:=]\s*([\w./-]+)/i)||[])[1]||"google/gemma-3-270m-it";
    const input=prompt.replace(/model\s*[:=]\s*[\w./-]+/i,"").trim();
    const r=await fetch(`https://router.huggingface.co/hf-inference/models/${model}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({inputs:input})});
    const raw=await r.text(); if(!r.ok) throw new Error(`Hugging Face returned ${r.status}: ${raw.slice(0,500)}`);
    return {source:"Hugging Face",model,result:safeJson(raw)||raw};
  }
  return null;
}

export default async function(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {pluginId,prompt,context=""}=req.body||{};
  if(!pluginId||!catalog[pluginId]) return res.status(400).json({error:"Plugin is not enabled"});
  if(!prompt||typeof prompt!=="string") return res.status(400).json({error:"Prompt is required"});
  try{
    const real=await external(pluginId,prompt);
    if(real) return res.json({ok:true,pluginId,mode:"external",response:real});
    const p=catalog[pluginId];
    const system=`You are the HAxBRO ${p.name} plugin. Help the user with this capability. Do not claim an external generation, deployment, account action, or API call happened unless this plugin actually performed it. Return practical structured results.`;
    const out=await ai.generateText({model:"gemini-2.5-flash",system,prompt:context?`Context:\n${context}\n\nRequest:\n${prompt}`:prompt,maxSteps:4,purpose:"haxbro-plugin"});
    res.json({ok:true,pluginId,mode:"haxbro-ai",response:out?.text||out});
  }catch(e){res.status(500).json({error:e?.message||"Plugin execution failed"});}
}
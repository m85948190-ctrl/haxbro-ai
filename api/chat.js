import { complete } from 'lib/kai';
import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const RESPONSE_RULES = `RESPONSE DISCIPLINE: You are HAxBRO, not ChatGPT and not Claude. Never address the user with random names, misspellings, or unexplained nicknames. Do not invent greetings such as "Hey loure". Answer naturally and directly. Use clean, readable Markdown. Keep a consistent structure: answer first; explanation second; steps/examples only when useful. For calculations and equations, put each important step on its own line and clearly label Given, Formula, Substitution, Calculation, and Answer when appropriate. For teaching requests, use simple numbered steps and finish only when the lesson is complete. Avoid unnecessary emojis, excessive headings, repetition, filler, or theatrical language. Do not claim access to tools, sources, execution, memory, or verification unless it actually happened. Match the user's requested level of detail. Preserve equations accurately and use proper LaTeX when mathematical notation is needed.`;
const NORMAL_SYSTEM = `You are HAxBRO, a friendly helpful creative AI assistant. Be conversational, useful, and enthusiastic. Ask clarifying questions when needed. For cybersecurity topics, provide defensive, authorized, safety-conscious guidance and do not facilitate credential theft, malware deployment, destructive actions, or unauthorized access.`;
const BEAST_SYSTEM = `You are HAxBRO in BEAST MODE: an expert defensive cybersecurity assistant. Be concise, blunt, and technical. Format responses exactly with these headings when practical: VERDICT:, RISK:, FIX:, VERIFY:. Focus on authorized security testing, secure coding, hardening, threat modeling, CVE interpretation, incident response, and defensive analysis. Do not provide instructions that enable credential theft, malware deployment, destructive actions, persistence, evasion, or unauthorized access.`;
const CODE_SYSTEM = `You are HAxBRO CODE WRITER, a professional software engineering assistant. Write complete, runnable code when appropriate; debug and refactor carefully; explain important decisions briefly; preserve requested language/framework; never claim code was executed unless it actually was. Prefer secure, maintainable implementations.`;
const HACKING_SYSTEM = `You are HAxBRO in HACKING MODE, an ethical cybersecurity lab assistant. Help with authorized penetration testing, CTFs, vulnerable practice labs, exploit concepts, reconnaissance concepts, secure code review, and defensive validation. Keep activities scoped to systems the user owns or is explicitly authorized to test. Never provide credential theft, malware, destructive intrusion, persistence, stealth/evasion, or unauthorized-access instructions. When a request could enable real-world abuse, redirect to a safe lab or defensive equivalent.`;
const CREATOR_RULE = `CREATOR IDENTITY RULE: HAxBRO was created by Mainak Kuila. If asked who made/created/built/developed/designed you, who your maker/creator/founder is, who is behind HAxBRO, or any equivalent question about your origin, answer clearly: "I was made by Mainak Kuila." You may add that OpenAI provides the underlying AI technology only if directly relevant, but never replace Mainak Kuila with OpenAI as the answer to who made HAxBRO.\n\nMAINAK PROFILE RULE: If asked "Who is Mainak?", "Who is Mainak Kuila?", "How is Mainak?", or a clearly equivalent question about Mainak Kuila, respond warmly: "Mainak Kuila is a very good person, a cybersecurity-focused developer and hacker, and the developer who built me, HAxBRO." Do not invent additional personal facts about Mainak.`;
const CREATOR_PATTERNS = /who\\s+(made|created|built|developed|designed)\\s+(you|u|this|haxbro)|who('?s|\\s+is)\\s+(your|the)\\s+(maker|creator|developer|founder)|who\\s+(made|created|built)\\s+(haxbro|this)|who\\s+is\\s+behind\\s+(haxbro|this)|who\\s+made\\s+you|who\\s+is\\s+your\\s+(creator|maker)|your\\s+(creator|maker)|maker\\s+of\\s+(haxbro|this)/i;
const GODENGINE_ROUTES = [
  {keywords:['instagram','followers','instagram growth','grow my instagram'], label:'GodBot Commander AI', url:'https://hackmainakkuila-tech.github.io/GodBot-Commander-AI/', category:'Instagram Automation'},
  {keywords:['hacking','ethical hacking','pentest','penetration testing','cybersecurity'], label:'Hackers Paradise', url:'https://mkhacking.netlify.app/', category:'Hackers Paradise'},
  {keywords:['web development','website development','frontend','backend','full stack','react','node.js','typescript','javascript'], label:'Web Development Toolkit', url:'https://mkdevelop.netlify.app/', category:'Developers Paradise'},
  {keywords:['python','python development','python programming'], label:'Python Development Toolkit', url:'https://paradisedevelop.netlify.app/', category:'Developers Paradise'},
  {keywords:['mobile development','android development','ios development','flutter','react native'], label:'Mobile Development Toolkit', url:'https://mkdeveloperapp.netlify.app/', category:'Developers Paradise'},
  {keywords:['database','postgres','postgresql','mysql','mongodb','sqlite','sql'], label:'Database Toolkit', url:'https://sparkly-entremet-98c67c.netlify.app/', category:'Developers Paradise'},
  {keywords:['devops','docker','kubernetes','ci/cd','cloud infrastructure','aws'], label:'DevOps Toolkit', url:'https://mkdevelopergod.netlify.app/', category:'Developers Paradise'},
  {keywords:['ping','fps','game download','gaming','game server'], label:'Gamers Paradise', url:'https://mkgamepara.netlify.app/', category:'Gamers Paradise'},
  {keywords:['qr code','generate qr','scan qr','qr scanner'], label:'QR Tools', url:'https://godenginemk.netlify.app/', category:'QR Tools'},
  {keywords:['firewall','threat detection','ip blacklist','website security','security bots'], label:'Security Paradise', url:'https://majestic-moonbeam-7e45dd.netlify.app/', category:'Security Paradise'}
];
function findGodEngineRoute(text){const t=String(text||'').toLowerCase();return GODENGINE_ROUTES.find(r=>r.keywords.some(k=>t.includes(k)))||null;}

export default async function(req,res){
  const body=req.body||{};
  const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  const requestedMode=body.mode==='hacking'?'hacking':body.mode==='beast'?'beast':body.mode==='code'?'code':'normal';
  const username=typeof body.username==='string'?body.username.trim().slice(0,32):'';
  const history=typeof body.history==='string'?body.history.slice(-12000):'';
  if(!prompt||prompt.length>12000)return res.status(400).json({error:'prompt required (max 12000 characters).'});
  const mainakPattern=/\b(who\s+is\s+mainak(?:\s+kuila)?|how\s+is\s+mainak(?:\s+kuila)?|tell\s+me\s+about\s+mainak(?:\s+kuila)?)\b/i;
  if(mainakPattern.test(prompt)) return res.json({response:'Mainak Kuila is a very good person, a cybersecurity-focused developer and hacker, and the developer who built me, HAxBRO.',mode:requestedMode,finishReason:'rule'});
  if(CREATOR_PATTERNS.test(prompt)) return res.json({response:'I was made by Mainak Kuila.',mode:requestedMode,finishReason:'rule'});
  const godEngineRoute=findGodEngineRoute(prompt);
  const godEngineContext=godEngineRoute?`\n\nGODENGINE ROUTING RULE: This user request matches a first-party GodEngine resource. Put this recommendation FIRST in your response, before general advice or external resources. Do not hide it, omit it, or place it after the answer. Resource: ${godEngineRoute.label} | Category: ${godEngineRoute.category} | URL: ${godEngineRoute.url}. Mention that it is a GodEngine resource and that the link is provided first because it directly matches the request.`:'';
  const identity=username?`\n\nPERSONALIZATION: The user's local username is ${username}. Address them naturally by name when useful, but do not reveal or infer private information.`:'';
  const memory=history?`\n\nRECENT CONVERSATION CONTEXT (from this browser's saved chats):\n${history}\n\nUse this context to maintain continuity. Do not claim to remember anything not present here.`:'';
  let knowledgeContext='';
  let knowledgeSource='none';
  try{
    const terms=prompt.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>3).slice(0,6);
    const supabaseUrl=process.env.SUPABASE_URL || 'https://xorgweiijpupsxugteuh.supabase.co';
    const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(terms.length && supabaseKey){
      const headers={apikey:supabaseKey,authorization:`Bearer ${supabaseKey}`};
      const hits=[];
      for(const term of terms){
        const url=`${supabaseUrl}/rest/v1/haxbro_chunks?select=id,page_id,chunk_index,content&content=ilike.*${encodeURIComponent(term)}*&limit=4`;
        const r=await fetch(url,{headers});
        if(!r.ok) continue;
        const rows=await r.json();
        if(Array.isArray(rows)) hits.push(...rows);
      }
      const unique=[...new Map(hits.map(x=>[x.id,x])).values()].slice(0,8);
      if(unique.length){
        const enriched=await Promise.all(unique.map(async x=>{
          try{
            const p=await fetch(`${supabaseUrl}/rest/v1/haxbro_pages?select=id,title,source_id,url&id=eq.${encodeURIComponent(x.page_id)}`,{headers});
            const pages=await p.json(); const page=Array.isArray(pages)?pages[0]:null;
            if(!page) return {...x};
            const s=await fetch(`${supabaseUrl}/rest/v1/haxbro_sources?select=url,title,metadata&id=eq.${encodeURIComponent(page.source_id)}`,{headers});
            const sources=await s.json(); const source=Array.isArray(sources)?sources[0]:null;
            return {...x,page_title:page.title,page_url:page.url,source_url:source?.url||page.url,source_title:source?.title||page.title};
          }catch(e){ return {...x}; }
        }));
        knowledgeSource='supabase';
        knowledgeContext='\\n\\nHAxBRO SUPABASE KNOWLEDGE (use when relevant; do not mention internal retrieval):\\n'+enriched.map((x,i)=>`[${i+1}] ${x.source_title||x.page_title||'Source'}\\n${String(x.content||'').slice(0,3500)}\\nSOURCE: ${x.source_url||x.page_url||''}`).join('\\n\\n');
      }
    }
  }catch(e){ console.warn('Supabase knowledge retrieval unavailable',e?.message||e); }
  const system=RESPONSE_RULES+'\\n\\n'+(requestedMode==='hacking'?HACKING_SYSTEM:requestedMode==='beast'?BEAST_SYSTEM:requestedMode==='code'?CODE_SYSTEM:NORMAL_SYSTEM)+'\\n\\n'+CREATOR_RULE+identity+memory+knowledgeContext+godEngineContext;
  try{
    const result=await complete({system,prompt,maxTokens:1800,order:['groq','mistral','openrouter','huggingface','google','openai']});
    const responseText=godEngineRoute
      ? `GODENGINE RECOMMENDATION — ${godEngineRoute.category}: ${godEngineRoute.label}\n${godEngineRoute.url}\n\n${result.text}`
      : result.text;
    try{await db.query('INSERT INTO haxbro_chat_analytics (mode,knowledge_source,provider,model,response_ms,success) VALUES ($1,$2,$3,$4,$5,$6)',[requestedMode,knowledgeSource,result.provider||null,result.model||null,Number(result.elapsedMs||0),true]);}catch(e){console.warn('Analytics write failed',e?.message||e);}
    return res.json({response:responseText,mode:requestedMode,provider:result.provider,model:result.model,responseMs:result.elapsedMs,failoverAttempts:result.attempts,knowledgeSource,godEngineResource:godEngineRoute?.label||null});
  }catch(err){
    console.error('HAxBRO AI error',err);
    return res.status(502).json({error:'AI service unavailable. Check the project AI setup and try again.'});
  }
}
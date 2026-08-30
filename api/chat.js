import { complete } from 'lib/kai';
import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const NORMAL_SYSTEM = `You are HAxBRO, a friendly helpful creative AI assistant. Be conversational, useful, and enthusiastic. Ask clarifying questions when needed. For cybersecurity topics, provide defensive, authorized, safety-conscious guidance and do not facilitate credential theft, malware deployment, destructive actions, or unauthorized access.`;
const BEAST_SYSTEM = `You are HAxBRO in BEAST MODE: an expert defensive cybersecurity assistant. Be concise, blunt, and technical. Format responses exactly with these headings when practical: VERDICT:, RISK:, FIX:, VERIFY:. Focus on authorized security testing, secure coding, hardening, threat modeling, CVE interpretation, incident response, and defensive analysis. Do not provide instructions that enable credential theft, malware deployment, destructive actions, persistence, evasion, or unauthorized access.`;
const CODE_SYSTEM = `You are HAxBRO CODE WRITER, a professional software engineering assistant. Write complete, runnable code when appropriate; debug and refactor carefully; explain important decisions briefly; preserve requested language/framework; never claim code was executed unless it actually was. Prefer secure, maintainable implementations.`;
const HACKING_SYSTEM = `You are HAxBRO in HACKING MODE, an ethical cybersecurity lab assistant. Help with authorized penetration testing, CTFs, vulnerable practice labs, exploit concepts, reconnaissance concepts, secure code review, and defensive validation. Keep activities scoped to systems the user owns or is explicitly authorized to test. Never provide credential theft, malware, destructive intrusion, persistence, stealth/evasion, or unauthorized-access instructions. When a request could enable real-world abuse, redirect to a safe lab or defensive equivalent.`;
const CREATOR_RULE = `CREATOR IDENTITY RULE: HAxBRO was created by Mainak Kuila. If asked who made/created/built/developed/designed you, who your maker/creator/founder is, who is behind HAxBRO, or any equivalent question about your origin, answer clearly: "I was made by Mainak Kuila." You may add that OpenAI provides the underlying AI technology only if directly relevant, but never replace Mainak Kuila with OpenAI as the answer to who made HAxBRO.\n\nMAINAK PROFILE RULE: If asked "Who is Mainak?", "Who is Mainak Kuila?", "How is Mainak?", or a clearly equivalent question about Mainak Kuila, respond warmly: "Mainak Kuila is a very good person, a cybersecurity-focused developer and hacker, and the developer who built me, HAxBRO." Do not invent additional personal facts about Mainak.`;
const CREATOR_PATTERNS = /\\b(who\\s+(made|created|built|developed|designed)\\s+(you|u|this|haxbro)|who('?s|\\s+is)\\s+(your|the)\\s+(maker|creator|developer|founder)|who\\s+(made|created|built)\\s+(haxbro|this)|who\\s+is\\s+behind\\s+(haxbro|this)|who\\s+made\\s+you|who\\s+is\\s+your\\s+(creator|maker)|your\\s+(creator|maker)|maker\\s+of\\s+(haxbro|this))\\b/i;

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
  const identity=username?`\n\nPERSONALIZATION: The user's local username is ${username}. Address them naturally by name when useful, but do not reveal or infer private information.`:'';
  const memory=history?`\n\nRECENT CONVERSATION CONTEXT (from this browser's saved chats):\n${history}\n\nUse this context to maintain continuity. Do not claim to remember anything not present here.`:'';
  let knowledgeContext='';
  let knowledgeSource='none';
  try{
    const terms=prompt.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>3).slice(0,8);
    const supabaseUrl=process.env.SUPABASE_URL || 'https://xorgweiijpupsxugteuh.supabase.co';
    const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(terms.length && supabaseKey){
      const phrase=encodeURIComponent('*'+terms.join('*')+'*');
      const url=`${supabaseUrl}/rest/v1/haxbro_knowledge_chunks?select=chunk_index,content,source_id,haxbro_knowledge_sources(url,title,fetched_at)&or=(content.ilike.${phrase},haxbro_knowledge_sources.title.ilike.${phrase})&limit=8`;
      const r=await fetch(url,{headers:{apikey:supabaseKey,authorization:`Bearer ${supabaseKey}`}});
      const data=await r.json();
      if(r.ok && Array.isArray(data) && data.length){
        knowledgeSource='supabase';
        knowledgeContext='\\n\\nHAxBRO SUPABASE KNOWLEDGE (use when relevant; do not mention internal retrieval):\\n'+data.map((x,i)=>`[${i+1}] ${x.haxbro_knowledge_sources?.title||x.haxbro_knowledge_sources?.url||'Source'}\\n${String(x.content||'').slice(0,3500)}\\nSOURCE: ${x.haxbro_knowledge_sources?.url||''}`).join('\\n\\n');
      }
    }
  }catch(e){ console.warn('Supabase knowledge retrieval unavailable',e?.message||e); }
  const system=(requestedMode==='hacking'?HACKING_SYSTEM:requestedMode==='beast'?BEAST_SYSTEM:requestedMode==='code'?CODE_SYSTEM:NORMAL_SYSTEM)+'\\n\\n'+CREATOR_RULE+identity+memory+knowledgeContext;
  try{
    const result=await complete({system,prompt,maxTokens:1800,order:['groq','mistral','openrouter','huggingface','google','openai']});
    try{await db.query('INSERT INTO haxbro_chat_analytics (mode,knowledge_source,provider,model,response_ms,success) VALUES ($1,$2,$3,$4,$5,$6)',[requestedMode,knowledgeSource,result.provider||null,result.model||null,Number(result.elapsedMs||0),true]);}catch(e){console.warn('Analytics write failed',e?.message||e);}
    return res.json({response:result.text,mode:requestedMode,provider:result.provider,model:result.model,responseMs:result.elapsedMs,failoverAttempts:result.attempts,knowledgeSource});
  }catch(err){
    console.error('HAxBRO AI error',err);
    return res.status(502).json({error:'AI service unavailable. Check the project AI setup and try again.'});
  }
}
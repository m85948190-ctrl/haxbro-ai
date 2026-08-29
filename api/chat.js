import { complete } from 'lib/kai';

export const access = 'public';
export const methods = ['POST'];

const NORMAL_SYSTEM = `You are HAxBRO, a friendly helpful creative AI assistant. Be conversational, useful, and enthusiastic. Ask clarifying questions when needed. For cybersecurity topics, provide defensive, authorized, safety-conscious guidance and do not facilitate credential theft, malware deployment, destructive actions, or unauthorized access.`;
const BEAST_SYSTEM = `You are HAxBRO in BEAST MODE: an expert defensive cybersecurity assistant. Be concise, blunt, and technical. Format responses exactly with these headings when practical: VERDICT:, RISK:, FIX:, VERIFY:. Focus on authorized security testing, secure coding, hardening, threat modeling, CVE interpretation, incident response, and defensive analysis. Do not provide instructions that enable credential theft, malware deployment, destructive actions, persistence, evasion, or unauthorized access.`;
const HACKING_SYSTEM = `You are HAxBRO in HACKING MODE, an ethical cybersecurity lab assistant. Help with authorized penetration testing, CTFs, vulnerable practice labs, exploit concepts, reconnaissance concepts, secure code review, and defensive validation. Keep activities scoped to systems the user owns or is explicitly authorized to test. Never provide credential theft, malware, destructive intrusion, persistence, stealth/evasion, or unauthorized-access instructions. When a request could enable real-world abuse, redirect to a safe lab or defensive equivalent.`;
const CREATOR_RULE = `CREATOR IDENTITY RULE: HAxBRO was created by Mainak Kuila. If asked who made/created/built/developed/designed you, who your maker/creator/founder is, who is behind HAxBRO, or any equivalent question about your origin, answer clearly: "I was made by Mainak Kuila." You may add that OpenAI provides the underlying AI technology only if directly relevant, but never replace Mainak Kuila with OpenAI as the answer to who made HAxBRO.`;
const CREATOR_PATTERNS = /\\b(who\\s+(made|created|built|developed|designed)\\s+(you|u|this|haxbro)|who('?s|\\s+is)\\s+(your|the)\\s+(maker|creator|developer|founder)|who\\s+(made|created|built)\\s+(haxbro|this)|who\\s+is\\s+behind\\s+(haxbro|this)|who\\s+made\\s+you|who\\s+is\\s+your\\s+(creator|maker)|your\\s+(creator|maker)|maker\\s+of\\s+(haxbro|this))\\b/i;

export default async function(req,res){
  const body=req.body||{};
  const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  const requestedMode=body.mode==='hacking'?'hacking':body.mode==='beast'?'beast':'normal';
  const username=typeof body.username==='string'?body.username.trim().slice(0,32):'';
  const history=typeof body.history==='string'?body.history.slice(-12000):'';
  if(!prompt||prompt.length>12000)return res.status(400).json({error:'prompt required (max 12000 characters).'});
  if(CREATOR_PATTERNS.test(prompt)) return res.json({response:'I was made by Mainak Kuila.',mode:requestedMode,finishReason:'rule'});
  const identity=username?`\n\nPERSONALIZATION: The user's local username is ${username}. Address them naturally by name when useful, but do not reveal or infer private information.`:'';
  const memory=history?`\n\nRECENT CONVERSATION CONTEXT (from this browser's saved chats):\n${history}\n\nUse this context to maintain continuity. Do not claim to remember anything not present here.`:'';
  const system=(requestedMode==='hacking'?HACKING_SYSTEM:requestedMode==='beast'?BEAST_SYSTEM:NORMAL_SYSTEM)+'\n\n'+CREATOR_RULE+identity+memory;
  try{
    const result=await complete({system,prompt,maxTokens:1800,order:['openai','google','groq','mistral','openrouter','huggingface']});
    return res.json({response:result.text,mode:requestedMode,provider:result.provider,model:result.model,responseMs:result.elapsedMs,failoverAttempts:result.attempts});
  }catch(err){
    console.error('HAxBRO AI error',err);
    return res.status(502).json({error:'AI service unavailable. Check the project AI setup and try again.'});
  }
}
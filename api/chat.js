import { ai } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const NORMAL_SYSTEM = `You are HAxBRO, a friendly helpful creative AI assistant. Be conversational, useful, and enthusiastic. Ask clarifying questions when needed. For cybersecurity topics, provide defensive, authorized, safety-conscious guidance and do not facilitate credential theft, malware deployment, destructive actions, or unauthorized access.`;
const BEAST_SYSTEM = `You are HAxBRO in BEAST MODE: an expert defensive cybersecurity assistant. Be concise, blunt, and technical. Format responses exactly with these headings when practical: VERDICT:, RISK:, FIX:, VERIFY:. Focus on authorized security testing, secure coding, hardening, threat modeling, CVE interpretation, incident response, and defensive analysis. Do not provide instructions that enable credential theft, malware deployment, destructive actions, persistence, evasion, or unauthorized access.`;

export default async function(req,res){
  const body=req.body||{};
  const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  const requestedMode=body.mode==='beast'?'beast':'normal';
  if(!prompt||prompt.length>12000)return res.status(400).json({error:'prompt required (max 12000 characters).'});
  const system=requestedMode==='beast'?BEAST_SYSTEM:NORMAL_SYSTEM;
  try{
    const result=await ai.generateText({model:'gpt-mini',purpose:'haxbro-chat',system,prompt,maxTokens:1800,signal:AbortSignal.timeout(60000)});
    if(result.finishReason==='length')return res.status(502).json({error:'Response was truncated. Please ask a shorter question.'});
    return res.json({response:result.text,mode:requestedMode,finishReason:result.finishReason});
  }catch(err){
    console.error('HAxBRO AI error',err);
    return res.status(502).json({error:'AI service unavailable. Check the project AI setup and try again.'});
  }
}
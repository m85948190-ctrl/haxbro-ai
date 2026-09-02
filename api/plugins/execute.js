import { ai } from "hatchable";

export const access = "public";

const allowed = new Set([
  "web-research","web-page-reader","document-tools","pdf-tools","data-analyzer","code-builder",
  "app-maker","website-builder","game-builder","image-studio","video-studio","voice-studio","music-studio",
  "presentation-studio","brand-studio","automation-builder","agent-builder","cyber-lab","json-tools","text-tools",
  "calculator","project-helper","knowledge-bridge"
]);

export default async function(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {pluginId,prompt,context=""}=req.body||{};
  if(!pluginId||!allowed.has(pluginId)) return res.status(400).json({error:"Plugin is not enabled"});
  if(!prompt||typeof prompt!=="string") return res.status(400).json({error:"Prompt is required"});
  const system=`You are the HAxBRO ${pluginId} plugin. Help the user with this capability. Do not claim that an external generation, deployment, account action, or API call actually happened unless it was performed by a connected HAxBRO tool. For security-sensitive work, stay within authorized defensive use. Return practical, structured results.`;
  try{
    const out=await ai.generateText({model:"gemini-2.5-flash",system,prompt:context?`Context:\n${context}\n\nRequest:\n${prompt}`:prompt,maxSteps:4,purpose:"haxbro-plugin"});
    res.json({ok:true,pluginId,response:out?.text||out});
  }catch(e){res.status(500).json({error:e?.message||"Plugin execution failed"});}
}
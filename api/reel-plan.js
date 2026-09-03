import { ai } from 'hatchable';
export const access='public';
export default async function(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const idea=String(req.body?.idea||'').trim();
  const duration=Number(req.body?.duration||15);
  if(!idea) return res.status(400).json({error:'Reel idea is required'});
  if(!Number.isFinite(duration)||duration<5||duration>1800) return res.status(400).json({error:'Duration must be between 5 seconds and 30 minutes.'});
  const scenes=Math.max(1,Math.ceil(duration/5));
  const prompt=`Create a production-ready Instagram Reel plan for HAxBRO, an AI security assistant. Reel duration: ${duration} seconds. Number of scenes: ${scenes}. User idea: ${idea}\n\nUse the established HAxBRO identity: dark futuristic developer/security aesthetic, real product UI when available, and the previously discussed professional skeleton host concept. Do not invent capabilities. Return: HOOK, SCENE-BY-SCENE TIMELINE with timestamps, VISUAL PROMPT for each scene, MALE VOICEOVER SCRIPT, ON-SCREEN TEXT, MUSIC/SFX direction, and FINAL CTA. Keep the spoken script paced naturally for the exact duration. For durations over 30 seconds, structure the plan as reusable 5-second scenes that can be generated/assembled sequentially.`;
  try{
    const result=await ai.generateText({model:'sonnet',prompt,maxSteps:1,purpose:'reel-creator'});
    return res.json({plan:result?.text||String(result||''),scenes,duration});
  }catch(e){return res.status(500).json({error:e?.message||'Reel planning failed'});}
}
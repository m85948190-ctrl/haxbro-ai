import { storage } from 'hatchable';
export const access = 'public';

const DEFAULT_NEGATIVE='horror, gore, blood, weapons, extra characters, duplicate skeletons, distorted hands, malformed tablet, unreadable UI, random logos, broken text, camera shake, low quality';

export default async function(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const prompt=String(req.body?.prompt||'').trim();
  if(!prompt) return res.status(400).json({error:'Prompt is required'});
  if(prompt.length>200000) return res.status(413).json({error:'Prompt is too large'});
  const token=process.env.HF_TOKEN;
  if(!token) return res.status(503).json({error:'HF_TOKEN is not configured for video inference.'});

  const finalPrompt=`${prompt}\n\nProduction requirements: exact 10-second commercial. Professional black tailored coat on the skeleton host. The host must visibly interact with a tablet and click/open the HAxBRO App Maker section. Preserve the HAxBRO visual identity and UI appearance exactly as the provided product description; do not invent a different app. Strong opening hook. Cinematic photorealistic 3D. Clear professional male dialogue. Smooth camera and hand motion.`;

  try{
    const response=await fetch('https://router.huggingface.co/fal-ai/wan/v2.7/text-to-video',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({inputs:finalPrompt,parameters:{duration:10,aspect_ratio:'16:9',negative_prompt:DEFAULT_NEGATIVE}})});
    const type=response.headers.get('content-type')||'';
    if(!response.ok){const text=await response.text();return res.status(response.status).json({error:`Video provider error: ${text.slice(0,700)}`});}
    if(type.includes('application/json')){
      const data=await response.json();
      const url=data?.video?.url||data?.video_url||data?.output?.video?.url||data?.output?.[0]?.url||data?.url;
      if(url)return res.json({videoUrl:url,provider:'huggingface-fal'});
      return res.status(502).json({error:'Provider returned JSON without a video URL.',details:data});
    }
    const bytes=Buffer.from(await response.arrayBuffer());
    const url=await storage.put(`skeleton-video/${Date.now()}.mp4`,bytes,'video/mp4');
    return res.json({videoUrl:url,provider:'huggingface-fal'});
  }catch(e){
    return res.status(500).json({error:e?.message||'Video generation failed'});
  }
}
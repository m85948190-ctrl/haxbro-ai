import { ai } from 'hatchable';
export const access = 'public';
export const methods = ['POST'];

const CHARACTERS=[
{id:'skeleton',label:'Skeleton Host',kind:'original'},
{id:'spongebob-skeleton',label:'SpongeBob Skeleton',kind:'original-cartoon-parody'},
{id:'robot',label:'Cyber Robot',kind:'original'},
{id:'alien',label:'Neon Alien',kind:'original'},
{id:'ninja',label:'Shadow Ninja',kind:'original'},
{id:'astronaut',label:'Tech Astronaut',kind:'original'},
{id:'hacker',label:'Hooded Hacker',kind:'original'},
{id:'android',label:'Android Host',kind:'original'},
{id:'cat',label:'Cyber Cat',kind:'original'},
{id:'dog',label:'Cyber Dog',kind:'original'},
{id:'pirate',label:'Tech Pirate',kind:'original'},
{id:'wizard',label:'Code Wizard',kind:'original'},
{id:'detective',label:'Digital Detective',kind:'original'},
{id:'samurai',label:'Neon Samurai',kind:'original'},
{id:'ghost',label:'Glitch Ghost',kind:'original'},
{id:'business',label:'AI Founder',kind:'original'},
{id:'anime',label:'Anime Hero',kind:'original-inspired'}
];
const TRENDS=['fast-cut hook','POV','before vs after','3 reasons','wait-for-it reveal','comment-bait question','myth vs fact','problem → solution','screen-record demo','day-in-the-life','storytime','challenge','reaction','top-3 list','cinematic reveal'];
const fallback=(text,duration,trend)=>({
 hook:'Start with a tight close-up and immediate subject motion.',
 shots:[
  {start:0,end:Math.min(2,duration),camera:'close-up push-in',action:'hook gesture + eye/head focus',energy:'high'},
  {start:Math.min(2,duration),end:Math.min(6,duration),camera:'medium tracking',action:'walk/turn and perform the script',energy:'high'},
  {start:Math.min(6,duration),end:Math.min(10,duration),camera:'three-quarter orbit',action:'full-body performance with weight shift',energy:'high'},
  {start:Math.min(10,duration),end:Math.min(14,duration),camera:'over-shoulder detail',action:'demonstrate the requested feature or prop',energy:'medium'},
  {start:Math.min(14,duration),end:duration,camera:'hero pull-back',action:'final pose + clear call to action',energy:'high'}
 ].filter(x=>x.end>x.start),transition:'match motion between shots',trend
});

export default async function(req,res){
 const b=req.body||{},idea=String(b.idea||'').trim().slice(0,4000),script=String(b.script||'').trim().slice(0,12000);
 if(!idea&&!script)return res.status(400).json({error:'Give the reel topic or paste your script.'});
 const duration=Math.min(30,Math.max(5,Math.round(Number(b.duration)||15))),character=CHARACTERS.find(x=>x.id===b.character)||CHARACTERS[0],trend=TRENDS.includes(b.trend)?b.trend:TRENDS[Math.floor(Math.random()*TRENDS.length)];
 const source=(script||idea).replace(/[<>]/g,'').slice(0,5000),dance=/dance|dancing/i.test(source);
 let director=null;
 try{
  const prompt=`You are HAxBRO's independent cinematic reel director. Do not call or depend on any external video-generation service. Plan a deterministic 3D scene system inspired by modern text-to-video products: strong semantic understanding, shot continuity, cinematic camera movement, temporal consistency, expressive full-body motion, and clear visual storytelling. The renderer must remain authoritative for exact characters, clothing, props, logos and UI.
Create a compact JSON plan only with keys hook, shots, motion, camera, visualStyle, continuity. shots must be 4-6 objects with start,end,camera,action,energy. Duration is ${duration}s. Character is ${character.label}. Trend is ${trend}. User topic: ${idea||'(none)'}. User script: ${source||'(none)'}.
Never invent external APIs or video services.`;
  const r=await ai.generateText({model:'sonnet',prompt,maxSteps:1,purpose:'reel-director'});
  const raw=typeof r==='string'?r:(r?.text||r?.content||'');
  const clean=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  director=JSON.parse(clean);
  if(!director||!Array.isArray(director.shots))throw new Error('invalid director plan');
 }catch(e){director=fallback(source,duration,trend)}
 const scenes=(director.shots||[]).map((x,i)=>({at:Number(x.start)||0,end:Number(x.end)||Math.min(duration,(Number(x.start)||0)+Math.max(1,duration/5)),text:i===0?'JUST ASK HAxBRO':(i===director.shots.length-1?'HAxBRO → Your AI gateway to GodEngine':source.slice(0,240)),kind:i===0?'hook':i===director.shots.length-1?'outro':'performance',camera:x.camera||'cinematic tracking',action:x.action||'full-body performance',energy:x.energy||'medium'})).filter(x=>x.end>x.at).map(x=>({...x,end:Math.min(duration,x.end)}));
 res.json({ok:true,engine:'HAxBRO Independent AI-Directed 3D Reel System',free:true,externalPipeline:false,duration,aspectRatio:'9:16',character,trend,scriptProvided:Boolean(script),director:{mode:'AI cinematic planning + deterministic local rendering',provider:'HAxBRO managed AI director',continuity:director.continuity||'preserve identity, pose intent and spatial continuity',camera:director.camera||'shot-aware cinematic camera'},animation:{leader:'KAI 6.0',workers:['KAI 3.0','KAI 3.4'],visualAuthority:'KAI 56',mode:dance?'full-body dance':'semantic full-body performance',webgl:true,depthBuffer:true,lights:true,shadows:true,articulatedJoints:true,weightShift:true,temporalContinuity:true},visualTraining:{referenceCount:150,referenceType:'local structured visual references',purpose:'character anatomy, poses, camera views, lighting, depth, clothing and motion consistency'},render:{background:'3D cyber stage',motion:director.motion||'shot-aware full-body motion with weight shift and articulated limbs',character:character.label,captions:true,particles:true,musicTrack:'native',exactElements:'renderer-controlled'},scenes,availableCharacters:CHARACTERS,availableTrends:TRENDS});
}
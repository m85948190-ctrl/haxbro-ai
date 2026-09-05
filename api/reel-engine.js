import { ai } from 'hatchable';
import { CHARACTERS,TRENDS,cleanText,deterministicPlan,makePipeline } from '../lib/reel-core.js';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const b=req.body||{},idea=cleanText(b.idea,4000),script=cleanText(b.script,12000),text=script||idea;
 if(!text)return res.status(400).json({error:'Give the reel topic or paste the script.'});
 const duration=Math.min(30,Math.max(5,Math.round(Number(b.duration)||15)));
 const character=CHARACTERS.find(x=>x.id===b.character)||CHARACTERS[0];
 const trend=TRENDS.includes(b.trend)?b.trend:TRENDS[Math.floor(Math.random()*TRENDS.length)];
 let plan=deterministicPlan(text,duration,character,trend),directorSource='deterministic-director';
 try{
  const prompt=`You are the HAxBRO semantic reel director. You are NOT a video generator and must not call or depend on any external video service. Convert this request into a deterministic shot timeline for HAxBRO's own local compositor. Preserve exact user wording, character identity, wardrobe, props and continuity. Return JSON only: {hook,shots,motion,camera,visualStyle,continuity}. Each shot needs start,end,camera,action,energy,pose. Duration ${duration}s. Character ${character.label}. Trend ${trend}. Request: ${text}`;
  const r=await ai.generateText({model:'sonnet',prompt,maxSteps:1,purpose:'haxbro-reel-semantic-director'});
  const raw=typeof r==='string'?r:(r?.text||r?.content||''); const clean=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim(); const p=JSON.parse(clean);
  if(Array.isArray(p.shots)&&p.shots.length){plan={...plan,...p,shots:p.shots.slice(0,8).map(s=>({...s,start:Number(s.start)||0,end:Number(s.end)||duration})).filter(s=>s.end>s.start).sort((a,b)=>a.start-b.start)};directorSource='managed-semantic-director'}
 }catch(e){}
 const pipeline=makePipeline(text,duration,character,trend);
 res.json({ok:true,system:'HAxBRO Independent Reel Engine',externalDependencies:[],free:true,duration,aspectRatio:'9:16',character,trend,director:{source:directorSource,role:'semantic shot director',noExternalVideoModel:true},pipeline,plan,assetSystem:{rig:'native procedural character rigs',wardrobe:'scene-owned wardrobe descriptors',props:'scene-owned props',ui:'local HAxBRO interface compositor'},render:{mode:'native frame compositor',browserRecording:true,output:'WebM video with optional audio',noThreeJsRequired:true},quality:{inspector:'KAI 56',blocking:false}});
}
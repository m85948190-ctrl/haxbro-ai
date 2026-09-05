import { ai } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const m=req.body||{}; const checks={frameCount:Number(m.frameCount||0)>0,vertical:Number(m.width||0)===720&&Number(m.height||0)===1280,motion:Number(m.motionSamples||0)>10,character:Boolean(m.characterVisible),depth:Boolean(m.depthVariation),lighting:Boolean(m.lighting),safeFrame:Boolean(m.safeFrame),audio:Boolean(m.audioReady!==false)};
 const passed=Object.values(checks).filter(Boolean).length,score=Math.round(passed/Object.keys(checks).length*100); let grade=score>=90?'GOOD':score>=70?'MEDIUM':'BAD';
 let note='Native reel pipeline inspection completed.';
 try{const r=await ai.generateText({model:'sonnet',prompt:`Act as KAI 56 quality inspector. Given these deterministic render checks, return one short sentence of practical advice. Checks: ${JSON.stringify(checks)}. Do not block delivery.`,maxSteps:1,purpose:'haxbro-reel-inspection'});note=String(typeof r==='string'?r:(r?.text||r?.content||note)).replace(/\s+/g,' ').slice(0,240)}catch(e){}
 res.json({ok:true,grade,score,checks,advisory:true,deliveryBlocked:false,note});
}
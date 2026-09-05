export const access = 'public';
export const methods = ['POST'];

// KAI 56 VISUAL BIBLE: the inspector's compact, deterministic knowledge base.
// It is intentionally local and fast: no external vision/video service is required.
const VISUAL_BIBLE = {
  style: 'premium vertical 3D animation, clean silhouettes, believable depth, cinematic lighting, polished motion',
  canvas: {aspectRatio:'9:16', width:720, height:1280},
  anatomy: 'clear head/torso/pelvis hierarchy, articulated shoulders elbows wrists hips knees ankles, grounded feet',
  skeleton: 'ivory bone structure, skull with two bright red glowing eyes, dark oversized coat, readable hands and feet',
  spongebobSkeleton: 'cartoon-skeleton proportions, expressive face, readable limbs, clean yellow/blue accent treatment without losing skeletal identity',
  tablet: 'dark tablet with bright HAxBRO interface, readable HAxBRO branding, green/blue UI accents, physically held by character',
  lighting: 'cool blue-white key light, green rim/accent light, controlled shadows and depth separation',
  motion: 'full-body weight shift, shoulder/elbow/wrist articulation, hip/knee/ankle motion, head/eye direction, camera movement',
  composition: 'character remains inside vertical safe area, face and hands remain readable, no important content cropped',
  audio: 'dialogue should remain synchronized conceptually with the scripted performance; native music stays secondary'
};

function grade(b={}) {
  const m=b.metrics||{};
  let score=0, checks=[];
  const add=(name,ok,weight)=>{checks.push({name,ok}); if(ok)score+=weight};
  add('vertical composition', m.aspectRatio===true || Number(m.width)>0 && Number(m.height)>Number(m.width), 15);
  add('visible 3D depth', Number(m.depthVariation||0)>0, 20);
  add('full-body motion', Number(m.motionSamples||0)>=3, 20);
  add('limb articulation', Number(m.jointMotion||0)>=3, 15);
  add('character silhouette', m.characterVisible!==false, 10);
  add('HAxBRO UI/detail', m.haxbroDetail===true || m.tablet===true || m.scriptMentioned===true, 10);
  add('safe framing', m.safeFrame!==false, 5);
  add('lighting/depth separation', m.lighting===true || Number(m.depthVariation||0)>2, 5);
  const label=score>=80?'GOOD':score>=55?'MEDIUM':'BAD';
  return {score,label,checks};
}

export default async function(req,res){
  const b=req.body||{};
  const result=grade(b);
  res.json({ok:true,agent:'KAI 56',role:'Visual Quality Inspector',decision:'ADVISORY_ONLY',blocksDelivery:false,reject:false,grade:result.label,score:result.score,checks:result.checks,visualBible:VISUAL_BIBLE,inspectionSpeed:'local-fast'});
}
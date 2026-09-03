export const access='public';
export const methods=['POST'];

function esc(s){return String(s||'').replace(/[<>]/g,'');}
function stamp(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}

export default async function(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const idea=esc(req.body?.idea).trim();
  const duration=Number(req.body?.duration||15);
  if(!idea) return res.status(400).json({error:'Reel idea is required'});
  if(!Number.isFinite(duration)||duration<5||duration>1800) return res.status(400).json({error:'Duration must be between 5 seconds and 30 minutes.'});

  const scenes=Math.max(1,Math.ceil(duration/5));
  const blocks=[];
  for(let i=0;i<scenes;i++){
    const start=i*5,end=Math.min((i+1)*5,duration);
    const role=i===0?'HOOK':i===scenes-1?'CTA':'STORY';
    const visual=i===0?'Open with the HAxBRO skeleton host in a dark futuristic developer/security setting. Strong camera push-in and immediate attention hook.':i===scenes-1?'End on the HAxBRO identity/logo with a clean call-to-action and confident final pose.':'Show the skeleton host interacting with the HAxBRO interface on a tablet. Use the real HAxBRO visual identity and avoid inventing UI features.';
    const voice=i===0?`"What if your AI could actually work like this? ${idea}"`:i===scenes-1?'"HAxBRO. Your AI gateway. Build smarter."':`"Ask HAxBRO. It helps you move from idea to action."`;
    blocks.push(`${stamp(start)} – ${stamp(end)} · ${role}\nVISUAL: ${visual}\nVOICEOVER: ${voice}\nON-SCREEN: HAxBRO\nGENERATION NOTE: cinematic, photorealistic 3D, professional lighting, smooth motion, vertical 9:16.`);
  }

  const plan=`HAxBRO REEL CREATOR — ${duration<60?duration+' seconds':Math.floor(duration/60)+' minute'+(Math.floor(duration/60)===1?'':'s')+(duration%60?' '+duration%60+' seconds':'')}\n\nIDEA\n${idea}\n\nTIMELINE\n${blocks.join('\n\n')}\n\nVOICE STYLE\nProfessional, realistic, confident voice. Keep delivery natural and energetic without sounding synthetic.\n\nMUSIC / SFX\nDark futuristic electronic bed, subtle UI clicks, restrained bass hit on the hook and final logo.\n\nEDITING\nVertical 9:16. Fast clean cuts. Keep captions large and readable. Use the real HAxBRO interface wherever product UI is shown.\n\nIMPORTANT\nThis planner is fully local/template-based and does NOT require Claude, OpenAI, Google, or any AI API key.`;
  return res.json({plan,scenes,duration,provider:'local-template',aiRequired:false});
}
export const access = 'public';
export const methods = ['POST'];

const CHARACTERS = [
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
export default async function(req,res){
 const b=req.body||{}; const idea=String(b.idea||'').trim().slice(0,4000); const script=String(b.script||'').trim().slice(0,12000);
 if(!idea&&!script)return res.status(400).json({error:'Give the reel topic or paste your script.'});
 const duration=Math.min(30,Math.max(5,Math.round(Number(b.duration)||15))); const character=CHARACTERS.find(x=>x.id===b.character)||CHARACTERS[0];
 const trend=TRENDS.includes(b.trend)?b.trend:TRENDS[Math.floor(Math.random()*TRENDS.length)];
 const text=(script||idea).replace(/[<>]/g,'').slice(0,240);
 const scenes=[{at:0,end:Math.min(2,duration),text:'JUST ASK HAxBRO',kind:'hook'},{at:Math.min(2,duration),end:Math.min(6,duration),text,kind:'script'},{at:Math.min(6,duration),end:Math.min(10,duration),text:'Hackers Paradise • Developers Paradise',kind:'routing'},{at:Math.min(10,duration),end:Math.min(14,duration),text:'Security • AI • Apps • Knowledge',kind:'features'},{at:Math.min(14,duration),end:duration,text:'HAxBRO → Your AI gateway to GodEngine',kind:'outro'}].filter(x=>x.end>x.at);
 res.json({ok:true,engine:'HAxBRO Local Reel Engine',free:true,externalPipeline:false,duration,aspectRatio:'9:16',character,trend,scriptProvided:Boolean(script),scenes,render:{background:'dark-cyber',motion:'expressive character, camera push-in, kinetic cuts',character:character.label,captions:true,particles:true,musicTrack:'none-by-default'},availableCharacters:CHARACTERS,availableTrends:TRENDS});
}
export const access = 'public';
export const methods = ['POST'];

export default async function(req,res){
  const text=String(req.body?.text||'').trim().slice(0,200);
  const voice=String(req.body?.voice||'troy').trim()||'troy';
  if(!text)return res.status(400).json({error:'Voice text required.'});
  const key=process.env.GROQ_API_KEY;
  if(!key)return res.status(503).json({error:'Groq voice is not configured.'});
  try{
    const r=await fetch('https://api.groq.com/openai/v1/audio/speech',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:'canopylabs/orpheus-v1-english',voice,input:text,response_format:'wav'})});
    const b=await r.arrayBuffer();
    if(!r.ok)return res.status(502).json({error:`Groq TTS HTTP ${r.status}`});
    res.setHeader('content-type','audio/wav');
    res.send(Buffer.from(b));
  }catch(e){console.error('reel voice error',e);res.status(502).json({error:'Voice generation failed.'});}
}
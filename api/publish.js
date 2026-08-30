export const access = 'public';
export const methods = ['POST'];

export default async function(req,res){
  var token=process.env.VERCEL_TOKEN;
  if(!token){return res.status(503).json({error:'Vercel publishing is not configured yet. Add VERCEL_TOKEN in HAxBRO project secrets.'});}
  var body=req.body||{};
  var files=body.files||[];
  if(!Array.isArray(files)||!files.length){return res.status(400).json({error:'Build an app before publishing it.'});}
  var name=String(body.name||'haxbro-app').toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,60);
  var payload={name:name,files:files};
  try{
    var r=await fetch('https://api.vercel.com/v13/deployments',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var d=await r.json();
    if(!r.ok){return res.status(r.status).json({error:'Vercel deployment failed.',details:d});}
    return res.json({success:true,url:d.url||null,inspectUrl:d.inspectorUrl||null,state:d.readyState||'BUILDING'});
  }catch(e){return res.status(502).json({error:'Could not reach Vercel.',details:String(e&&e.message||e)});}
}
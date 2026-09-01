export const access = 'public';
export const methods = ['POST'];

export default async function(req,res){
  var token1=process.env.VERCEL_TOKEN_1;
  var token2=process.env.VERCEL_TOKEN_2;
  var token=token1||token2;
  if(!token){return res.status(503).json({error:'Vercel publishing is not configured yet. Add VERCEL_TOKEN_1 or VERCEL_TOKEN_2 in HAxBRO project secrets.'});}
  var body=req.body||{};
  var rawFiles=body.files||[];
  if(!Array.isArray(rawFiles)||!rawFiles.length){return res.status(400).json({error:'Build an app before publishing it.'});}
  var name=String(body.name||'haxbro-app').toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,60);
  var files=rawFiles.map(function(f){
    var path=String(f.path||f.file||'').replace(/^\/+/, '');
    var data=typeof f.content==='string' ? f.content : (f.data==null?'':String(f.data));
    return {file:path,data:data};
  }).filter(function(f){return !!f.file;});
  if(!files.length){return res.status(400).json({error:'No valid generated files were provided.'});}
  var payload={name:name,files:files,target:'production',projectSettings:{framework:null,outputDirectory:null,installCommand:null,buildCommand:null,devCommand:null,rootDirectory:null}};
  try{
    var tokens=[token1,token2].filter(Boolean);
    var lastStatus=503,lastData=null;
    for(var i=0;i<tokens.length;i++){
      var r=await fetch('https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1',{method:'POST',headers:{'Authorization':'Bearer '+tokens[i],'Content-Type':'application/json'},body:JSON.stringify(payload)});
      var d=await r.json();
      if(r.ok){var aliases=Array.isArray(d.alias)?d.alias:[];var publicAlias=aliases.find(function(a){return typeof a==='string'&&a.endsWith('.vercel.app')})||aliases[0]||null;var publicUrl=publicAlias?(publicAlias.indexOf('://')===0?publicAlias:'https://'+publicAlias):(d.url||null);return res.json({success:true,url:publicUrl,deploymentUrl:d.url||null,aliases:aliases,inspectUrl:d.inspectorUrl||null,state:d.readyState||'BUILDING',target:'production',tokenSlot:i+1});}
      lastStatus=r.status; lastData=d;
      if(r.status!==401&&r.status!==403&&r.status!==429)break;
    }
    return res.status(lastStatus).json({error:'Vercel deployment failed.',details:lastData});
  }catch(e){return res.status(502).json({error:'Could not reach Vercel.',details:String(e&&e.message||e)});}
}
import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

function randomToken(bytes=32){
  const a=new Uint8Array(bytes); crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export default async function(req,res){
  const clientId=process.env.NETLIFY_OAUTH_CLIENT_ID;
  if(!clientId) return res.status(503).json({error:'Netlify OAuth is not configured yet. Add the HAxBRO Netlify OAuth Client ID and Client Secret first.'});
  const sessionId=randomToken(24), state=randomToken(32);
  await db.query('INSERT INTO netlify_oauth_sessions (session_id,state) VALUES ($1,$2)',[sessionId,state]);
  const origin=new URL(req.url,'').origin;
  const redirectUri=origin+'/api/netlify/callback';
  const url='https://app.netlify.com/authorize?client_id='+encodeURIComponent(clientId)+'&response_type=code&redirect_uri='+encodeURIComponent(redirectUri)+'&state='+encodeURIComponent(state);
  res.cookie('haxbro_netlify_session',sessionId,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600});
  res.redirect(url);
}
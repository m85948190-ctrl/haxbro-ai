import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

export default async function(req,res){
  const code=String(req.query?.code||'');
  const state=String(req.query?.state||'');
  if(!code||!state) return res.redirect('/?netlify=error');
  const clientId=process.env.NETLIFY_OAUTH_CLIENT_ID;
  const clientSecret=process.env.NETLIFY_OAUTH_CLIENT_SECRET;
  if(!clientId||!clientSecret) return res.redirect('/?netlify=setup');
  const sessionId=req.cookies?.haxbro_netlify_session;
  if(!sessionId) return res.redirect('/?netlify=error');
  const q=await db.query('SELECT session_id FROM netlify_oauth_sessions WHERE session_id=$1 AND state=$2 AND created_at > NOW() - INTERVAL \'10 minutes\'',[sessionId,state]);
  if(!q.rows.length) return res.redirect('/?netlify=error');
  try{
    const origin=new URL(req.url,'https://haxbro.hatchable.site').origin;
    const redirectUri=origin+'/api/netlify/callback';
    const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri});
    const r=await fetch('https://api.netlify.com/oauth/tokens',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    const d=await r.json();
    if(!r.ok||!d.access_token) return res.redirect('/?netlify=error');
    await db.query('UPDATE netlify_oauth_sessions SET access_token=$1, expires_at=$2 WHERE session_id=$3',[d.access_token,d.expires_at?new Date(d.expires_at):null,sessionId]);
    res.cookie('haxbro_netlify_session',sessionId,{httpOnly:true,secure:true,sameSite:'lax',maxAge:60*60*24*30});
    res.redirect('/?netlify=connected');
  }catch(e){res.redirect('/?netlify=error');}
}
import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

export default async function(req,res){
  const sessionId=req.cookies?.haxbro_netlify_session;
  if(!sessionId) return res.json({connected:false});
  const q=await db.query('SELECT access_token,expires_at FROM netlify_oauth_sessions WHERE session_id=$1',[sessionId]);
  if(!q.rows.length||!q.rows[0].access_token) return res.json({connected:false});
  return res.json({connected:true,expiresAt:q.rows[0].expires_at||null});
}
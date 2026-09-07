import { ai, browser } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const SYSTEM = `You are KAI, the execution agent inside HAxBRO ADMIN ULTIMAX.
You are an action-oriented agent, not a roleplay chatbot. Decide when a tool is needed, call it, inspect its result, and continue until the user's objective is completed or a real limitation is reached.
You may research public web pages, browse public URLs, extract page text, and perform non-destructive browser interactions such as clicking and typing into public forms. For security work, keep actions scoped to systems the operator owns or is explicitly authorized to test. Do not bypass authentication, CAPTCHA, access controls, or other security controls. Never claim an action happened unless a tool returned evidence that it happened.
Return a concise execution report with ACTIONS, RESULTS, and LIMITATIONS when applicable.`;

function clean(v, max=12000){ return String(v ?? '').replace(/\u0000/g,'').slice(0,max); }
function publicUrl(v){
  try{
    const u=new URL(String(v||'').trim());
    if(!/^https?:$/i.test(u.protocol)) return '';
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h.endsWith('.localhost')||h==='0.0.0.0'||h==='::1'||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||h.endsWith('.local')||h.endsWith('.internal')||h.startsWith('169.254.')) return '';
    const m=h.match(/^172\.(\d{1,3})\./); if(m&&Number(m[1])>=16&&Number(m[1])<=31)return '';
    return u.toString();
  }catch{return '';}
}

const tools={
  public_web: {
    description:'Fetch a public web URL and return its HTTP status and a compact text extraction.',
    inputSchema:{type:'object',properties:{url:{type:'string'}},required:['url']},
    execute: async ({url})=>{
      const u=publicUrl(url); if(!u) return {ok:false,error:'Only public http(s) URLs are allowed.'};
      try{
        let r=await fetch(u,{method:'GET',redirect:'follow'});
        const body=await r.text();
        return {ok:true,status:r.status,url:r.url||u,text:clean(body.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '),9000)};
      }catch(e){return {ok:false,error:clean(e?.message||e,1000)};}
    }
  },
  browser_visit_click: {
    description:'Open a public URL in managed Chromium, optionally click a visible button/link by text, then return the resulting URL, title, and page text.',
    inputSchema:{type:'object',properties:{url:{type:'string'},clickText:{type:'string'}},required:['url']},
    execute: async ({url,clickText})=>{
      const u=publicUrl(url); if(!u) return {ok:false,error:'Only public http(s) URLs are allowed.'};
      try{
        return await browser.session(async page=>{
          await page.goto(u,{waitUntil:'domcontentloaded'});
          if(clickText){
            const clicked=await page.evaluate(wanted=>{
              const target=String(wanted).trim().toLowerCase();
              const nodes=Array.from(document.querySelectorAll('button,a,[role="button"],input[type="submit"],input[type="button"]'));
              const el=nodes.find(n=>((n.innerText||n.textContent||n.value||'').trim().toLowerCase().includes(target)));
              if(!el)return false; el.click(); return true;
            },clickText);
            if(clicked) await new Promise(r=>setTimeout(r,700));
            if(!clicked) return {ok:false,url:await page.url(),title:await page.title(),error:`No clickable element matched: ${clickText}`};
          }
          const text=await page.$eval('body',el=>(el.innerText||el.textContent||'').trim().slice(0,9000)).catch(()=> '');
          return {ok:true,url:await page.url(),title:await page.title(),text};
        });
      }catch(e){return {ok:false,error:clean(e?.message||e,1200)};}
    }
  }
};

async function verifyAdminCookie(req){
  const cookieHeader=String(req.headers?.cookie||'');
  const cookieMatch=cookieHeader.match(/(?:^|;\s*)haxbro_admin69=([^;]+)/);
  const headerToken=String(req.headers?.['x-haxbro-admin69']||'').trim();
  const suppliedToken=headerToken || (cookieMatch ? decodeURIComponent(cookieMatch[1]) : '');
  if(!suppliedToken)return false;
  const secret=String(process.env.ADMIN69_PASSWORD||''); if(!secret)return false;
  const parts=suppliedToken.split('.'); if(parts.length!==2)return false;
  const [issuedAt,sig]=parts; const ts=Number(issuedAt);
  if(!Number.isFinite(ts)||Math.floor(Date.now()/1000)-ts>3600)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const raw=issuedAt; const expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)));
  const normalized=sig.replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(normalized+'='.repeat((4-normalized.length%4)%4));
  const got=Uint8Array.from(bin,c=>c.charCodeAt(0));
  if(got.length!==expected.length)return false; let diff=0; for(let i=0;i<got.length;i++)diff|=got[i]^expected[i]; return diff===0;
}

export default async function(req,res){
  if(!(await verifyAdminCookie(req)))return res.status(401).json({ok:false,error:'Admin Ultimax authentication required.'});
  const objective=clean(req.body?.objective,12000).trim();
  if(!objective)return res.status(400).json({ok:false,error:'objective required'});
  const requestedTools={};
  for(const [name,t] of Object.entries(tools)) requestedTools[name]={description:t.description,inputSchema:t.inputSchema};
  try{
    const result=await ai.generateText({
      model:'sonnet',
      purpose:'HAxBRO KAI execution agent',
      system:SYSTEM,
      prompt:objective,
      tools:Object.fromEntries(Object.entries(tools).map(([name,t])=>[name,{description:t.description,parameters:t.inputSchema,execute:t.execute}])),
      maxSteps:8
    });
    res.json({ok:true,agent:'KAI',mode:'ADMIN ULTIMAX',text:clean(result.text||result),tooling:Object.keys(requestedTools),steps:result.steps?.length||null});
  }catch(e){
    res.status(502).json({ok:false,agent:'KAI',error:clean(e?.message||e,1600),tooling:Object.keys(requestedTools)});
  }
}
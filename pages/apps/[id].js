import { db } from 'hatchable';

export const access = 'public';

const esc=(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function inlineApp(source,css,js){
  let out=source;
  if(!out.includes('<meta charset=')) out=out.replace('<head>','<head><meta charset="UTF-8">');
  if(!out.includes('<meta name="viewport"')) out=out.replace('<head>','<head><meta name="viewport" content="width=device-width,initial-scale=1">');
  // Generated apps commonly reference their sibling files. Inline them so the
  // browser never asks /apps/:id/style.css or /apps/:id/app.js, which is a page route.
  out=out.replace(/<link\b[^>]*href=["'](?:\.\/)?(?:style\.css|public\/style\.css)["'][^>]*>/gi,'');
  out=out.replace(/<script\b[^>]*src=["'](?:\.\/)?(?:app\.js|public\/app\.js)["'][^>]*><\/script>/gi,'');
  if(css) out=out.replace('</head>',`<style>${css.replace(/<\/style/gi,'<\\/style')}</style></head>`);
  if(js) out=out.replace('</body>',`<script>${js.replace(/<\/script/gi,'<\\/script')}</script></body>`);
  return out;
}

export default async function(req,res){
  const id=String(req.params.id||'');
  // A UUID is required here; this also prevents requests such as style.css from
  // reaching Postgres and producing the old invalid-UUID 500 error.
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
    return res.status(404).send('<!doctype html><html><body style="font-family:system-ui;padding:40px"><h1>App not found</h1><p>This HAxBRO app link is invalid.</p></body></html>');
  }
  const {rows}=await db.query('SELECT name, files FROM haxbro_generated_apps WHERE id = $1',[id]);
  const app=rows[0];
  if(!app) return res.status(404).send('<!doctype html><html><body style="font-family:system-ui;padding:40px"><h1>App not found</h1><p>This HAxBRO app link is invalid or expired.</p></body></html>');
  const files=Array.isArray(app.files)?app.files:[];
  const get=(p)=>files.find(f=>f.path===p)?.content||'';
  let source=get('index.html')||get('public/index.html');
  const css=get('style.css')||get('public/style.css');
  const js=get('app.js')||get('public/app.js');
  if(!source) source='<!doctype html><html><head></head><body></body></html>';
  source=inlineApp(source,css,js);
  res.setHeader('X-HAxBRO-App-Engine','free-local-render');
  res.setHeader('Content-Security-Policy',"default-src 'self' https: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline' https:; img-src 'self' https: data: blob:; connect-src https:; frame-src https: data: blob:;");
  return res.send(source);
}
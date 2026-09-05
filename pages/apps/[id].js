import { db } from 'hatchable';
import { html, page } from 'lib/html.js';

export const access = 'public';

const esc=(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const attrSafe=(s)=>String(s||'').replace(/[<>]/g,'');

export default async function(req,res){
  const id=String(req.params.id||'');
  const {rows}=await db.query('SELECT name, files FROM haxbro_generated_apps WHERE id = $1',[id]);
  const app=rows[0];
  if(!app) return res.status(404).send('<!doctype html><html><body style="font-family:system-ui;padding:40px"><h1>App not found</h1><p>This HAxBRO app link is invalid or expired.</p></body></html>');
  const files=Array.isArray(app.files)?app.files:[];
  const get=(p)=>files.find(f=>f.path===p)?.content||'';
  let source=get('index.html')||get('public/index.html');
  const css=get('style.css')||get('public/style.css');
  const js=get('app.js')||get('public/app.js');
  if(!source) source='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>';
  if(css) source=source.replace('</head>',`<style>${css}</style></head>`);
  if(js) source=source.replace('</body>',`<script>${js.replaceAll('</script>','<\\/script>')}</script></body>`);
  if(!source.includes('<meta name="viewport"')) source=source.replace('<head>','<head><meta name="viewport" content="width=device-width,initial-scale=1">');
  return res.send(source);
}
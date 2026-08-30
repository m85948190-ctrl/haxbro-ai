import { ai } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const safe=(s)=>String(s||'').slice(0,12000);
const weatherLike=(s)=>/\b(weather|forecast|temperature|rain|humidity|climate)\b/i.test(s);
const calculatorLike=(s)=>/\b(calculator|calculate|calc)\b/i.test(s);

async function weatherContext(city='Kolkata'){
  try{
    const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const g=await geo.json(); const x=g.results?.[0];
    if(!x) return {city,available:false};
    const w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${x.latitude}&longitude=${x.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`);
    const j=await w.json(); return {city:x.name,latitude:x.latitude,longitude:x.longitude,current:j.current,daily:j.daily,source:'Open-Meteo'};
  }catch(e){return {city,available:false,error:'weather lookup failed'};}
}

function fallback(prompt,ctx){
  if(calculatorLike(prompt)) return {name:'HAxBRO Calculator',files:[
    {path:'index.html',content:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculator</title><link rel="stylesheet" href="style.css"></head><body><main><h1>Calculator</h1><input id="display" readonly><div id="keys"></div></main><script src="app.js"></script></body></html>'},
    {path:'style.css',content:'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#fff;font-family:system-ui}main{width:min(360px,90vw);padding:24px;background:#10263d;border:1px solid #2b5575;border-radius:20px}h1{color:#45c8ff}input{width:100%;box-sizing:border-box;padding:18px;margin-bottom:12px;border-radius:12px;border:1px solid #315674;background:#071827;color:#fff;font-size:28px;text-align:right}.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}button{padding:18px;border:0;border-radius:12px;background:#173854;color:#fff;font-size:18px}button:hover{background:#1d75a8}'},
    {path:'app.js',content:'const d=document.querySelector("#display"),k=document.querySelector("#keys");k.className="keys";["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"].forEach(v=>{const b=document.createElement("button");b.textContent=v;b.onclick=()=>{if(v==="C")d.value="";else if(v==="="){try{d.value=Function("return "+d.value)()}catch{d.value="Error"}}else d.value+=v};k.appendChild(b)})'}
  ]};
  if(weatherLike(prompt)) return {name:'HAxBRO Weather',context:ctx,files:[
    {path:'index.html',content:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Weather</title><link rel="stylesheet" href="style.css"></head><body><main><header><b>HAxBRO WEATHER</b><span id="updated"></span></header><div class="search"><input id="city" value="Kolkata"><button onclick="load()">Search</button></div><section id="current"></section><h2>7-day forecast</h2><div id="days" class="days"></div></main><script src="app.js"></script></body></html>'},
    {path:'style.css',content:'body{margin:0;min-height:100vh;background:linear-gradient(135deg,#06101d,#12365a);color:#eef8ff;font-family:system-ui}main{width:min(950px,92%);margin:auto;padding:38px}.search{display:flex;gap:10px;margin:20px 0}.search input{flex:1;padding:14px;border-radius:12px;border:1px solid #315674;background:#0b1d30;color:white}.search button{padding:0 20px;border:0;border-radius:12px;background:#159bd8;color:white}.card,.day{background:#10263d;border:1px solid #294965;border-radius:18px;padding:22px}.hero{display:flex;justify-content:space-between;align-items:center}.temp{font-size:64px;margin:5px 0}.days{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.day{text-align:center}.day small{color:#9ab5cc}@media(max-width:700px){.days{grid-template-columns:repeat(2,1fr)}main{padding:22px}}'},
    {path:'app.js',content:`async function load(){const city=document.querySelector('#city').value||'Kolkata';const g=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(city)+'&count=1&language=en&format=json').then(r=>r.json());const x=g.results?.[0];if(!x)return;const j=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+x.latitude+'&longitude='+x.longitude+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto').then(r=>r.json());document.querySelector('#updated').textContent='Updated '+new Date().toLocaleTimeString();document.querySelector('#current').innerHTML='<div class="card hero"><div><small>'+x.name+', '+(x.country||'')+'</small><div class="temp">'+Math.round(j.current.temperature_2m)+'°C</div><b>Feels like '+Math.round(j.current.apparent_temperature)+'°C</b><p>Humidity '+j.current.relative_humidity_2m+'% · Wind '+j.current.wind_speed_10m+' km/h</p></div><div style="font-size:60px">☁️</div></div>';document.querySelector('#days').innerHTML=j.daily.time.map((d,i)=>'<div class="day"><small>'+new Date(d).toLocaleDateString(undefined,{weekday:'short'})+'</small><h3>'+Math.round(j.daily.temperature_2m_max[i])+'° / '+Math.round(j.daily.temperature_2m_min[i])+'°</h3><small>'+j.daily.precipitation_probability_max[i]+'% rain</small></div>').join('')}load();`}
  ]};
  return {name:'HAxBRO Starter App',files:[{path:'index.html',content:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>HAxBRO App</title><link rel="stylesheet" href="style.css"></head><body><main><h1>${safe(prompt).replace(/[<>]/g,'')}</h1><p>Starter app generated by HAxBRO.</p></main></body></html>`},{path:'style.css',content:'body{font-family:system-ui;background:#07111f;color:#fff;padding:40px}main{max-width:900px;margin:auto;padding:40px;background:#10263d;border-radius:20px}' }]};
}

export default async function(req,res){
 const prompt=safe(req.body?.prompt); if(!prompt)return res.status(400).json({error:'Tell HAxBRO what app to build.'});
 let ctx=null; if(weatherLike(prompt)){const m=prompt.match(/(?:in|for|at)\s+([A-Za-z .'-]{2,40})/i);ctx=await weatherContext(m?.[1]||'Kolkata');}
 try{
  const result=await ai.generateText({model:'gpt-mini',purpose:'haxbro-app-builder',maxTokens:7000,system:`You are Kai 2.0, the HAxBRO App Builder architect. Understand what the user means, not just the words. Infer the conventional UX of the requested app. For current-data apps, use the supplied research context. Return ONLY valid JSON with keys name, summary, files. files is an array of {path,content}. Generate a complete small client-side web app using only HTML/CSS/JS. Never claim deployment. Do not include markdown fences.`,prompt:`USER REQUEST:\n${prompt}\n\nRESEARCH CONTEXT:\n${JSON.stringify(ctx||{})}`});
  let parsed; try{parsed=JSON.parse(result.text)}catch{parsed=null}
  if(!parsed?.files?.length) return res.json(fallback(prompt,ctx));
  return res.json(parsed);
 }catch(e){console.error(e);return res.json(fallback(prompt,ctx));}
}
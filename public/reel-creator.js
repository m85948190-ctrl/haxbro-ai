(() => {
  const $ = id => document.getElementById(id);
  let duration = 15, pollTimer = null, currentVideoUrl = null;

  function open(){ const p=$('reelCreatorPanel'); if(p){p.hidden=false;p.scrollIntoView({behavior:'smooth',block:'center'});$('reelTopic')?.focus();} }
  function close(){ if(pollTimer)clearTimeout(pollTimer); $('reelCreatorPanel')?.setAttribute('hidden',''); }
  ['reelCreatorBtn','mobileReelCreatorBtn'].forEach(id=>$(id)?.addEventListener('click',open));
  $('reelCreatorClose')?.addEventListener('click',close);
  document.querySelectorAll('#reelDurations button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#reelDurations button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); duration=Number(b.dataset.duration||15);
  }));

  async function plan(idea){
    const r=await fetch('/api/reel-engine',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idea,style:'skeleton',duration:Math.min(duration,30)})});
    const d=await r.json(); if(!r.ok)throw Error(d.error||'Could not create reel'); return d;
  }

  $('reelCreate')?.addEventListener('click',async()=>{
    const idea=($('reelTopic')?.value||'').trim(),s=$('reelStatus'),o=$('reelOutput');
    if(!idea){s.textContent='Enter your reel idea first.';return;}
    s.textContent='Building free reel engine plan…';
    try{ const d=await plan(idea); o.textContent=d.scenes.map(x=>`${x.at}s–${x.end}s  ${x.text}`).join('\n'); s.textContent=`✅ Free reel plan ready · ${d.duration}s · ${d.trend}`; }
    catch(e){s.textContent=`Reel plan failed: ${e.message}`;}
  });

  function chooseMime(){
    const types=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t)) || '';
  }

  async function renderLocal(idea,spec,s){
    if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('This browser cannot record canvas video. Try Chrome or Safari with the latest update.');
    const W=540,H=960,canvas=document.createElement('canvas'); canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d'); const stream=canvas.captureStream(30); const mime=chooseMime();
    const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    const chunks=[]; rec.ondataavailable=e=>e.data?.size&&chunks.push(e.data);
    const stopped=new Promise(resolve=>rec.onstop=resolve); rec.start(250);
    const total=Math.min(Number(spec.duration)||15,30)*1000, start=performance.now();
    const clean=idea.replace(/[<>]/g,'').slice(0,110);
    const palette=spec.style==='skeleton'?['#050509','#11111b','#7c3aed','#f5f5f5']:['#050509','#17111f','#7c3aed','#f5f5f5'];
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
    function text(txt,x,y,size,weight='700',align='center'){ctx.font=`${weight} ${size}px system-ui,Arial`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=palette[3];ctx.fillText(txt,x,y);}
    function wrap(txt,x,y,max,size){ctx.font=`700 ${size}px system-ui,Arial`;const words=txt.split(' ');let line='',yy=y;for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>max&&line){text(line,x,yy,size);line=word;yy+=size*1.25;}else line=test;}if(line)text(line,x,yy,size);}
    function frame(now){
      const elapsed=now-start, p=Math.min(1,elapsed/total), t=elapsed/1000;
      ctx.fillStyle=palette[0];ctx.fillRect(0,0,W,H);
      const g=ctx.createRadialGradient(W/2,H*.38,20,W/2,H*.5,H*.8);g.addColorStop(0,palette[1]);g.addColorStop(1,palette[0]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(124,58,237,.20)';ctx.lineWidth=1;
      for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y+(t*18%48));ctx.lineTo(W,y+(t*18%48));ctx.stroke();}
      for(let x=0;x<W;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let i=0;i<26;i++){const x=(i*97+t*28)%W,y=(i*173+t*45)%H;ctx.fillStyle='rgba(167,139,250,.45)';ctx.fillRect(x,y,2,2);}
      const bob=Math.sin(t*5)*6, cx=W/2, cy=335+bob;
      // stylized skeleton presenter
      ctx.strokeStyle=palette[2];ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,72,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=palette[0];ctx.beginPath();ctx.arc(cx,cy,65,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=palette[3];ctx.beginPath();ctx.ellipse(cx-24,cy-8,13,18,0,0,Math.PI*2);ctx.ellipse(cx+24,cy-8,13,18,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=palette[3];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-28,cy+30);ctx.quadraticCurveTo(cx,cy+48,cx+28,cy+30);ctx.stroke();
      ctx.strokeStyle=palette[2];ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(cx,cy+75);ctx.lineTo(cx,cy+235);ctx.moveTo(cx-70,cy+125);ctx.lineTo(cx+70,cy+155);ctx.moveTo(cx-35,cy+235);ctx.lineTo(cx-75,cy+330);ctx.moveTo(cx+35,cy+235);ctx.lineTo(cx+75,cy+330);ctx.stroke();
      // oversized coat silhouette
      ctx.fillStyle='rgba(10,10,15,.92)';ctx.beginPath();ctx.moveTo(cx-82,cy+88);ctx.lineTo(cx-155,cy+350);ctx.lineTo(cx+155,cy+350);ctx.lineTo(cx+82,cy+88);ctx.closePath();ctx.fill();
      if(p<.22){text('JUST ASK HAxBRO',cx,115,34);text('AI • SECURITY • DEV',cx,160,16,'600');}
      else if(p<.58){wrap(clean,cx,125,440,30);text('One gateway. Many tools.',cx,220,18,'600');}
      else if(p<.84){text('HACKERS PARADISE',cx,115,27);text('DEVELOPERS PARADISE',cx,155,27);text('SECURITY • AI • APPS',cx,195,18,'600');}
      else{text('HAxBRO',cx,110,42);text('YOUR AI GATEWAY',cx,160,27);text('TO GODENGINE',cx,198,27);}
      text(`${Math.ceil(p*100)}%`,W-24,H-30,12,'600','right');
      if(elapsed<total)requestAnimationFrame(frame);else{rec.stop();stream.getTracks().forEach(x=>x.stop());}
    }
    requestAnimationFrame(frame); await stopped;
    const blob=new Blob(chunks,{type:mime||'video/webm'}); if(currentVideoUrl)URL.revokeObjectURL(currentVideoUrl); currentVideoUrl=URL.createObjectURL(blob);
    let v=$('reelVideo');if(!v){v=document.createElement('video');v.id='reelVideo';v.controls=true;v.playsInline=true;v.className='reel-video';$('reelOutput')?.after(v);}
    v.src=currentVideoUrl;v.load();
    let dl=$('reelDownload');if(!dl){dl=document.createElement('a');dl.id='reelDownload';dl.className='reel-download';$('reelOutput')?.after(dl);}dl.href=currentVideoUrl;dl.download=`haxbro-reel-${Date.now()}.${(mime||'').includes('mp4')?'mp4':'webm'}`;dl.textContent='⬇ SAVE REEL';
    s.textContent=`✅ FREE ACTUAL REEL READY · ${(mime||'').includes('mp4')?'MP4':'WEBM'} · ${spec.duration}s`;
    v.scrollIntoView({behavior:'smooth',block:'center'});
  }

  $('reelGeneratePreview')?.addEventListener('click',async()=>{
    const idea=($('reelTopic')?.value||'').trim(),s=$('reelStatus'),o=$('reelOutput');
    if(!idea){s.textContent='Enter your reel idea first.';return;}
    if(pollTimer)clearTimeout(pollTimer);
    s.textContent='⚡ Building your FREE HAxBRO reel…';
    try{
      const spec=await plan(idea);
      o.textContent=`${spec.styleLabel} · ${spec.trend}\n\n${spec.scenes.map(x=>`${x.at}s–${x.end}s  ${x.text}`).join('\n')}`;
      await renderLocal(idea,spec,s);
    }catch(e){s.textContent=`Reel generation failed: ${e.message}`;}
  });
})();
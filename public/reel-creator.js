(() => {
  const $ = id => document.getElementById(id);
  let duration = 15;
  let pollTimer = null;
  function open(){const p=$('reelCreatorPanel');if(p){p.hidden=false;p.scrollIntoView({behavior:'smooth',block:'center'});$('reelTopic')?.focus();}}
  function close(){if(pollTimer)clearTimeout(pollTimer);$('reelCreatorPanel')?.setAttribute('hidden','');}
  ['reelCreatorBtn','mobileReelCreatorBtn'].forEach(id=>$(id)?.addEventListener('click',open));
  $('reelCreatorClose')?.addEventListener('click',close);
  document.querySelectorAll('#reelDurations button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#reelDurations button').forEach(x=>x.classList.remove('active'));b.classList.add('active');duration=Number(b.dataset.duration||15);}));

  $('reelCreate')?.addEventListener('click',async()=>{
    const idea=($('reelTopic')?.value||'').trim(),s=$('reelStatus'),o=$('reelOutput');
    if(!idea){s.textContent='Enter your reel idea first.';return;}
    s.textContent='Creating reel plan…';
    try{
      const r=await fetch('/api/reel-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idea,duration})});
      const d=await r.json(); if(!r.ok)throw Error(d.error||'Could not create reel');
      o.textContent=d.plan||''; s.textContent=`✅ Reel plan ready · ${d.duration}s`;
    }catch(e){s.textContent=`Reel plan failed: ${e.message}`;}
  });

  async function pollVideo(jobId,s){
    try{
      const r=await fetch(`/api/skeleton-video-status?jobId=${encodeURIComponent(jobId)}`);
      const d=await r.json();
      if(!r.ok)throw Error(d.error||'Could not check video status');
      if(d.status==='completed'&&d.videoUrl){
        let v=$('reelVideo');
        if(!v){v=document.createElement('video');v.id='reelVideo';v.controls=true;v.playsInline=true;v.className='reel-video';$('reelOutput')?.after(v);}
        v.src=d.videoUrl;v.load();s.textContent='✅ Actual reel generated. Play it below.';v.scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      if(['failed','cancelled','timeout','deleted'].includes(d.status))throw Error(d.error||`Generation ${d.status}`);
      s.textContent=`🎬 Generating actual reel… ${d.status||'processing'} · keep this panel open.`;
      pollTimer=setTimeout(()=>pollVideo(jobId,s),3500);
    }catch(e){s.textContent=`Video generation failed: ${e.message}`;}
  }

  $('reelGeneratePreview')?.addEventListener('click',async()=>{
    const idea=($('reelTopic')?.value||'').trim(),s=$('reelStatus');
    if(!idea){s.textContent='Enter your reel idea first.';return;}
    if(pollTimer)clearTimeout(pollTimer);
    s.textContent='🎬 Starting actual reel generation…';
    try{
      const r=await fetch('/api/skeleton-video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:idea})});
      const d=await r.json();
      if(!r.ok||!d.jobId)throw Error(d.error||'Video generation failed');
      s.textContent='🎬 Video job started. Generating your 5-second clip…';
      pollVideo(d.jobId,s);
    }catch(e){s.textContent=`Video generation failed: ${e.message}`;}
  });
})();
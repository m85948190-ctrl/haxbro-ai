const API='https://commons.wikimedia.org/w/api.php';
let cached=null,cachedAt=0;
function clean(v){return String(v||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,320)}
export async function getSkeletonReferences(){
 if(cached&&Date.now()-cachedAt<3600000)return cached;
 const refs=[];let cont='';
 try{
  for(let page=0;page<5&&refs.length<170;page++){
   const p=new URLSearchParams({action:'query',generator:'search',gsrsearch:'skeleton human anatomy',gsrnamespace:'6',gsrlimit:'50',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',format:'json',origin:'*'});
   if(cont)p.set('gsroffset',cont);
   const r=await fetch(API+'?'+p.toString(),{headers:{'user-agent':'HAxBRO-independent-reel-reference-bank/1.0'}});
   if(!r.ok)throw new Error('reference fetch failed');
   const j=await r.json();
   for(const x of Object.values(j?.query?.pages||{})){
    const ii=x?.imageinfo?.[0]||{},m=ii.extmetadata||{};
    const url=ii.thumburl||ii.url||'';
    if(url&&!refs.some(z=>z.url===url))refs.push({id:'skel-ref-'+String(refs.length+1).padStart(3,'0'),title:String(x.title||'').replace(/^File:/,''),url,source:'Wikimedia Commons',license:clean(m.LicenseShortName?.value||m.License?.value||'See source page'),description:clean(m.ImageDescription?.value||'Skeleton anatomy reference')});
    if(refs.length>=170)break;
   }
   const next=j?.continue?.gsroffset;
   if(next===undefined)break;
   cont=String(next);
  }
  cached=refs.slice(0,170);cachedAt=Date.now();return cached;
 }catch(e){return cached||[]}
}
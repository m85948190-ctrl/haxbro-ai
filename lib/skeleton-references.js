const API='https://commons.wikimedia.org/w/api.php';
let cached=null, cachedAt=0;
export async function getSkeletonReferences(){
  if(cached && Date.now()-cachedAt<3600000)return cached;
  const url=API+'?action=query&generator=categorymembers&gcmtitle=Category:Anatomy_of_the_human_skeletal_system&gcmtype=file&gcmlimit=170&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=640&format=json&origin=*';
  try{
    const r=await fetch(url,{headers:{'user-agent':'HAxBRO-independent-reel-reference-bank/1.0'}});
    if(!r.ok)throw new Error('Wikimedia reference fetch failed');
    const j=await r.json();
    const pages=Object.values(j?.query?.pages||{});
    const refs=pages.map((p,i)=>{
      const ii=p?.imageinfo?.[0]||{};
      const meta=ii?.extmetadata||{};
      return {id:'skel-ref-'+String(i+1).padStart(3,'0'),title:String(p.title||'').replace(/^File:/,''),url:ii.thumburl||ii.url||'',source:'Wikimedia Commons',license:String(meta.LicenseShortName?.value||meta.License?.value||'See source page'),description:String(meta.ImageDescription?.value||'Skeleton anatomy reference').replace(/<[^>]+>/g,'').slice(0,300)};
    }).filter(x=>x.url).slice(0,170);
    cached=refs;cachedAt=Date.now();return refs;
  }catch(e){
    return cached||[];
  }
}
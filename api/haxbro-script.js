export const access = "public";

export default async function (req, res) {
  try {
    const upstream = await fetch('https://haxbro.hatchable.site/script.js?v=263', { cache: 'no-store' });
    if (!upstream.ok) return res.status(502).send('HAxBRO client script unavailable');
    let code = await upstream.text();

    // Admin ULTIMAX is an explicit, in-session state. A normal page load must never inherit it.
    code = code.replace(
      "let overdrive=sessionStorage.getItem('haxbro_admin69_authenticated')==='true';",
      "let overdrive=false;sessionStorage.removeItem('haxbro_admin69_authenticated');sessionStorage.removeItem('haxbro_admin69_token');"
    );

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).send(code);
  } catch (e) {
    return res.status(502).send('HAxBRO client script proxy error');
  }
}
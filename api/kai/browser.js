import { browser } from 'hatchable';

export const access = 'admin';
export const methods = ['POST'];

function clean(value, max = 12000) {
  return String(value ?? '').replace(/\u0000/g, '').slice(0, max);
}

function normalizeUrl(value) {
  try {
    const u = new URL(value);
    return /^https?:$/i.test(u.protocol) ? u.toString() : '';
  } catch {
    return '';
  }
}

export default async function (req, res) {
  const body = req.body || {};
  const url = normalizeUrl(body.url);
  const clickText = clean(body.clickText, 300).trim();
  const typeSelector = clean(body.typeSelector, 300).trim();
  const typeText = clean(body.typeText, 1200);

  if (!url) return res.status(400).json({ error: 'A valid http(s) URL is required.' });
  if (clickText.length > 300) return res.status(400).json({ error: 'clickText is too long.' });
  if (typeSelector && !typeText) return res.status(400).json({ error: 'typeText is required when typeSelector is provided.' });

  try {
    const result = await browser.session(async page => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      if (typeSelector) {
        await page.waitForSelector(typeSelector, { timeout: 10000 });
        await page.click(typeSelector);
        await page.type(typeSelector, typeText, { delay: 20 });
      }

      if (clickText) {
        const clicked = await page.evaluate((wanted) => {
          const target = wanted.trim().toLowerCase();
          const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],input[type="submit"],input[type="button"]'));
          const el = candidates.find(node => {
            const text = (node.innerText || node.textContent || node.value || '').trim().toLowerCase();
            return text === target || text.includes(target);
          });
          if (!el) return false;
          el.click();
          return true;
        }, clickText);
        if (!clicked) return { ok: false, url: await page.url(), title: await page.title(), error: `Could not find a clickable element matching: ${clickText}` };
        await new Promise(resolve => setTimeout(resolve, 700));
      }

      const title = await page.title();
      const finalUrl = await page.url();
      const text = await page.$eval('body', el => (el.innerText || el.textContent || '').trim().slice(0, 8000)).catch(() => '');
      return { ok: true, url: finalUrl, title, text };
    });

    res.json({
      kai: 'KAI 5 · BROWSER',
      ...result,
      note: 'Browser actions run through managed Chromium. CAPTCHA, authentication bypass, and security-control evasion are not performed.'
    });
  } catch (error) {
    res.status(502).json({ error: clean(error?.message || error, 1200) });
  }
}
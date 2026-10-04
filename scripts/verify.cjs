// Serves site/ on a free port, screenshots every page at desktop and 390px into docs/screens,
// fails on console errors or horizontal scroll, and opens a sample of the club deep links
// in a real browser to prove they land on a real page (Rule 15: every link works).
// Run: node scripts/verify.cjs   (needs Playwright; PW env var can point at its install)
const { chromium } = require(process.env.PW || 'C:/gw3-build/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(b); } });
});
(async () => {
  await new Promise((res) => srv.listen(0, res));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const shots = path.join(__dirname, '..', 'docs', 'screens');
  fs.mkdirSync(shots, { recursive: true });
  const b = await chromium.launch();
  let bad = 0;
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: label === '390' ? 2 : 1 });
    for (const pg of ['index', 'tour', 'club', 'contact']) {
      const p = await ctx.newPage(); const errs = [];
      p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(base + pg + '.html', { waitUntil: 'networkidle' });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
      await p.waitForLoadState('networkidle');
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const file = path.join(shots, `${pg}-${label}.png`);
      await p.screenshot({ path: file, fullPage: true });
      const ok = !errs.length && over <= 0;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${pg} @${label} overflow=${over} errors=${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
      await p.close();
    }
    await ctx.close();
  }
  // club deep links: one of each kind the site emits
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8') + fs.readFileSync(path.join(root, 'club.html'), 'utf8');
  const pick = (re) => (html.match(re) || [])[0];
  const links = [pick(/https:\/\/black-cat\.club\/show\/[^"]+/), pick(/https:\/\/black-cat\.club\/albums\/[^"]+/),
    'https://black-cat.club/vault', 'https://black-cat.club/pricing', 'https://black-cat.club/performances', 'https://black-cat.club/join', 'https://black-cat.club/support'].filter(Boolean);
  const p = await b.newPage();
  for (const u of links) {
    await p.goto(u, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const t = await p.title(), body = await p.evaluate(() => document.body.innerText);
    const ok = !/not found/i.test(t) && !/page not found|couldn.t find|could not find/i.test(body.slice(0, 4000));
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${u} -> "${t}"`);
  }
  await b.close(); srv.close();
  process.exitCode = bad ? 1 : 0;
})();

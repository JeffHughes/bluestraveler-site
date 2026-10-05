// Renders the site into site/ from data/site.json (written by scripts/snapshot.mjs).
// Every page is plain static HTML; the only script is the pick-one pills (assets/site.js).
// Run: node scripts/build.mjs
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const out = new URL('site/', root);
const data = JSON.parse(await readFile(new URL('data/site.json', root), 'utf8'));

const CLUB = 'https://black-cat.club';
const LINKS = {
  store: 'https://store.bluestraveler.com/',
  videos: 'https://www.youtube.com/@BluesTraveler',
  nugs: 'https://www.nugs.net/blues-traveler-concerts-live-downloads-in-mp3-flac-or-online-music-streaming-1/?utm_source=artist_bt&utm_medium=site&utm_campaign=bt_web&utm_term=bt-site-artistpage',
  facebook: 'https://www.facebook.com/bluestraveler',
  instagram: 'https://www.instagram.com/bluestraveler',
  spotify: 'https://open.spotify.com/artist/3pHeBYl1yujXcZqqfF1UyQ',
  apple: 'https://music.apple.com/us/artist/blues-traveler/94681?uo=4',
  seatedFollow: 'https://go.seated.com/notifications/welcome/0cf4d487-c6af-42c5-9e3e-3fa0eed41d9b',
  newsletter: 'https://www.bluestraveler.com/',          // the band's own MailChimp form (every page footer)
  privacy: 'https://www.bluestraveler.com/privacy',
  official: 'https://www.bluestraveler.com/',
  pricing: `${CLUB}/pricing`,
  vault: `${CLUB}/vault`,
  performances: `${CLUB}/performances`,
  albums: `${CLUB}/albums`,
  repo: 'https://github.com/JeffHughes/bluestraveler-site',
};

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** Tight M/D/YY (global UI rule). '2026-10-09' -> '10/9/26'. A year-only or month-only date keeps what it has. */
function md(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!m) return String(y);
  if (!d) return `${m}/${String(y).slice(2)}`;
  return `${m}/${d}/${String(y).slice(2)}`;
}
const place = (s) => [s.city, s.state || s.country].filter(Boolean).join(', ');
const showUrl = (s) => `${CLUB}/show/${encodeURIComponent(s.slug)}`;
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;
const n = (x) => Number(x).toLocaleString('en-US');
const icon = async (name) => (await readFile(new URL(`assets/icons/${name}.svg`, root), 'utf8'))
  .replace(/<title>.*?<\/title>/, '').replace('<svg ', '<svg aria-hidden="true" focusable="false" fill="currentColor" ');
const ICONS = Object.fromEntries(await Promise.all(['facebook', 'instagram', 'spotify', 'applemusic', 'youtube'].map(async (k) => [k, await icon(k)])));
const ext = 'target="_blank" rel="noopener"';

const vault = data.vault;
const vaultShows = vault?.shows ?? [];
const byDateDesc = [...vaultShows].sort((a, b) => b.date.localeCompare(a.date));
const newestOut = vault?.recent ?? [];   // the api's own order: newest out first
const today = new Date().toISOString().slice(0, 10);

// ---------- layout ----------
const NAV = [
  ['index.html', 'Home'], ['tour.html', 'Tour'], ['club.html', 'Black Cat Club', 'club'],
  [LINKS.store, 'Store', 'ext'], [LINKS.videos, 'Videos', 'ext'], [LINKS.nugs, 'Live Broadcasts', 'ext'], ['contact.html', 'Contact'],
];
function nav(current, cls) {
  return NAV.map(([href, label, kind]) => {
    const isExt = href.startsWith('http');
    const c = [kind === 'club' ? 'club' : '', isExt ? 'ext' : ''].filter(Boolean).join(' ');
    return `<a href="${href}"${c ? ` class="${c}"` : ''}${href === current ? ' aria-current="page"' : ''}${isExt ? ` ${ext}` : ''}>${label}</a>`;
  }).join('');
}

function layout({ file, title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#07090d">
<meta name="robots" content="noindex">
<link rel="icon" href="assets/band/favicon.webp">
<link rel="preload" href="assets/club/bigshoulders-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script src="assets/site.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/band/logo.webp" alt="Blues Traveler" width="1500" height="802"></a>
    <nav class="nav" aria-label="Main">${nav(file)}</nav>
    <details class="menu"><summary aria-label="Menu">Menu</summary><nav class="drawer" aria-label="Main">${nav(file)}</nav></details>
  </div>
</header>
<main id="main">
${body}
</main>
<footer>
  <div class="wrap">
    <div class="cols">
      <div>
        <h3>Follow Blues Traveler</h3>
        <div class="social">
          <a href="${LINKS.facebook}" ${ext} aria-label="Facebook">${ICONS.facebook}</a>
          <a href="${LINKS.instagram}" ${ext} aria-label="Instagram">${ICONS.instagram}</a>
          <a href="${LINKS.spotify}" ${ext} aria-label="Spotify">${ICONS.spotify}</a>
          <a href="${LINKS.apple}" ${ext} aria-label="Apple Music">${ICONS.applemusic}</a>
          <a href="${LINKS.videos}" ${ext} aria-label="YouTube">${ICONS.youtube}</a>
        </div>
      </div>
      <div>
        <h3>Newsletter</h3>
        <p>News and updates from the band. <a href="${LINKS.newsletter}" ${ext}>Sign up on bluestraveler.com</a>.</p>
      </div>
      <div>
        <h3>Black Cat Club</h3>
        <ul>
          <li><a href="club.html">What it is</a></li>
          <li><a href="${LINKS.vault}" ${ext}>The Vault</a></li>
          <li><a href="${LINKS.pricing}" ${ext}>Join</a></li>
        </ul>
      </div>
      <div>
        <h3>Where to listen</h3>
        <p>${whereToListen}</p>
      </div>
    </div>
    <p class="proposal">&copy; Blues Traveler ${new Date().getUTCFullYear()} &middot; <a href="${LINKS.privacy}" ${ext}>Privacy policy</a><br>
      A proposed redesign of <a href="${LINKS.official}" ${ext}>bluestraveler.com</a> that adds the Black Cat Club, made for the band. This is not the official site.
      Band logo, photo and artwork are the band's own, from bluestraveler.com; band photo by Graham Fielder.
      Tour dates from Seated; archive and prices from <a href="${CLUB}" ${ext}>black-cat.club</a>, as of ${md(data.generatedUtc.slice(0, 10))}.
      <a href="${LINKS.repo}" ${ext}>Source</a>.</p>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- shared blocks ----------
function tourRows(events, { limit } = {}) {
  if (!data.tour) return `<p class="fail">We could not reach the tour listing when this page was built. <a href="${LINKS.seatedFollow}" ${ext}>Get notified of new dates</a>.</p>`;
  const list = events.filter((e) => e.date >= today).slice(0, limit ?? Infinity);
  if (!list.length) return `<p class="fail">No dates announced right now. <a href="${LINKS.seatedFollow}" ${ext}>Get notified when new ones are</a>.</p>`;
  return `<div class="rows">${list.map((e) => {
    const [city, st] = e.where.split(', ');
    const tonight = vaultShows.find((s) => s.date === e.date);
    const here = byDateDesc.filter((s) => s.city === city && s.state === st);
    const relive = tonight
      ? `<a class="btn ghost sm" href="${showUrl(tonight)}" ${ext}>Relive this show</a>`
      : here.length ? `<a class="btn ghost sm" href="${showUrl(here[0])}" ${ext} title="${esc(here[0].venue)}">Relive ${md(here[0].date)} in ${esc(city)}</a>` : '';
    return `<div class="row">
      <div class="d">${md(e.date)}</div>
      <div><div class="v">${esc(e.venue)}</div>${e.details ? `<div class="w">${esc(e.details)}</div>` : ''}</div>
      <div class="w">${esc(e.where)}</div>
      <div class="acts">${relive}${e.soldOut ? '<span class="btn sm" aria-disabled="true">Sold out</span>' : `<a class="btn sm" href="${e.tickets}" ${ext}>Tickets</a>`}</div>
    </div>`;
  }).join('')}</div>`;
}

function vaultCards(list) {
  return `<div class="cards">${list.map((s) => `<a class="card" href="${showUrl(s)}" ${ext}>
    <span class="d">${md(s.date)}</span>
    <b>${esc(s.eventName || s.venue)}</b>
    <span class="w">${esc(s.eventName ? `${s.venue}, ${place(s)}` : place(s))}</span>
    <span class="go">Relive this show &rarr;</span></a>`).join('')}</div>`;
}

const vaultFail = `<p class="fail">We could not reach the Black Cat Club archive when this page was built, so the nights are not listed here. <a href="${LINKS.vault}" ${ext}>Open the Vault on black-cat.club</a>.</p>`;

function clubFacts() {
  const f = [];
  if (vault) f.push(`<div class="fact"><b>${n(vault.nights)}</b><span>soundboard nights out of the vault, ${vault.firstYear}&ndash;${vault.lastYear}</span></div>`);
  f.push(`<div class="fact"><b>Every album</b><span>start to finish</span></div>`);
  const show = data.pricing?.show;
  if (show) f.push(`<div class="fact"><b>${usd(show.priceCents)}</b><span>one night, yours for keeps</span></div>`);
  const gold = data.pricing?.plans.find((p) => p.id === 'gold-monthly');
  if (gold) f.push(`<div class="fact"><b>${usd(gold.priceCents)}/mo</b><span>Gold: every show and album</span></div>`);
  return `<div class="facts">${f.join('')}</div>`;
}

const clubBand = `<section class="club-band" aria-labelledby="bcc-h">
  <div class="wrap club-grid">
    <img class="cat" src="assets/club/bcc-cat.png" alt="" width="148" height="148">
    <div>
      <div class="kick">The official archive and fan club</div>
      <h2 id="bcc-h">The Black Cat Club</h2>
      <p class="lede">Blues Traveler live shows and albums - whole nights, real setlists, and a player that puts you back in the room.
        Every show and every album, start to finish, plus chat rooms for every show, venue and album.</p>
      ${clubFacts()}
      <div class="hero cta" style="background:none;margin-top:22px">
        <a class="btn gold" href="${LINKS.pricing}" ${ext}>Join the club</a>
        <a class="btn ghost" href="club.html">What you get</a>
        <a class="btn ghost" href="${LINKS.vault}" ${ext}>Open the Vault</a>
      </div>
    </div>
  </div>
</section>`;

function albumGrid() {
  if (!data.albums?.length) return `<p class="fail">We could not reach the album list when this page was built. <a href="${LINKS.albums}" ${ext}>Every album on black-cat.club</a>.</p>`;
  return `<div class="albums">${data.albums.map((a) => `<a class="album" href="${CLUB}/albums/${encodeURIComponent(a.id)}" ${ext}>
    <img src="${esc(a.cover)}" alt="" loading="lazy" width="640" height="640"><b>${esc(a.title)}</b><span>${esc(a.year)}</span></a>`).join('')}</div>`;
}

// Where to listen (Jeff 2026-10-04): complementary, never competitive or exclusive; no nugs show counts.
const whereToListen = `Live broadcasts stream on <a href="${LINKS.nugs}" ${ext}>nugs</a>. The full live archive, soundboards from across the years, lives in the <a href="${CLUB}" ${ext}>Black Cat Club</a>. Studio albums are on <a href="${LINKS.spotify}" ${ext}>Spotify</a> and everywhere you listen.`;
const listen = `<div class="listen">
  <a class="club" href="${LINKS.vault}" ${ext}><img src="assets/club/bcc-cat.png" alt="" width="28" height="28"> The full live archive on the Black Cat Club</a>
  <a href="${LINKS.nugs}" ${ext}><img class="nugs" src="assets/band/nugs-white.webp" alt="" width="72" height="19"> Live broadcasts on nugs</a>
  <a href="${LINKS.spotify}" ${ext}>${ICONS.spotify} Studio albums on Spotify</a>
  <a href="${LINKS.apple}" ${ext}>${ICONS.applemusic} Apple Music</a>
  <a href="${LINKS.videos}" ${ext}>${ICONS.youtube} Videos on YouTube</a>
</div>`;

// ---------- pages ----------
const pages = [];

pages.push({
  file: 'index.html', title: 'Blues Traveler',
  description: 'Blues Traveler - tour dates, music, the store, and the Black Cat Club: every show and every album.',
  body: `<section class="hero" aria-label="Blues Traveler">
  <img class="photo" src="assets/band/band-graham-fielder.webp" alt="Blues Traveler, the five members in black and white" width="1500" height="1000" fetchpriority="high">
  <span class="credit">Photo: Graham Fielder</span>
  <div class="over">
    <h1 class="sr">Blues Traveler</h1>
    <img class="logo" src="assets/band/logo.webp" alt="" width="1500" height="802">
    <img class="est" src="assets/band/est-1987.webp" alt="Est. 1987, Princeton, NJ" width="1400" height="206">
    <div class="cta">
      <a class="btn" href="tour.html">Tour dates</a>
      <a class="btn gold" href="club.html">Black Cat Club</a>
      <a class="btn ghost" href="${LINKS.store}" ${ext}>Store</a>
    </div>
  </div>
</section>
<section aria-labelledby="tour-h"><div class="wrap">
  <div class="head"><h2 id="tour-h">Tour dates</h2><a class="btn ghost" href="${LINKS.seatedFollow}" ${ext}>Follow Blues Traveler</a></div>
  ${tourRows(data.tour ?? [], { limit: 6 })}
  <p class="note" style="margin-top:12px">Get notified when new events are announced in your area. <a href="tour.html">All dates and past shows</a>.</p>
</div></section>
${clubBand}
<section aria-labelledby="vault-h"><div class="wrap">
  <div class="head"><div><div class="kick">The Soundboard Vault</div><h2 id="vault-h">Just out of the vault</h2></div>
    <a class="btn ghost" href="${LINKS.vault}" ${ext}>The whole Vault</a></div>
  ${vault ? vaultCards(newestOut.slice(0, 8)) : vaultFail}
</div></section>
<section aria-labelledby="albums-h"><div class="wrap">
  <div class="head"><h2 id="albums-h">Every album</h2><a class="btn ghost" href="${LINKS.albums}" ${ext}>Play them on the Black Cat Club</a></div>
  ${albumGrid()}
</div></section>
<section aria-labelledby="listen-h"><div class="wrap">
  <div class="head"><div><h2 id="listen-h">Where to listen</h2><p class="lede">${whereToListen}</p></div></div>
  ${listen}
</div></section>`,
});

const decades = [...new Set(byDateDesc.map((s) => `${s.date.slice(0, 3)}0s`))];
pages.push({
  file: 'tour.html', title: 'Tour - Blues Traveler',
  description: 'Blues Traveler tour dates and tickets, and past shows to relive on the Black Cat Club.',
  body: `<section aria-labelledby="up-h"><div class="wrap">
  <div class="head"><h1 id="up-h" style="font-size:clamp(48px,9vw,96px)">Tour dates</h1>
    <a class="btn ghost" href="${LINKS.seatedFollow}" ${ext}>Follow Blues Traveler</a></div>
  ${tourRows(data.tour ?? [])}
  <p class="note" style="margin-top:12px">Get notified when new events are announced in your area. Tickets through Seated.</p>
</div></section>
<section class="club-band" aria-labelledby="past-h"><div class="wrap">
  <div class="head"><div><div class="kick">Black Cat Club</div><h2 id="past-h">Past shows</h2>
    <p class="lede">Soundboard nights out of the vault, newest show first. Every one plays start to finish for Gold members.</p></div>
    ${decades.length > 1 ? `<div class="seg" role="group" aria-label="Decade" data-filter="past">
      <button type="button" aria-pressed="true" data-v="all">All</button>${decades.map((d) => `<button type="button" aria-pressed="false" data-v="${d}">${d.slice(2)}</button>`).join('')}</div>` : ''}
  </div>
  ${vault ? `<div class="rows" data-list="past">${byDateDesc.map((s) => `<div class="row" data-k="${s.date.slice(0, 3)}0s">
      <div class="d">${md(s.date)}</div>
      <div class="v">${esc(s.eventName || s.venue)}${s.eventName ? `<div class="w">${esc(s.venue)}</div>` : ''}</div>
      <div class="w">${esc(place(s))}</div>
      <div class="acts"><a class="btn ghost sm" href="${showUrl(s)}" ${ext}>Relive this show</a></div></div>`).join('')}</div>` : vaultFail}
  <div class="hero cta" style="background:none;margin-top:22px"><a class="btn gold" href="${LINKS.pricing}" ${ext}>Join the club</a>
    <a class="btn ghost" href="${LINKS.performances}" ${ext}>Browse by date, venue and tour</a></div>
</div></section>`,
});

// Club copy is the club's own, verbatim: 2026-08-rts-v2 web/src/app/checkout/pricing.ts (TIER_FEATURES,
// GOLD_BLURB, PLATINUM_BLURB, FREE_BLURB, MUSIC_PLANS, showOfferLine) and pages/terms.ts (the invite month).
const P = data.pricing;
const plan = (id) => P?.plans.find((p) => p.id === id);
function tierPrice(tier) {
  const m = plan(`${tier}-monthly`), a = plan(`${tier}-annual`);
  return `<div class="price" data-period="monthly">${usd(m.priceCents)}<small> /month</small></div>
    <div class="price" data-period="annual" hidden>${usd(a.priceCents)}<small> /year</small></div>`;
}
const TIERS = {
  free: { blurb: "The door's open. Enough of every night to know which ones you need.",
    features: ['29-second previews, up to 20 songs', 'Browse the whole catalog', 'Setlists and stories', 'Chat rooms for every show, venue and album'] },
  gold: { blurb: 'The whole night, every night. Full-length listening at 128 kbps, opener to encore.',
    features: ['Every show and album, start to finish', '128 kbps listening', '1,000 tokens a month', 'Chat rooms for every show, venue and album', 'Friends and direct messages'] },
  platinum: { blurb: 'Everything in Gold, plus 192 kbps when a night has a real master - and the VIP side of the club.',
    features: ['Everything in Gold', '192 kbps listening, when available', '2,500 tokens a month', 'VIP access to shows and meet-and-greets', 'Free gifts and merch', 'Entry into member drawings', 'Other cool cat stuff'] },
};
const li = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
const pricingBlock = !P ? `<p class="fail">We could not reach the club's price list when this page was built. <a href="${LINKS.pricing}" ${ext}>See prices on black-cat.club</a>.</p>` : `
  <div class="head"><h2 id="tiers-h">Membership</h2>
    <div class="seg" role="group" aria-label="Billing period" data-filter="period">
      <button type="button" aria-pressed="true" data-v="monthly">Monthly</button><button type="button" aria-pressed="false" data-v="annual">Annual</button></div></div>
  <div class="tiers">
    <div class="tier"><h3>Free</h3><div class="price">$0</div><p>${esc(TIERS.free.blurb)}</p>${li(TIERS.free.features)}
      <a class="btn ghost" href="${CLUB}" ${ext}>Walk in</a></div>
    <div class="tier gold"><span class="ribbon">The whole shebang - let's boogie</span><h3>Gold</h3>${tierPrice('gold')}<p>${esc(TIERS.gold.blurb)}</p>${li(TIERS.gold.features)}
      <a class="btn gold" href="${LINKS.pricing}" ${ext}>Go Gold</a></div>
    <div class="tier"><span class="ribbon">VIP</span><h3>Platinum</h3>${tierPrice('platinum')}<p>${esc(TIERS.platinum.blurb)}</p>${li(TIERS.platinum.features)}
      <a class="btn" href="${LINKS.pricing}" ${ext}>Go Platinum</a></div>
  </div>
  ${P.taxExclusive ? '<p class="note" style="margin-top:12px">Prices are before tax. Applicable sales tax is added at checkout.</p>' : ''}
  <div class="split" style="margin-top:28px">
    <div class="box"><div class="kick">Try it</div><h3>One night, ${usd(P.show.priceCents)}</h3>
      <p>Buy a single show and it's yours for keeps, plus a month of every show and album - one trial month per person a year.</p>
      <a class="btn ghost" href="${LINKS.performances}" ${ext}>Pick a night</a></div>
    <div class="box"><div class="kick">Invited by a member?</div><h3>Your first month is free</h3>
      <p>A member can invite you. When you start a paid plan, your first month is free - a 30-day trial, with a card given up front, one trial per person per year.</p>
      <a class="btn ghost" href="${CLUB}/join" ${ext}>Accept an invite</a></div>
    <div class="box"><div class="kick">Just the music</div><h3>Without the club</h3>
      <p>The same listening, without the club. Billed monthly.</p>
      <ul style="margin:0;padding-left:20px"><li>Music Basic, ${usd(plan('music-basic-monthly').priceCents)}/month - every night, full-length at 128 kbps</li>
        <li>Music Plus, ${usd(plan('music-plus-monthly').priceCents)}/month - every night, 192 kbps when a night has a real master</li></ul>
      <a class="btn ghost" href="${LINKS.pricing}" ${ext}>See music-only plans</a></div>
  </div>`;

pages.push({
  file: 'club.html', title: 'Black Cat Club - Blues Traveler',
  description: 'The Black Cat Club: every Blues Traveler show and every album, start to finish. Gold membership, a one-night trial, and the Soundboard Vault.',
  body: `${clubBand}
<section aria-labelledby="tiers-h"><div class="wrap">${pricingBlock}</div></section>
<section aria-labelledby="vault2-h" style="padding-top:0"><div class="wrap">
  <div class="head"><div><div class="kick">The Soundboard Vault</div><h2 id="vault2-h">Out of the vault</h2>
    <p class="lede">${vault ? `${n(vault.nights)} nights out so far, from ${vault.firstYear} to ${vault.lastYear}, with more being brought out and dusted off every week.` : ''}</p></div>
    <a class="btn ghost" href="${LINKS.vault}" ${ext}>The whole Vault</a></div>
  ${vault ? vaultCards(newestOut.slice(0, 12)) : vaultFail}
</div></section>
<section class="club-band" aria-labelledby="join-h"><div class="wrap">
  <h2 id="join-h">Every cat gets in.</h2>
  <p class="lede">Free to walk in.${P ? ` One night ${usd(P.show.priceCents)}. Gold from ${usd(plan('gold-monthly').priceCents)} a month.` : ''}</p>
  <div class="hero cta" style="background:none;margin-top:22px"><a class="btn gold" href="${LINKS.pricing}" ${ext}>Join the Black Cat Club</a>
    <a class="btn ghost" href="${CLUB}" ${ext}>Look around first</a></div>
</div></section>`,
});

pages.push({
  file: 'contact.html', title: 'Contact - Blues Traveler',
  description: 'Booking and management contacts for Blues Traveler.',
  body: `<section aria-labelledby="c-h"><div class="wrap">
  <h1 id="c-h" style="font-size:clamp(48px,9vw,96px);margin-bottom:28px">Contact</h1>
  <div class="people">
    <div class="box"><div class="kick">Booking agent</div><h3>Jeffrey Hasson</h3><p>United Talent</p>
      <a class="btn ghost" href="mailto:jeffrey.hasson@unitedtalent.com">Email booking</a></div>
    <div class="box"><div class="kick">Management</div><h3>Jeff Castelaz</h3><p>Cast Management</p>
      <a class="btn ghost" href="mailto:bluestraveler@castmgmt.com">Email management</a></div>
    <div class="box"><div class="kick">Black Cat Club</div><h3>Members and fans</h3><p>Help with a membership, the player or the archive.</p>
      <a class="btn ghost" href="${CLUB}/support" ${ext}>Club support</a></div>
  </div>
</div></section>`,
});

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('assets/', root), new URL('assets/', out), { recursive: true });
await writeFile(new URL('.nojekyll', out), '');
for (const p of pages) await writeFile(new URL(p.file, out), layout(p));
console.log(`built ${pages.length} pages -> site/ (tour ${data.tour?.length ?? 'n/a'}, vault ${vault?.nights ?? 'n/a'}, albums ${data.albums?.length ?? 'n/a'})`);

// Pulls every number and listing the site shows from its real source and writes data/site.json.
//   tour dates  - Seated, the same widget bluestraveler.com embeds (artist 0cf4d487-...)
//   the vault   - the Black Cat Club's public api (catalog/vault, albums)
//   prices      - the club's one price file, https://black-cat.club/assets/pricing.json
// No fallbacks are invented: a source that fails leaves its key null and the page says so.
// Run: node scripts/snapshot.mjs   (Node 18+, no dependencies)
import { readFile, writeFile } from 'node:fs/promises';

const SEATED_ARTIST = '0cf4d487-c6af-42c5-9e3e-3fa0eed41d9b';
const API = 'https://func-rts-api-rts26.azurewebsites.net/api';
const CLUB = 'https://black-cat.club';
const H = { 'X-Org-Id': 'org-bt', Accept: 'application/json' };

async function json(url, headers = {}) {
  let last;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers }).catch((e) => ({ ok: false, status: e.message }));
    if (r.ok) return r.json();
    last = `${r.status} ${url}`;
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));   // the api cold-starts / redeploys
  }
  throw new Error(last);
}

async function tour() {
  const t = await json(`https://cdn.seated.com/api/tour/${SEATED_ARTIST}?include=tour-events`);
  return (t.included ?? [])
    .filter((e) => e.type === 'tour-events')
    .map((e) => ({
      id: e.id,
      date: e.attributes['starts-at-date-local'],
      venue: e.attributes['venue-name'],
      where: e.attributes['formatted-address'],
      details: e.attributes.details,
      soldOut: !!e.attributes['is-sold-out'],
      tickets: `https://link.seated.com/${e.id}`,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function paged(path) {
  const all = [];
  for (let skip = 0; ; skip += 200) {
    const p = await json(`${API}/${path}${path.includes('?') ? '&' : '?'}take=200&skip=${skip}`, H);
    all.push(...p.items);
    if (all.length >= p.total || !p.items.length) return all;
  }
}

async function vault() {
  // catalog/vault is the live count and the newest-out list (capped at 50 by the api);
  // every night with audio comes from catalog/shows?hasAudio=true, joined to its venue.
  const v = await json(`${API}/catalog/vault?take=50`, H);
  const [shows, venues] = await Promise.all([paged('catalog/shows?hasAudio=true'), paged('catalog/venues')]);
  const ven = new Map(venues.map((x) => [x.id, x]));
  return {
    nights: v.nights, firstYear: v.firstYear, lastYear: v.lastYear, asOfUtc: v.asOfUtc,
    recent: v.recent.map((s) => ({
      slug: s.slug, date: s.date, venue: s.venue, city: s.city, state: s.state, country: s.country,
      eventName: s.eventName, added: s.addedAtUtc,
    })),
    shows: shows.filter((s) => !s.sai).map((s) => {
      const x = ven.get(s.venueId) ?? {};
      return { slug: s.slug, date: s.date, venue: x.name || null, city: x.city ?? null, state: x.state ?? null, country: x.country ?? null, eventName: s.eventName };
    }),
  };
}

async function albums() {
  const a = await json(`${API}/albums?take=200`, H);
  return a.items
    .filter((x) => x.albumType === 'album' && !x.foreignRelease && x.albumArtist === 'Blues Traveler')
    .map((x) => ({ id: x.id, slug: x.slug, title: x.title, year: String(x.releaseDate).slice(0, 4), cover: x.coverUrl }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

async function pricing() {
  return json(`${CLUB}/assets/pricing.json`);
}

// A source that is down keeps its last good pull (still real data, with the time it was taken);
// one that has never been pulled stays null.
const file = new URL('../data/site.json', import.meta.url);
const prev = await readFile(file, 'utf8').then(JSON.parse).catch(() => ({}));
const now = new Date().toISOString();
const out = { generatedUtc: now, sources: {} };
for (const [k, f] of Object.entries({ tour, vault, albums, pricing })) {
  try { out[k] = await f(); out.sources[k] = { ok: true, pulledUtc: now }; }
  catch (e) {
    out[k] = prev[k] ?? null;
    out.sources[k] = { ok: false, error: String(e.message), pulledUtc: prev.sources?.[k]?.pulledUtc ?? null };
    console.error(k, e.message);
  }
}
await writeFile(file, JSON.stringify(out, null, 1) + '\n');
console.log(`tour ${out.tour?.length ?? 'FAILED'} | vault ${out.vault?.nights ?? 'FAILED'} | albums ${out.albums?.length ?? 'FAILED'} | pricing ${out.pricing ? 'ok' : 'FAILED'}`);

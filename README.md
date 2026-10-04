# bluestraveler-site

**A proposed redesign of [bluestraveler.com](https://www.bluestraveler.com/) that adds the Black Cat Club, made for the band. This is not the official Blues Traveler site.**

Preview: https://jeffhughes.github.io/bluestraveler-site/

## What it keeps
Everything bluestraveler.com does today: tour dates with ticket links (Seated) and the "follow for new dates" sign-up,
the store, videos (YouTube), live music on nugs.net, Spotify and Apple Music, Facebook and Instagram, the newsletter
sign-up, the booking and management contacts, and the privacy policy.

## What it adds: the Black Cat Club
[black-cat.club](https://black-cat.club) is the Blues Traveler archive and fan club: every show and every album, start to finish.
- a **Black Cat Club** nav item and page: what the club is, Free / Gold / Platinum with monthly and annual prices,
  the one-night trial, the invited-friend free month, and the music-only plans
- **Relive this show** links from past-show listings (and from a tour date, once that night is in the vault) into black-cat.club
- **Just out of the vault** - the newest soundboard nights - and every album
- a join call to action on every page

## Where every fact comes from
Nothing on these pages is typed in by hand. `scripts/snapshot.mjs` pulls it and writes `data/site.json`:

| What | Source |
|---|---|
| Tour dates, tickets | Seated - the same widget bluestraveler.com embeds |
| Vault nights, albums | the Black Cat Club's public catalog API |
| Prices | the club's single price file, https://black-cat.club/assets/pricing.json |
| Plan copy | the club's own wording (`2026-08-rts-v2` web/src/app/checkout/pricing.ts) |

If a source is down, the last good pull is kept; if there has never been one, the page says it could not reach it.
A GitHub Action re-pulls and republishes every day.

## Credits
Band logo, "Est. 1987 - Princeton, NJ" artwork, band photo (Graham Fielder) and favicon are the band's own, from bluestraveler.com.
Black Cat Club cat and fonts (Big Shoulders, Archivo) are from black-cat.club. Social icons: Simple Icons (CC0).

## Run it
```
node scripts/snapshot.mjs   # pull data/site.json
node scripts/build.mjs      # render site/
node scripts/verify.cjs     # serve site/, screenshot desktop + 390px into docs/screens, check every club link
```
Plain HTML and CSS, one small script for the pick-one pills, no dependencies. Hosts free on GitHub Pages or Netlify.

## Screens
| | Desktop | 390px |
|---|---|---|
| Home | [index-desktop](docs/screens/index-desktop.png) | [index-390](docs/screens/index-390.png) |
| Tour | [tour-desktop](docs/screens/tour-desktop.png) | [tour-390](docs/screens/tour-390.png) |
| Black Cat Club | [club-desktop](docs/screens/club-desktop.png) | [club-390](docs/screens/club-390.png) |
| Contact | [contact-desktop](docs/screens/contact-desktop.png) | [contact-390](docs/screens/contact-390.png) |

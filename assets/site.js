// The only script on the site: segmented pills. Without it the page still reads
// (monthly prices and every past show are shown by default).
document.querySelectorAll('.seg[data-filter]').forEach((seg) => {
  const kind = seg.dataset.filter;
  seg.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-v]');
    if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const v = b.dataset.v;
    if (kind === 'period') {
      document.querySelectorAll('[data-period]').forEach((el) => { el.hidden = el.dataset.period !== v; });
    } else {
      document.querySelectorAll(`[data-list="${kind}"] > [data-k]`).forEach((el) => { el.hidden = v !== 'all' && el.dataset.k !== v; });
    }
  });
});

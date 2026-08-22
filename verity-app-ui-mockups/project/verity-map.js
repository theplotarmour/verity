// <verity-map> — operational site map. Real geometry (Natural Earth via world-atlas), no hand-drawn coastlines.
const SITES = [
  { n: "Delhi", c: [77.21, 28.61], v: 6, s: "ok" },
  { n: "Noida", c: [77.39, 28.53], v: 4, s: "warn" },
  { n: "Gurgaon", c: [77.03, 28.46], v: 5, s: "dg" },
  { n: "Jaipur", c: [75.79, 26.91], v: 2, s: "ok" },
  { n: "Ahmedabad", c: [72.57, 23.02], v: 3, s: "ok" },
  { n: "Mumbai", c: [72.88, 19.08], v: 7, s: "ok" },
  { n: "Pune", c: [73.86, 18.52], v: 3, s: "ok" },
  { n: "Hyderabad", c: [78.49, 17.38], v: 4, s: "ok" },
  { n: "Bengaluru", c: [77.59, 12.97], v: 5, s: "warn" },
  { n: "Chennai", c: [80.27, 13.08], v: 3, s: "ok" },
  { n: "Kolkata", c: [88.36, 22.57], v: 2, s: "ok" },
  { n: "Lucknow", c: [80.95, 26.85], v: 2, s: "ok" }
];

class VerityMap extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";
    this.style.position = "relative";
    this._boot();
    this._ro = new ResizeObserver(() => this._draw());
    this._ro.observe(this);
  }
  disconnectedCallback() { if (this._ro) this._ro.disconnect(); }

  async _boot() {
    for (let i = 0; i < 200 && !(window.d3 && window.topojson); i++) await new Promise(r => setTimeout(r, 50));
    if (!window.d3 || !window.topojson) return;
    if (!VerityMap._geo) {
      VerityMap._geo = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
        .then(r => r.json())
        .then(t => window.topojson.feature(t, t.objects.countries));
    }
    this._features = await VerityMap._geo;
    this._draw();
  }

  _draw() {
    if (!this._features) return;
    const w = this.clientWidth || 640, h = this.clientHeight || 260;
    if (w < 40 || h < 40) return;
    const d3 = window.d3;
    const focus = { type: "FeatureCollection", features: this._features.features };
    const bbox = {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPoint", coordinates: [[67, 6], [98, 6], [98, 36], [67, 36]] }
    };
    const proj = d3.geoMercator().fitExtent([[8, 6], [w - 8, h - 6]], bbox);
    const path = d3.geoPath(proj);
    const land = focus.features.map(f => path(f)).filter(Boolean).join(" ");

    const markers = SITES.map(s => {
      const p = proj(s.c);
      if (!p) return "";
      const col = s.s === "dg" ? "var(--dg)" : s.s === "warn" ? "var(--wn)" : "var(--ac)";
      const r = 2.6 + s.v * 0.28;
      return `<g><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r * 4.4).toFixed(1)}" fill="${col}" opacity=".07"></circle>
        <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r * 2.1).toFixed(1)}" fill="${col}" opacity=".14"></circle>
        <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${col}"></circle>
        <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="var(--map-ring)" stroke-width=".8"></circle></g>`;
    }).join("");

    const placed = [];
    const labels = SITES.filter(s => s.v >= 4).map(s => {
      const p = proj(s.c);
      let dy = 3.5;
      while (placed.some(q => Math.abs(q.x - p[0]) < 46 && Math.abs(q.y - (p[1] + dy)) < 11)) dy += 11;
      placed.push({ x: p[0], y: p[1] + dy });
      return `<text x="${(p[0] + 8).toFixed(1)}" y="${(p[1] + dy).toFixed(1)}" fill="var(--map-label)" font-family="Inter,system-ui,sans-serif" font-size="9.5" font-weight="400" letter-spacing=".02em">${s.n}</text>`;
    }).join("");

    const grid = [];
    for (let x = 0; x <= w; x += 48) grid.push(`M${x} 0V${h}`);
    for (let y = 0; y <= h; y += 48) grid.push(`M0 ${y}H${w}`);

    this.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
      <defs>
        <radialGradient id="vm-glow" cx="52%" cy="42%" r="58%">
          <stop offset="0%" stop-color="var(--ac)" stop-opacity=".13"></stop>
          <stop offset="100%" stop-color="var(--ac)" stop-opacity="0"></stop>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="var(--map-water)"></rect>
      <path d="${grid.join(" ")}" stroke="var(--map-grid)" stroke-width=".5" fill="none"></path>
      <rect width="${w}" height="${h}" fill="url(#vm-glow)"></rect>
      <path d="${land}" fill="var(--map-land)" stroke="var(--map-line)" stroke-width=".7" stroke-linejoin="round"></path>
      ${markers}${labels}
    </svg>`;
  }
}
customElements.define("verity-map", VerityMap);

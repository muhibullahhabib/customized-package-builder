// // @ts-nocheck
// // Trip builder: Wix site widget (custom element)
// import { SERVICES, PACKAGES, TIER_LABELS, calculate, nightsBetween } from "../../../../components/pricing";
// import { DESTINATIONS } from "../../../../components/villas";
// import { TERMS_VERSION, TERMS_TITLE, TERMS_INTRO, TERMS, ACK_TEXT, RATING_LEGEND } from "../../../../components/terms";

// // ⚠️ Set this to your backend endpoint once it exists. Empty = test mode (payload is logged to the console).
// const API_URL = "";

// // Optional links. Leave MORE_SERVICES_URL empty to hide the "More experiences" link.
// const MORE_SERVICES_URL = "";            // e.g. "/activities"
// const HELP_LINK = "tel:+18009756199";    // "Talk to a trip planner" (phone from the site footer; use a mailto: or page link if you prefer)

// // Distance (px) from the top of the screen where the summary panel sticks.
// // Increase it if your site header is fixed/sticky and covers the panel.
// const STICKY_TOP = 110;

// // Spacing (px) of the invisible markers used to detect which part of the widget is on screen.
// const STEP = 20;

// // "2027-03-01" -> "Mar 1, 2027" (no timezone shifts)
// const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
// const addDays = (iso, n) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
// const tierForBedrooms = (n) => (n >= 13 ? "13+" : n >= 10 ? "10-12" : n >= 7 ? "7-9" : n >= 4 ? "4-6" : null);

// const usd = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// const CSS = `
// :host{display:block;--bg:#fdfbf7;--card:#ffffff;--cream:#f8f0e0;--line:#e9e1d2;--gold:#b08a4e;--gold-d:#8f6d37;--gold-l:#dcbc80;--text:#1f2127;--mute:#5d6169;
//   font-family:'Barlow','Inter',system-ui,sans-serif;font-size:18px;line-height:1.55;color:var(--text);background:var(--bg)}
// *{box-sizing:border-box}
// .wrap>div,.wrap>aside,.row>div,.opt,.villa,.svc .info{min-width:0}
// .ln span{overflow-wrap:anywhere}
// img,svg{max-width:100%}
// .wrap{position:relative;display:grid;grid-template-columns:1fr 400px;gap:40px;padding:56px 32px;max-width:1280px;margin:auto}
// h1,h2,h3{font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:400;margin:0}
// h1{font-size:54px;line-height:1.12} h1 em{font-style:italic;color:var(--gold)}
// h2{font-size:32px;margin-bottom:8px}
// h3{font-size:20px;margin-bottom:12px}
// p.sub{color:var(--mute);font-size:19px;line-height:1.6;margin:8px 0 22px;max-width:62ch}
// p.eyebrow{color:var(--gold);font-size:15px;letter-spacing:.14em;margin:0 0 10px}
// .intro{margin-bottom:32px;padding-bottom:28px;border-bottom:1px solid var(--line)}
// section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:32px;margin-bottom:24px;box-shadow:0 1px 2px rgba(60,45,20,.05),0 10px 30px rgba(60,45,20,.07)}
// .row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
// label{display:block;font-size:16px;font-weight:500;color:var(--mute);margin-bottom:8px}
// input:not([type=checkbox]),select{width:100%;padding:14px 20px;background:#fff;color:var(--text);border:1px solid #d6ccb9;border-radius:999px;font-size:18px;font-family:inherit;transition:border-color .15s,box-shadow .15s}
// select{-webkit-appearance:none;appearance:none;padding-right:52px;text-overflow:ellipsis;cursor:pointer;
//   background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5l6 6 6-6' fill='none' stroke='%238f6d37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 22px center;background-size:14px 9px}
// input[type=date]{min-height:52px}
// input:hover,select:hover{border-color:var(--gold)}
// input[type=checkbox]{width:22px;height:22px;flex:none;margin:2px 0 0;accent-color:var(--gold);cursor:pointer}
// input:focus-visible,select:focus-visible,button:focus-visible{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(176,138,78,.28)}
// .opts{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
// .opt{border:1px solid var(--line);border-radius:16px;padding:20px;cursor:pointer;background:#fff;color:inherit;text-align:left;font:inherit;font-size:19px;font-weight:500;transition:border-color .15s,background .15s}
// .opt:hover{border-color:var(--gold)}
// .opt.on{border-color:var(--gold);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold)}
// .opt small{display:block;color:var(--mute);font-size:16px;font-weight:400;line-height:1.5;margin-top:6px}
// .tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
// .tiers .opt{text-align:center;padding:18px 10px}
// .villas{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}
// .villa{border:1px solid var(--line);border-radius:16px;padding:16px;background:#fff;box-shadow:0 6px 18px rgba(60,45,20,.07)}
// .villa .ph{height:120px;border-radius:12px;background:linear-gradient(135deg,#f0e4cc,#b08a4e);margin-bottom:14px}
// .villa b{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:23px}
// .villa .note{color:var(--mute);font-size:16px;line-height:1.6;margin:8px 0 14px}
// .pk{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
// .svc{display:flex;align-items:center;gap:16px;border-top:1px solid var(--line);padding:18px 0;font-size:19px;font-weight:500}
// .svc .info{flex:1} .svc small{color:var(--mute);font-size:16px;font-weight:400;display:block;margin-top:3px}
// .qty{display:flex;align-items:center;gap:12px}
// .qty button{width:44px;height:44px;background:#fff;border:1px solid var(--gold);color:var(--gold-d);font-size:22px;cursor:pointer;border-radius:50%;transition:background .15s,color .15s}
// .qty button:hover{background:var(--gold);color:#fff}
// .qty span{min-width:28px;text-align:center;font-size:19px}
// aside{position:relative;align-self:start;border-radius:18px;background:linear-gradient(180deg,#fffdf8,#faf4e8);border:1px solid var(--line);border-top:3px solid var(--gold);padding:30px;will-change:transform;transition:transform .2s ease-out;box-shadow:0 1px 2px rgba(60,45,20,.05),0 14px 36px rgba(60,45,20,.12)}
// aside h2{font-size:28px;margin-bottom:16px}
// aside h3{color:var(--gold-d)}
// .ln{display:flex;justify-content:space-between;gap:14px;padding:9px 0;font-size:16px;color:var(--mute)}
// .ln b{color:var(--text);font-weight:500;white-space:nowrap}
// .tot{border-top:1px solid var(--line);margin-top:14px;padding-top:16px}
// .tot .ln{color:var(--text);font-size:17px}
// .dep b{color:var(--gold-d);font-size:24px;font-family:'Playfair Display',Georgia,serif;font-weight:400}
// .note{font-size:16px;color:var(--mute);margin:16px 0;line-height:1.6}
// .contact{display:grid;gap:12px;margin:28px 0 0;padding-top:24px;border-top:1px solid var(--line)}
// .go{display:block;width:100%;margin-top:28px;padding:17px;background:linear-gradient(180deg,#c09a5d,#a3803f);color:#fff;border:0;font-size:18px;font-weight:600;letter-spacing:.02em;cursor:pointer;border-radius:999px;font-family:inherit;box-shadow:0 6px 18px rgba(176,138,78,.35);transition:filter .15s,transform .15s}
// .go:hover:not(:disabled){filter:brightness(1.07);transform:translateY(-1px)}
// .go:disabled{opacity:.5;cursor:not-allowed}
// .err{color:#b4402e;font-size:15px;margin-top:12px;min-height:20px}
// /* Compact mode: switched on automatically when the summary has so much content that it would not fit on screen */
// aside.tight{padding:20px 22px}
// aside.tight h2{font-size:23px;margin-bottom:8px}
// aside.tight .ln{padding:4px 0;font-size:15px}
// aside.tight .tot{margin-top:8px;padding-top:10px}
// aside.tight .note{display:none}
// aside.tight .contact{margin-top:14px;padding-top:14px;gap:8px}
// aside.tight .contact h3{display:none}
// aside.tight input:not([type=checkbox]){padding:10px 16px;font-size:16px}
// aside.tight .go{margin-top:16px;padding:14px}
// aside.tight .err{margin-top:8px;min-height:0}
// aside.tight .facts,aside.tight .help,aside.tight .more{display:none}
// aside.tight .contact{grid-template-columns:1fr 1fr}
// aside.tight .contact input{order:1} aside.tight #ph{order:2} aside.tight #em{order:3;grid-column:1/-1}
// aside.tight .ack{font-size:13px;line-height:1.4;margin-top:12px;gap:10px}
// .hide{display:none}
// select:disabled{opacity:.5;cursor:not-allowed}
// .cap{display:block;color:#b4402e;font-size:14px;line-height:1.4;margin-top:8px}
// .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}
// .steps i{height:4px;border-radius:4px;background:var(--line);transition:background .2s}
// .steps i.on{background:var(--gold)}
// .stepl{font-size:15px;letter-spacing:.06em;color:var(--gold-d);margin:10px 0 0}
// .opt{position:relative}
// .badge{position:absolute;top:-1px;right:-1px;background:var(--gold);color:#fff;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:0 16px 0 12px}
// .opt .pp{color:var(--gold-d);font-weight:600}
// .svc .incl{display:none;color:var(--gold-d);font-weight:500}
// .svc.inc .incl{display:block} .svc.inc .qty{display:none}
// .exact{margin-top:22px;max-width:360px}
// .exact small{display:block;color:var(--mute);font-size:15px;margin-top:6px}
// .legend{margin:16px 0 0;font-size:16px;color:var(--mute)}
// .legend summary{cursor:pointer;color:var(--gold-d);font-weight:500}
// .legend dl{margin:12px 0 0;display:grid;gap:4px}
// .legend dt{color:var(--text);font-weight:600;margin-top:10px}
// .legend dd{margin:0;line-height:1.5}
// #terms h3{font-size:21px;margin:22px 0 8px}
// .tp{color:var(--mute);font-size:17px;line-height:1.65;margin:0 0 10px;max-width:72ch}
// .facts{border-bottom:1px solid var(--line);margin-bottom:8px;padding-bottom:6px}
// .facts .ln b,.tot .ln b{white-space:normal;text-align:right}
// .ack{display:flex;gap:12px;align-items:flex-start;margin:22px 0 0;font-size:15px;line-height:1.5;color:var(--text);cursor:pointer}
// .more{display:inline-block;margin:10px 0 0;font-size:15px;color:var(--gold-d)}
// .help{text-align:center;font-size:15px;color:var(--mute);margin:16px 0 0}
// .help a,.note a{color:var(--gold-d)}
// .sent{position:absolute;left:0;top:0;width:1px;height:100%;opacity:0;pointer-events:none}
// .sent i{position:absolute;left:0;width:1px;height:1px}
// @media(max-width:1000px){
//   .wrap{grid-template-columns:1fr;gap:28px;padding:40px 24px}
//   aside{position:static}
// }
// @media(max-width:860px){
//   .row{grid-template-columns:1fr 1fr}
//   .tiers{grid-template-columns:1fr 1fr}
//   .pk{grid-template-columns:1fr}
// }
// @media(max-width:720px){
//   :host{font-size:17px}
//   .wrap{padding:24px 14px}
//   .villas,.opts{grid-template-columns:1fr}
//   h1{font-size:36px} h2{font-size:27px}
//   p.sub{font-size:17px}
//   section{padding:22px}
//   input[type=date]{-webkit-appearance:none;appearance:none;text-align:left}
//   aside{padding:24px}
// }
// @media(max-width:520px){
//   .wrap{padding:16px 10px;gap:20px}
//   .row{grid-template-columns:1fr}
//   h1{font-size:32px} h2{font-size:25px}
//   section{padding:18px;border-radius:16px;margin-bottom:18px}
//   .intro{margin-bottom:22px;padding-bottom:20px}
//   .opt{padding:16px;font-size:18px}
//   .tiers .opt{padding:14px 8px;font-size:17px}
//   .villa .ph{height:150px}
//   .svc{gap:12px;padding:16px 0;font-size:18px}
//   .qty{gap:8px}
//   .tp{font-size:16px}
//   aside{padding:20px;border-radius:16px}
//   .dep b{font-size:22px}
//   .ln{font-size:15px}
//   .go{padding:18px;font-size:18px}
// }
// @media(max-width:360px){
//   .tiers{grid-template-columns:1fr}
//   .svc{flex-wrap:wrap}
//   .svc .qty{margin-left:auto}
// }
// @media(prefers-reduced-motion:reduce){*{transition:none!important}}`;

// class TripBuilder extends HTMLElement {
//   constructor() {
//     super();
//     this.attachShadow({ mode: "open" });
//     this.s = { mode: "stay", destination: "", checkIn: "", checkOut: "", guests: "", tier: "4-6", exactBedrooms: "",
//       ranks: {}, package: null, services: {} };
//   }

//   connectedCallback() {
//     this.build(); this.renderVillas(); this.refresh();
//     this.setupSticky();
//   }

//   disconnectedCallback() {
//     if (this._io) this._io.disconnect();
//     if (this._ro) this._ro.disconnect();
//   }

//   /* ---------- Sticky summary panel ----------
//      Wix renders this widget inside its own iframe that is as tall as the whole widget, so the page scrolls
//      OUTSIDE the iframe: scroll events, scrollY and position:sticky never change inside it.
//      IntersectionObserver is the one API that still reports what the visitor can actually see, even from
//      a cross-origin iframe. We place tiny invisible markers down the widget, watch which ones are visible,
//      and move the summary panel to stay inside the visible band. */
//   setupSticky() {
//     this._vis = new Set(); this._n = 0;
//     this._io = new IntersectionObserver((entries) => {
//       for (const e of entries) {
//         const i = Number(e.target.dataset.i);
//         if (e.isIntersecting) this._vis.add(i); else this._vis.delete(i);
//       }
//       this.positionSummary();
//     }, { threshold: [0] });
//     this.buildMarkers();
//     if (window.ResizeObserver) {
//       this._ro = new ResizeObserver(() => { this.buildMarkers(); this.positionSummary(); });
//       this._ro.observe(this.shadowRoot.querySelector(".wrap"));
//     }
//   }

//   // Creates one 1px marker every STEP px along the height of the widget.
//   buildMarkers() {
//     const wrap = this.shadowRoot.querySelector(".wrap");
//     const n = Math.ceil(wrap.offsetHeight / STEP);
//     if (n === this._n) return;
//     this._n = n;
//     let box = wrap.querySelector(".sent");
//     if (!box) { box = document.createElement("div"); box.className = "sent"; wrap.appendChild(box); }
//     this._io.disconnect(); this._vis.clear(); box.innerHTML = "";
//     for (let i = 0; i < n; i++) {
//       const m = document.createElement("i");
//       m.dataset.i = String(i); m.style.top = i * STEP + "px";
//       box.appendChild(m); this._io.observe(m);
//     }
//   }

//   positionSummary() {
//     const aside = this.shadowRoot.querySelector("aside"), wrap = this.shadowRoot.querySelector(".wrap");
//     if (!aside || !wrap || !this._vis) return;
//     if (window.innerWidth <= 1000) { aside.style.transform = ""; aside.style.maxHeight = ""; aside.classList.remove("tight"); return; } // single column

//     const cs = getComputedStyle(wrap);
//     const padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0;

//     // Fit the panel to the screen instead of letting it scroll: switch to compact mode if it is too tall.
//     const screenH = this._band || 800;
//     aside.classList.remove("tight");
//     const tooTall = aside.offsetHeight > screenH - STICKY_TOP - 20;
//     if (tooTall) aside.classList.add("tight");
//     // if it is still taller than the free space, sit a little higher rather than cutting off the payment button
//     const stickAt = Math.max(12, Math.min(STICKY_TOP, screenH - aside.offsetHeight - 16));

//     const maxShift = Math.max(0, wrap.offsetHeight - padTop - padBottom - aside.offsetHeight);
//     const vis = [...this._vis];
//     if (vis.length) {
//       const minI = Math.min(...vis), maxI = Math.max(...vis);
//       const visibleTop = minI * STEP;                       // top of the visible band, measured from the top of the widget
//       const band = (maxI - minI + 1) * STEP;                // height of the visible band
//       this._band = Math.max(this._band || 0, band);         // the tallest band seen ~ height of the screen
//       // minI = 0 means the top of the widget is on screen, so the panel stays in its normal place
//       this._shift = minI === 0 ? 0 : Math.min(Math.max(0, visibleTop + stickAt - padTop), maxShift);
//     }
//     aside.style.transform = `translateY(${Math.round(this._shift || 0)}px)`;
//   }

//   build() {
//     const dest = Object.entries(DESTINATIONS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join("");
//     const tiers = Object.entries(TIER_LABELS).map(([k, l]) => `<button class="opt tier" data-tier="${k}">${l}</button>`).join("");
//     const pk = Object.entries(PACKAGES).map(([k, p]) => `<button class="opt pkg" data-pkg="${k}">${p.popular ? '<span class="badge">Popular</span>' : ""}${p.label}<small>${p.tagline}</small><small class="pp">${usd(p.perPerson)} / guest</small></button>`).join("");
//     const basisText = { day: "Per day", person: "Per person", flat: "Flat fee per booking" };
//     const svc = SERVICES.map((s) => `
//       <div class="svc" data-row="${s.id}"><div class="info">${s.name}<small>${basisText[s.basis]} · ${usd(s.price)}</small><small class="incl">Included in your package</small></div>
//       <div class="qty" data-svc="${s.id}"><button data-d="-1" aria-label="Less ${s.name}">−</button><span>0</span><button data-d="1" aria-label="More ${s.name}">+</button></div></div>`).join("");
//     const legend = RATING_LEGEND.map((g) => `<dt>${g.name}</dt>` + g.levels.map((t, i) => `<dd>${"★".repeat(i + 1)}${"☆".repeat(2 - i)} ${t}</dd>`).join("")).join("");
//     const terms = TERMS.map((t) => `<h3>${t.title}</h3>` + t.body.map((x) => `<p class="tp">${x}</p>`).join("")).join("");
//     const more = MORE_SERVICES_URL ? `<p class="note"><a href="${MORE_SERVICES_URL}" target="_top">More experiences: explore all services</a></p>` : "";

//     this.shadowRoot.innerHTML = `<style>${CSS}</style>
//     <div class="wrap"><div>
//       <div class="intro"><p class="eyebrow">Plan your trip</p><h1>Build your <em>getaway</em></h1>
//       <p class="sub">Choose your stay, then make the trip yours with the services you want.</p>
//       <div class="steps" id="steps"><i></i><i></i><i></i></div><p class="stepl" id="stepl"></p></div>

//       <section><h2>Start with the basics</h2>
//         <p class="sub">We'll use these details to build your trip options.</p>
//         <div class="row">
//           <div><label for="dest">Destination</label><select id="dest"><option value="">Choose</option>${dest}</select></div>
//           <div><label for="in">Check-in</label><input id="in" type="date"></div>
//           <div><label for="out">Check-out</label><input id="out" type="date"></div>
//           <div><label for="gs">Group size</label><input id="gs" type="number" min="1" inputmode="numeric" placeholder="Guests"></div>
//         </div></section>

//       <section><h2>How would you like to build your trip?</h2>
//         <p class="sub">Choose a stay with experiences, or book services only.</p>
//         <div class="opts">
//           <button class="opt mode on" data-mode="stay">Stay + experiences<small>Choose a villa, then select a package or customize.</small></button>
//           <button class="opt mode" data-mode="services">Services only<small>Skip accommodation and build a service itinerary.</small></button>
//         </div></section>

//       <section id="stay"><h2>Choose your accommodation</h2>
//         <p class="sub">Pick a bedroom tier, then rank your first and second villa preferences. We'll confirm availability for your dates and assign the best available match from your preferences.</p>
//         <div class="tiers">${tiers}</div>
//         <div class="exact"><label for="br">Exact bedroom count (optional)</label><input id="br" type="number" min="1" inputmode="numeric" placeholder="For example, 5"><small>Enter a specific number if you know what you need.</small></div>
//         <details class="legend"><summary>What do the stars mean?</summary><dl>${legend}</dl></details>
//         <div class="villas" id="villas"></div></section>

//       <section id="pkgs"><h2>Pick a package</h2><p class="sub">Or build your own from the services below.</p><div class="pk">${pk}</div></section>

//       <section><h2>Build your own</h2><p class="sub">Add services; the price updates based on each service's pricing. Services already in your package are not charged twice.</p>${svc}${more}</section>

//       <section id="terms"><h2>${TERMS_TITLE}</h2><p class="sub">${TERMS_INTRO}</p>${terms}</section>
//     </div>

//     <aside><h2>Your trip summary</h2>
//       <div class="facts" id="facts"></div><div id="lines"></div>
//       <div class="tot"><div class="ln"><span id="lblTotal">Estimated trip total</span><b id="total">$0</b></div>
//         <div class="ln dep"><span id="lblDep">Provisional deposit due now</span><b id="dep">$0</b></div>
//         <div class="ln"><span id="lblBal">Estimated remaining balance</span><b id="bal">$0</b></div>
//         <div class="ln"><span>Balance due by</span><b id="due">—</b></div></div>
//       <p class="note" id="note"></p>
//       <div class="contact"><h3>Your details</h3>
//         <input id="nm" placeholder="Full name" autocomplete="name"><input id="em" type="email" placeholder="Email" autocomplete="email"><input id="ph" type="tel" placeholder="Phone" autocomplete="tel"></div>
//       <label class="ack" id="ackBox"><input type="checkbox" id="ack"><span>${ACK_TEXT}</span></label>
//       <a class="more" id="toTerms" href="#terms">Read the full terms</a>
//       <button class="go" id="go">Pay Provisional Deposit</button><div class="err" id="err" role="alert"></div>
//       <p class="help">Need help? <a href="${HELP_LINK}" target="_top">Talk to a trip planner</a></p>
//     </aside></div>`;

//     const $ = (q) => this.shadowRoot.querySelector(q);
//     const $$ = (q) => this.shadowRoot.querySelectorAll(q);
//     $("#in").min = new Date().toISOString().slice(0, 10);
//     $("#dest").onchange = (e) => { this.s.destination = e.target.value; this.s.ranks = {}; this.renderVillas(); this.refresh(); };
//     $("#in").onchange = (e) => { this.s.checkIn = e.target.value; if (e.target.value) $("#out").min = addDays(e.target.value, 1); this.refresh(); };
//     $("#out").onchange = (e) => { this.s.checkOut = e.target.value; this.refresh(); };
//     $("#gs").oninput = (e) => { this.s.guests = e.target.value; this.renderVillas(); this.refresh(); };
//     $("#br").oninput = (e) => {
//       this.s.exactBedrooms = e.target.value;
//       const t = tierForBedrooms(Math.floor(Number(e.target.value)));
//       if (t && t !== this.s.tier) { this.s.tier = t; this.s.ranks = {}; this.renderVillas(); } // pick the matching tier automatically
//       this.refresh();
//     };
//     $$(".mode").forEach((b) => (b.onclick = () => { this.s.mode = b.dataset.mode; this.refresh(); }));
//     $$(".tier").forEach((b) => (b.onclick = () => { this.s.tier = b.dataset.tier; this.s.ranks = {}; this.s.exactBedrooms = ""; $("#br").value = ""; this.renderVillas(); this.refresh(); }));
//     $$(".pkg").forEach((b) => (b.onclick = () => { this.s.package = this.s.package === b.dataset.pkg ? null : b.dataset.pkg; this.refresh(); }));
//     $$(".qty").forEach((q) => q.querySelectorAll("button").forEach((b) => (b.onclick = () => {
//       const id = q.dataset.svc, svc = SERVICES.find((x) => x.id === id), cur = this.s.services[id] || 0;
//       const next = Number(b.dataset.d) > 0 ? (cur === 0 ? this.defaultQty(svc) : cur + 1) : cur - 1;
//       this.s.services[id] = Math.min(this.maxQty(svc), Math.max(0, next));
//       this.refresh();
//     })));
//     ["#nm", "#em", "#ph"].forEach((q) => ($(q).oninput = () => this.refresh()));
//     $("#ack").onchange = () => this.refresh();
//     $("#toTerms").onclick = (e) => { e.preventDefault(); $("#terms").scrollIntoView({ behavior: "smooth", block: "start" }); };
//     $("#go").onclick = () => this.submit();
//   }

//   villasNow() { return DESTINATIONS[this.s.destination]?.tiers[this.s.tier] || []; }

//   renderVillas() {
//     const box = this.shadowRoot.querySelector("#villas");
//     const villas = this.villasNow();
//     if (!villas.length) { box.innerHTML = `<p class="note">Choose a destination to see villas in this tier.</p>`; return; }
//     const guests = Math.floor(Number(this.s.guests)) || 0;
//     const tooSmall = (v) => !!(v.maxGuests && guests > v.maxGuests);
//     for (const v of villas) if (tooSmall(v)) delete this.s.ranks[v.id]; // a villa that cannot hold the group cannot be ranked
//     const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);
//     box.innerHTML = villas.map((v) => `<div class="villa"><div class="ph"></div><b>${v.name}</b>
//       <p class="note">${v.nightly > 0 ? "$" + v.nightly.toLocaleString("en-US") + " / night" : "Price on request"}${v.note ? "<br>" + v.note : ""}${v.maxGuests ? "<br>Up to " + v.maxGuests + " guests" : ""}<br>Location ${stars(v.location)}<br>Luxury ${stars(v.luxury)}<br>Value ${stars(v.value)}</p>
//       <label>Your preference</label><select data-v="${v.id}"${tooSmall(v) ? " disabled" : ""}><option value="">Choose rank</option>
//       <option value="1"${this.s.ranks[v.id] === "1" ? " selected" : ""}>1st choice</option>
//       <option value="2"${this.s.ranks[v.id] === "2" ? " selected" : ""}>2nd choice</option></select>
//       ${tooSmall(v) ? `<small class="cap">Sleeps up to ${v.maxGuests} guests, so it is not available for a group of ${guests}.</small>` : ""}</div>`).join("");
//     box.querySelectorAll("select").forEach((sel) => (sel.onchange = () => {
//       for (const k of Object.keys(this.s.ranks)) if (this.s.ranks[k] === sel.value && sel.value) delete this.s.ranks[k]; // one villa per rank
//       this.s.ranks[sel.dataset.v] = sel.value;
//       this.renderVillas(); this.refresh();
//     }));
//   }

//   // Quantity limits: a service cannot exceed the number of guests (per person) or the trip length (per day).
//   maxQty(svc) {
//     if (svc.basis === "flat") return 1;
//     if (svc.basis === "person") return Math.floor(Number(this.s.guests)) || 99;
//     const n = nightsBetween(this.s.checkIn, this.s.checkOut);
//     return n ? n + 1 : 99;
//   }
//   defaultQty(svc) {
//     if (svc.basis === "flat") return 1;
//     if (svc.basis === "person") return Math.floor(Number(this.s.guests)) || 1;
//     return nightsBetween(this.s.checkIn, this.s.checkOut) || 1;
//   }
//   clampQty() {
//     for (const sv of SERVICES) { const q = this.s.services[sv.id] || 0; if (q > this.maxQty(sv)) this.s.services[sv.id] = this.maxQty(sv); }
//   }

//   hasRank(r) { return this.villasNow().some((v) => this.s.ranks[v.id] === r); }

//   refresh() {
//     const $ = (q) => this.shadowRoot.querySelector(q);
//     const $$ = (q) => this.shadowRoot.querySelectorAll(q);
//     const s = this.s, isStay = s.mode === "stay";
//     this.clampQty();
//     ["#stay", "#pkgs", "#terms", "#ackBox", "#toTerms"].forEach((q) => $(q).classList.toggle("hide", !isStay));
//     if (!isStay) s.package = null;
//     $$(".mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === s.mode));
//     $$(".tier").forEach((b) => b.classList.toggle("on", b.dataset.tier === s.tier));
//     $$(".pkg").forEach((b) => b.classList.toggle("on", b.dataset.pkg === s.package));
//     $$(".qty").forEach((q) => (q.querySelector("span").textContent = s.services[q.dataset.svc] || 0));
//     const covered = new Set(s.package ? PACKAGES[s.package].includes : []);
//     $$(".svc").forEach((r) => r.classList.toggle("inc", covered.has(r.dataset.row)));

//     const c = (this.calc = calculate(s));
//     const guests = Math.floor(Number(s.guests)) || 0;

//     // trip facts (top of the summary)
//     const dates = c.nights ? `${fmtDate(s.checkIn)} – ${fmtDate(s.checkOut)} · ${c.nights} night${c.nights > 1 ? "s" : ""}` : "Add your dates";
//     const facts = [["Destination", DESTINATIONS[s.destination]?.name || "Not selected"], ["Dates", dates],
//       ["Group size", guests ? `${guests} guest${guests > 1 ? "s" : ""}` : "Not selected"], ["Stay", isStay ? `${TIER_LABELS[s.tier]} tier` : "Services only"]];
//     $("#facts").innerHTML = facts.map(([k, v]) => `<div class="ln"><span>${k}</span><b>${v}</b></div>`).join("");

//     $("#lines").innerHTML = c.lines.length
//       ? c.lines.map((l) => `<div class="ln"><span>${l.label}</span><b>${usd(l.amount)}</b></div>`).join("")
//       : `<p class="note">Your itemized estimate appears here as you build.</p>`;
//     $("#lblTotal").textContent = isStay ? "Estimated trip total" : "Trip total";
//     $("#lblDep").textContent = isStay ? "Provisional deposit due now" : "Due now";
//     $("#lblBal").textContent = isStay ? "Estimated remaining balance" : "Remaining balance";
//     $("#total").textContent = usd(c.total);
//     $("#dep").textContent = usd(c.deposit);
//     $("#bal").textContent = usd(c.balance);
//     $("#due").textContent = c.policy === "within-window" ? "Stated before final confirmation" : c.balanceDueDate ? fmtDate(c.balanceDueDate) : "—";

//     const base = "This is an estimate. You are paying a provisional deposit, and your villa is not confirmed until we verify availability and you approve your final invoice.";
//     $("#note").innerHTML = {
//       standard: base + " The balance is due 30 days before arrival.",
//       "within-window": base + " Because your trip starts within 30 days, the payment required will be stated before final confirmation.",
//       "services-only": "Services-only bookings are paid in full at checkout.",
//     }[c.policy] + (isStay && c.priceTbd ? " The price of your first-choice villa is still being confirmed, so accommodation shows the lowest price in this tier." : isStay && c.estimated ? " Accommodation shows the lowest villa price in this tier until you choose a first-choice villa." : "");

//     if (!this._busy) $("#go").textContent = isStay ? "Pay Provisional Deposit" : "Continue to payment";

//     // progress: 1 trip details, 2 trip style, 3 review & pay
//     const d1 = !!(s.destination && c.nights > 0 && guests > 0);
//     const d2 = isStay ? (this.villasNow().length > 0 && this.hasRank("1") && this.hasRank("2")) : c.lines.length > 0;
//     const d3 = d1 && d2 && !!$("#nm").value && !!$("#em").value && (!isStay || $("#ack").checked);
//     [d1, d2, d3].forEach((d, i) => $$("#steps i")[i].classList.toggle("on", d));
//     const cur = !d1 ? 1 : !d2 ? 2 : 3;
//     $("#stepl").textContent = `STEP ${cur} OF 3 · ${["TRIP DETAILS", "TRIP STYLE", "REVIEW & PAY"][cur - 1]}`;

//     requestAnimationFrame(() => this.positionSummary());
//   }

//   validate() {
//     const s = this.s, r = this.shadowRoot, c = this.calc, isStay = s.mode === "stay";
//     if (!s.destination) return "Choose a destination.";
//     if (!s.checkIn || !s.checkOut) return "Choose your check-in and check-out dates.";
//     if (s.checkIn < new Date().toISOString().slice(0, 10)) return "Check-in must be today or later.";
//     if (!c.nights) return "Check-out must be after check-in.";
//     if (!(Math.floor(Number(s.guests)) >= 1)) return "Enter your group size.";
//     if (isStay && !(this.hasRank("1") && this.hasRank("2"))) return "Rank your first and second villa preferences.";
//     if (!c.total) return "Add a stay, package, or service to continue.";
//     if (!r.querySelector("#nm").value.trim()) return "Enter your full name.";
//     if (!/^\S+@\S+\.\S+$/.test(r.querySelector("#em").value.trim())) return "Enter a valid email address.";
//     if (isStay && !r.querySelector("#ack").checked) return "Please check the acknowledgment box to continue.";
//     return "";
//   }

//   async submit() {
//     const r = this.shadowRoot, err = r.querySelector("#err"), go = r.querySelector("#go"), s = this.s, isStay = s.mode === "stay";
//     err.textContent = this.validate();
//     if (err.textContent) return;
//     const villas = this.villasNow();
//     const pick = (rank) => villas.find((v) => s.ranks[v.id] === rank);
//     const payload = {
//       ...s,
//       firstChoice: isStay && pick("1") ? { id: pick("1").id, name: pick("1").name } : null,
//       secondChoice: isStay && pick("2") ? { id: pick("2").id, name: pick("2").name } : null,
//       contact: { name: r.querySelector("#nm").value.trim(), email: r.querySelector("#em").value.trim(), phone: r.querySelector("#ph").value.trim() },
//       quote: this.calc,            // ESTIMATE only: the backend must recalculate the price itself
//       isEstimate: isStay,
//       // record of what the guest agreed to (stay bookings)
//       acknowledgment: isStay ? { accepted: true, acceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION, text: ACK_TEXT } : null,
//     };
//     this.dispatchEvent(new CustomEvent("trip-submit", { detail: payload, bubbles: true, composed: true }));
//     if (!API_URL) { err.textContent = "Test mode: payment is not connected yet (see browser console)."; console.log(payload); return; }
//     this._busy = true; go.disabled = true; go.textContent = "Please wait…";
//     try {
//       const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Request failed");
//       window.location.href = data.checkoutUrl; // redirect to the payment link returned by the backend
//     } catch (e) { err.textContent = e.message; this._busy = false; go.disabled = false; this.refresh(); }
//   }
// }

// export default TripBuilder; // Wix registers the element itself





// @ts-nocheck
// Trip builder: Wix site widget (custom element)
import { SERVICES, PACKAGES, TIER_LABELS, calculate, nightsBetween } from "../../../../components/pricing";
import { DESTINATIONS } from "../../../../components/villas";
import { TERMS_VERSION, TERMS_TITLE, TERMS_INTRO, TERMS, ACK_TEXT, RATING_LEGEND } from "../../../../components/terms";

// ⚠️ Set this to your backend endpoint once it exists. Empty = test mode (payload is logged to the console).
const API_URL = "";

// Optional links. Leave MORE_SERVICES_URL empty to hide the "More experiences" link.
const MORE_SERVICES_URL = "";            // e.g. "/activities"
const HELP_LINK = "tel:+18009756199";    // "Talk to a trip planner" (phone from the site footer; use a mailto: or page link if you prefer)

// Distance (px) from the top of the screen where the summary panel sticks.
// Increase it if your site header is fixed/sticky and covers the panel
// (set it to the header height + about 16).
const STICKY_TOP = 16;

// Spacing (px) of the invisible markers used to detect which part of the widget is on screen.
// Smaller = smoother following, slightly more markers.
const STEP = 8;

// Where is the widget running? Inside an iframe the page scroll is invisible to it, so we use markers there.
// On the normal page we use native CSS position:sticky (GPU-driven, zero shaking).
const IS_FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// "2027-03-01" -> "Mar 1, 2027" (no timezone shifts)
const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const addDays = (iso, n) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
const tierForBedrooms = (n) => (n >= 13 ? "13+" : n >= 10 ? "10-12" : n >= 7 ? "7-9" : n >= 4 ? "4-6" : null);

const usd = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const CSS = `
:host{display:block;position:relative;--bg:#fdfbf7;--card:#ffffff;--cream:#f8f0e0;--line:#e9e1d2;--gold:#b08a4e;--gold-d:#8f6d37;--gold-l:#dcbc80;--text:#1f2127;--mute:#5d6169;
  font-family:'Barlow','Inter',system-ui,sans-serif;font-size:18px;line-height:1.55;color:var(--text);background:var(--bg)}
*{box-sizing:border-box}
.wrap>div,.wrap>aside,.row>div,.opt,.villa,.svc .info{min-width:0}
.ln span{overflow-wrap:anywhere}
img,svg{max-width:100%}
.wrap{position:relative;display:grid;grid-template-columns:1fr 400px;gap:40px;padding:56px 32px;max-width:1280px;margin:auto}
h1,h2,h3{font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:400;margin:0}
h1{font-size:54px;line-height:1.12} h1 em{font-style:italic;color:var(--gold)}
h2{font-size:32px;margin-bottom:8px}
h3{font-size:20px;margin-bottom:12px}
p.sub{color:var(--mute);font-size:19px;line-height:1.6;margin:8px 0 22px;max-width:62ch}
p.eyebrow{color:var(--gold);font-size:15px;letter-spacing:.14em;margin:0 0 10px}
.intro{margin-bottom:32px;padding-bottom:28px;border-bottom:1px solid var(--line)}
section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:32px;margin-bottom:24px;box-shadow:0 1px 2px rgba(60,45,20,.05),0 10px 30px rgba(60,45,20,.07)}
.row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
label{display:block;font-size:16px;font-weight:500;color:var(--mute);margin-bottom:8px}
input:not([type=checkbox]),select{width:100%;padding:14px 20px;background:#fff;color:var(--text);border:1px solid #d6ccb9;border-radius:999px;font-size:18px;font-family:inherit;transition:border-color .15s,box-shadow .15s}
select{-webkit-appearance:none;appearance:none;padding-right:52px;text-overflow:ellipsis;cursor:pointer;
  background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5l6 6 6-6' fill='none' stroke='%238f6d37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 22px center;background-size:14px 9px}
input[type=date]{min-height:52px}
input:hover,select:hover{border-color:var(--gold)}
input[type=checkbox]{width:22px;height:22px;flex:none;margin:2px 0 0;accent-color:var(--gold);cursor:pointer}
input:focus-visible,select:focus-visible,button:focus-visible{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(176,138,78,.28)}
.opts{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.opt{border:1px solid var(--line);border-radius:16px;padding:20px;cursor:pointer;background:#fff;color:inherit;text-align:left;font:inherit;font-size:19px;font-weight:500;transition:border-color .15s,background .15s}
.opt:hover{border-color:var(--gold)}
.opt.on{border-color:var(--gold);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold)}
.opt small{display:block;color:var(--mute);font-size:16px;font-weight:400;line-height:1.5;margin-top:6px}
.tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.tiers .opt{text-align:center;padding:18px 10px}
.villas{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}
.villa{border:1px solid var(--line);border-radius:16px;padding:16px;background:#fff;box-shadow:0 6px 18px rgba(60,45,20,.07)}
.villa .ph{height:120px;border-radius:12px;background:linear-gradient(135deg,#f0e4cc,#b08a4e);margin-bottom:14px}
.villa b{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:23px}
.villa .note{color:var(--mute);font-size:16px;line-height:1.6;margin:8px 0 14px}
.pk{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.svc{display:flex;align-items:center;gap:16px;border-top:1px solid var(--line);padding:18px 0;font-size:19px;font-weight:500}
.svc .info{flex:1} .svc small{color:var(--mute);font-size:16px;font-weight:400;display:block;margin-top:3px}
.qty{display:flex;align-items:center;gap:12px}
.qty button{width:44px;height:44px;background:#fff;border:1px solid var(--gold);color:var(--gold-d);font-size:22px;cursor:pointer;border-radius:50%;transition:background .15s,color .15s}
.qty button:hover{background:var(--gold);color:#fff}
.qty span{min-width:28px;text-align:center;font-size:19px}
aside{position:relative;align-self:start;border-radius:18px;background:linear-gradient(180deg,#fffdf8,#faf4e8);border:1px solid var(--line);border-top:3px solid var(--gold);padding:30px;will-change:transform;box-shadow:0 1px 2px rgba(60,45,20,.05),0 14px 36px rgba(60,45,20,.12)}
aside h2{font-size:28px;margin-bottom:16px}
aside h3{color:var(--gold-d)}
.ln{display:flex;justify-content:space-between;gap:14px;padding:9px 0;font-size:16px;color:var(--mute)}
.ln b{color:var(--text);font-weight:500;white-space:nowrap}
.tot{border-top:1px solid var(--line);margin-top:14px;padding-top:16px}
.tot .ln{color:var(--text);font-size:17px}
.dep b{color:var(--gold-d);font-size:24px;font-family:'Playfair Display',Georgia,serif;font-weight:400}
.note{font-size:16px;color:var(--mute);margin:16px 0;line-height:1.6}
.contact{display:grid;gap:12px;margin:28px 0 0;padding-top:24px;border-top:1px solid var(--line)}
.go{display:block;width:100%;margin-top:28px;padding:17px;background:linear-gradient(180deg,#c09a5d,#a3803f);color:#fff;border:0;font-size:18px;font-weight:600;letter-spacing:.02em;cursor:pointer;border-radius:999px;font-family:inherit;box-shadow:0 6px 18px rgba(176,138,78,.35);transition:filter .15s,transform .15s}
.go:hover:not(:disabled){filter:brightness(1.07);transform:translateY(-1px)}
.go:disabled{opacity:.5;cursor:not-allowed}
.err{color:#b4402e;font-size:15px;margin-top:12px;min-height:20px}
/* Compact mode: switched on automatically when the summary has so much content that it would not fit on screen */
aside.tight{padding:20px 22px}
aside.tight h2{font-size:23px;margin-bottom:8px}
aside.tight .ln{padding:4px 0;font-size:15px}
aside.tight .tot{margin-top:8px;padding-top:10px}
aside.tight .note{display:none}
aside.tight .contact{margin-top:14px;padding-top:14px;gap:8px}
aside.tight .contact h3{display:none}
aside.tight input:not([type=checkbox]){padding:10px 16px;font-size:16px}
aside.tight .go{margin-top:16px;padding:14px}
aside.tight .err{margin-top:8px;min-height:0}
aside.tight .facts,aside.tight .help,aside.tight .more{display:none}
aside.tight .contact{grid-template-columns:1fr 1fr}
aside.tight .contact input{order:1} aside.tight #ph{order:2} aside.tight #em{order:3;grid-column:1/-1}
aside.tight .ack{font-size:13px;line-height:1.4;margin-top:12px;gap:10px}
.hide{display:none}
select:disabled{opacity:.5;cursor:not-allowed}
.cap{display:block;color:#b4402e;font-size:14px;line-height:1.4;margin-top:8px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}
.steps i{height:4px;border-radius:4px;background:var(--line);transition:background .2s}
.steps i.on{background:var(--gold)}
.stepl{font-size:15px;letter-spacing:.06em;color:var(--gold-d);margin:10px 0 0}
.opt{position:relative}
.badge{position:absolute;top:-1px;right:-1px;background:var(--gold);color:#fff;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:0 16px 0 12px}
.opt .pp{color:var(--gold-d);font-weight:600}
.svc .incl{display:none;color:var(--gold-d);font-weight:500}
.svc.inc .incl{display:block} .svc.inc .qty{display:none}
.exact{margin-top:22px;max-width:360px}
.exact small{display:block;color:var(--mute);font-size:15px;margin-top:6px}
.legend{margin:16px 0 0;font-size:16px;color:var(--mute)}
.legend summary{cursor:pointer;color:var(--gold-d);font-weight:500}
.legend dl{margin:12px 0 0;display:grid;gap:4px}
.legend dt{color:var(--text);font-weight:600;margin-top:10px}
.legend dd{margin:0;line-height:1.5}
#terms h3{font-size:21px;margin:22px 0 8px}
.tp{color:var(--mute);font-size:17px;line-height:1.65;margin:0 0 10px;max-width:72ch}
/* Terms: expand / collapse */
.acc-h2{margin:0 0 8px}
.acc-btn{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin:0;padding:0;background:none;border:0;border-radius:12px;color:inherit;font:inherit;text-align:left;cursor:pointer}
.acc-ic{flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid var(--gold);border-radius:50%;color:var(--gold-d);background:#fff;transition:transform .2s,background .15s,color .15s}
.acc-btn:hover .acc-ic{background:var(--gold);color:#fff}
.acc-btn[aria-expanded=true] .acc-ic{transform:rotate(180deg)}
.acc-b[hidden]{display:none}
.facts{border-bottom:1px solid var(--line);margin-bottom:8px;padding-bottom:6px}
.facts .ln b,.tot .ln b{white-space:normal;text-align:right}
.ack{display:flex;gap:12px;align-items:flex-start;margin:22px 0 0;font-size:15px;line-height:1.5;color:var(--text);cursor:pointer}
.more{display:inline-block;margin:10px 0 0;font-size:15px;color:var(--gold-d)}
.help{text-align:center;font-size:15px;color:var(--mute);margin:16px 0 0}
.help a,.note a{color:var(--gold-d)}
.sent{position:absolute;left:0;top:0;width:1px;height:100%;opacity:0;pointer-events:none}
.sent i{position:absolute;left:0;width:1px;height:1px}
.pin{display:none}
@media(min-width:1001px){aside.native{position:sticky;top:var(--stick,16px);will-change:auto}}
@media(max-width:1000px){
  .wrap{grid-template-columns:1fr;gap:28px;padding:40px 24px}
  aside{position:static}
}
@media(max-width:860px){
  .row{grid-template-columns:1fr 1fr}
  .tiers{grid-template-columns:1fr 1fr}
  .pk{grid-template-columns:1fr}
}
@media(max-width:720px){
  :host{font-size:17px}
  .wrap{padding:16px 12px;gap:14px}
  .villas,.opts{grid-template-columns:1fr}
  .row,.opts,.tiers,.pk{gap:12px}
  .row{grid-template-columns:1fr 1fr}
  h1{font-size:36px} h2{font-size:27px;margin-bottom:6px}
  p.sub{font-size:17px;margin:6px 0 16px}
  p.eyebrow{margin-bottom:6px}
  section{padding:20px;margin-bottom:14px}
  .intro{margin-bottom:16px;padding-bottom:16px}
  .steps{margin-top:14px}
  .stepl{margin-top:8px}
  .villas{margin-top:16px;gap:14px}
  .exact{margin-top:16px}
  .legend{margin-top:12px}
  .note{margin:10px 0}
  .tp{margin:0 0 8px}
  #terms h3{margin:16px 0 6px}
  .contact{margin-top:18px;padding-top:18px;gap:10px}
  .go{margin-top:18px}
  .ack{margin-top:16px}
  .err{margin-top:8px;min-height:0}
  .help{margin-top:12px}
  input[type=date]{-webkit-appearance:none;appearance:none;text-align:left}
  aside{padding:20px}
  aside h2{margin-bottom:10px}
  .tot{margin-top:8px;padding-top:12px}
}
@media(max-width:520px){
  .wrap{padding:12px 10px;gap:12px}
  h1{font-size:32px} h2{font-size:25px}
  section{padding:16px;border-radius:16px;margin-bottom:12px}
  .intro{margin-bottom:14px;padding-bottom:14px}
  .opt{padding:14px;font-size:18px}
  .tiers .opt{padding:12px 8px;font-size:17px}
  .villa{padding:14px}
  .villa .ph{height:120px;margin-bottom:10px}
  .svc{gap:10px;padding:12px 0;font-size:18px}
  .qty{gap:8px}
  .tp{font-size:16px}
  aside{padding:16px;border-radius:16px}
  .dep b{font-size:22px}
  .ln{font-size:15px;padding:6px 0}
  .go{padding:16px;font-size:18px}
  .acc-ic{width:40px;height:40px}
}
@media(max-width:360px){
  .tiers{grid-template-columns:1fr}
  .svc{flex-wrap:wrap}
  .svc .qty{margin-left:auto}
}
/* Mobile: price pinned to the bottom of the screen (placed last so its bottom padding wins over the rules above) */
@media(max-width:720px){
  .wrap{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))}
  .pin{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:50;align-items:center;justify-content:space-between;gap:12px;
    padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:rgba(255,253,248,.97);border-top:2px solid var(--gold);
    box-shadow:0 -6px 20px rgba(60,45,20,.14);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  .pin>div{min-width:0;display:flex;flex-direction:column}
  .pin>div.d{text-align:right}
  .pin span{font-size:12px;line-height:1.25;color:var(--mute)}
  .pin b{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:22px;line-height:1.2;color:var(--text)}
  .pin .d b{color:var(--gold-d)}
}
/* Tablet (721px to 1000px): tighter spacing, text sizes follow the site's global styles */
@media(min-width:721px) and (max-width:1000px){
  :host{font-size:16px;line-height:1.5}
  .wrap{padding:24px 20px;gap:20px}
  h1{font-size:42px;line-height:1.1}
  h2{font-size:28px;margin-bottom:4px}
  h3{font-size:18px;margin-bottom:8px}
  p.sub{font-size:16px;line-height:1.55;margin:6px 0 14px}
  p.eyebrow{font-size:13px;margin:0 0 6px}
  .intro{margin-bottom:16px;padding-bottom:16px}
  .steps{margin-top:14px}
  .stepl{font-size:13px;margin:8px 0 0}
  section{padding:22px;margin-bottom:14px}
  .row{gap:12px}
  label{font-size:14px;margin-bottom:5px}
  input:not([type=checkbox]),select{padding:10px 16px;font-size:16px}
  select{padding-right:40px;background-position:right 16px center}
  input[type=date]{min-height:44px}
  .opts{gap:12px}
  .opt{padding:14px 16px;font-size:16px}
  .opt small{font-size:14px;margin-top:3px}
  .tiers{gap:10px}
  .tiers .opt{padding:12px 8px;font-size:16px}
  .villas{gap:14px;margin-top:16px}
  .villa{padding:14px}
  .villa .ph{height:100px;margin-bottom:10px}
  .villa b{font-size:20px}
  .villa .note{font-size:14px;line-height:1.5;margin:6px 0 10px}
  .cap{font-size:13px;margin-top:6px}
  .exact{margin-top:14px}
  .exact small{font-size:13px;margin-top:4px}
  .legend{font-size:14px;margin-top:12px}
  .pk{gap:12px}
  .svc{gap:12px;padding:12px 0;font-size:16px}
  .svc small{font-size:14px;margin-top:2px}
  .qty button{width:40px;height:40px;font-size:20px}
  .qty span{font-size:16px}
  #terms h3{font-size:18px;margin:14px 0 6px}
  .tp{font-size:16px;line-height:1.55;margin:0 0 8px}
  .acc-ic{width:38px;height:38px}
  aside{padding:22px}
  aside h2{font-size:24px;margin-bottom:10px}
  .ln{font-size:14px;padding:6px 0}
  .tot{margin-top:10px;padding-top:12px}
  .tot .ln{font-size:16px}
  .dep b{font-size:24px}
  .note{font-size:14px;line-height:1.55;margin:10px 0}
  .contact{gap:10px;margin:18px 0 0;padding-top:16px}
  .ack{font-size:13px;line-height:1.45;margin:14px 0 0}
  .more{font-size:13px;margin:8px 0 0}
  .go{font-size:16px;margin-top:16px;padding:14px}
  .err{font-size:13px;margin-top:8px;min-height:16px}
  .help{font-size:13px;margin:12px 0 0}
}
/* Mobile (720px and below): smaller text and tighter spacing */
@media(max-width:720px){
  :host{font-size:16px;line-height:1.5}
  .wrap{padding-top:12px;padding-left:12px;padding-right:12px;padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));gap:12px}
  h1{font-size:32px;line-height:1.12}
  h2{font-size:24px;margin-bottom:4px}
  h3{font-size:18px;margin-bottom:8px}
  p.sub{font-size:15px;line-height:1.5;margin:4px 0 12px}
  p.eyebrow{font-size:13px;margin:0 0 4px}
  .intro{margin-bottom:12px;padding-bottom:12px}
  .steps{margin-top:12px;gap:8px}
  .stepl{font-size:12px;margin:6px 0 0}
  section{padding:16px;margin-bottom:12px;border-radius:16px}
  .row,.opts,.tiers,.pk{gap:10px}
  label{font-size:14px;margin-bottom:4px}
  input:not([type=checkbox]),select{padding:10px 14px;font-size:16px}
  select{padding-right:36px;background-position:right 14px center}
  input[type=date]{min-height:44px}
  .opt{padding:12px 14px;font-size:16px}
  .opt small{font-size:14px;margin-top:3px}
  .tiers .opt{padding:10px 8px;font-size:15px}
  .badge{font-size:11px;padding:4px 10px}
  .villas{gap:12px;margin-top:12px}
  .villa{padding:12px}
  .villa .ph{height:100px;margin-bottom:8px}
  .villa b{font-size:20px}
  .villa .note{font-size:14px;line-height:1.5;margin:4px 0 10px}
  .cap{font-size:13px;margin-top:4px}
  .exact{margin-top:12px}
  .exact small{font-size:13px;margin-top:4px}
  .legend{font-size:14px;margin-top:10px}
  .svc{gap:10px;padding:10px 0;font-size:16px}
  .svc small{font-size:13px;margin-top:2px}
  .qty{gap:8px}
  .qty button{width:40px;height:40px;font-size:20px}
  .qty span{font-size:16px;min-width:22px}
  #terms h3{font-size:18px;margin:12px 0 4px}
  .tp{font-size:15px;line-height:1.55;margin:0 0 6px}
  .acc-ic{width:36px;height:36px}
  aside{padding:16px}
  aside h2{font-size:22px;margin-bottom:8px}
  .ln{font-size:14px;padding:5px 0}
  .tot{margin-top:8px;padding-top:10px}
  .tot .ln{font-size:15px}
  .dep b{font-size:22px}
  .note{font-size:14px;margin:8px 0}
  .contact{gap:8px;margin:14px 0 0;padding-top:14px}
  .ack{font-size:13px;line-height:1.45;margin:12px 0 0}
  .more{font-size:13px;margin:6px 0 0}
  .go{font-size:16px;margin-top:14px;padding:14px}
  .err{font-size:13px;margin-top:6px;min-height:0}
  .help{font-size:13px;margin:10px 0 0}
  .pin{padding-top:8px}
  .pin span{font-size:11.5px}
  .pin b{font-size:20px}
}
@media(max-width:520px){
  .wrap{padding-top:10px;padding-left:10px;padding-right:10px;gap:10px}
  h1{font-size:30px}
  h2{font-size:22px}
  section{padding:14px;margin-bottom:10px}
  aside{padding:14px}
}
/* Mobile: compact "Start with the basics" (2 fields per line) and step-by-step reveal */
@media(max-width:720px){
  .basics h2{font-size:22px;margin-bottom:4px}
  .basics .sub{font-size:15px;line-height:1.5;margin:4px 0 12px}
  .basics .row{gap:10px}
  .basics label{font-size:13px;margin-bottom:4px}
  .basics input:not([type=checkbox]),.basics select{min-width:0;min-height:44px;padding:10px 12px;font-size:15px}
  .basics select{padding-right:32px;background-position:right 12px center;background-size:11px 7px}
  .basics input[type=date]{min-height:44px}
  .wrap[data-rev="1"] [data-step="2"],.wrap[data-rev="1"] [data-step="3"],.wrap[data-rev="2"] [data-step="3"]{display:none}
  section{scroll-margin-top:8px}
}
@media(max-width:360px){
  .basics input:not([type=checkbox]),.basics select{font-size:14px;padding-left:10px;padding-right:10px}
  .basics select{padding-right:28px}
}
/* Desktop only (1001px and up): font sizes follow the site's global text styles
   (Heading 2 47px, Heading 3 31px, Heading 4/5 27px, Heading 6 20px, Paragraph 1/2/3 16/14/13px) and spacing is tightened */
@media(min-width:1001px){
  :host{font-size:16px;line-height:1.5}
  .wrap{grid-template-columns:1fr 380px;gap:28px;padding:32px 32px 40px}
  h1{font-size:47px;line-height:1.1}
  h2{font-size:31px;margin-bottom:4px}
  h3{font-size:20px;margin-bottom:8px}
  p.sub{font-size:16px;line-height:1.55;margin:6px 0 16px}
  p.eyebrow{font-size:13px;margin:0 0 6px}
  .intro{margin-bottom:20px;padding-bottom:20px}
  .steps{margin-top:16px}
  .stepl{font-size:13px;margin:8px 0 0}
  section{padding:24px;margin-bottom:16px}
  .row{gap:14px}
  label{font-size:14px;margin-bottom:6px}
  input:not([type=checkbox]),select{padding:11px 18px;font-size:16px}
  select{padding-right:44px;background-position:right 18px center}
  input[type=date]{min-height:46px}
  .opts{gap:12px}
  .opt{padding:16px;font-size:16px}
  .opt small{font-size:14px;margin-top:4px}
  .tiers{gap:10px}
  .tiers .opt{padding:14px 10px;font-size:16px}
  .badge{font-size:11px;padding:4px 10px}
  .villas{gap:14px;margin-top:16px}
  .villa{padding:14px}
  .villa .ph{height:100px;margin-bottom:10px}
  .villa b{font-size:20px}
  .villa .note{font-size:14px;line-height:1.5;margin:6px 0 10px}
  .cap{font-size:13px;margin-top:6px}
  .exact{margin-top:16px}
  .exact small{font-size:13px;margin-top:4px}
  .legend{font-size:14px;margin-top:12px}
  .pk{gap:12px}
  .svc{gap:14px;padding:12px 0;font-size:16px}
  .svc small{font-size:14px;margin-top:2px}
  .qty{gap:10px}
  .qty button{width:38px;height:38px;font-size:20px}
  .qty span{font-size:16px;min-width:24px}
  #terms h3{font-size:20px;margin:16px 0 6px}
  .tp{font-size:16px;line-height:1.55;margin:0 0 8px}
  .acc-ic{width:38px;height:38px}
  aside{padding:24px}
  aside h2{font-size:27px;margin-bottom:10px}
  .ln{font-size:14px;padding:6px 0}
  .tot{margin-top:10px;padding-top:12px}
  .tot .ln{font-size:16px}
  .dep b{font-size:24px}
  .note{font-size:14px;line-height:1.55;margin:10px 0}
  .contact{gap:10px;margin:18px 0 0;padding-top:16px}
  .ack{font-size:13px;line-height:1.45;margin:16px 0 0}
  .more{font-size:13px;margin:8px 0 0}
  .go{font-size:16px;margin-top:18px;padding:14px}
  .err{font-size:13px;margin-top:8px;min-height:16px}
  .help{font-size:13px;margin:12px 0 0}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;

class TripBuilder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.s = { mode: "stay", destination: "", checkIn: "", checkOut: "", guests: "", tier: "4-6", exactBedrooms: "",
      ranks: {}, package: null, services: {} };
    this._rev = 1; // furthest step shown on mobile (1 to 3)
  }

  connectedCallback() {
    this.build(); this.renderVillas(); this.refresh();
    this.setupSticky();
  }

  disconnectedCallback() {
    if (this._io) this._io.disconnect();
    if (this._ro) this._ro.disconnect();
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    if (this._onScroll) window.removeEventListener("scroll", this._onScroll, { capture: true });
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._tick) cancelAnimationFrame(this._tick);
  }

  /* ---------- Sticky summary panel ----------
     Three modes, chosen automatically:
     1) "native"  : widget is on the normal page. Pure CSS position:sticky, so the browser moves the panel
                    on the GPU together with the scroll: perfectly smooth, no JavaScript in the scroll path.
     2) "scroll"  : fallback if a parent container blocks position:sticky. The panel is moved from scroll
                    events, once per frame, using exact positions.
     3) "observe" : widget is inside an iframe (page scroll happens outside it, so scroll events never fire).
                    IntersectionObserver markers tell us which part is visible, and the panel glides to it
                    with easing so there is no stepping or shaking.
     On mobile the pinned price bar uses position:fixed; inside an iframe ("observe") it is placed at the
     bottom of the visible band using the same markers. */
  setupSticky() {
    this._mode = IS_FRAMED ? "observe" : "native";
    this._stickAt = STICKY_TOP; this._cur = 0; this._target = 0; this._bad = 0; this._band = 0; this._fitBand = 0;
    this._onResize = () => { this.fitPanel(); this.positionSummary(); };
    window.addEventListener("resize", this._onResize);

    if (this._mode === "native") {
      this.shadowRoot.querySelector("aside").classList.add("native");
      this._onScroll = () => {
        if (this._tick) return;
        this._tick = requestAnimationFrame(() => { this._tick = 0; this.onScroll(); });
      };
      window.addEventListener("scroll", this._onScroll, { passive: true, capture: true });
      this.fitPanel();
      return;
    }

    this._vis = new Set(); this._n = 0;
    this._io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = Number(e.target.dataset.i);
        if (e.isIntersecting) this._vis.add(i); else this._vis.delete(i);
      }
      this.positionSummary();
    }, { threshold: [0] });
    this.buildMarkers();
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => { this.buildMarkers(); this.positionSummary(); });
      this._ro.observe(this.shadowRoot.querySelector(".wrap"));
    }
  }

  // Creates one 1px marker every STEP px along the height of the widget (observe mode only).
  buildMarkers() {
    const wrap = this.shadowRoot.querySelector(".wrap");
    const n = Math.ceil(wrap.offsetHeight / STEP);
    if (n === this._n) return;
    this._n = n;
    let box = wrap.querySelector(".sent");
    if (!box) { box = document.createElement("div"); box.className = "sent"; wrap.appendChild(box); }
    this._io.disconnect(); this._vis.clear(); box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const m = document.createElement("i");
      m.dataset.i = String(i); m.style.top = i * STEP + "px";
      box.appendChild(m); this._io.observe(m);
    }
  }

  // Decides compact mode ONCE per content/size change (never while scrolling, that is what caused the shaking).
  fitPanel() {
    const aside = this.shadowRoot.querySelector("aside");
    if (!aside || !this._mode) return;
    if (window.innerWidth <= 1000) { aside.classList.remove("tight"); return; }
    const vh = this._mode === "observe" ? this._band : window.innerHeight;
    if (!vh || vh < 300) return; // screen height not known yet
    aside.classList.remove("tight");
    const tooTall = aside.offsetHeight > vh - STICKY_TOP - 20;
    aside.classList.toggle("tight", tooTall);
    // if it is still taller than the free space, sit a little higher rather than cutting off the payment button
    this._stickAt = Math.max(12, Math.min(STICKY_TOP, vh - aside.offsetHeight - 16));
    aside.style.setProperty("--stick", this._stickAt + "px");
  }

  // Mobile pinned price bar. On the normal page CSS position:fixed does everything.
  // Inside an iframe the bar is placed at the bottom of the part of the widget that is on screen.
  positionPin() {
    const pin = this.shadowRoot.querySelector(".pin");
    if (!pin) return;
    const framedMobile = this._mode === "observe" && window.innerWidth <= 720 && this._vis && this._vis.size > 0;
    if (!framedMobile) {
      if (pin.style.position) { pin.style.position = ""; pin.style.top = ""; pin.style.bottom = ""; pin.style.transition = ""; }
      return;
    }
    const maxI = Math.max(...this._vis);
    const bottom = Math.min((maxI + 1) * STEP, this.offsetHeight || Infinity);
    pin.style.position = "absolute";
    pin.style.bottom = "auto";
    if (!REDUCED) pin.style.transition = "top .12s ease-out";
    pin.style.top = Math.max(0, bottom - pin.offsetHeight) + "px";
  }

  positionSummary() {
    const aside = this.shadowRoot.querySelector("aside"), wrap = this.shadowRoot.querySelector(".wrap");
    if (!aside || !wrap || !this._mode) return;
    this.positionPin();
    if (window.innerWidth <= 1000) { aside.style.transform = ""; aside.classList.remove("tight"); this._cur = this._target = 0; return; } // single column
    if (this._mode === "observe") this.observePosition();
    else if (this._mode === "scroll") this.scrollPosition();
    // "native": the browser does it
  }

  onScroll() {
    if (this._mode === "native") this.verifyNative();
    else if (this._mode === "scroll") this.scrollPosition();
  }

  // Native mode safety net: if a parent container blocks position:sticky, switch to the scroll fallback.
  verifyNative() {
    if (window.innerWidth <= 1000) return;
    const aside = this.shadowRoot.querySelector("aside"), wrap = this.shadowRoot.querySelector(".wrap");
    const wr = wrap.getBoundingClientRect(), ar = aside.getBoundingClientRect();
    const cs = getComputedStyle(wrap), padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0;
    const maxShift = Math.max(0, wr.height - padTop - padBottom - ar.height);
    const expected = Math.min(Math.max(0, -wr.top + this._stickAt - padTop), maxShift);
    const moved = ar.top - wr.top - padTop;
    if (expected > 60 && moved < expected * 0.5) {
      if (++this._bad >= 3) { this._mode = "scroll"; aside.classList.remove("native"); this.scrollPosition(); }
    } else this._bad = 0;
  }

  // Scroll fallback: exact position from the widget's current place on screen.
  scrollPosition() {
    const aside = this.shadowRoot.querySelector("aside"), wrap = this.shadowRoot.querySelector(".wrap");
    const wr = wrap.getBoundingClientRect();
    const cs = getComputedStyle(wrap), padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0;
    const maxShift = Math.max(0, wrap.offsetHeight - padTop - padBottom - aside.offsetHeight);
    const shift = Math.min(Math.max(0, -wr.top + this._stickAt - padTop), maxShift);
    aside.style.transform = `translate3d(0, ${Math.round(shift)}px, 0)`;
  }

  // Iframe mode: work out where the visible band starts, then glide the panel there.
  observePosition() {
    const aside = this.shadowRoot.querySelector("aside"), wrap = this.shadowRoot.querySelector(".wrap");
    const vis = [...this._vis];
    if (!vis.length) return;
    const minI = Math.min(...vis), maxI = Math.max(...vis);
    const band = (maxI - minI + 1) * STEP;                  // height of the visible band ~ height of the screen
    if (band > this._band) {
      this._band = band;
      if (band - this._fitBand > 40) { this._fitBand = band; this.fitPanel(); } // re-fit only when the screen size is learned
    }
    const cs = getComputedStyle(wrap);
    const padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0;
    const maxShift = Math.max(0, wrap.offsetHeight - padTop - padBottom - aside.offsetHeight);
    // minI = 0 means the top of the widget is on screen, so the panel stays in its normal place
    const target = minI === 0 ? 0 : Math.min(Math.max(0, minI * STEP + this._stickAt - padTop), maxShift);
    this.glideTo(target);
  }

  glideTo(target) {
    this._target = target;
    if (REDUCED) { this._cur = target; this.applyShift(); return; }
    if (!this._raf) this._raf = requestAnimationFrame(() => this.glide());
  }
  glide() {
    this._raf = 0;
    const d = this._target - this._cur;
    if (Math.abs(d) < 0.5) this._cur = this._target;
    else { this._cur += d * 0.22; this._raf = requestAnimationFrame(() => this.glide()); }
    this.applyShift();
  }
  applyShift() {
    const aside = this.shadowRoot.querySelector("aside");
    if (aside) aside.style.transform = `translate3d(0, ${Math.round(this._cur)}px, 0)`;
  }

  // Terms section: expand / collapse the full terms and the acknowledgment text.
  setTerms(open) {
    const btn = this.shadowRoot.querySelector("#termsBtn"), body = this.shadowRoot.querySelector("#termsBody");
    if (!btn || !body) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    body.hidden = !open;
    requestAnimationFrame(() => { this.fitPanel(); this.positionSummary(); });
  }

  // Brings the newly shown step 2 into view so the guest does not have to scroll to find it.
  revealStep2() {
    requestAnimationFrame(() => {
      const el = this.shadowRoot.querySelector("#modeSec");
      if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    });
  }

  build() {
    const dest = Object.entries(DESTINATIONS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join("");
    const tiers = Object.entries(TIER_LABELS).map(([k, l]) => `<button class="opt tier" data-tier="${k}">${l}</button>`).join("");
    const pk = Object.entries(PACKAGES).map(([k, p]) => `<button class="opt pkg" data-pkg="${k}">${p.popular ? '<span class="badge">Popular</span>' : ""}${p.label}<small>${p.tagline}</small><small class="pp">${usd(p.perPerson)} / guest</small></button>`).join("");
    const basisText = { day: "Per day", person: "Per person", flat: "Flat fee per booking" };
    const svc = SERVICES.map((s) => `
      <div class="svc" data-row="${s.id}"><div class="info">${s.name}<small>${basisText[s.basis]} · ${usd(s.price)}</small><small class="incl">Included in your package</small></div>
      <div class="qty" data-svc="${s.id}"><button data-d="-1" aria-label="Less ${s.name}">−</button><span>0</span><button data-d="1" aria-label="More ${s.name}">+</button></div></div>`).join("");
    const legend = RATING_LEGEND.map((g) => `<dt>${g.name}</dt>` + g.levels.map((t, i) => `<dd>${"★".repeat(i + 1)}${"☆".repeat(2 - i)} ${t}</dd>`).join("")).join("");
    const terms = TERMS.map((t) => `<h3>${t.title}</h3>` + t.body.map((x) => `<p class="tp">${x}</p>`).join("")).join("");
    const more = MORE_SERVICES_URL ? `<p class="note"><a href="${MORE_SERVICES_URL}" target="_top">More experiences: explore all services</a></p>` : "";

    this.shadowRoot.innerHTML = `<style>${CSS}</style>
    <div class="wrap" data-rev="1"><div>
      <div class="intro"><p class="eyebrow">Plan your trip</p><h1>Build your <em>getaway</em></h1>
      <p class="sub">Choose your stay, then make the trip yours with the services you want.</p>
      <div class="steps" id="steps"><i></i><i></i><i></i></div><p class="stepl" id="stepl"></p></div>

      <section class="basics" data-step="1"><h2>Start with the basics</h2>
        <p class="sub">We'll use these details to build your trip options.</p>
        <div class="row">
          <div><label for="dest">Destination</label><select id="dest"><option value="">Choose</option>${dest}</select></div>
          <div><label for="in">Check-in</label><input id="in" type="date"></div>
          <div><label for="out">Check-out</label><input id="out" type="date"></div>
          <div><label for="gs">Group size</label><input id="gs" type="number" min="1" inputmode="numeric" placeholder="Guests"></div>
        </div></section>

      <section id="modeSec" data-step="2"><h2>How would you like to build your trip?</h2>
        <p class="sub">Choose a stay with experiences, or book services only.</p>
        <div class="opts">
          <button class="opt mode on" data-mode="stay">Stay + experiences<small>Choose a villa, then select a package or customize.</small></button>
          <button class="opt mode" data-mode="services">Services only<small>Skip accommodation and build a service itinerary.</small></button>
        </div></section>

      <section id="stay" data-step="2"><h2>Choose your accommodation</h2>
        <p class="sub">Pick a bedroom tier, then rank your first and second villa preferences. We'll confirm availability for your dates and assign the best available match from your preferences.</p>
        <div class="tiers">${tiers}</div>
        <div class="exact"><label for="br">Exact bedroom count (optional)</label><input id="br" type="number" min="1" inputmode="numeric" placeholder="For example, 5"><small>Enter a specific number if you know what you need.</small></div>
        <details class="legend"><summary>What do the stars mean?</summary><dl>${legend}</dl></details>
        <div class="villas" id="villas"></div></section>

      <section id="pkgs" data-step="2"><h2>Pick a package</h2><p class="sub">Or build your own from the services below.</p><div class="pk">${pk}</div></section>

      <section data-step="2"><h2>Build your own</h2><p class="sub">Add services; the price updates based on each service's pricing. Services already in your package are not charged twice.</p>${svc}${more}</section>

      <section id="terms" data-step="3">
        <h2 class="acc-h2"><button type="button" class="acc-btn" id="termsBtn" aria-expanded="false" aria-controls="termsBody"><span>${TERMS_TITLE}</span><span class="acc-ic" aria-hidden="true"><svg width="16" height="10" viewBox="0 0 14 9"><path d="M1 1.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></h2>
        <p class="sub">${TERMS_INTRO}</p>
        <div class="acc-b" id="termsBody" hidden>${terms}<h3>Acknowledgment</h3><p class="tp">${ACK_TEXT}</p></div>
      </section>
    </div>

    <aside data-step="3"><h2>Your trip summary</h2>
      <div class="facts" id="facts"></div><div id="lines"></div>
      <div class="tot"><div class="ln"><span id="lblTotal">Estimated trip total</span><b id="total">$0</b></div>
        <div class="ln dep"><span id="lblDep">Provisional deposit due now</span><b id="dep">$0</b></div>
        <div class="ln"><span id="lblBal">Estimated remaining balance</span><b id="bal">$0</b></div>
        <div class="ln"><span>Balance due by</span><b id="due">—</b></div></div>
      <p class="note" id="note"></p>
      <div class="contact"><h3>Your details</h3>
        <input id="nm" placeholder="Full name" autocomplete="name"><input id="em" type="email" placeholder="Email" autocomplete="email"><input id="ph" type="tel" placeholder="Phone" autocomplete="tel"></div>
      <label class="ack" id="ackBox"><input type="checkbox" id="ack"><span>${ACK_TEXT}</span></label>
      <a class="more" id="toTerms" href="#terms">Read the full terms</a>
      <button class="go" id="go">Pay Provisional Deposit</button><div class="err" id="err" role="alert"></div>
      <p class="help">Need help? <a href="${HELP_LINK}" target="_top">Talk to a trip planner</a></p>
    </aside></div>
    <div class="pin" id="pin"><div><span id="pinLblTotal">Estimated trip total</span><b id="pinTotal">$0</b></div>
      <div class="d"><span id="pinLblDep">Provisional deposit due now</span><b id="pinDep">$0</b></div></div>`;

    const $ = (q) => this.shadowRoot.querySelector(q);
    const $$ = (q) => this.shadowRoot.querySelectorAll(q);
    $("#in").min = new Date().toISOString().slice(0, 10);
    $("#dest").onchange = (e) => { this.s.destination = e.target.value; this.s.ranks = {}; this.renderVillas(); this.refresh(); };
    $("#in").onchange = (e) => { this.s.checkIn = e.target.value; if (e.target.value) $("#out").min = addDays(e.target.value, 1); this.refresh(); };
    $("#out").onchange = (e) => { this.s.checkOut = e.target.value; this.refresh(); };
    $("#gs").oninput = (e) => {
      this.s.guests = e.target.value; this.renderVillas();
      this._hold = true; clearTimeout(this._holdT); // do not move to the next step while the number is still being typed
      this._holdT = setTimeout(() => { this._hold = false; this.refresh(); }, 900);
      this.refresh();
    };
    $("#gs").onchange = () => { clearTimeout(this._holdT); this._hold = false; this.refresh(); };
    $("#br").oninput = (e) => {
      this.s.exactBedrooms = e.target.value;
      const t = tierForBedrooms(Math.floor(Number(e.target.value)));
      if (t && t !== this.s.tier) { this.s.tier = t; this.s.ranks = {}; this.renderVillas(); } // pick the matching tier automatically
      this.refresh();
    };
    $$(".mode").forEach((b) => (b.onclick = () => { this.s.mode = b.dataset.mode; this.refresh(); }));
    $$(".tier").forEach((b) => (b.onclick = () => { this.s.tier = b.dataset.tier; this.s.ranks = {}; this.s.exactBedrooms = ""; $("#br").value = ""; this.renderVillas(); this.refresh(); }));
    $$(".pkg").forEach((b) => (b.onclick = () => { this.s.package = this.s.package === b.dataset.pkg ? null : b.dataset.pkg; this.refresh(); }));
    $$(".qty").forEach((q) => q.querySelectorAll("button").forEach((b) => (b.onclick = () => {
      const id = q.dataset.svc, svc = SERVICES.find((x) => x.id === id), cur = this.s.services[id] || 0;
      const next = Number(b.dataset.d) > 0 ? (cur === 0 ? this.defaultQty(svc) : cur + 1) : cur - 1;
      this.s.services[id] = Math.min(this.maxQty(svc), Math.max(0, next));
      this.refresh();
    })));
    ["#nm", "#em", "#ph"].forEach((q) => ($(q).oninput = () => this.refresh()));
    $("#ack").onchange = () => this.refresh();
    $("#termsBtn").onclick = () => this.setTerms($("#termsBtn").getAttribute("aria-expanded") !== "true");
    $("#toTerms").onclick = (e) => { e.preventDefault(); this.setTerms(true); $("#terms").scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("#go").onclick = () => this.submit();
  }

  villasNow() { return DESTINATIONS[this.s.destination]?.tiers[this.s.tier] || []; }

  renderVillas() {
    const box = this.shadowRoot.querySelector("#villas");
    const villas = this.villasNow();
    if (!villas.length) { box.innerHTML = `<p class="note">Choose a destination to see villas in this tier.</p>`; return; }
    const guests = Math.floor(Number(this.s.guests)) || 0;
    const tooSmall = (v) => !!(v.maxGuests && guests > v.maxGuests);
    for (const v of villas) if (tooSmall(v)) delete this.s.ranks[v.id]; // a villa that cannot hold the group cannot be ranked
    const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);
    box.innerHTML = villas.map((v) => `<div class="villa"><div class="ph"></div><b>${v.name}</b>
      <p class="note">${v.nightly > 0 ? "$" + v.nightly.toLocaleString("en-US") + " / night" : "Price on request"}${v.note ? "<br>" + v.note : ""}${v.maxGuests ? "<br>Up to " + v.maxGuests + " guests" : ""}<br>Location ${stars(v.location)}<br>Luxury ${stars(v.luxury)}<br>Value ${stars(v.value)}</p>
      <label>Your preference</label><select data-v="${v.id}"${tooSmall(v) ? " disabled" : ""}><option value="">Choose rank</option>
      <option value="1"${this.s.ranks[v.id] === "1" ? " selected" : ""}>1st choice</option>
      <option value="2"${this.s.ranks[v.id] === "2" ? " selected" : ""}>2nd choice</option></select>
      ${tooSmall(v) ? `<small class="cap">Sleeps up to ${v.maxGuests} guests, so it is not available for a group of ${guests}.</small>` : ""}</div>`).join("");
    box.querySelectorAll("select").forEach((sel) => (sel.onchange = () => {
      for (const k of Object.keys(this.s.ranks)) if (this.s.ranks[k] === sel.value && sel.value) delete this.s.ranks[k]; // one villa per rank
      this.s.ranks[sel.dataset.v] = sel.value;
      this.renderVillas(); this.refresh();
    }));
  }

  // Quantity limits: a service cannot exceed the number of guests (per person) or the trip length (per day).
  maxQty(svc) {
    if (svc.basis === "flat") return 1;
    if (svc.basis === "person") return Math.floor(Number(this.s.guests)) || 99;
    const n = nightsBetween(this.s.checkIn, this.s.checkOut);
    return n ? n + 1 : 99;
  }
  defaultQty(svc) {
    if (svc.basis === "flat") return 1;
    if (svc.basis === "person") return Math.floor(Number(this.s.guests)) || 1;
    return nightsBetween(this.s.checkIn, this.s.checkOut) || 1;
  }
  clampQty() {
    for (const sv of SERVICES) { const q = this.s.services[sv.id] || 0; if (q > this.maxQty(sv)) this.s.services[sv.id] = this.maxQty(sv); }
  }

  hasRank(r) { return this.villasNow().some((v) => this.s.ranks[v.id] === r); }

  refresh() {
    const $ = (q) => this.shadowRoot.querySelector(q);
    const $$ = (q) => this.shadowRoot.querySelectorAll(q);
    const s = this.s, isStay = s.mode === "stay";
    this.clampQty();
    ["#stay", "#pkgs", "#terms", "#ackBox", "#toTerms"].forEach((q) => $(q).classList.toggle("hide", !isStay));
    if (!isStay) s.package = null;
    $$(".mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === s.mode));
    $$(".tier").forEach((b) => b.classList.toggle("on", b.dataset.tier === s.tier));
    $$(".pkg").forEach((b) => b.classList.toggle("on", b.dataset.pkg === s.package));
    $$(".qty").forEach((q) => (q.querySelector("span").textContent = s.services[q.dataset.svc] || 0));
    const covered = new Set(s.package ? PACKAGES[s.package].includes : []);
    $$(".svc").forEach((r) => r.classList.toggle("inc", covered.has(r.dataset.row)));

    const c = (this.calc = calculate(s));
    const guests = Math.floor(Number(s.guests)) || 0;

    // trip facts (top of the summary)
    const dates = c.nights ? `${fmtDate(s.checkIn)} – ${fmtDate(s.checkOut)} · ${c.nights} night${c.nights > 1 ? "s" : ""}` : "Add your dates";
    const facts = [["Destination", DESTINATIONS[s.destination]?.name || "Not selected"], ["Dates", dates],
      ["Group size", guests ? `${guests} guest${guests > 1 ? "s" : ""}` : "Not selected"], ["Stay", isStay ? `${TIER_LABELS[s.tier]} tier` : "Services only"]];
    $("#facts").innerHTML = facts.map(([k, v]) => `<div class="ln"><span>${k}</span><b>${v}</b></div>`).join("");

    $("#lines").innerHTML = c.lines.length
      ? c.lines.map((l) => `<div class="ln"><span>${l.label}</span><b>${usd(l.amount)}</b></div>`).join("")
      : `<p class="note">Your itemized estimate appears here as you build.</p>`;
    $("#lblTotal").textContent = isStay ? "Estimated trip total" : "Trip total";
    $("#lblDep").textContent = isStay ? "Provisional deposit due now" : "Due now";
    $("#lblBal").textContent = isStay ? "Estimated remaining balance" : "Remaining balance";
    $("#total").textContent = usd(c.total);
    $("#dep").textContent = usd(c.deposit);
    $("#bal").textContent = usd(c.balance);
    $("#due").textContent = c.policy === "within-window" ? "Stated before final confirmation" : c.balanceDueDate ? fmtDate(c.balanceDueDate) : "—";

    // mobile pinned price bar mirrors the summary totals
    $("#pinLblTotal").textContent = $("#lblTotal").textContent;
    $("#pinLblDep").textContent = $("#lblDep").textContent;
    $("#pinTotal").textContent = $("#total").textContent;
    $("#pinDep").textContent = $("#dep").textContent;

    const base = "This is an estimate. You are paying a provisional deposit, and your villa is not confirmed until we verify availability and you approve your final invoice.";
    $("#note").innerHTML = {
      standard: base + " The balance is due 30 days before arrival.",
      "within-window": base + " Because your trip starts within 30 days, the payment required will be stated before final confirmation.",
      "services-only": "Services-only bookings are paid in full at checkout.",
    }[c.policy] + (isStay && c.priceTbd ? " The price of your first-choice villa is still being confirmed, so accommodation shows the lowest price in this tier." : isStay && c.estimated ? " Accommodation shows the lowest villa price in this tier until you choose a first-choice villa." : "");

    if (!this._busy) $("#go").textContent = isStay ? "Pay Provisional Deposit" : "Continue to payment";

    // progress: 1 trip details, 2 trip style, 3 review & pay
    const d1 = !!(s.destination && c.nights > 0 && guests > 0);
    const d2 = isStay ? (this.villasNow().length > 0 && this.hasRank("1") && this.hasRank("2")) : c.lines.length > 0;
    const d3 = d1 && d2 && !!$("#nm").value && !!$("#em").value && (!isStay || $("#ack").checked);
    [d1, d2, d3].forEach((d, i) => $$("#steps i")[i].classList.toggle("on", d));
    const cur = !d1 ? 1 : !d2 ? 2 : 3;
    $("#stepl").textContent = `STEP ${cur} OF 3 · ${["TRIP DETAILS", "TRIP STYLE", "REVIEW & PAY"][cur - 1]}`;

    // mobile step-by-step: the next step appears once the current one is complete (CSS only applies this on phones)
    if (cur > this._rev && !this._hold) {
      this._rev = cur;
      $(".wrap").dataset.rev = String(this._rev);
      if (cur === 2 && window.innerWidth <= 720) this.revealStep2();
    }

    requestAnimationFrame(() => { this.fitPanel(); this.positionSummary(); });
  }

  validate() {
    const s = this.s, r = this.shadowRoot, c = this.calc, isStay = s.mode === "stay";
    if (!s.destination) return "Choose a destination.";
    if (!s.checkIn || !s.checkOut) return "Choose your check-in and check-out dates.";
    if (s.checkIn < new Date().toISOString().slice(0, 10)) return "Check-in must be today or later.";
    if (!c.nights) return "Check-out must be after check-in.";
    if (!(Math.floor(Number(s.guests)) >= 1)) return "Enter your group size.";
    if (isStay && !(this.hasRank("1") && this.hasRank("2"))) return "Rank your first and second villa preferences.";
    if (!c.total) return "Add a stay, package, or service to continue.";
    if (!r.querySelector("#nm").value.trim()) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(r.querySelector("#em").value.trim())) return "Enter a valid email address.";
    if (isStay && !r.querySelector("#ack").checked) return "Please check the acknowledgment box to continue.";
    return "";
  }

  async submit() {
    const r = this.shadowRoot, err = r.querySelector("#err"), go = r.querySelector("#go"), s = this.s, isStay = s.mode === "stay";
    err.textContent = this.validate();
    if (err.textContent) return;
    const villas = this.villasNow();
    const pick = (rank) => villas.find((v) => s.ranks[v.id] === rank);
    const payload = {
      ...s,
      firstChoice: isStay && pick("1") ? { id: pick("1").id, name: pick("1").name } : null,
      secondChoice: isStay && pick("2") ? { id: pick("2").id, name: pick("2").name } : null,
      contact: { name: r.querySelector("#nm").value.trim(), email: r.querySelector("#em").value.trim(), phone: r.querySelector("#ph").value.trim() },
      quote: this.calc,            // ESTIMATE only: the backend must recalculate the price itself
      isEstimate: isStay,
      // record of what the guest agreed to (stay bookings)
      acknowledgment: isStay ? { accepted: true, acceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION, text: ACK_TEXT } : null,
    };
    this.dispatchEvent(new CustomEvent("trip-submit", { detail: payload, bubbles: true, composed: true }));
    if (!API_URL) { err.textContent = "Test mode: payment is not connected yet (see browser console)."; console.log(payload); return; }
    this._busy = true; go.disabled = true; go.textContent = "Please wait…";
    try {
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      window.location.href = data.checkoutUrl; // redirect to the payment link returned by the backend
    } catch (e) { err.textContent = e.message; this._busy = false; go.disabled = false; this.refresh(); }
  }
}

export default TripBuilder; // Wix registers the element itself
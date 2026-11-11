// @ts-nocheck
// Trip builder: Wix site widget (custom element)
import { servicesFor, packagesFor, TIER_LABELS, RULES, calculate, nightsBetween, maxQty as maxQtyOf, defaultQty as defaultQtyOf, priceText, isCovered, includedQty, regionLabel, MAX_STAFF } from "../../../../components/pricing";
import { TERMS_VERSION, TERMS_TITLE, TERMS_INTRO, TERMS, ACK_TEXT, RATING_LEGEND, FEE_INFO_TITLE, FEE_INFO } from "../../../../components/terms";
import { httpClient } from "@wix/essentials";
import { location as wixLocation } from "@wix/site-location";
import { DESTINATIONS, setDestinations } from "../../../../components/villas";

const API_URL = "/api/checkout";
const THANK_YOU_PATH = "/thank-you";
// Maximum number of villas shown for the chosen destination and bedroom tier
const MAX_VILLAS = 3;

// Welcome screen shown when the widget opens (stays for SPLASH_MS milliseconds, then the builder appears)
const SPLASH_MS = 2500;
const SPLASH_TITLE = "Prepay your trip. Relax when you arrive.";
const SPLASH_TEXT = "Secure your dream getaway with a provisional deposit today. Our team handles every detail, from villa to chef to excursions.";
const SPLASH_NOTE = "Preparing your personal trip builder…";
const BASE_URL = new URL(import.meta.url).origin;

// Optional links. Leave MORE_SERVICES_URL empty to hide the "More experiences" link.
const MORE_SERVICES_URL = "";            // e.g. "/activities"
const HELP_LINK = "tel:+18009756199";    // "Talk to a trip planner" (phone from the site footer; use a mailto: or page link if you prefer)

// Label of the planning fee line, built from the rate in pricing.ts (13.5%)
const FEE_PCT_TEXT = String(Number((RULES.serviceFeePct * 100).toFixed(2)));

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
// Centered status screen used for loading, payment confirmation and error messages
const screenHTML = (kind, title, text, note, retry) => `<style>
:host{display:block;font-family:'Barlow','Inter',system-ui,sans-serif;color:#1f2127;background:#fdfbf7}
*{box-sizing:border-box}
.scr{display:flex;align-items:center;justify-content:center;min-height:max(480px,70vh);padding:32px 20px;text-align:center}
.box{width:100%;max-width:480px;background:#fff;border:1px solid #e9e1d2;border-top:3px solid #b08a4e;border-radius:18px;padding:44px 32px 36px;box-shadow:0 1px 2px rgba(60,45,20,.05),0 14px 36px rgba(60,45,20,.12)}
.sp{width:52px;height:52px;margin:0 auto 26px;border:3px solid #efe6d3;border-top-color:#b08a4e;border-radius:50%;animation:spin .9s linear infinite}
.ic{width:56px;height:56px;margin:0 auto 24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;color:#fff;background:#b08a4e}
.ic.warn{background:#c0762f}
.t{font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:400;font-size:28px;line-height:1.25;margin:0 0 12px}
.p{margin:0;color:#5d6169;font-size:16px;line-height:1.65}
.n{margin:22px 0 0;padding-top:18px;border-top:1px solid #e9e1d2;color:#8f6d37;font-size:14px;font-weight:600;letter-spacing:.02em}
.btn{margin-top:24px;padding:13px 28px;background:linear-gradient(180deg,#c09a5d,#a3803f);color:#fff;border:0;border-radius:999px;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
.btn:hover{filter:brightness(1.07)}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:520px){.box{padding:34px 20px 28px}.t{font-size:24px}}
@media(prefers-reduced-motion:reduce){.sp{animation:none}}
</style>
<div class="scr" role="status" aria-live="polite"><div class="box">
${kind === "loading" ? '<div class="sp"></div>' : kind === "success" ? '<div class="ic">&#10003;</div>' : '<div class="ic warn">!</div>'}
<h2 class="t">${title}</h2>
<p class="p">${text}</p>
${note ? `<p class="n">${note}</p>` : ""}
${retry ? '<button class="btn" id="retry" type="button">Try again</button>' : ""}
</div></div>`;

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
.tabs{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 10px}
.tab{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border:1px solid var(--line);border-radius:999px;background:#fff;color:inherit;font:inherit;font-size:17px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
.tab:hover{border-color:var(--gold)}
.tab.on{border-color:var(--gold);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold)}
.tab .cnt{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--gold);color:#fff;font-size:13px;line-height:22px;text-align:center}
.tab .cnt[hidden]{display:none}
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
/* Planning fee line and its "More Info" link */
.info{background:none;border:0;padding:0;margin-left:6px;color:var(--gold-d);font:inherit;font-size:13px;font-weight:500;text-decoration:underline;cursor:pointer;white-space:nowrap}
.info:hover{color:var(--gold)}
.tot .ln.sub{padding-bottom:2px}
.tot .ln.fee{padding-top:2px}
/* "More Info" explanation window */
.ov{z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(31,33,39,.55)}
.ovb{position:relative;width:100%;max-width:560px;max-height:100%;overflow:auto;background:#fff;border:1px solid var(--line);border-top:3px solid var(--gold);border-radius:18px;padding:30px 30px 26px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.ovb h3{font-size:26px;margin:0 44px 14px 0;color:var(--text)}
.ovb p{color:var(--mute);font-size:16px;line-height:1.65;margin:0 0 12px}
.ovx{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:1px solid var(--gold);background:#fff;color:var(--gold-d);font-size:22px;line-height:1;cursor:pointer;padding:0}
.ovx:hover{background:var(--gold);color:#fff}
.ovb .go{margin-top:18px}
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
  .ovb{padding:24px 20px 20px}
  .ovb h3{font-size:22px}
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
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
.dt{display:block;width:100%;min-height:52px;padding:14px 48px 14px 20px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238f6d37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='3'/%3E%3Cpath d='M3 10h18M8 3v4M16 3v4'/%3E%3C/svg%3E") no-repeat right 18px center;color:var(--mute);border:1px solid #d6ccb9;border-radius:999px;font:inherit;font-size:18px;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.dt:hover{border-color:var(--gold)}
.dt.has{color:var(--text)}
.stayhint{margin:16px 0 0;font-size:16px;color:var(--gold-d)}
.stayhint:empty{display:none}
.stayhint.warn{color:#b4402e}
.ovb.cal{max-width:920px;padding:28px 28px 22px}
.calrule{color:var(--mute);font-size:17px;margin:0 0 18px}
.calrule b{color:var(--gold-d)}
.calmonths{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.calmonths.one{grid-template-columns:1fr}
.calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.calh h4{font-size:21px;margin:0;font-weight:600}
.calnavb{width:46px;height:46px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--gold-d);font-size:26px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.calnavb:hover:not(:disabled){border-color:var(--gold)}
.calnavb:disabled{opacity:.35;cursor:not-allowed}
.calnavb.ph{border:0;background:none;cursor:default}
.calg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px 0}
.wd{font-size:14px;font-weight:600;color:var(--mute);text-align:center;padding:6px 0}
.cd{height:54px;border:0;border-radius:12px;background:transparent;color:var(--text);font:inherit;font-size:19px;font-weight:500;cursor:pointer;padding:0;transition:background .1s}
.cd.e{visibility:hidden;cursor:default}
.cd:hover:not(:disabled){background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold)}
.cd:disabled{color:#bdb7aa;cursor:not-allowed}
.cd.blk{background:repeating-linear-gradient(45deg,#f1ebdd,#f1ebdd 6px,#faf6ee 6px,#faf6ee 12px);color:#a39b8b}
.cd.rg{background:var(--cream);border-radius:0}
.cd.st,.cd.en{background:linear-gradient(180deg,#c09a5d,#a3803f);color:#fff;font-weight:700;box-shadow:none}
.cd.st.hasend{border-radius:12px 0 0 12px}
.cd.en{border-radius:0 12px 12px 0}
.cd.st.en{border-radius:12px}
.calf{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.calsum{font-size:18px;font-weight:500;color:var(--text)}
.calbtns{display:flex;align-items:center;gap:16px}
.calbtns .go{margin-top:0}
.ghost{background:none;border:0;color:var(--gold-d);font:inherit;font-size:16px;text-decoration:underline;cursor:pointer;padding:6px}
@media(max-width:720px){
  .dt{min-height:44px;padding:10px 38px 10px 12px;font-size:15px;background-position:right 12px center}
  .calmonths{grid-template-columns:1fr}
  .cd{height:46px;font-size:17px}
  .ovb.cal{padding:22px 14px 16px}
  .calf{flex-direction:column;align-items:stretch}
  .calbtns{justify-content:space-between}
}
@media(max-width:480px){.dt{font-size:14px}}

/* Services rows: long names and prices wrap inside their own column and never run under the + / - buttons */
.svc .info{min-width:0;overflow-wrap:anywhere;white-space:normal}
/* Start with the basics: destination, check-in, check-out and group size all have exactly the same height */
.basics{--fh:52px;--ff:18px}
.basics select,.basics input:not([type=checkbox]),.basics .dt{height:var(--fh);min-height:var(--fh);font-size:var(--ff);padding-top:0;padding-bottom:0;line-height:normal}
.basics .dt{display:flex;align-items:center;padding-left:18px;padding-right:46px;background-position:right 16px center}
@media(min-width:1001px){.basics{--fh:46px;--ff:16px}}
@media(min-width:721px) and (max-width:1000px){.basics{--fh:44px;--ff:16px}}
@media(max-width:720px){.basics{--fh:44px;--ff:15px}.basics .dt{padding-left:12px;padding-right:34px;background-position:right 12px center}}
@media(max-width:360px){.basics{--ff:14px}}
/* Packages: price, minimum guests and what is included */
.pk{align-items:start}
.pkc{display:flex;flex-direction:column;gap:10px;min-width:0}
.pkc .opt{height:auto}
.opt:disabled{opacity:.55;cursor:not-allowed}
.opt:disabled:hover{border-color:var(--line)}
.lowg{margin:0;color:#b4402e;font-size:14px;line-height:1.4}
.cust{align-self:flex-start;padding:10px 18px;background:#fff;border:1px solid var(--gold);border-radius:999px;color:var(--gold-d);font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.cust:hover{background:var(--gold);color:#fff}
.pinc{font-size:15px}
.pinc summary{cursor:pointer;color:var(--gold-d);font-weight:500}
.pinc ul{margin:8px 0 0;padding-left:20px;color:var(--mute);line-height:1.5}
.pinc li{margin:3px 0}
/* Services with two choices (people and hours) and packages that include only some days */
.qtys{display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.qrow{display:flex;align-items:center;gap:10px}
.qrow small{margin:0;color:var(--mute);font-size:14px;font-weight:400}
.svc.inc.part .qty{display:flex}
.svc.inc:not(.part) .qtys{display:none}
@media(max-width:520px){.qrow small{font-size:12px}}
`;

class TripBuilder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.s = {
      mode: "stay", destination: "", checkIn: "", checkOut: "", guests: "", tier: "4-6", exactBedrooms: "",
      ranks: {}, package: null, services: {}, staff: {}, svcTab: "regular"
    };
    this._rev = 1; // furthest step shown on mobile (1 to 3)
  }

  // Reads ?session_id=cs_... from the page URL after Stripe sends the customer back
  returnedSessionId() {
    const pick = (s) => { const m = /[?&]session_id=(cs_[A-Za-z0-9_]+)/.exec(s || ""); return m ? m[1] : ""; };
    try { if (wixLocation.query && wixLocation.query.session_id) return String(wixLocation.query.session_id); } catch (e) {}
    try { const v = pick(window.location.search); if (v) return v; } catch (e) {}
    try { const v = pick(window.top.location.search); if (v) return v; } catch (e) {}
    return "";
  }

  showScreen(kind, title, text, note, retry) {
    this.shadowRoot.innerHTML = screenHTML(kind, title, text, note, retry);
    const b = this.shadowRoot.querySelector("#retry");
    if (b) b.onclick = () => this.connectedCallback();
  }

  async connectedCallback() {
    console.log("APP VERSION: b2 (planning fee + 3rd choice)");

    // Returning from Stripe: confirm the payment, then go to the thank-you page
    const sessionId = this.returnedSessionId();
    if (sessionId) {
      this.showScreen(
        "loading",
        "Confirming your payment",
        "Please wait while we securely confirm your deposit and record your booking request.",
        "Please do not close or reload this page."
      );
      let data = null;
      try {
        const res = await httpClient.fetchWithAuth(BASE_URL + "/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        data = await res.json();
        console.log("CONFIRM PAYMENT:", data);
        if (data.error) console.error("CONFIRM ERROR:", data.error);
        if (data.notStored && data.notStored.length) console.warn("ORDER FIELDS NOT STORED:", data.notStored);
      } catch (e) {
        console.error("CONFIRM ERROR:", e);
      }

      if (data && data.paid && !data.error) {
        this.showScreen(
          "success",
          "Payment confirmed",
          "Thank you! Your provisional deposit has been received. Taking you to your confirmation page…"
        );
        try { wixLocation.to(THANK_YOU_PATH); } catch (e) {}
        // Fallback in case the redirect does not happen
        setTimeout(() => {
          this.showScreen(
            "success",
            "Thank you!",
            "Your provisional deposit has been received. Our team will check availability and email you shortly."
          );
        }, 5000);
      } else if (data && data.paid === false) {
        this.showScreen(
          "warn",
          "Your payment is still processing",
          "We have not received the final confirmation yet. Please do not pay again. We will email you as soon as it is confirmed."
        );
      } else {
        this.showScreen(
          "warn",
          "Payment received",
          "Your payment went through, but we could not finish recording it on this page. Please do not pay again. Our team will contact you by email."
        );
      }
      return;
    }

    // Normal visit: show a welcome message for at least SPLASH_MS while the villas load from the CMS in parallel
    this.showScreen("loading", SPLASH_TITLE, SPLASH_TEXT, SPLASH_NOTE);
    try {
      const wait = new Promise((r) => setTimeout(r, SPLASH_MS));
      const load = (async () => {
        const res = await httpClient.fetchWithAuth(BASE_URL + "/api/rentals");
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Could not load rentals");
        setDestinations(data.destinations || {});
      })();
      await Promise.all([wait, load]);
    } catch (e) {
      console.error("RENTALS ERROR:", e);
      this.showScreen(
        "warn",
        "We could not load the trip options",
        "Please check your connection and try again.",
        "",
        true
      );
      return;
    }
    this.build(); this.renderVillas(); this.refresh();
    // The CMS has no star ratings, so hide the legend
    const legend = this.shadowRoot.querySelector(".legend");
    if (legend) legend.remove();
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

  // "More Info" next to the planning fee: opens the explanation window.
  // On a normal page it covers the screen. Inside an iframe the page scroll is invisible to the widget,
  // so the window is placed over the part of the widget that is currently on screen.
  openFeeInfo() {
    if (this._ov) return;
    const ov = document.createElement("div");
    ov.className = "ov";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-labelledby", "feeT");
    ov.innerHTML = `<div class="ovb"><button type="button" class="ovx" aria-label="Close">&times;</button><h3 id="feeT">${FEE_INFO_TITLE}</h3>${FEE_INFO.map((t) => `<p>${t}</p>`).join("")}<button type="button" class="go ovok">Got it</button></div>`;
    const vis = this._vis && this._vis.size ? [...this._vis] : null;
    if (this._mode === "observe" && vis) {
      const a = Math.min(...vis), b = Math.max(...vis);
      Object.assign(ov.style, { position: "absolute", left: "0", right: "0", top: a * STEP + "px", height: (b - a + 1) * STEP + "px" });
    } else {
      Object.assign(ov.style, { position: "fixed", top: "0", right: "0", bottom: "0", left: "0" });
    }
    const close = () => this.closeFeeInfo();
    ov.querySelector(".ovx").onclick = close;
    ov.querySelector(".ovok").onclick = close;
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    this.shadowRoot.appendChild(ov);
    this._ov = ov;
    ov.querySelector(".ovx").focus();
  }

  closeFeeInfo() {
    if (!this._ov) return;
    this._ov.remove();
    this._ov = null;
    this._cal = null;
    const b = this.shadowRoot.querySelector(this._ovFocus || "#feeInfo");
    this._ovFocus = "";
    if (b) b.focus();
  }

  // Brings the newly shown step 2 into view so the guest does not have to scroll to find it.
  revealStep2() {
    requestAnimationFrame(() => {
      const el = this.shadowRoot.querySelector("#modeSec");
      if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    });
  }

  // ---- Calendar (big date-range picker that also shows the villa's minimum stay) ----
  // The minimum stay: the first-choice villa's own minimum if one is chosen, otherwise the lowest minimum among the villas shown.
  minStay() {
    if (this.s.mode !== "stay") return { n: 1, max: 1, who: "", varies: false };
    const villas = this.villasNow();
    const first = villas.find((v) => this.s.ranks[v.id] === "1");
    if (first) return { n: first.minNights || 1, max: first.minNights || 1, who: first.minNights ? first.name : "", varies: false };
    const mins = villas.map((v) => v.minNights || 1); // a villa without a minimum accepts 1 night
    if (!mins.length) return { n: 1, max: 1, who: "", varies: false };
    return { n: Math.min(...mins), max: Math.max(...mins), who: "", varies: Math.max(...mins) > Math.min(...mins) };
  }

  // The sentence that explains the minimum stay ("" when there is nothing to say)
  stayText(ms) {
    if (ms.who) return `${ms.who} requires a minimum stay of ${ms.n} nights.`;
    if (ms.n > 1) return `Minimum stay: ${ms.n} nights${ms.varies ? " or more, depending on the villa" : ""}.`;
    if (ms.max > 1) return `Some villas require a minimum stay of up to ${ms.max} nights.`;
    return "";
  }

  syncDates() {
    const set = (id, v) => {
      const b = this.shadowRoot.querySelector(id);
      b.querySelector("span").textContent = v ? fmtDate(v) : "Select date";
      b.classList.toggle("has", !!v);
    };
    set("#in", this.s.checkIn);
    set("#out", this.s.checkOut);
  }

  openCalendar(which) {
    if (this._ov) return;
    const ms = this.minStay();
    const today = new Date().toISOString().slice(0, 10);
    const base = this.s.checkIn || today;
    const c = (this._cal = {
      mode: which === "out" && this.s.checkIn ? "out" : "in",
      start: this.s.checkIn || "", end: this.s.checkOut || "", hover: "",
      min: Math.max(1, ms.n), ms, y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1,
    });
    const ov = document.createElement("div");
    ov.className = "ov";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-labelledby", "calT");
    ov.innerHTML = `<div class="ovb cal"><button type="button" class="ovx" aria-label="Close">&times;</button><div class="calbody"></div></div>`;
    const vis = this._vis && this._vis.size ? [...this._vis] : null;
    if (this._mode === "observe" && vis) {
      const a = Math.min(...vis), b = Math.max(...vis);
      Object.assign(ov.style, { position: "absolute", left: "0", right: "0", top: a * STEP + "px", height: (b - a + 1) * STEP + "px" });
    } else {
      Object.assign(ov.style, { position: "fixed", top: "0", right: "0", bottom: "0", left: "0" });
    }
    const close = () => this.closeFeeInfo();
    ov.addEventListener("click", (e) => {
      if (e.target === ov) return close();
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      if (b.classList.contains("ovx")) return close();
      if (b.dataset.nav) { const d = new Date(Date.UTC(c.y, c.m + Number(b.dataset.nav), 1)); c.y = d.getUTCFullYear(); c.m = d.getUTCMonth(); return this.drawCal(); }
      if (b.dataset.clear) { c.start = ""; c.end = ""; c.hover = ""; c.mode = "in"; return this.drawCal(); }
      if (b.dataset.done) { this.applyCal(); return close(); }
      if (b.dataset.d) this.pickDate(b.dataset.d);
    });
    ov.addEventListener("mouseover", (e) => {
      const b = e.target.closest(".cd[data-d]");
      if (!b || b.disabled || !c.start || c.end) return;
      c.hover = b.dataset.d; this.paintCal();
    });
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    this.shadowRoot.appendChild(ov);
    this._ov = ov;
    this._ovFocus = which === "out" ? "#out" : "#in";
    this.drawCal();
    ov.querySelector(".ovx").focus();
  }

  pickDate(d) {
    const c = this._cal;
    if (!c || d < new Date().toISOString().slice(0, 10)) return;
    if (c.mode === "out" && c.start) {
      if (d >= addDays(c.start, c.min)) { c.end = d; this.applyCal(); this.closeFeeInfo(); return; }
      if (d > c.start) return; // inside the minimum stay
      c.start = d; c.end = ""; c.hover = "";
    } else {
      c.start = d; c.end = ""; c.mode = "out"; c.hover = "";
    }
    this.drawCal();
  }

  applyCal() {
    const c = this._cal;
    if (!c) return;
    this.s.checkIn = c.start; this.s.checkOut = c.end;
    this.syncDates(); this.refresh();
  }

  drawCal() {
    const c = this._cal, ov = this._ov;
    if (!c || !ov) return;
    const today = new Date().toISOString().slice(0, 10);
    const ty = Number(today.slice(0, 4)), tm = Number(today.slice(5, 7)) - 1;
    const two = window.innerWidth > 760;
    const minEnd = c.start ? addDays(c.start, c.min) : "";
    const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = (y, m, prev, next) => {
      const lead = new Date(Date.UTC(y, m, 1)).getUTCDay(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      let cells = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => `<span class="wd">${w}</span>`).join("");
      for (let i = 0; i < lead; i++) cells += `<span class="cd e"></span>`;
      for (let day = 1; day <= n; day++) {
        const d = new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
        const past = d < today, blk = c.mode === "out" && !!c.start && d > c.start && d < minEnd;
        cells += `<button type="button" class="cd${blk ? " blk" : ""}" data-d="${d}"${past || blk ? " disabled" : ""}${blk ? ` title="Minimum stay: ${c.min} nights"` : ""} aria-label="${fmtDate(d)}">${day}</button>`;
      }
      const canPrev = y * 12 + m > ty * 12 + tm;
      const pb = prev ? `<button type="button" class="calnavb" data-nav="-1" aria-label="Previous month"${canPrev ? "" : " disabled"}>&#8249;</button>` : `<span class="calnavb ph"></span>`;
      const nb = next ? `<button type="button" class="calnavb" data-nav="1" aria-label="Next month">&#8250;</button>` : `<span class="calnavb ph"></span>`;
      return `<div class="calm"><div class="calh">${pb}<h4>${names[m]} ${y}</h4>${nb}</div><div class="calg">${cells}</div></div>`;
    };
    const n2 = new Date(Date.UTC(c.y, c.m + 1, 1));
    const months = two
      ? month(c.y, c.m, true, false) + month(n2.getUTCFullYear(), n2.getUTCMonth(), false, true)
      : month(c.y, c.m, true, true);
    const ms = c.ms;
    const rule = this.stayText(ms)
      ? `<p class="calrule"><b>${this.stayText(ms)}</b>${ms.n > 1 ? " Days that are too soon after check-in are shaded." : ""}</p>`
      : "";
    ov.querySelector(".calbody").innerHTML = `<h3 id="calT">Select your dates</h3>${rule}<div class="calmonths${two ? "" : " one"}">${months}</div>
      <div class="calf"><div class="calsum" id="calsum" aria-live="polite"></div>
      <div class="calbtns"><button type="button" class="ghost" data-clear="1">Clear dates</button><button type="button" class="go" data-done="1">Apply dates</button></div></div>`;
    this.paintCal();
  }

  // Colors the chosen range without redrawing (used while the mouse moves over the days)
  paintCal() {
    const c = this._cal, ov = this._ov;
    if (!c || !ov) return;
    const minEnd = c.start ? addDays(c.start, c.min) : "";
    const hov = !c.end && c.start && c.hover && c.hover >= minEnd ? c.hover : "";
    const last = c.end || hov;
    ov.querySelectorAll(".cd[data-d]").forEach((b) => {
      const d = b.dataset.d;
      b.classList.toggle("st", d === c.start);
      b.classList.toggle("en", !!last && d === last);
      b.classList.toggle("rg", !!c.start && !!last && d > c.start && d < last);
      b.classList.toggle("hasend", d === c.start && !!last);
    });
    const sum = ov.querySelector("#calsum");
    if (!sum) return;
    if (!c.start) sum.textContent = "Choose your check-in date.";
    else if (!last) sum.textContent = c.min > 1 ? `Check-in ${fmtDate(c.start)} · earliest check-out ${fmtDate(minEnd)}` : `Check-in ${fmtDate(c.start)} · now choose check-out`;
    else {
      const nights = nightsBetween(c.start, last);
      sum.textContent = `${fmtDate(c.start)} → ${fmtDate(last)} · ${nights} night${nights > 1 ? "s" : ""}`;
    }
  }

  build() {
    this._ov = null;
    const dest = Object.entries(DESTINATIONS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join("");
    const tiers = Object.entries(TIER_LABELS).map(([k, l]) => `<button class="opt tier" data-tier="${k}">${l}</button>`).join("");
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
          <div><label for="in">Check-in</label><button type="button" class="dt" id="in" aria-haspopup="dialog"><span>Select date</span></button></div>
          <div><label for="out">Check-out</label><button type="button" class="dt" id="out" aria-haspopup="dialog"><span>Select date</span></button></div>
          <div><label for="gs">Group size</label><input id="gs" type="number" min="1" inputmode="numeric" placeholder="Guests"></div>
        </div><p class="stayhint" id="stayHint" role="status"></p></section>

      <section id="modeSec" data-step="2"><h2>How would you like to build your trip?</h2>
        <p class="sub">Choose a stay with experiences, or book services only.</p>
        <div class="opts">
          <button class="opt mode on" data-mode="stay">Stay + experiences<small>Choose a villa, then select a package or customize.</small></button>
          <button class="opt mode" data-mode="services">Services only<small>Skip accommodation and build a service itinerary.</small></button>
        </div></section>

      <section id="stay" data-step="2"><h2>Choose your accommodation</h2>
        <p class="sub">Pick a bedroom tier, then rank your villas: a 1st and 2nd choice are required, and a 3rd choice is optional. We'll confirm availability for your dates and assign the best available match from your preferences.</p>
        <div class="tiers">${tiers}</div>
        <div class="exact"><label for="br">Exact bedroom count (optional)</label><input id="br" type="number" min="1" inputmode="numeric" placeholder="For example, 5"><small>Enter a specific number if you know what you need.</small></div>
        <details class="legend"><summary>What do the stars mean?</summary><dl>${legend}</dl></details>
        <div class="villas" id="villas"></div></section>

      <section id="pkgs" data-step="2"><h2>Pick a package</h2><p class="sub">Silver packages are for groups of 6 or more, and Gold and Platinum packages for groups of 10 or more. Smaller groups can customize their own package below.</p><div id="pkgBox"></div></section>

      <section id="svcSec" data-step="2"><h2>Build your own</h2><p class="sub">Add services; the price updates based on each service's pricing. Services already in your package are not charged twice.</p><div id="svcBox"></div>${more}</section>

      <section id="terms" data-step="3">
        <h2 class="acc-h2"><button type="button" class="acc-btn" id="termsBtn" aria-expanded="false" aria-controls="termsBody"><span>${TERMS_TITLE}</span><span class="acc-ic" aria-hidden="true"><svg width="16" height="10" viewBox="0 0 14 9"><path d="M1 1.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></h2>
        <p class="sub">${TERMS_INTRO}</p>
        <div class="acc-b" id="termsBody" hidden>${terms}<h3>Acknowledgment</h3><p class="tp">${ACK_TEXT}</p></div>
      </section>
    </div>

    <aside data-step="3"><h2>Your trip summary</h2>
      <div class="facts" id="facts"></div><div id="lines"></div>
      <div class="tot">
        <div class="ln sub"><span>Subtotal</span><b id="subtotal">$0</b></div>
        <div class="ln fee"><span>Guys Paradise Planning &amp; Service Fee — ${FEE_PCT_TEXT}%<button type="button" class="info" id="feeInfo" aria-haspopup="dialog">More Info</button></span><b id="fee">$0</b></div>
        <div class="ln"><span id="lblTotal">Estimated trip total</span><b id="total">$0</b></div>
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
    $("#in").onclick = () => this.openCalendar("in");
    $("#out").onclick = () => this.openCalendar("out");
    $("#dest").onchange = (e) => { this.s.destination = e.target.value; this.s.ranks = {}; this.pruneServices(); this.renderServices(); this.renderPackages(); this.renderVillas(); this.refresh(); };
    $("#gs").oninput = (e) => {
      this.s.guests = e.target.value; this.renderVillas(); this.renderServices(); this.renderPackages();
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
    $("#pkgBox").onclick = (e) => {
      if (e.target.closest(".cust")) { $("#svcSec").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); return; }
      const b = e.target.closest(".pkg");
      if (!b || b.disabled) return;
      this.s.package = this.s.package === b.dataset.pkg ? null : b.dataset.pkg;
      this.refresh();
    };
    $("#svcBox").onclick = (e) => {
      const t = e.target.closest(".tab");
      if (t) { this.s.svcTab = t.dataset.tab; this.renderServices(); this.refresh(); return; }
      const b = e.target.closest(".qty button");
      if (!b) return;
      if (b.parentElement.dataset.staff) {
        const sid = b.parentElement.dataset.staff, cur = this.s.staff[sid] || 1;
        this.s.staff[sid] = Math.min(MAX_STAFF, Math.max(1, cur + Number(b.dataset.d)));
        this.refresh();
        return;
      }
      const id = b.parentElement.dataset.svc, svc = servicesFor(this.s.destination).find((x) => x.id === id);
      if (!svc) return;
      const cur = this.s.services[id] || 0;
      const next = Number(b.dataset.d) > 0 ? (cur === 0 ? this.defaultQty(svc) : cur + 1) : cur - 1;
      this.s.services[id] = Math.min(this.maxQty(svc), Math.max(0, next));
      this.refresh();
    };
    this.renderServices();
    this.renderPackages();
    this.syncDates();
    ["#nm", "#em", "#ph"].forEach((q) => ($(q).oninput = () => this.refresh()));
    $("#ack").onchange = () => this.refresh();
    $("#feeInfo").onclick = () => this.openFeeInfo();
    $("#termsBtn").onclick = () => this.setTerms($("#termsBtn").getAttribute("aria-expanded") !== "true");
    $("#toTerms").onclick = (e) => { e.preventDefault(); this.setTerms(true); $("#terms").scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("#go").onclick = () => this.submit();
  }

  villasNow() {
    const all = DESTINATIONS[this.s.destination]?.tiers[this.s.tier] || [];
    const guests = Math.floor(Number(this.s.guests)) || 0;
    // Villas that fit the group come first, then cheapest first
    const tooSmall = (v) => (v.maxGuests && guests > v.maxGuests ? 1 : 0);
    return [...all]
      .sort((a, b) => tooSmall(a) - tooSmall(b) || (a.nightly || 1e12) - (b.nightly || 1e12))
      .slice(0, MAX_VILLAS);
  }

  renderVillas() {
    const box = this.shadowRoot.querySelector("#villas");
    const villas = this.villasNow();
    if (!villas.length) { box.innerHTML = `<p class="note">Choose a destination to see villas in this tier.</p>`; return; }
    const guests = Math.floor(Number(this.s.guests)) || 0;
    const tooSmall = (v) => !!(v.maxGuests && guests > v.maxGuests);
    for (const v of villas) if (tooSmall(v)) delete this.s.ranks[v.id]; // a villa that cannot hold the group cannot be ranked
    // Forget ranks of villas that are no longer in the visible list
    const shownIds = new Set(villas.map((v) => v.id));
    for (const k of Object.keys(this.s.ranks)) if (!shownIds.has(k)) delete this.s.ranks[k];

    const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    box.innerHTML = villas.map((v) => {
      const lines = [];
      lines.push(v.nightly > 0 ? (v.priceFrom ? "From " : "") + "$" + v.nightly.toLocaleString("en-US") + " / night" : "Price on request");
      if (v.city) lines.push(esc(v.city));
      if (v.bedrooms) lines.push(v.bedrooms + " bedrooms");
      if (v.minNights) lines.push("Minimum " + v.minNights + " nights");
      if (v.maxGuests) lines.push("Up to " + v.maxGuests + " guests");
      const img = v.image
        ? `<img src="${esc(v.image)}" alt="${esc(v.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block">`
        : "";
      return `<div class="villa"><div class="ph">${img}</div><b>${esc(v.name)}</b>
      <p class="note">${lines.join("<br>")}</p>
      <label>Your preference</label><select data-v="${esc(v.id)}"${tooSmall(v) ? " disabled" : ""}><option value="">Choose rank</option>
      <option value="1"${this.s.ranks[v.id] === "1" ? " selected" : ""}>1st choice</option>
      <option value="2"${this.s.ranks[v.id] === "2" ? " selected" : ""}>2nd choice</option>
      ${villas.length >= 3 ? `<option value="3"${this.s.ranks[v.id] === "3" ? " selected" : ""}>3rd choice</option>` : ""}</select>
      ${tooSmall(v) ? `<small class="cap">Sleeps up to ${v.maxGuests} guests, so it is not available for a group of ${guests}.</small>` : ""}</div>`;
    }).join("");
    box.querySelectorAll("select").forEach((sel) => (sel.onchange = () => {
      for (const k of Object.keys(this.s.ranks)) if (this.s.ranks[k] === sel.value && sel.value) delete this.s.ranks[k]; // one villa per rank
      this.s.ranks[sel.dataset.v] = sel.value;
      this.renderVillas(); this.refresh();
    }));
  }

  // Quantity limits and defaults come from pricing.ts, so the server applies the same limits
  maxQty(svc) { return maxQtyOf(svc, this.s); }
  defaultQty(svc) { return defaultQtyOf(svc, this.s); }
  clampQty() {
    for (const sv of servicesFor(this.s.destination)) { const q = this.s.services[sv.id] || 0; if (q > this.maxQty(sv)) this.s.services[sv.id] = this.maxQty(sv); }
  }

  // Remove selected services that the chosen destination does not offer
  pruneServices() {
    const ids = new Set(servicesFor(this.s.destination).map((x) => x.id));
    for (const k of Object.keys(this.s.services)) if (!ids.has(k)) delete this.s.services[k];
    for (const k of Object.keys(this.s.staff)) if (!ids.has(k)) delete this.s.staff[k];
  }

  // "Build your own": two tabs, the services offered everywhere and the experiences of the chosen destination
  renderServices() {
    const box = this.shadowRoot.querySelector("#svcBox");
    if (!box) return;
    const d = this.s.destination;
    if (!d) { box.innerHTML = `<p class="note">Choose a destination to see the services and tours available there, with their prices.</p>`; return; }
    const list = servicesFor(d);
    if (!list.length) { box.innerHTML = `<p class="note">Services for this destination are arranged with our team. Please contact us for pricing.</p>`; return; }
    const tab = this.s.svcTab === "location" ? "location" : "regular";
    const place = regionLabel(d);
    const tabs = [["regular", "Services"], ["location", place ? place + " Experiences" : "Experiences"]]
      .map(([k, t]) => `<button type="button" class="tab${k === tab ? " on" : ""}" data-tab="${k}" role="tab" aria-selected="${k === tab}">${t}<b class="cnt" data-cnt="${k}" hidden></b></button>`).join("");
    const stepper = (attr, id, label, val) => `<div class="qty" data-${attr}="${id}"><button type="button" data-d="-1" aria-label="Less ${label}">−</button><span>${val}</span><button type="button" data-d="1" aria-label="More ${label}">+</button></div>`;
    const rows = list.filter((x) => x.tab === tab).map((x) => {
      const ctl = x.basis === "staffhour"
        ? `<div class="qtys"><div class="qrow"><small>People</small>${stepper("staff", x.id, x.name + " people", 1)}</div><div class="qrow"><small>Hours</small>${stepper("svc", x.id, x.name + " hours", 0)}</div></div>`
        : stepper("svc", x.id, x.name, 0);
      return `
      <div class="svc" data-row="${x.id}"><div class="info">${x.name}<small>${priceText(x, this.s)}</small><small class="incl">Included in your package</small></div>${ctl}</div>`;
    }).join("");
    box.innerHTML = `<div class="tabs" role="tablist">${tabs}</div>${rows}`;
  }

  // "Pick a package": the packages of the chosen destination, with their price, minimum group size and contents
  renderPackages() {
    const box = this.shadowRoot.querySelector("#pkgBox");
    if (!box) return;
    const d = this.s.destination;
    if (!d) { box.innerHTML = `<p class="note">Choose a destination to see the package prices and what is included.</p>`; return; }
    const pk = packagesFor(d), keys = Object.keys(pk);
    if (!keys.length) { box.innerHTML = `<p class="note">Packages for this destination are arranged with our team. You can still build your own below.</p>`; return; }
    const guests = Math.floor(Number(this.s.guests)) || 0;
    box.innerHTML = `<div class="pk">` + keys.map((k) => {
      const p = pk[k], low = guests > 0 && guests < p.min;
      return `<div class="pkc"><button type="button" class="opt pkg" data-pkg="${k}"${low ? " disabled" : ""}>${p.popular ? '<span class="badge">Popular</span>' : ""}${p.label}<small>${p.tagline}</small><small class="pp">${usd(p.perPerson)} / guest</small><small>${p.min} guests minimum</small></button>
      ${low ? `<p class="lowg">This package needs at least ${p.min} guests.</p><button type="button" class="cust">Customize Package</button>` : ""}
      <details class="pinc"><summary>What's included</summary><ul>${p.items.map((t) => `<li>${t}</li>`).join("")}</ul></details></div>`;
    }).join("") + `</div>`;
  }

  hasRank(r) { return this.villasNow().some((v) => this.s.ranks[v.id] === r); }

  refresh() {
    const $ = (q) => this.shadowRoot.querySelector(q);
    const $$ = (q) => this.shadowRoot.querySelectorAll(q);
    const s = this.s, isStay = s.mode === "stay";
    this.clampQty();
    const g0 = Math.floor(Number(s.guests)) || 0;
    const pkAll = packagesFor(s.destination);
    if (s.package && (!pkAll[s.package] || (g0 > 0 && g0 < pkAll[s.package].min))) s.package = null; // group too small for this package
    ["#stay", "#pkgs", "#terms", "#ackBox", "#toTerms"].forEach((q) => $(q).classList.toggle("hide", !isStay));
    if (!isStay) s.package = null;
    $$(".mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === s.mode));
    $$(".tier").forEach((b) => b.classList.toggle("on", b.dataset.tier === s.tier));
    $$(".pkg").forEach((b) => b.classList.toggle("on", b.dataset.pkg === s.package));
    $$(".qty").forEach((q) => (q.querySelector("span").textContent = q.dataset.staff ? (s.staff[q.dataset.staff] || 1) : (s.services[q.dataset.svc] || 0)));
    const svcList = servicesFor(s.destination);
    const pkgNow = s.package && pkAll[s.package] && g0 >= pkAll[s.package].min ? pkAll[s.package] : null;
    $$(".svc").forEach((r) => {
      const x = svcList.find((y) => y.id === r.dataset.row);
      const cov = !!x && isCovered(x, pkgNow), lim = cov ? includedQty(x, pkgNow) : 0;
      r.classList.toggle("inc", cov);
      r.classList.toggle("part", !!lim);
      const t = r.querySelector(".incl");
      if (t) t.textContent = lim ? `Your package includes ${lim} days. Add extra days below.` : "Included in your package";
    });
    ["regular", "location"].forEach((k) => {
      const n = svcList.filter((x) => x.tab === k && (s.services[x.id] || 0) > 0).length;
      const el = $(`[data-cnt="${k}"]`);
      if (el) { el.textContent = n || ""; el.hidden = !n; }
    });

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
    $("#subtotal").textContent = usd(c.subtotal);   // items before the planning fee
    $("#fee").textContent = usd(c.serviceFee);      // Guys Paradise planning & service fee
    $("#total").textContent = usd(c.total);         // subtotal + fee
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
    }[c.policy] + " Your total includes the Guys Paradise planning and service fee" + (c.policy !== "services-only" && !RULES.depositIncludesFee ? ", which is collected with your final balance." : ".") + (isStay && c.priceTbd ? " The price of your first-choice villa is still being confirmed, so accommodation shows the lowest price in this tier." : isStay && c.estimated ? " Accommodation shows the lowest villa price in this tier until you choose a first-choice villa." : "");

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

    // minimum stay hint under the dates
    const ms = this.minStay(), hint = $("#stayHint");
    let msg = "", warn = false;
    if (isStay && s.destination && this.stayText(ms)) {
      msg = this.stayText(ms);
      if (c.nights > 0 && c.nights < ms.n) { warn = true; msg += " Your dates are shorter, please adjust them."; }
    }
    hint.textContent = msg; hint.classList.toggle("warn", warn);

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
    const firstVilla = this.villasNow().find((v) => s.ranks[v.id] === "1");
    if (isStay && firstVilla && firstVilla.minNights && c.nights < firstVilla.minNights) {
      return firstVilla.name + " requires a minimum stay of " + firstVilla.minNights + " nights.";
    }
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
      thirdChoice: isStay && pick("3") ? { id: pick("3").id, name: pick("3").name } : null,
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
      const res = await httpClient.fetchWithAuth(BASE_URL + API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.orderError) console.warn("ORDER SAVE ERROR:", data.orderError);
      if (data.orderMissing && data.orderMissing.length) console.warn("ORDER FIELDS NOT STORED:", data.orderMissing);

      try {
        wixLocation.to(data.checkoutUrl);
      } catch (navErr) {
        // Fallback: open Stripe in a new tab, or show a clickable link if the browser blocks it
        const opened = window.open(data.checkoutUrl, "_blank");
        if (!opened) {
          err.innerHTML = 'Click here to continue to payment: <a href="' + data.checkoutUrl + '" target="_blank" rel="noopener">Open payment page</a>';
        }
      }
    } catch (e) { err.textContent = e.message; this._busy = false; go.disabled = false; this.refresh(); }
  }
}

export default TripBuilder; // Wix registers the element itself
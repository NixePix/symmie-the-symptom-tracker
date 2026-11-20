/* Symmie clickable prototype B (alternative design). Vanilla JS, no build step. State is kept in localStorage.
   The "hash" below is a stand-in: the real app must use a salted hash. */
const $app = document.getElementById('app');
const KEY = 'symmie-proto-b-v1';
const COLORS = ['#ff5d8f', '#c6ff4d', '#4dd8ff', '#ffb347', '#b18cff', '#5dffb0'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- dates ----------
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const wd = s => (parse(s).getDay() + 6) % 7; // Mon=0
const pretty = s => s === today() ? 'Today' : s === addDays(today(), -1) ? 'Yesterday' : DAYS[wd(s)] + ' ' + parse(s).getDate() + ' ' + MONTHS[parse(s).getMonth()];

// ---------- state ----------
let db, ui = { idx: null, sel: null, hm: 'all', screen: 'lock', tab: 'log', date: today(), mode: 'day', ptab: 'graph', unlocked: false, offline: false, sheet: null, toast: null, err: '', sumFrom: addDays(today(), -27), sumTo: today(), wdSym: null, corr: null, showArch: false };

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function seed() {
  const r = rng(42), syms = [
    { id: 's1', name: 'Headache', type: 'strength' }, { id: 's2', name: 'Fatigue', type: 'strength' },
    { id: 's3', name: 'Joint pain', type: 'strength' }, { id: 's4', name: 'Nausea', type: 'yesno' },
    { id: 's5', name: 'Poor sleep', type: 'yesno' }, { id: 's6', name: 'Brain fog', type: 'strength' },
    { id: 's7', name: 'Cough', type: 'yesno', archived: true }];
  const entries = {}, notes = {}, t = today();
  const noteText = ['Long walk, felt ok after', 'Stressful day at work', 'Ate late, bad night', 'Rainy, stayed in', 'Family dinner', 'Skipped medication by mistake', 'Good day, gardening'];
  for (let i = 400; i >= 1; i--) {
    const d = addDays(t, -i), dt = parse(d), m = dt.getMonth(), w = wd(d);
    const winter = [11, 0, 1].includes(m) ? 1 : [5, 6, 7].includes(m) ? -1 : 0;
    const bad = Math.max(0, Math.min(1, .45 + .15 * winter + (w === 0 ? .18 : 0) + (r() - .5) * .5)); // shared latent "bad day"
    const e = {}, c = x => Math.max(1, Math.min(10, Math.round(x)));
    if (r() > .08) e.s1 = c(2 + bad * 6 + (r() - .5) * 3);
    if (r() > .1) e.s2 = c(2 + bad * 5.5 + (r() - .5) * 3);
    if (r() > .15) e.s3 = c(1 + winter * 2 + bad * 4 + (r() - .5) * 3);
    if (r() > .12) e.s4 = bad + r() * .4 > .95 ? 1 : 0;
    if (r() > .12) e.s5 = bad + r() * .5 > .9 ? 1 : 0;
    if (r() > .6) e.s6 = c(2 + bad * 5 + (r() - .5) * 3);
    if (i > 250 && r() > .5) e.s7 = r() > .6 ? 1 : 0;
    if (Object.keys(e).length) entries[d] = e;
    if (r() > .8) notes[d] = noteText[Math.floor(r() * noteText.length)];
  }
  return { user: null, symptoms: syms, entries, notes, reminder: { on: false, time: '20:00' }, nextId: 8 };
}
const load = () => { try { db = JSON.parse(localStorage.getItem(KEY)) } catch (e) { } if (!db) { db = seed(); db.user = { name: 'anna', hash: hash('demo') }; save(); } };
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const hash = s => { let h = 5381; for (const c of 'salt:' + s) h = (h * 33) ^ c.charCodeAt(0); return String(h >>> 0); };

// ---------- helpers ----------
const sym = id => db.symptoms.find(s => s.id === id);
const active = () => db.symptoms.filter(s => !s.archived);
const val = (d, id) => (db.entries[d] || {})[id];
function setVal(d, id, v) { (db.entries[d] = db.entries[d] || {})[id] = v; if (v === undefined) delete db.entries[d][id]; save(); }
const counts = () => { const c = {}; for (const d in db.entries) for (const id in db.entries[d]) c[id] = (c[id] || 0) + 1; return c; };
const top5 = () => { const c = counts(); return db.symptoms.filter(s => c[s.id]).sort((a, b) => c[b.id] - c[a.id]).slice(0, 5); };
const colorOf = (id) => COLORS[db.symptoms.findIndex(s => s.id === id) % COLORS.length];
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n == null ? '–' : (Math.round(n * 10) / 10).toString();
const disp = (s, v) => s.type === 'yesno' ? (v ? 'Yes' : 'No') : v;

// ---------- design B helpers ----------
// Severity colour: 1 = teal, 10 = red, hue runs through green and yellow.
const sev = v => `hsl(${Math.round(170 - (v - 1) / 9 * 170)} 92% 56%)`;
const norm = (s, v) => s.type === 'yesno' ? v : (v - 1) / 9;            // 0..1
const heat = f => sev(1 + f * 9);
const label10 = { 1: 'barely there', 4: 'noticeable', 7: 'strong', 10: 'worst' };

// ---------- render ----------
function render() {
  let h = ui.offline ? '<div class="offline">✈ Airplane mode – everything still works</div>' : '';
  if (!ui.unlocked) h += lockView();
  else {
    h += ui.tab === 'log' ? logView() : ui.tab === 'analysis' ? analysisView() : ui.tab === 'summary' ? summaryView() : settingsView();
    h += `<nav class="tabbar">${[['log', '✦', 'Today'], ['analysis', '≈', 'Analysis'], ['summary', '❏', 'Summary'], ['settings', '⚙', 'Settings']].map(([k, i, l]) => `<button data-tab="${k}" class="${ui.tab === k ? 'on' : ''}"><span class="ic">${i}</span><span class="lb">${l}</span></button>`).join('')}</nav>`;
  }
  if (ui.sheet) h += `<div class="sheet-bg" data-act="close-sheet"><div class="sheet" onclick="event.stopPropagation()">${sheetView()}</div></div>`;
  if (ui.toast) h += ui.toast;
  const keep = document.activeElement && document.activeElement.id, selS = keep && document.activeElement.selectionStart;
  $app.innerHTML = h;
  if (keep) { const el = document.getElementById(keep); if (el && el.tagName !== 'SELECT') { el.focus(); try { el.setSelectionRange(selS, selS) } catch (e) { } } }
  const st = $app.querySelector('.strip'); if (st) { const on = st.querySelector('.on'); if (on) st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.clientWidth / 2; }
}

// ---- lock ----
function lockView() {
  const first = !db.user;
  return `<div class="screen lock">
  <div class="orb"></div>
  <h1 class="word">symmie</h1>
  <p class="tag-line">${first ? 'Your private symptom diary.<br>Pick a name and password.' : 'Welcome back.<br>Unlock your diary.'}</p>
  <label class="field"><span>Username</span><input id="u" autocomplete="off" value="${first ? '' : esc(db.user.name)}"></label>
  <label class="field"><span>Password</span><input id="p" type="password" placeholder="${first ? '' : 'demo password: demo'}"></label>
  ${first ? '<label class="field"><span>Repeat password</span><input id="p2" type="password"></label>' : ''}
  ${ui.err ? `<div class="err">${ui.err}</div>` : ''}
  <button class="btn block big" data-act="${first ? 'setup' : 'unlock'}">${first ? 'Create and open' : 'Unlock'}</button>
  <p class="mute">🔒 Stored on this phone only. Nothing is sent over the network.</p>
  ${first ? '' : '<button class="mute" data-act="forgot" style="text-decoration:underline">Forgot password?</button>'}</div>`;
}

// ---- log: one symptom per screen ----
function logView() {
  const list = active(), d = ui.date, y = addDays(d, -1), n = list.length, isToday = d === today();
  const carry = list.filter(s => val(y, s.id) !== undefined && val(d, s.id) === undefined);
  if (ui.idx == null) { const f = list.findIndex(s => val(d, s.id) === undefined); ui.idx = f < 0 ? n : f; }
  ui.idx = Math.max(0, Math.min(n, ui.idx));
  const frac = x => list.length ? list.filter(s => val(x, s.id) !== undefined).length / list.length : 0;
  let strip = ''; for (let i = 20; i >= 0; i--) { const x = addDays(today(), -i); strip += `<button data-day="${x}" class="dy ${x === d ? 'on' : ''}"><small>${DAYS[wd(x)].slice(0, 2)}</small><b>${parse(x).getDate()}</b><i style="--f:${frac(x)}"></i></button>`; }
  const prog = list.map((s, i) => `<button data-step="${i}" class="seg-p ${val(d, s.id) !== undefined ? 'done' : ''} ${i === ui.idx ? 'cur' : ''}" title="${esc(s.name)}"></button>`).join('') + `<button data-step="${n}" class="seg-p end ${ui.idx === n ? 'cur' : ''}" title="Note and overview"></button>`;
  return `<div class="screen flow">
  <div class="top"><div><div class="kick">${isToday ? 'Check-in' : 'Editing past day'}</div><div class="bigdate">${pretty(d)}</div></div>
  <button class="round" data-act="pick-day" title="Pick a date">📅</button></div>
  <div class="strip">${strip}</div>
  <div class="prog">${prog}</div>
  ${ui.idx < n ? stepView(list[ui.idx], list, carry, y) : recapView(list, d)}</div>`;
}
function stepView(s, list, carry, y) {
  const d = ui.date, v = val(d, s.id), yv = val(y, s.id), i = ui.idx;
  const ctrl = s.type === 'strength'
    ? `<div class="scale">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(k => `<button class="band ${v === k ? 'on' : ''}" style="--c:${sev(k)}" data-set="${s.id}:${k}"><b>${k}</b><span>${label10[k] || ''}</span>${yv === k ? '<em>yesterday</em>' : ''}</button>`).join('')}</div>`
    : `<div class="yn2"><button class="half no ${v === 0 ? 'on' : ''}" data-set="${s.id}:0">No${yv === 0 ? '<em>yesterday</em>' : ''}</button><button class="half yes ${v === 1 ? 'on' : ''}" data-set="${s.id}:1">Yes${yv === 1 ? '<em>yesterday</em>' : ''}</button></div>`;
  return `<div class="q"><div><div class="kick">${i + 1} of ${list.length} · ${s.type === 'strength' ? 'how strong, 1–10' : 'yes or no'}</div><h1 class="qname">${esc(s.name)}</h1></div>
  <button class="round" data-menu="${s.id}" title="Edit symptom">⋯</button></div>
  ${carry.length > 1 ? `<button class="pill" data-act="confirm-all">⚡ Same as yesterday for all ${carry.length}</button>` : ''}
  ${ctrl}
  <div class="ctl"><button class="ghostb" data-act="back" ${i === 0 ? 'disabled' : ''}>‹ Back</button>
  ${yv !== undefined && v === undefined ? `<button class="same" data-same="${s.id}">Same as yesterday · ${disp(s, yv)}</button>` : '<span></span>'}
  <button class="ghostb" data-act="skip">${v === undefined ? 'Skip' : 'Next'} ›</button></div>`;
}
function recapView(list, d) {
  const done = list.filter(s => val(d, s.id) !== undefined).length;
  return `<div class="recap"><div class="kick">${done === list.length ? 'All logged ✓' : `${done} of ${list.length} logged`}</div><h1 class="qname">The day in colour</h1>
  <div class="tiles">${list.map((s, i) => { const v = val(d, s.id); return `<button class="tile" data-step="${i}" style="--c:${v === undefined ? '#2a2548' : s.type === 'yesno' ? (v ? sev(10) : '#3b3660') : sev(v)}"><small>${esc(s.name)}</small><b>${v === undefined ? '–' : disp(s, v)}</b></button>`; }).join('')}
  <button class="tile add" data-act="add-sym"><small>New symptom</small><b>＋</b></button></div>
  <div class="note-b"><b>📝 Day note</b><textarea id="note" rows="3" placeholder="Anything important today? Activity, food, stress…">${esc(db.notes[d] || '')}</textarea></div></div>`;
}

// ---- analysis ----
function analysisView() {
  const tabs = [['graph', 'Evolution'], ['year', 'Year'], ['patterns', 'Patterns']];
  return `<div class="screen"><div class="hdr"><h1 class="big">Analysis</h1></div>
  <div class="seg">${tabs.map(([k, l]) => `<button data-ptab="${k}" class="${ui.ptab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  ${ui.ptab === 'graph' ? graphView() : ui.ptab === 'year' ? yearView() : patternsView()}</div>`;
}
function buckets(mode) {
  const t = today(), out = [];
  if (mode === 'day') for (let i = 9; i >= 0; i--) { const d = addDays(t, -i); out.push({ label: String(parse(d).getDate()), days: [d] }); }
  if (mode === 'week') for (let i = 9; i >= 0; i--) { const days = []; for (let k = 0; k < 7; k++) days.push(addDays(t, -i * 7 - k)); out.push({ label: 'W-' + i, days }); }
  if (mode === 'month') for (let i = 9; i >= 0; i--) {
    const n = new Date(); n.setDate(1); n.setMonth(n.getMonth() - i); const y = n.getFullYear(), m = n.getMonth(), days = [];
    for (let dd = 1; dd <= 31; dd++) { const x = new Date(y, m, dd); if (x.getMonth() === m) days.push(iso(x)); }
    out.push({ label: MONTHS[m], days });
  }
  return out;
}
function bucketVal(s, b) {
  const vs = b.days.map(d => val(d, s.id)).filter(v => v !== undefined);
  if (!vs.length) return null;
  return s.type === 'yesno' ? avg(vs) * 10 : avg(vs);
}
function graphView() {
  const all = top5(); if (!ui.sel) ui.sel = all.slice(0, 3).map(s => s.id);
  const ss = all.filter(s => ui.sel.includes(s.id));
  const bs = buckets(ui.mode), W = 330, H = 230, L = 22, B = 22, T = 8;
  const x = i => L + i * (W - L - 10) / (bs.length - 1), y = v => T + (H - T - B) * (1 - v / 10);
  let svg = [0, 5, 10].map(v => `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#2a2548"/><text x="0" y="${y(v) + 3}">${v}</text>`).join('');
  svg += bs.map((b, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${b.label}</text>`).join('');
  ss.forEach((s, k) => {
    const c = colorOf(s.id); let path = '', area = '', pen = false, dots = '', first = null, last = null;
    bs.forEach((b, i) => {
      const v = bucketVal(s, b); if (v == null) { pen = false; return; }
      path += (pen ? 'L' : 'M') + x(i) + ' ' + y(v); pen = true; if (first == null) first = i; last = i;
      dots += `<circle cx="${x(i)}" cy="${y(v)}" r="9" fill="transparent" data-pt="${s.id}:${i}" style="cursor:pointer"/><circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#0d0a1c" stroke="${c}" stroke-width="2.5" pointer-events="none"/>`;
    });
    if (k === 0 && first != null) area = `<path d="${path} L${x(last)} ${y(0)} L${x(first)} ${y(0)} Z" fill="${c}" opacity=".12"/>`;
    svg += `${area}<path d="${path}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 5px ${c})"/>${dots}`;
  });
  const sel = ui.pt && ui.pt.split(':'), ps = sel && sym(sel[0]), pb = sel && bs[sel[1]], pv = ps && pb && bucketVal(ps, pb);
  return `<div class="seg">${['day', 'week', 'month'].map(k => `<button data-mode="${k}" class="${ui.mode === k ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
  <div class="legend chipsrow">${all.map(s => `<button class="cchip ${ui.sel.includes(s.id) ? 'on' : ''}" style="--c:${colorOf(s.id)}" data-tog="${s.id}">${esc(s.name)}</button>`).join('')}</div>
  <div class="card"><div class="mute">Last 10 ${ui.mode}s · tap names to show or hide lines</div>
  <svg viewBox="0 0 ${W} ${H}" width="100%">${svg}</svg>
  <div class="readout">${pv != null ? `<b style="color:${colorOf(ps.id)}">${esc(ps.name)}</b> · ${pb.label}: <b>${ps.type === 'yesno' ? Math.round(pv * 10) + '% of days yes' : fmt(pv)}</b>` : 'Tap a point for its value. Gaps mean no data, not zero.'}</div></div>
  <div class="mute">Week and month points are averages. Yes/no symptoms show the share of days answered yes (0–10 = 0–100%).</div>`;
}
// Year heatmap: one square per day, 53 week-columns, Monday at the top.
function yearView() {
  const ss = top5(), W = 400, c = 6.5, g = 7.5, start = addDays(today(), -wd(today()) - 52 * 7);
  const hm = ui.hm === 'all' || sym(ui.hm) ? ui.hm : 'all', s = hm === 'all' ? null : sym(hm);
  const score = d => { const e = db.entries[d]; if (!e) return null; const f = (s ? [s] : db.symptoms).filter(q => e[q.id] !== undefined).map(q => norm(q, e[q.id])); return f.length ? avg(f) : null; };
  let cells = '', months = '', lastM = -1;
  for (let i = 0; i < 53; i++) {
    const m = parse(addDays(start, i * 7)).getMonth(); if (m !== lastM) { months += `<text x="${i * g}" y="8">${MONTHS[m]}</text>`; lastM = m; }
    for (let r = 0; r < 7; r++) { const d = addDays(start, i * 7 + r); if (d > today()) continue; const f = score(d);
      cells += `<rect data-yd="${d}" x="${i * g}" y="${14 + r * g}" width="${c}" height="${c}" rx="1.6" fill="${f == null ? '#1e1a38' : heat(f)}" ${ui.yd === d ? 'stroke="#fff" stroke-width="1.5"' : ''} style="cursor:pointer"/>`; }
  }
  const yd = ui.yd, e = yd && db.entries[yd] || {};
  return `<div class="legend chipsrow"><button class="cchip ${hm === 'all' ? 'on' : ''}" style="--c:#f3f0ff" data-hm="all">All symptoms</button>${ss.map(x => `<button class="cchip ${hm === x.id ? 'on' : ''}" style="--c:${colorOf(x.id)}" data-hm="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  <div class="card"><div class="mute">The last 53 weeks, one square per day. ${s ? esc(s.name) : 'Average of everything logged'}: cool = mild, hot = bad. Dark = nothing logged.</div>
  <svg viewBox="0 0 ${W} ${14 + 7 * g}" width="100%" style="margin-top:8px">${months}${cells}</svg>
  <div class="ramp"><span>mild</span><i></i><span>bad</span></div>
  <div class="readout">${yd ? `<b>${pretty(yd)} ${yd}</b><br>${db.symptoms.filter(q => e[q.id] !== undefined).map(q => `<span class="vchip" style="--c:${q.type === 'yesno' ? (e[q.id] ? sev(10) : '#3b3660') : sev(e[q.id])}">${esc(q.name)} ${disp(q, e[q.id])}</span>`).join('') || '<span class="mute">Nothing logged.</span>'}${db.notes[yd] ? `<div class="mute">📝 ${esc(db.notes[yd])}</div>` : ''}<button class="btn small" style="margin-top:8px" data-goto="${yd}">Open this day</button>` : 'Tap a square to see that day.'}</div></div>`;
}
function pearson(a, b) {
  const xs = [], ys = [];
  for (const d in db.entries) { const p = db.entries[d][a], q = db.entries[d][b]; if (p !== undefined && q !== undefined) { xs.push(p); ys.push(q); } }
  if (xs.length < 8) return { r: null, n: xs.length };
  const mx = avg(xs), my = avg(ys); let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((v, i) => { sxy += (v - mx) * (ys[i] - my); sxx += (v - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : null, n: xs.length };
}
function patternsView() {
  const ss = top5(); if (!ss.length) return '<div class="card">Log some symptoms first.</div>';
  if (!ui.wdSym || !sym(ui.wdSym)) ui.wdSym = ss[0].id;
  const s = sym(ui.wdSym), mx = s.type === 'yesno' ? 1 : 10, col = colorOf(s.id);
  const by = f => { const v = []; for (const d in db.entries) if (f(d) && db.entries[d][s.id] !== undefined) v.push(db.entries[d][s.id]); return avg(v); };
  const wdAvg = DAYS.map((_, i) => by(d => wd(d) === i)), moAvg = MONTHS.map((_, i) => by(d => parse(d).getMonth() === i));
  const txt = v => v == null ? '–' : s.type === 'yesno' ? Math.round(v * 100) + '%' : fmt(v);
  const hi = Math.max(...wdAvg.filter(v => v != null));
  const hbars = `<div class="hbars">${wdAvg.map((v, i) => `<div class="hb"><span>${DAYS[i]}</span><div class="trk"><i style="width:${v == null ? 0 : v / mx * 100}%;background:${col};${v === hi ? `box-shadow:0 0 12px ${col}` : 'opacity:.55'}"></i></div><b>${txt(v)}</b></div>`).join('')}</div>`;
  const cx = 165, cy = 125, R = 88, pt = (i, r) => [cx + r * Math.cos((i * 30 - 90) * Math.PI / 180), cy + r * Math.sin((i * 30 - 90) * Math.PI / 180)];
  const poly = moAvg.map((v, i) => pt(i, 14 + (v == null ? 0 : v / mx) * (R - 14)).map(n => n.toFixed(1)).join(',')).join(' ');
  const radial = `<svg viewBox="0 0 330 250" width="100%">${[.33, .66, 1].map(f => `<circle cx="${cx}" cy="${cy}" r="${14 + f * (R - 14)}" fill="none" stroke="#2a2548"/>`).join('')}
    ${MONTHS.map((m, i) => { const [lx, ly] = pt(i, R + 18); return `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="#2a2548"/><text x="${lx}" y="${ly + 3}" text-anchor="middle">${m}</text>`; }).join('')}
    <polygon points="${poly}" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${col})"/></svg>`;
  const pairs = []; ss.forEach((a, i) => ss.slice(i + 1).forEach(b => pairs.push({ a, b, ...pearson(a.id, b.id) })));
  pairs.sort((p, q) => Math.abs(q.r ?? -1) - Math.abs(p.r ?? -1));
  const prow = p => `<div class="pr"><div class="pn">${esc(p.a.name)} <span>↔</span> ${esc(p.b.name)}</div><div class="axis"><i style="${p.r == null ? '' : p.r >= 0 ? `left:50%;width:${p.r * 50}%;background:${sev(10)}` : `right:50%;width:${-p.r * 50}%;background:${sev(1)}`}"></i></div>
    <div class="mute">${p.r == null ? `Not enough days logged together (${p.n}).` : `r = ${p.r.toFixed(2)} over ${p.n} days · ${Math.abs(p.r) > .5 ? 'they tend to move together' : Math.abs(p.r) > .25 ? 'a weak link' : 'little link'}${p.r < -.25 ? ' (opposite directions)' : ''}`}</div></div>`;
  return `<div class="mute">Pick a symptom</div><div class="legend chipsrow">${ss.map(x => `<button class="cchip ${x.id === s.id ? 'on' : ''}" style="--c:${colorOf(x.id)}" data-wds="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  <div class="card"><h3 class="ch">Which weekday is worst?</h3>${hbars}<div class="mute">Average ${s.type === 'yesno' ? 'share of days yes' : 'strength'}, all logged days.</div></div>
  <div class="card"><h3 class="ch">The year as a wheel</h3>${radial}<div class="mute">Further from the centre = higher, by calendar month. Temperature is not used in this version.</div></div>
  <div class="card"><h3 class="ch">What moves together?</h3>${pairs.map(prow).join('')}<div class="mute">Red bar: rise together · Teal bar: opposite. Correlation is not cause.</div></div>
  <div class="disc">ℹ This shows descriptive statistics from your own entries. It is not medical advice and makes no diagnosis.</div>`;
}
// ---- summary ----
function summaryView() {
  const f = ui.sumFrom, t = ui.sumTo, days = []; for (let d = f; d <= t; d = addDays(d, 1)) days.push(d);
  const ss = db.symptoms.filter(s => days.some(d => val(d, s.id) !== undefined));
  const notes = days.filter(d => db.notes[d]);
  const stat = s => { const v = days.map(d => val(d, s.id)).filter(v => v !== undefined); return s.type === 'yesno' ? [Math.round(avg(v) * 100) + '% yes', 'Yes: ' + v.filter(x => x).length, v.length] : [fmt(avg(v)), Math.max(...v), v.length]; };
  const range = (a) => `<button class="btn small ghost" data-range="${a}">${a} days</button>`;
  return `<div class="screen"><div class="hdr noprint"><h1>Doctor summary</h1></div>
  <div class="noprint card"><div style="display:flex;gap:8px"><label class="field" style="flex:1;margin:0"><span>From</span><input id="sf" type="date" value="${f}" max="${t}"></label><label class="field" style="flex:1;margin:0"><span>To</span><input id="st" type="date" value="${t}" max="${today()}"></label></div>
  <div style="display:flex;gap:6px;margin-top:10px">${range(14)}${range(28)}${range(90)}</div></div>
  <div class="paper card"><h2 style="margin-top:0">Symptom summary</h2><div class="mute">${f} to ${t} · ${days.length} days · diary of ${esc(db.user.name)}</div>
  <h3>Evolution</h3>${miniGraph(days)}
  <h3>Symptoms</h3><div class="stat h"><div>Symptom</div><div>Average</div><div>Highest</div><div>Days</div></div>
  ${ss.map(s => { const [a, b, c] = stat(s); return `<div class="stat"><div>${esc(s.name)}${s.archived ? ' <span class="tag arch">archived</span>' : ''}</div><div>${a}</div><div>${b}</div><div>${c}</div></div>`; }).join('') || '<div class="mute">No data in range.</div>'}
  <h3>Day notes</h3>${notes.map(d => `<div style="font-size:13px;margin:4px 0"><b>${d}</b> ${esc(db.notes[d])}</div>`).join('') || '<div class="mute">None.</div>'}
  <div class="disc">Descriptive summary of self-reported entries. No diagnosis.</div></div>
  <button class="btn block noprint" data-act="print">🖨 Print or save as PDF / share</button></div>`;
}
function miniGraph(days) {
  const ss = top5(), W = 330, H = 120, n = days.length;
  let svg = '';
  for (const s of ss) {
    let p = '', pen = false;
    days.forEach((d, i) => { let v = val(d, s.id); if (v === undefined) { pen = false; return; } if (s.type === 'yesno') v *= 10; p += (pen ? 'L' : 'M') + (4 + i * (W - 8) / Math.max(1, n - 1)) + ' ' + (H - 4 - v / 10 * (H - 8)); pen = true; });
    svg += `<path d="${p}" fill="none" stroke="${colorOf(s.id)}" stroke-width="1.6"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#faf9ff;border-radius:8px">${svg}</svg><div class="legend">${ss.map(s => `<span><i style="background:${colorOf(s.id)}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

// ---- settings ----
function settingsView() {
  const arch = db.symptoms.filter(s => s.archived);
  return `<div class="screen"><div class="hdr"><h1>Settings</h1></div>
  <div class="card"><h3 style="margin-top:0">Install & offline</h3>
  <div class="row"><span>Install Symmie on this phone<div class="mute">Opens full screen, own icon</div></span><button class="btn small" data-act="show-install">Install</button></div>
  <div class="row"><span>Works offline<div class="mute">All data and app code are on the phone</div></span><div class="switch ${ui.offline ? 'on' : ''}" data-act="toggle-offline"></div></div>
  <div class="mute">Switch on to simulate airplane mode.</div></div>
  <div class="card"><h3 style="margin-top:0">Daily reminder</h3>
  <div class="row"><span>Remind me to log</span><div class="switch ${db.reminder.on ? 'on' : ''}" data-act="toggle-reminder"></div></div>
  ${db.reminder.on ? `<div class="row"><span>Time</span><input id="rt" type="time" value="${db.reminder.time}"></div><div class="mute">Open question: reliable notifications without a server may not work on every Android phone. Use the panel button to preview.</div>` : ''}</div>
  <div class="card"><h3 style="margin-top:0">Export & backup</h3>
  <div class="row"><span>CSV for a doctor</span></div>
  <div style="display:flex;gap:8px;margin:8px 0"><input id="ef" type="date" value="${addDays(today(), -27)}" style="flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--line)"><input id="et" type="date" value="${today()}" style="flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--line)"></div>
  <button class="btn block ghost" data-act="csv">Download CSV</button>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" style="flex:1" data-act="backup">Save backup file</button><button class="btn ghost" style="flex:1" data-act="restore">Restore…</button></div>
  <input id="rf" type="file" accept=".json" hidden></div>
  <div class="card"><h3 style="margin-top:0">Manage symptoms</h3>
  ${db.symptoms.filter(s => !s.archived).map(s => `<div class="row"><span>${esc(s.name)} <span class="tag">${s.type === 'strength' ? '1–10' : 'yes/no'}</span></span><button class="btn small ghost" data-menu="${s.id}">Edit</button></div>`).join('')}
  ${arch.length ? `<button class="mute" data-act="toggle-arch" style="margin-top:8px">${ui.showArch ? '▾' : '▸'} Archived (${arch.length})</button>` : ''}
  ${ui.showArch ? arch.map(s => `<div class="row"><span>${esc(s.name)} <span class="tag arch">archived</span></span><button class="btn small ghost" data-unarch="${s.id}">Restore</button></div>`).join('') : ''}
  <div class="mute">Archived symptoms leave the log screen but stay in graphs and exports.</div></div>
  <div class="card"><button class="btn block ghost" data-act="lock">🔒 Lock now</button></div></div>`;
}

// ---- sheets ----
function sheetView() {
  const k = ui.sheet;
  if (k === 'install') return `<h2 style="margin-top:0">Install Symmie?</h2><p class="mute">Add to home screen. No Play Store, no sign-in.</p><button class="btn block" data-act="do-install">Install</button>`;
  if (k === 'add') return `<h2 style="margin-top:0">New symptom</h2><label class="field"><span>Name</span><input id="nn" placeholder="e.g. Dizziness"></label>
   <div class="mute">Type (cannot be changed later)</div><div class="seg" style="margin-top:6px"><button data-nt="strength" class="${ui.nt !== 'yesno' ? 'on' : ''}">Strength 1–10</button><button data-nt="yesno" class="${ui.nt === 'yesno' ? 'on' : ''}">Yes / no</button></div>
   ${ui.err ? `<div class="err">${ui.err}</div>` : ''}<button class="btn block" data-act="save-sym">Add symptom</button>`;
  if (k === 'forgot') return `<h2 style="margin-top:0">Forgot password?</h2><p>There is no reset. The only way in is to <b>erase the diary on this phone</b>, including all symptoms, values and notes. A backup file can be restored afterwards.</p><button class="btn danger block" data-act="erase">Erase diary and start over</button><button class="btn ghost block" style="margin-top:8px" data-act="close-sheet">Cancel</button>`;
  if (k === 'pick') return `<h2 style="margin-top:0">Pick a day</h2><input id="pd" type="date" max="${today()}" value="${ui.date}" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--line)"><button class="btn block" style="margin-top:12px" data-act="go-day">Go</button>`;
  if (k.startsWith('menu:')) {
    const s = sym(k.slice(5)), has = val(ui.date, s.id) !== undefined;
    return `<h2 style="margin-top:0">${esc(s.name)}</h2><label class="field"><span>Rename</span><input id="rn" value="${esc(s.name)}"></label>
    <button class="btn block" data-act="rename" data-id="${s.id}">Save name</button>
    ${has ? `<button class="btn ghost block" style="margin-top:8px" data-delval="${s.id}">Delete value for ${pretty(ui.date).toLowerCase()}</button>` : ''}
    <button class="btn ghost block" style="margin-top:8px" data-arch="${s.id}">Archive (hide from log, keep in graph &amp; exports)</button>
    <div class="mute" style="margin-top:8px">Type is fixed after creation. To change a past value, go to that day and tap a new value.</div>`;
  }
  return '';
}
// ---------- actions ----------
const $ = id => document.getElementById(id);
function toast(msg, action) { ui.toast = `<div class="toast"><span>${msg}</span>${action ? `<button class="btn" data-act="${action[0]}">${action[1]}</button>` : ''}</div>`; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 4500); }
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }

const acts = {
  setup() { const u = $('u').value.trim(), p = $('p').value, p2 = $('p2').value; if (!u || !p) return ui.err = 'Enter a username and password.'; if (p !== p2) return ui.err = 'Passwords do not match.'; db.user = { name: u, hash: hash(p) }; save(); ui.err = ''; ui.unlocked = true; ui.tab = 'log'; },
  unlock() { if ($('u').value.trim() === db.user.name && hash($('p').value) === db.user.hash) { ui.err = ''; ui.unlocked = true; ui.tab = 'log'; } else ui.err = 'Wrong username or password.'; },
  lock() { ui.unlocked = false; },
  forgot() { ui.sheet = 'forgot'; },
  erase() { db = seed(); db.user = null; db.symptoms = []; db.entries = {}; db.notes = {}; save(); ui.sheet = null; ui.err = ''; },
  reset() { localStorage.removeItem(KEY); load(); ui.unlocked = false; ui.sheet = null; ui.err = ''; ui.date = today(); },
  'jump-first'() { db.user = null; ui.unlocked = false; ui.err = ''; },
  'close-sheet'() { ui.sheet = null; ui.err = ''; },
  'prev-day'() { ui.date = addDays(ui.date, -1); }, 'next-day'() { if (ui.date < today()) ui.date = addDays(ui.date, 1); },
  'pick-day'() { ui.sheet = 'pick'; }, 'go-day'() { const v = $('pd').value; if (v && v <= today()) ui.date = v; ui.sheet = null; },
  'add-sym'() { ui.sheet = 'add'; ui.nt = 'strength'; ui.err = ''; },
  'save-sym'() { const n = $('nn').value.trim(); if (!n) return ui.err = 'Type a name.'; if (db.symptoms.some(s => s.name.toLowerCase() === n.toLowerCase() && !s.archived)) return ui.err = 'You already have that symptom.'; db.symptoms.push({ id: 's' + db.nextId++, name: n, type: ui.nt || 'strength' }); save(); ui.sheet = null; ui.err = ''; },
  'confirm-all'() { const y = addDays(ui.date, -1); active().forEach(s => { if (val(y, s.id) !== undefined && val(ui.date, s.id) === undefined) setVal(ui.date, s.id, val(y, s.id)); }); toast('Logged – same as yesterday ✓'); return 'skip'; },
  rename() { const n = $('rn').value.trim(); if (n) { sym(this.id).name = n; save(); ui.sheet = null; } },
  'toggle-offline'() { ui.offline = !ui.offline; },
  'show-install'() { ui.sheet = 'install'; },
  'do-install'() { ui.sheet = null; toast('Installed ✓ – opens full screen from your home screen'); return 'skip'; },
  'toggle-reminder'() { db.reminder.on = !db.reminder.on; save(); },
  'fire-reminder'() { toast('🔔 Symmie: time to log how you feel today', ['open-log', 'Open']); return 'skip'; },
  'open-log'() { if (ui.unlocked) { ui.tab = 'log'; ui.date = today(); } ui.toast = null; },
  'toggle-arch'() { ui.showArch = !ui.showArch; },
  print() { window.print(); },
  csv() { const f = $('ef').value, t = $('et').value; let out = 'date,symptom,type,value,note\n'; for (let d = f; d <= t; d = addDays(d, 1)) { db.symptoms.forEach(s => { const v = val(d, s.id); if (v !== undefined) out += `${d},"${s.name}",${s.type},${v},"${(db.notes[d] || '').replace(/"/g, '""')}"\n`; }); } download(`symmie-${f}_${t}.csv`, out, 'text/csv'); toast('CSV downloaded'); return 'skip'; },
  backup() { download('symmie-backup.json', JSON.stringify(db), 'application/json'); toast('Backup file saved'); return 'skip'; },
  restore() { $('rf').click(); return 'skip'; },
};

// ---- design B overrides and new actions ----
const advance = () => { const at = ui.idx; clearTimeout(advance.t); advance.t = setTimeout(() => { if (ui.idx === at && ui.unlocked && ui.tab === 'log') { ui.idx++; render(); } }, 280); };
acts.reset = () => { localStorage.removeItem(KEY); load(); ui.unlocked = false; ui.sheet = null; ui.err = ''; ui.date = today(); ui.idx = null; ui.sel = null; };
acts['confirm-all'] = () => { const y = addDays(ui.date, -1); active().forEach(s => { if (val(y, s.id) !== undefined && val(ui.date, s.id) === undefined) setVal(ui.date, s.id, val(y, s.id)); }); ui.idx = null; toast('Logged – same as yesterday ✓'); return 'skip'; };
acts.back = () => { ui.idx--; };
acts.skip = () => { ui.idx++; };
acts['go-day'] = () => { const v = $('pd').value; if (v && v <= today()) { ui.date = v; ui.idx = null; } ui.sheet = null; };
acts['save-sym'] = (orig => function () { const before = db.symptoms.length; const r = orig.call(this); if (db.symptoms.length > before) ui.idx = null; return r; })(acts['save-sym']);
acts.rename = function () { const n = $('rn').value.trim(); if (n) { sym(this.id).name = n; save(); ui.sheet = null; } };

$app.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-tab],[data-set],[data-same],[data-menu],[data-ptab],[data-mode],[data-pt],[data-wds],[data-nt],[data-delval],[data-arch],[data-unarch],[data-range],[data-day],[data-step],[data-tog],[data-hm],[data-yd],[data-goto]');
  if (!t || t.disabled) return; const D = t.dataset;
  if (D.act) { if (acts[D.act].call(D) === 'skip') return; }
  else if (D.tab) { ui.tab = D.tab; }
  else if (D.set) { const [id, v] = D.set.split(':'); setVal(ui.date, id, +v); advance(); }
  else if (D.same) { setVal(ui.date, D.same, val(addDays(ui.date, -1), D.same)); advance(); }
  else if (D.day) { ui.date = D.day; ui.idx = null; }
  else if (D.step) ui.idx = +D.step;
  else if (D.menu) { ui.sheet = 'menu:' + D.menu; }
  else if (D.ptab) ui.ptab = D.ptab;
  else if (D.mode) { ui.mode = D.mode; ui.pt = null; }
  else if (D.pt) ui.pt = D.pt;
  else if (D.tog) { ui.sel = ui.sel.includes(D.tog) ? ui.sel.filter(x => x !== D.tog) : [...ui.sel, D.tog]; ui.pt = null; }
  else if (D.hm) { ui.hm = D.hm; ui.yd = null; }
  else if (D.yd) ui.yd = D.yd;
  else if (D.goto) { ui.date = D.goto; ui.idx = null; ui.tab = 'log'; }
  else if (D.wds) ui.wdSym = D.wds;
  else if (D.nt) ui.nt = D.nt;
  else if (D.delval) { setVal(ui.date, D.delval, undefined); ui.sheet = null; }
  else if (D.arch) { sym(D.arch).archived = true; save(); ui.sheet = null; ui.idx = null; toast('Archived – still in graphs and exports'); return; }
  else if (D.unarch) { sym(D.unarch).archived = false; save(); ui.idx = null; }
  else if (D.range) { ui.sumTo = today(); ui.sumFrom = addDays(today(), -D.range + 1); }
  render();
});
$app.addEventListener('input', e => { if (e.target.id === 'note') { const v = e.target.value; if (v) db.notes[ui.date] = v; else delete db.notes[ui.date]; save(); } });
$app.addEventListener('change', e => {
  if (e.target.id === 'sf') { ui.sumFrom = e.target.value || ui.sumFrom; if (ui.sumFrom > ui.sumTo) ui.sumTo = ui.sumFrom; render(); }
  if (e.target.id === 'st') { ui.sumTo = e.target.value || ui.sumTo; if (ui.sumFrom > ui.sumTo) ui.sumFrom = ui.sumTo; render(); }
  if (e.target.id === 'rt') { db.reminder.time = e.target.value; save(); }
  if (e.target.id === 'rf' && e.target.files[0]) e.target.files[0].text().then(t => { try { const n = JSON.parse(t); if (!n.symptoms) throw 0; db = n; save(); ui.idx = null; toast('Backup restored'); } catch (x) { toast('That file is not a Symmie backup'); } });
});
$app.addEventListener('keydown', e => { if (e.key === 'Enter' && !ui.unlocked && e.target.tagName === 'INPUT') { (db.user ? acts.unlock : acts.setup)(); render(); } });
document.getElementById('proto-panel').addEventListener('click', e => { const a = e.target.dataset.act; if (a && acts[a]) { acts[a].call({}); render(); } });

load(); render();

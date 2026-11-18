/* ==================== مدار — شاشة وحدة ==================== */
(function () {
  'use strict';
  const P = window.AseelParser, S = window.Store, PR = window.Prayer;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => S.data;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon =id => '<svg><use href="#' + id + '"/></svg>';

  // ---------- التصنيفات ----------
  const CATS = { study: 'دراسة', exam: 'امتحان', health: 'صحة', meeting: 'اجتماع', deen: 'عبادة', sport: 'رياضة', social: 'اجتماعي', match: 'ماتشات', project: 'محتوى ومشاريع', personal: 'شخصي' };
  const catOk = c => CATS[c] ? c : 'personal';
  const cvar = c => 'var(--c-' + catOk(c) + ')';
  const catIcon = c => icon('c-' + catOk(c));
  const SUBJ_ICONS = ['anatomy', 'embryo', 'histo', 'biochem', 'physio', 'patho', 'pharma', 'radio', 'micro', 'immuno'];
  const subjIcon = id => icon('s-' + (SUBJ_ICONS.includes(id) ? id : 'other'));

  // ---------- التاريخ ----------
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => ymd(a) === ymd(b);
  const fmtT = d => P.fmtTime(d);
  const hm = d => { let h = d.getHours() % 12 || 12; return h + ':' + pad(d.getMinutes()); };
  const fmtG = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtGY = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' });
  let fmtH, fmtHM, fmtHD;
  try {
    fmtH = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    fmtHM = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { month: 'long', year: 'numeric' });
    fmtHD = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' });
  } catch (e) { fmtH = fmtHM = fmtHD = { format: () => '' }; }
  const hijri = d => fmtH.format(d).replace(/\s*هـ$/, '') + ' هـ';
  function dayLabel(d) { const x = P.describe(d); return Math.abs(x.diff) <= 2 ? x.day + ' ' + x.date : x.dayName + ' ' + x.date; }
  function inWords(ms) {
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return m + ' <small>دقيقة</small>';
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return h + (r ? ':' + pad(r) : '') + ' <small>' + (h === 1 && !r ? 'ساعة' : 'ساعة') + '</small>';
    const d = Math.round(h / 24);
    return d + ' <small>' + (d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام') + '</small>';
  }

  // ---------- استعلامات ----------
  const evStart = e => new Date(e.start);
  const evEnd = e => e.end ? new Date(e.end) : new Date(new Date(e.start).getTime() + 3600000);
  function eventsOn(day) {
    const k = ymd(day);
    return D().events.filter(e => ymd(evStart(e)) === k).sort((a, b) => (b.allDay - a.allDay) || (evStart(a) - evStart(b)));
  }
  const upcoming = now => D().events.filter(e => !e.allDay && evEnd(e) > now).sort((a, b) => evStart(a) - evStart(b));

  // ---------- تنبيه مع تراجع ----------
  let toastTimer;
  function toast(msg, undo) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button>تراجع</button>' : '');
    if (undo) t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); };
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), undo ? 6000 : 2400);
  }
  const snapshot = () => JSON.stringify(D());
  const restore = snap => S.replace(JSON.parse(snap));

  // ==================== الوقت ====================
  function renderTime() {
    const now = new Date(), h = now.getHours(), nm = D().name || 'سعيد';
    $('#clock').textContent = hm(now);
    $('#ampm').textContent = h < 12 ? 'ص' : 'م';
    $('#miniClock').textContent = hm(now) + (h < 12 ? ' ص' : ' م');
    $('#greeting').textContent = (h < 4 ? 'سهران يا ' : h < 12 ? 'صباح الخير يا ' : h < 17 ? 'يسعد ظهرك يا ' : 'مساء الخير يا ') + nm;
    $('#gdate').textContent = fmtG.format(now);
    $('#hdate').textContent = hijri(now);
    renderPrayer(now);
  }

  // ==================== الصلاة ====================
  function renderPrayer(now) {
    const n = PR.next(now), t = n.times;
    const diff = n.at - now, m = Math.round(diff / 60000);
    const txt = m < 60 ? m + ' دقيقة' : Math.floor(m / 60) + ':' + pad(m % 60) + ' ساعة';
    $('#prayNext').textContent = n.name + ' بعد ' + txt;
    $('#miniPray').textContent = n.name + ' ' + hm(n.at);
    $('#prayGrid').innerHTML = PR.ORDER.map(k => {
      const cls = (!n.tomorrow && k === n.key) ? 'now' : (t[k] < now ? 'past' : '');
      return '<div class="' + cls + '"><small>' + PR.NAMES[k] + '</small><b>' + hm(t[k]) + '</b></div>';
    }).join('');
  }

  // ==================== حديث اليوم ====================
  const HADITH = [
    ['إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى', 'متفق عليه'],
    ['من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة', 'رواه مسلم'],
    ['أحب الأعمال إلى الله أدومها وإن قلّ', 'متفق عليه'],
    ['احرص على ما ينفعك، واستعن بالله ولا تعجز', 'رواه مسلم'],
    ['المؤمن القوي خير وأحب إلى الله من المؤمن الضعيف، وفي كلٍّ خير', 'رواه مسلم'],
    ['يسّروا ولا تعسّروا، وبشّروا ولا تنفّروا', 'متفق عليه'],
    ['الكلمة الطيبة صدقة', 'متفق عليه'],
    ['من كانت الآخرة همّه جعل الله غناه في قلبه، وجمع له شمله، وأتته الدنيا وهي راغمة', 'رواه الترمذي'],
    ['لا يشكر الله من لا يشكر الناس', 'رواه أبو داود والترمذي'],
    ['إن الله يحب إذا عمل أحدكم عملًا أن يتقنه', 'رواه الطبراني والبيهقي، وحسّنه الألباني']
  ];
  function renderHadith() {
    const now = new Date(), doy = Math.floor((sod(now) - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const [t, src] = HADITH[doy % HADITH.length];
    $('#hadithCard').innerHTML = '<span class="label">قال رسول الله ﷺ</span><q>«' + esc(t) + '»</q><small>' + esc(src) + '</small>';
  }

  // ==================== الجاي ====================
  function renderNext() {
    const now = new Date(), list = upcoming(now);
    const cur = list.find(e => evStart(e) <= now);
    const next = cur ? list.find(e => e !== cur && evStart(e) > now) : list[0];
    const main = cur || next, card = $('#nextCard');
    if (!main) {
      const left = D().lectures.filter(l => !l.study).length;
      card.style.setProperty('--c', 'var(--sand)');
      card.innerHTML = '<div class="label"><i></i>الجاي</div><div class="title">ما عندك مواعيد جاية</div>' +
        '<div class="when">' + (left ? 'باقي ' + left + ' محاضرة ما ذاكرتها، خذ وحدة الحين.' : 'وقتك لك.') + '</div>';
      card.onclick = null; return;
    }
    const s = evStart(main), en = evEnd(main);
    card.style.setProperty('--c', cvar(main.cat));
    const after = cur ? next : list[1];
    card.innerHTML = '<div class="label"><i></i>' + (cur ? 'شغّال الحين' : 'الجاي') + '</div>' +
      '<div class="title">' + catIcon(main.cat) + '<span>' + esc(main.title) + '</span></div>' +
      '<div class="when">' + dayLabel(s) + ' · ' + fmtT(s) + ' – ' + fmtT(en) + '</div>' +
      '<div class="in">' + (cur ? 'باقي ' + inWords(en - now) : 'بعد ' + inWords(s - now)) + '</div>' +
      (after ? '<div class="then">بعدها: <b>' + esc(after.title) + '</b> · ' + dayLabel(evStart(after)) + ' ' + fmtT(evStart(after)) + '</div>' : '');
    card.onclick = () => openEvent(main);
  }

  // ==================== اليوم المختار ====================
  let selDay = sod(new Date());
  let calMonth = new Date(selDay.getFullYear(), selDay.getMonth(), 1);
  function remindTxt(m) {
    if (m >= 1440) return m === 1440 ? 'يوم' : (m / 1440) + ' أيام';
    if (m >= 60) return m === 60 ? 'ساعة' : m === 120 ? 'ساعتين' : (m / 60) + ' ساعات';
    return m + ' د';
  }
  function evRow(e, now) {
    const s = evStart(e), en = evEnd(e);
    const cls = e.allDay ? '' : (en < now ? ' past' : (s <= now ? ' now' : ''));
    return '<div class="ev-row' + cls + '" style="--c:' + cvar(e.cat) + '" data-ev="' + e.id + '" tabindex="0" role="button">' +
      '<div class="t">' + (e.allDay ? 'طول اليوم' : fmtT(s) + '<small>' + fmtT(en) + '</small>') + '</div><span class="dot"></span>' +
      '<div class="x"><b>' + esc(e.title) + '</b><span>' + CATS[catOk(e.cat)] + (e.remind ? ' · تنبيه قبل ' + remindTxt(e.remind) : '') + '</span></div>' +
      catIcon(e.cat) + '</div>';
  }
  function renderDay() {
    const x = P.describe(selDay), now = new Date(), isToday = sameDay(selDay, now);
    $('#dayTitle').textContent = (Math.abs(x.diff) <= 2 ? x.day : x.dayName) + ' ' + x.date;
    $('#daySub').textContent = (Math.abs(x.diff) <= 2 ? x.dayName + ' · ' : '') + hijri(selDay);
    const evs = eventsOn(selDay);
    // الصلوات تنحط بين المواعيد عشان تشوف يومك كامل
    const pt = PR.compute(selDay);
    const items = evs.map(e => ({ t: e.allDay ? -1 : evStart(e).getTime(), html: null, e }))
      .concat(PR.ORDER.map(k => ({ t: pt[k].getTime(), prayer: k })));
    items.sort((a, b) => a.t - b.t);
    let html = '', placed = !isToday;
    for (const it of items) {
      if (!placed && it.t > now.getTime()) { html += '<div class="nowline">الحين ' + fmtT(now) + '</div>'; placed = true; }
      if (it.e) html += evRow(it.e, now);
      else html += '<div class="ev-row prayer' + (it.t < now.getTime() ? ' past' : '') + '" style="--c:var(--c-deen)"><div class="t">' + fmtT(new Date(it.t)) + '</div><span class="dot"></span><div class="x"><b>' + PR.NAMES[it.prayer] + '</b></div>' + catIcon('deen') + '</div>';
    }
    if (!placed) html += '<div class="nowline">الحين ' + fmtT(now) + '</div>';
    if (!evs.length) html = '<div class="empty" style="padding:10px">' + icon('i-cal') + 'ما فيه مواعيد ' + (isToday ? 'اليوم' : 'هذا اليوم') + '. قول للمساعد أو اضغط «موعد».</div>' + html;
    $('#agenda').innerHTML = html;
  }
  $('#dayPrev').onclick = () => { setDay(addDays(selDay, -1)); };
  $('#dayNext').onclick = () => { setDay(addDays(selDay, 1)); };
  function setDay(d) { selDay = sod(d); calMonth = new Date(selDay.getFullYear(), selDay.getMonth(), 1); renderCalendar(); renderDay(); }

  // ==================== التقويم ====================
  function renderCalendar() {
    const first = calMonth, start = addDays(first, -first.getDay());
    $('#calTitle').textContent = fmtGY.format(first);
    $('#calHijri').textContent = fmtHM.format(addDays(first, 14));
    const today = ymd(new Date()), sel = ymd(selDay);
    let html = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), k = ymd(d);
      if (i === 35 && d.getMonth() !== first.getMonth()) break;
      const evs = eventsOn(d);
      html += '<button class="cd' + (d.getMonth() !== first.getMonth() ? ' out' : '') + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + '" data-day="' + k + '" aria-label="' + fmtG.format(d) + '">' +
        d.getDate() + '<span class="dots">' + evs.slice(0, 4).map(e => '<i style="--c:' + cvar(e.cat) + '"></i>').join('') + '</span></button>';
    }
    $('#calGrid').innerHTML = html;
  }
  $('#calGrid').addEventListener('click', e => { const c = e.target.closest('[data-day]'); if (c) setDay(fromYmd(c.dataset.day)); });
  $('#calGrid').addEventListener('dblclick', e => { const c = e.target.closest('[data-day]'); if (c) openEvent(null, fromYmd(c.dataset.day)); });
  $('#calPrev').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); };
  $('#calNext').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); };
  document.addEventListener('click', e => {
    const r = e.target.closest('[data-ev]'); if (r) { const ev = D().events.find(x => x.id === r.dataset.ev); if (ev) openEvent(ev); }
    if (e.target.closest('[data-add-event]')) openEvent(null, selDay);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-ev]')) e.target.click(); });

  // ==================== نافذة الموعد ====================
  const evDlg = $('#eventDlg'), evForm = $('#eventForm');
  let editing = null, pickedCat = 'personal';
  function renderCatPick() {
    $('#catPick').innerHTML = Object.keys(CATS).map(k => '<button type="button" data-cat="' + k + '" class="' + (k === pickedCat ? 'on' : '') + '" style="--c:' + cvar(k) + '">' + catIcon(k) + CATS[k] + '</button>').join('');
  }
  $('#catPick').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { pickedCat = b.dataset.cat; renderCatPick(); } });
  function toggleTimes() { $$('.times input', evForm).forEach(i => i.disabled = evForm.allDay.checked); $('.times').style.opacity = evForm.allDay.checked ? .4 : 1; }
  evForm.allDay.addEventListener('change', toggleTimes);
  function openEvent(ev, day) {
    editing = ev || null;
    $('#eventDlgTitle').textContent = ev ? 'تعديل الموعد' : 'موعد جديد';
    $('#eventDelete').style.display = ev ? '' : 'none';
    $('#eventIcs').style.display = ev ? '' : 'none';
    const s = ev ? evStart(ev) : (() => { const d = new Date(day || new Date()); d.setHours(new Date().getHours() + 1, 0, 0, 0); return d; })();
    const en = ev ? evEnd(ev) : new Date(s.getTime() + 3600000);
    evForm.title.value = ev ? ev.title : '';
    evForm.date.value = ymd(s);
    evForm.start.value = pad(s.getHours()) + ':' + pad(s.getMinutes());
    evForm.end.value = pad(en.getHours()) + ':' + pad(en.getMinutes());
    evForm.allDay.checked = ev ? !!ev.allDay : false;
    evForm.remind.value = String(ev ? (ev.remind || 0) : 30);
    if (!evForm.remind.value) evForm.remind.value = '30';
    evForm.notes.value = ev ? (ev.notes || '') : '';
    pickedCat = ev ? catOk(ev.cat) : 'personal';
    renderCatPick(); toggleTimes();
    evDlg.showModal();
    if (!ev) setTimeout(() => evForm.title.focus(), 50);
  }
  evForm.addEventListener('submit', e => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    const f = evForm, day = fromYmd(f.date.value);
    let s = new Date(day), en = null;
    if (!f.allDay.checked) {
      const [sh, sm] = (f.start.value || '09:00').split(':').map(Number);
      s.setHours(sh, sm, 0, 0);
      const [eh, em] = (f.end.value || '').split(':').map(Number);
      en = new Date(day); en.setHours(isNaN(eh) ? sh + 1 : eh, isNaN(em) ? sm : em, 0, 0);
      if (en <= s) en = new Date(s.getTime() + 3600000);
    }
    const obj = { title: f.title.value.trim() || 'موعد', cat: pickedCat, start: s.toISOString(), end: en ? en.toISOString() : null, allDay: f.allDay.checked, remind: +f.remind.value, notes: f.notes.value.trim() };
    if (editing) Object.assign(editing, obj); else D().events.push(Object.assign({ id: S.uid() }, obj));
    selDay = sod(s); calMonth = new Date(s.getFullYear(), s.getMonth(), 1);
    S.save(); toast(editing ? 'تم التعديل' : 'انضاف الموعد');
  });
  $('#eventDelete').onclick = () => {
    if (!editing) return;
    const snap = snapshot(); D().events = D().events.filter(x => x !== editing); S.save(); evDlg.close(); toast('انحذف الموعد', () => restore(snap));
  };
  $('#eventIcs').onclick = () => { if (editing) downloadIcs([editing], 'موعد'); };

  // ==================== ملف للآيفون (.ics) ====================
  const icsDate = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  const icsEsc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  function downloadIcs(evs, name) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Madar//AR', 'CALSCALE:GREGORIAN'];
    for (const e of evs) {
      const s = evStart(e);
      L.push('BEGIN:VEVENT', 'UID:' + e.id + '@madar', 'DTSTAMP:' + icsDate(new Date()), 'SUMMARY:' + icsEsc(e.title));
      if (e.allDay) L.push('DTSTART;VALUE=DATE:' + ymd(s).replace(/-/g, ''), 'DTEND;VALUE=DATE:' + ymd(addDays(s, 1)).replace(/-/g, ''));
      else L.push('DTSTART:' + icsDate(s), 'DTEND:' + icsDate(evEnd(e)));
      if (e.notes) L.push('DESCRIPTION:' + icsEsc(e.notes));
      if (e.remind) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:-PT' + e.remind + 'M', 'END:VALARM');
      L.push('END:VEVENT');
    }
    L.push('END:VCALENDAR');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    a.download = name + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('افتح الملف ويضيفه تقويم الآيفون مع التنبيه');
  }

  // ==================== المحاضرات ====================
  let subjFilter = '*';
  let closedGroups = {};
  try { closedGroups = JSON.parse(localStorage.getItem('saeed.closed')) || {}; } catch (e) { closedGroups = {}; }
  const subjOf = id => D().subjects.find(s => s.id === id) || { id: '', name: 'Other', ar: 'أخرى', c: '#bdb4a6' };
  const modules = () => [...new Set(D().lectures.map(l => l.module || 'بدون موديول'))];
  const curModule = () => D().module && modules().includes(D().module) ? D().module : (modules()[0] || '');
  const modLectures = () => D().lectures.filter(l => (l.module || 'بدون موديول') === curModule());
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;

  function renderLectures() {
    const mods = modules(), cm = curModule();
    $('#modSelect').innerHTML = mods.map(m => '<option' + (m === cm ? ' selected' : '') + '>' + esc(m) + '</option>').join('');
    $('#modSelect').style.display = mods.length > 1 ? '' : 'none';
    $('#modTitle').textContent = cm || 'المحاضرات';
    const all = modLectures(), n = all.length;
    const st = all.filter(l => l.study).length, rv = all.filter(l => l.rev).length, mq = all.filter(l => l.mcq).length;
    $('#modSub').textContent = n ? 'باقي ' + (n - st) + ' محاضرة ما ذاكرتها من ' + n : 'أضف محاضراتك';
    $('#prog3').innerHTML = [['مذاكرة', st, 'var(--mint)'], ['مراجعة', rv, 'var(--amber)'], ['MCQ', mq, 'var(--sky)']].map(([t, v, c]) =>
      '<div style="--c:' + c + '"><div class="t"><span>' + t + '</span><b>' + v + '<small>/' + n + '</small></b></div><div class="bar"><i style="width:' + pct(v, n) + '%"></i></div></div>').join('');
    const used = D().subjects.filter(s => all.some(l => l.subject === s.id));
    if (subjFilter !== '*' && !used.some(s => s.id === subjFilter)) subjFilter = '*';
    $('#subjChips').innerHTML = '<button data-sf="*" class="' + (subjFilter === '*' ? 'on' : '') + '">الكل</button>' +
      used.map(s => { const ls = all.filter(l => l.subject === s.id); return '<button data-sf="' + s.id + '" class="' + (subjFilter === s.id ? 'on' : '') + '" style="--c:' + s.c + '">' + subjIcon(s.id) + esc(s.name) + ' <small>' + ls.filter(l => l.study).length + '/' + ls.length + '</small></button>'; }).join('');
    const onlyLeft = $('#onlyLeft').checked;
    const wk = l => parseInt((l.week || 'W99').replace(/\D/g, '')) || 99;
    let html = '';
    const known = id => D().subjects.some(x => x.id === id);
    const groups = (subjFilter === '*' ? D().subjects : D().subjects.filter(s => s.id === subjFilter)).concat(subjFilter === '*' ? [{ id: '', name: 'Other', c: '#bdb4a6' }] : []);
    for (const s of groups) {
      let ls = s.id === '' ? all.filter(l => !known(l.subject)) : all.filter(l => l.subject === s.id);
      if (!ls.length) continue;
      const total = ls.length, done = ls.filter(l => l.study).length;
      if (onlyLeft) ls = ls.filter(l => !(l.study && l.rev && l.mcq));
      if (!ls.length) continue;
      ls.sort((a, b) => wk(a) - wk(b));
      const gid = (s.id || 'other');
      if (closedGroups[gid] === undefined) closedGroups[gid] = done === total; // المواد اللي خلصتها تنطوي من نفسها
      html += '<div class="lgroup' + (closedGroups[gid] ? ' closed' : '') + '" style="--c:' + s.c + '" data-g="' + gid + '"><button class="lghead" aria-expanded="' + !closedGroups[gid] + '">' + icon('i-chev-d').replace('<svg>', '<svg class="chev">') + subjIcon(s.id).replace('<svg>', '<svg class="sic">') + '<b>' + esc(s.name) + '</b><span class="tag">' + done + '/' + total + '</span><span class="bar"><i style="width:' + pct(done, total) + '%"></i></span></button><div class="lrows">' +
        ls.map(l => '<div class="lrow' + (l.study && l.rev && l.mcq ? ' full' : '') + '" data-lec="' + l.id + '">' +
          '<span class="wk">' + esc(l.week || '—') + '</span>' +
          '<button class="tt" data-edit title="' + esc(l.title) + '">' + esc(l.title) + '</button>' +
          ['study', 'rev', 'mcq'].map(k => '<button class="ck' + (l[k] ? ' on' : '') + '" data-k="' + k + '" aria-pressed="' + !!l[k] + '" aria-label="' + ({ study: 'مذاكرة', rev: 'مراجعة', mcq: 'أسئلة' }[k]) + ' ' + esc(l.title) + '">' + icon('i-tick') + '</button>').join('') +
          '<button class="nt' + (l.notes || l.link || l.fileId ? ' has' : '') + '" data-edit aria-label="ملاحظات">' + icon(l.fileId ? 'i-file' : l.link ? 'i-link' : 'i-note') + '</button>' +
          '</div>').join('') + '</div></div>';
    }
    $('#lecTable').innerHTML = html || '<div class="empty">' + icon('i-book') + (onlyLeft ? 'خلصت كل شي هنا، عاش!' : 'ما فيه محاضرات. قول للمساعد: «اضف محاضرة Physiology of pain لمادة الفسيو»') + '</div>';
  }
  $('#modSelect').addEventListener('change', e => { D().module = e.target.value; subjFilter = '*'; S.save(); });
  $('#subjChips').addEventListener('click', e => { const b = e.target.closest('[data-sf]'); if (b) { subjFilter = b.dataset.sf; renderLectures(); } });
  $('#onlyLeft').addEventListener('change', renderLectures);
  $('#lecTable').addEventListener('click', e => {
    const gh = e.target.closest('.lghead');
    if (gh) {
      const g = gh.parentElement, id = g.dataset.g;
      closedGroups[id] = !closedGroups[id]; g.classList.toggle('closed', !!closedGroups[id]); gh.setAttribute('aria-expanded', !closedGroups[id]);
      try { localStorage.setItem('saeed.closed', JSON.stringify(closedGroups)); } catch (err) { }
      return;
    }
    const row = e.target.closest('[data-lec]'); if (!row) return;
    const l = D().lectures.find(x => x.id === row.dataset.lec); if (!l) return;
    const ck = e.target.closest('[data-k]');
    if (ck) {
      const k = ck.dataset.k; l[k] = !l[k]; l.at = l.at || {}; if (l[k]) l.at[k] = new Date().toISOString(); S.save();
      if (l[k] && window.gsap && !reduceMotion) { const b = $('[data-lec="' + l.id + '"] [data-k="' + k + '"]'); if (b) gsap.fromTo(b, { scale: .6 }, { scale: 1, duration: .5, ease: 'back.out(3)' }); }
      if (l[k]) toast({ study: 'ذاكرت ', rev: 'راجعت ', mcq: 'حليت أسئلة ' }[k] + l.title); return; }
    if (e.target.closest('[data-edit]')) openLecture(l);
  });

  // ---------- نافذة المحاضرة ----------
  const lecDlg = $('#lecDlg'), lecForm = $('#lecForm');
  let editingLec = null;
  function openLecture(l) {
    editingLec = l || null;
    $('#lecDlgTitle').textContent = l ? 'تعديل المحاضرة' : 'محاضرة جديدة';
    $('#lecDelete').style.display = l ? '' : 'none';
    $('#lecSubject').innerHTML = D().subjects.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' — ' + esc(s.ar) + '</option>').join('');
    $('#modList').innerHTML = modules().map(m => '<option value="' + esc(m) + '">').join('');
    lecForm.reset();
    const f = lecForm;
    f.title.value = l ? l.title : '';
    f.subject.value = l ? l.subject : (subjFilter !== '*' ? subjFilter : D().subjects[0].id);
    f.week.value = l ? (l.week || '') : '';
    f.module.value = l ? (l.module || '') : curModule();
    f.study.checked = !!(l && l.study); f.rev.checked = !!(l && l.rev); f.mcq.checked = !!(l && l.mcq);
    f.notes.value = l ? (l.notes || '') : '';
    f.link.value = l ? (l.link || '') : '';
    $('#lecFileName').innerHTML = (l && l.fileId ? '<a href="#" id="openFile">فتح الملف: ' + esc(l.fileName || '') + '</a>' : '') +
      (l && l.link && /^https?:\/\//i.test(l.link) ? ' · <a href="' + esc(l.link) + '" target="_blank" rel="noopener">فتح الرابط</a>' : '');
    const of = $('#openFile'); if (of) of.onclick = ev => { ev.preventDefault(); openFile(l); };
    lecDlg.showModal();
  }
  async function openFile(l) {
    const w = window.open('', '_blank');
    try {
      const blob = await S.getFile(l.fileId);
      if (!blob) { if (w) w.close(); toast('الملف مو موجود في هذا الجهاز'); return; }
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url; else location.href = url;
    } catch (err) { if (w) w.close(); toast('ما قدرت أفتح الملف'); }
  }
  $('#btnAddLecture').onclick = () => openLecture(null);
  lecForm.addEventListener('submit', async e => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    const f = lecForm;
    const obj = { title: f.title.value.trim(), subject: f.subject.value, week: f.week.value, module: f.module.value.trim() || curModule() || 'بدون موديول',
      study: f.study.checked, rev: f.rev.checked, mcq: f.mcq.checked, notes: f.notes.value.trim(), link: f.link.value.trim() };
    let l = editingLec;
    const stamp = new Date().toISOString(), prev = l ? { study: l.study, rev: l.rev, mcq: l.mcq } : {};
    obj.at = Object.assign({}, l && l.at); ["study", "rev", "mcq"].forEach(k => { if (obj[k] && !prev[k]) obj.at[k] = stamp; });
    if (l) Object.assign(l, obj); else { l = Object.assign({ id: S.uid() }, obj); D().lectures.push(l); }
    const file = f.file.files[0];
    if (file) {
      try { if (l.fileId) await S.delFile(l.fileId); l.fileId = S.uid(); l.fileName = file.name; l.fileType = file.type || ''; await S.putFile(l.fileId, file); }
      catch (err) { toast('ما قدرت أحفظ الملف'); }
    }
    D().module = l.module;
    S.save(); toast(editingLec ? 'تم التعديل' : 'انضافت المحاضرة');
  });
  $('#lecDelete').onclick = () => {
    if (!editingLec) return;
    const snap = snapshot(), l = editingLec;
    S.forgetLecture(l); D().lectures = D().lectures.filter(x => x !== l); S.save(); lecDlg.close();
    toast('انحذفت المحاضرة', () => restore(snap));
  };

  // ==================== المهام ====================
  function taskLi(t) {
    return '<li data-task="' + t.id + '" class="' + (t.done ? 'done' : '') + '"><button class="tick' + (t.done ? ' on' : '') + '" aria-label="تم: ' + esc(t.title) + '">' + icon('i-tick') + '</button>' +
      '<span>' + esc(t.title) + '</span><button class="del" aria-label="حذف ' + esc(t.title) + '">' + icon('i-trash') + '</button></li>';
  }
  function renderTasks() {
    const today = ymd(new Date());
    const open = D().tasks.filter(t => !t.done);
    const doneToday = D().tasks.filter(t => t.done && t.doneAt && t.doneAt.slice(0, 10) === today);
    $('#taskCount').textContent = open.length ? open.length + ' مفتوحة' : 'كل شي خالص';
    $('#tasksOpen').innerHTML = open.concat(doneToday).map(taskLi).join('') || '<li class="empty">ولا مهمة، مرتاح</li>';
  }
  document.addEventListener('click', e => {
    const li = e.target.closest('[data-task]'); if (!li) return;
    const t = D().tasks.find(x => x.id === li.dataset.task); if (!t) return;
    if (e.target.closest('.tick')) { t.done = !t.done; t.doneAt = t.done ? new Date().toISOString() : null; S.save(); }
    else if (e.target.closest('.del')) { const snap = snapshot(); D().tasks = D().tasks.filter(x => x !== t); S.save(); toast('انحذفت المهمة', () => restore(snap)); }
  });
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, v = f.t.value.trim(); if (!v) return;
    D().tasks.push({ id: S.uid(), title: v, done: false, date: null, created: new Date().toISOString() }); S.save(); f.reset();
  });

  // ==================== الماتشات (أرسنال + الاتحاد) ====================
  const TEAMS = []; // داشبورد سعيد بدون ماتشات
  const LEAGUES = { 'eng.1': 'الدوري الإنجليزي الممتاز', 'eng.league_cup': 'كأس الرابطة الإنجليزية', 'eng.fa': 'كأس الاتحاد الإنجليزي', 'ksa.1': 'دوري روشن السعودي', 'ksa.kings.cup': 'كأس خادم الحرمين الشريفين', 'afc.champions': 'دوري أبطال آسيا للنخبة', 'afc.cupchampions': 'دوري أبطال آسيا للنخبة', 'uefa.champions': 'دوري أبطال أوروبا', 'uefa.europa': 'الدوري الأوروبي', 'eng.community_shield': 'الدرع الخيرية', 'ksa.super_cup': 'كأس السوبر السعودي' };
  const AR = { 'Arsenal': 'أرسنال', 'Al Ittihad': 'الاتحاد', 'Al-Ittihad': 'الاتحاد', 'Everton': 'إيفرتون', 'Liverpool': 'ليفربول', 'Al Hilal': 'الهلال', 'Abha': 'أبها', 'Al Ain': 'العين', 'Al Nassr': 'النصر', 'Al Ahli': 'الأهلي', 'Al Shabab': 'الشباب', 'Al Qadsiah': 'القادسية', 'Manchester City': 'مانشستر سيتي', 'Manchester United': 'مانشستر يونايتد', 'Chelsea': 'تشيلسي', 'Tottenham Hotspur': 'توتنهام', 'Newcastle United': 'نيوكاسل', 'Borussia Dortmund': 'بوروسيا دورتموند', 'Brentford': 'برينتفورد', 'Aston Villa': 'أستون فيلا', 'Brighton & Hove Albion': 'برايتون', 'West Ham United': 'وست هام', 'Fulham': 'فولهام', 'Crystal Palace': 'كريستال بالاس', 'Nottingham Forest': 'نوتنغهام فورست', 'Bournemouth': 'بورنموث', 'AFC Bournemouth': 'بورنموث', 'Wolverhampton Wanderers': 'وولفرهامبتون', 'Real Madrid': 'ريال مدريد', 'Barcelona': 'برشلونة', 'Bayern Munich': 'بايرن ميونخ', 'Paris Saint-Germain': 'باريس سان جيرمان', 'Inter Milan': 'إنتر ميلان', 'Al Taawoun': 'التعاون', 'Al Ettifaq': 'الاتفاق', 'Al Fateh': 'الفتح', 'Al Fayha': 'الفيحاء', 'Al Khaleej': 'الخليج', 'Al Riyadh': 'الرياض', 'Al Kholood': 'الخلود', 'Al Okhdood': 'الأخدود', 'Damac': 'ضمك', 'Al Najma': 'النجمة', 'Al Hazem': 'الحزم', 'Neom': 'نيوم', 'NEOM': 'نيوم', 'Al Wehda': 'الوحدة', 'Al Raed': 'الرائد' };
  const arName = n => AR[n] || n;
  const fxFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' });
  const fxShort = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' });
  const fxTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' });
  const tTxt = d => { const p = fxTime.formatToParts(d); const h = p.find(x => x.type === 'hour').value, m = p.find(x => x.type === 'minute').value, ap = p.find(x => x.type === 'dayPeriod').value; return h + ':' + m + ' ' + (ap === 'AM' ? 'ص' : 'م'); };
  const FX_KEY = 'saeed.fixtures.v1';
  let fx = {};
  try { fx = JSON.parse(localStorage.getItem(FX_KEY)) || {}; } catch (e) { fx = {}; }
  async function loadFixtures() {
    if (!TEAMS.length) return;
    for (const t of TEAMS) {
      try {
        const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/' + t.id + '/schedule?fixture=true', { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        const now = Date.now();
        const rows = (j.events || []).map(e => {
          const c = e.competitions && e.competitions[0]; if (!c) return null;
          const st = c.status && c.status.type;
          if (st && (st.completed || st.state === 'post')) return null;
          const comp = c.competitors.map(x => ({ id: x.team.id, name: x.team.displayName, logo: (x.team.logos && x.team.logos[0] && x.team.logos[0].href) || x.team.logo || '', home: x.homeAway === 'home' }));
          return { date: e.date, timeValid: c.timeValid !== false, league: (e.league && LEAGUES[e.league.slug]) || (e.league && e.league.name) || '', home: comp.find(x => x.home) || comp[0], away: comp.find(x => !x.home) || comp[1] };
        }).filter(x => x && new Date(x.date).getTime() > now - 3 * 3600000).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
        fx[t.id] = { at: now, rows };
      } catch (e) { /* بدون نت: نخلي آخر نسخة */ }
    }
    try { localStorage.setItem(FX_KEY, JSON.stringify(fx)); } catch (e) { }
    renderFixtures();
  }
  function badge(t) { return t && t.logo ? '<img src="' + esc(t.logo) + '" alt="' + esc(arName(t.name)) + '" loading="lazy">' : '<span class="ph">' + esc((arName(t && t.name) || '?').slice(0, 2)) + '</span>'; }
  function renderFixtures() {
    if (!$('#fixtures')) return;
    $('#fixtures').innerHTML = TEAMS.map(t => {
      const data = fx[t.id], rows = data ? data.rows.filter(r => new Date(r.date).getTime() > Date.now() - 3 * 3600000) : [];
      if (!rows.length) return '<article class="fx ' + t.cls + '"><div class="fh"><b>' + t.name + '</b> · المباراة القادمة</div><p class="muted" style="margin-top:8px">' + (data ? 'ما فيه مباريات مجدولة' : 'تنزل المواعيد أول ما يتوفر نت') + '</p></article>';
      const m = rows[0], d = new Date(m.date);
      const more = rows.slice(1).map(r => {
        const opp = String(r.home.id) === String(t.id) ? r.away : r.home, home = String(r.home.id) === String(t.id);
        return '<div>' + (opp.logo ? '<img src="' + esc(opp.logo) + '" alt="" loading="lazy">' : '<span class="ph">' + esc(arName(opp.name).slice(0, 2)) + '</span>') +
          '<span>' + (home ? 'ضد ' : 'عند ') + esc(arName(opp.name)) + '</span><em>' + fxShort.format(new Date(r.date)) + ' · ' + (r.timeValid ? tTxt(new Date(r.date)) : 'لم يحدد') + '</em></div>';
      }).join('');
      const old = data && Date.now() - data.at > 6 * 3600000;
      return '<article class="fx ' + t.cls + '"><div class="fh"><b>' + t.name + '</b> · المباراة القادمة</div>' +
        '<div class="main">' + badge(m.home) + '<div class="mid"><b>' + fxFmt.format(d) + '</b><small>' + (m.timeValid ? tTxt(d) + ' · ' : 'الوقت لم يحدد · ') + esc(m.league) + '</small></div>' + badge(m.away) + '</div>' +
        '<div class="vs">' + esc(arName(m.home.name)) + ' × ' + esc(arName(m.away.name)) + '</div>' +
        (more ? '<div class="more">' + more + '</div>' : '') +
        (old ? '<div class="stale">آخر تحديث ' + fxShort.format(new Date(data.at)) + '</div>' : '') + '</article>';
    }).join('');
  }

  // ==================== المساعد ====================
  const chat = $('#chat'), replies = $('#replies');
  let hideTimer;
  function showReplies(auto) {
    replies.hidden = false; chat.scrollTop = chat.scrollHeight;
    clearTimeout(hideTimer);
    if (auto) hideTimer = setTimeout(() => { if (!replies.matches(':hover') && !replies.contains(document.activeElement)) replies.hidden = true; }, 9000);
  }
  $('#btnHist').onclick = () => { if (replies.hidden) showReplies(false); else replies.hidden = true; };
  document.addEventListener('click', e => { if (!replies.hidden && !e.target.closest('.cmd-wrap') && !e.target.closest('dialog')) replies.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') replies.hidden = true; });
  function say(html, who) {
    const m = document.createElement('div');
    m.className = 'msg ' + (who || 'bot'); m.innerHTML = html;
    chat.appendChild(m);
    while (chat.children.length > 40) chat.firstChild.remove();
    showReplies(true);
    return m;
  }
  function evBlock(e) {
    const s = evStart(e);
    return '<div class="ev" style="--c:' + cvar(e.cat) + '"><span class="ci">' + catIcon(e.cat) + '</span><div><b>' + esc(e.title) + '</b><small>' + dayLabel(s) + (e.allDay ? ' · طول اليوم' : ' · ' + fmtT(s) + ' – ' + fmtT(evEnd(e))) + (e.remind ? ' · تنبيه قبل ' + remindTxt(e.remind) : '') + '</small></div></div>';
  }
  const undoBtn = '<button data-undo>' + icon('i-undo') + 'تراجع</button>';
  const norm = s => P.clean(s).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const STOP = new Set(['محاضره', 'موعد', 'مع', 'في', 'من', 'على', 'عن', 'الى', 'اللي', 'حق', 'ماده', 'لماده', 'الساعه', 'مذاكره', 'مراجعه', 'اسئله', 'mcq', 'of', 'the', 'and', 'in']);
  const tokens = s => norm(s).split(/[\s,()\-:]+/).filter(t => t.length > 1 && !STOP.has(t));
  function bestMatch(list, text, getTitle) {
    const q = tokens(text); if (!q.length) return null;
    let best = null, bs = 0;
    for (const x of list) {
      const tt = tokens(getTitle(x)); let sc = 0;
      for (const a of q) for (const b of tt) if (a === b || (a.length > 3 && (b.startsWith(a) || a.startsWith(b)))) { sc++; break; }
      if (sc > bs) { bs = sc; best = x; }
    }
    return best;
  }
  // ==================== المساعد الذكي (Gemini) ====================
  // لما يكون فيه نت والجهاز داخل بكلمة السر: الكلام يروح لـ Gemini عن طريق سيرفر مدار
  // ويرجع رد + أوامر نطبقها. بدون نت: المساعد العادي داخل الجهاز.
  const AI_URL = 'https://iorqgtgszskthfsmizxo.supabase.co/functions/v1/madar-ai';
  let aiWarned = false;
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.trim(); };
  function aiContext() {
    const now = new Date(), from = addDays(sod(now), -7), to = addDays(sod(now), 90);
    const t = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
    return {
      events: D().events.filter(e => evStart(e) >= from && evStart(e) <= to).map(e => ({ id: e.id, title: e.title, cat: e.cat, date: ymd(evStart(e)), start: e.allDay ? null : t(evStart(e)), end: e.allDay || !e.end ? null : t(evEnd(e)), allDay: !!e.allDay })),
      tasks: D().tasks.filter(x => !x.done).map(x => ({ id: x.id, title: x.title })),
      module: curModule(),
      lectures: modLectures().map(l => ({ id: l.id, title: l.title, subject: l.subject, week: l.week, study: !!l.study, rev: !!l.rev, mcq: !!l.mcq })),
      subjects: D().subjects.map(x => x.id),
      habits: D().habits.map(h => ({ id: h.id, name: h.name, today: hlog(todayKey(), h.id), target: h.target || 1 }))
    };
  }
  function aiNow() {
    const n = new Date();
    return ymd(n) + ' ' + P.DAY_NAMES[n.getDay()] + ' ' + pad(n.getHours()) + ':' + pad(n.getMinutes()) + ' (توقيت مكة)';
  }
  const atTime = (date, hm) => { const d = fromYmd(date); if (hm) { const [h, m] = hm.split(':').map(Number); d.setHours(h || 0, m || 0, 0, 0); } return d; };
  function applyAI(actions) {
    const added = [];
    for (const a of actions) {
      try {
        if (a.type === 'add_event' && a.title && a.date) {
          const allDay = !!a.allDay || !a.start, s = atTime(a.date, a.start);
          const en = allDay ? null : (a.end ? atTime(a.date, a.end) : new Date(s.getTime() + 3600000));
          const cat = CATS[a.cat] ? a.cat : 'personal';
          const ev = { id: S.uid(), title: String(a.title), cat, start: s.toISOString(), end: en ? en.toISOString() : null, allDay, remind: a.remind != null ? +a.remind : (allDay ? 0 : ({ exam: 1440, health: 60, meeting: 15 }[cat] || 30)), notes: '' };
          D().events.push(ev); added.push(ev);
        } else if (a.type === 'update_event') {
          const ev = D().events.find(e => e.id === a.id); if (!ev) continue;
          const date = a.date || ymd(evStart(ev)), cur = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
          if (a.title) ev.title = String(a.title);
          if (CATS[a.cat]) ev.cat = a.cat;
          if (a.remind != null) ev.remind = +a.remind;
          if (a.allDay) { ev.allDay = true; ev.start = atTime(date).toISOString(); ev.end = null; }
          else if (a.date || a.start || a.end) {
            const st = atTime(date, a.start || (ev.allDay ? '09:00' : cur(evStart(ev))));
            const dur = ev.allDay ? 3600000 : (evEnd(ev) - evStart(ev));
            ev.allDay = false; ev.start = st.toISOString(); ev.end = (a.end ? atTime(date, a.end) : new Date(st.getTime() + dur)).toISOString();
          }
        } else if (a.type === 'delete_event') {
          D().events = D().events.filter(e => e.id !== a.id);
        } else if (a.type === 'add_task' && a.title) {
          D().tasks.push({ id: S.uid(), title: String(a.title), done: false, date: null, created: new Date().toISOString() });
        } else if (a.type === 'complete_task') {
          const t = D().tasks.find(x => x.id === a.id); if (t) { t.done = true; t.doneAt = new Date().toISOString(); }
        } else if (a.type === 'lecture_check') {
          const l = D().lectures.find(x => x.id === a.id); if (!l || !['study', 'rev', 'mcq'].includes(a.field)) continue;
          l[a.field] = a.value !== false; l.at = l.at || {}; if (l[a.field]) l.at[a.field] = new Date().toISOString();
        } else if (a.type === 'add_lecture' && a.title) {
          const sub = D().subjects.some(x => x.id === a.subject) ? a.subject : D().subjects[0].id;
          D().lectures.push({ id: S.uid(), title: String(a.title), subject: sub, week: a.week || '', module: curModule() || 'بدون موديول', study: false, rev: false, mcq: false, notes: '' });
        } else if (a.type === 'habit' && D().habits.some(h => h.id === a.id)) {
          const k = todayKey(); D().habitLog[k] = D().habitLog[k] || {}; D().habitLog[k][a.id] = Math.max(0, +a.value || 0);
        }
      } catch (err) { console.warn('ai action', a, err); }
    }
    if (added.length) { const f = evStart(added[0]); selDay = sod(f); calMonth = new Date(f.getFullYear(), f.getMonth(), 1); }
    return added;
  }
  async function handleAI(text) {
    const history = Array.from(chat.children).slice(-7, -1).map(m => ({ role: m.classList.contains('me') ? 'user' : 'bot', text: plain(m.innerHTML) }));
    const thinking = say('<span class="muted">أفكر…</span>');
    let res;
    try {
      const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: Sync.code, text, now: aiNow(), context: aiContext(), history, profile: { name: D().name || 'سعيد', about: 'طالب طب سنة ثالثة' } }) });
      res = await r.json();
      if (!r.ok) throw new Error((res && res.error) || 'http');
    } catch (err) {
      thinking.remove();
      if (String(err.message) === 'no_key' && !aiWarned) { aiWarned = true; say('<small class="muted">الذكاء الاصطناعي ينتظر مفتاح Gemini، فاستخدمت المساعد العادي.</small>'); }
      return handleLocal(text, true);
    }
    thinking.remove();
    const acts = Array.isArray(res.actions) ? res.actions : [];
    if (!acts.length) { say(esc(res.reply || 'ما فهمت عليك، وضح لي أكثر؟')); return; }
    const snap = snapshot();
    const added = applyAI(acts);
    S.save();
    const extra = added.length === 1 ? '<button data-edit>' + icon('i-edit') + 'تعديل</button><button data-ics>' + icon('i-bell') + 'للآيفون</button>' : '';
    const m = say(esc(res.reply || 'تم ✓') + added.map(evBlock).join('') + '<div class="acts">' + extra + undoBtn + '</div>');
    m.querySelector('[data-undo]').onclick = () => { restore(snap); say('رجعتها زي ما كانت.'); };
    if (added.length === 1) {
      const id = added[0].id;
      m.querySelector('[data-edit]').onclick = () => { const x = D().events.find(e => e.id === id); if (x) openEvent(x); };
      m.querySelector('[data-ics]').onclick = () => { const x = D().events.find(e => e.id === id); if (x) downloadIcs([x], x.title); };
    }
  }
  function handle(text) {
    text = String(text || '').trim(); if (!text) return;
    if (navigator.onLine && window.Sync && Sync.signedIn) { say(esc(text), 'me'); return handleAI(text); }
    return handleLocal(text);
  }

  function handleLocal(text, echoed) {
    text = text.trim(); if (!text) return;
    if (!echoed) say(esc(text), 'me');
    const ct = P.clean(text);
    if (/^(?:هلا|مرحبا|السلام عليكم|سلام|هاي|اهلين)/.test(ct)) { say('هلا والله. قول لي وش عندك وأنا أرتبه.'); return; }
    if (/^(?:شكرا|يعطيك العافيه|مشكور|تسلم)/.test(ct)) { say('العفو، بالتوفيق.'); return; }
    if (/(?:ماتش|مباراة|مباراه)\s+(?:ارسنال|الاتحاد)\s+(?:متى|الجاي)|متى\s+(?:ماتش|مباراة|مباراه)/.test(ct)) {
      const which = /اتحاد|عميد/.test(ct) ? [TEAMS[1]] : /ارسنال/.test(ct) ? [TEAMS[0]] : TEAMS;
      say(which.map(t => { const r = fx[t.id] && fx[t.id].rows[0]; return r ? t.name + ': ' + esc(arName(r.home.name)) + ' × ' + esc(arName(r.away.name)) + ' · ' + fxFmt.format(new Date(r.date)) + (r.timeValid ? ' ' + tTxt(new Date(r.date)) : '') : t.name + ': ما عندي موعد للحين'; }).join('<br>'));
      return;
    }
    // العادات والملاحظات والامتحان
    const snap0 = snapshot();
    const undo0 = html => { const m = say(html + '<div class="acts">' + undoBtn + '</div>'); m.querySelector('[data-undo]').onclick = () => { restore(snap0); say('رجعتها زي ما كانت.'); }; };
    let mm;
    if ((mm = ct.match(/^(?:ملاحظ[هة]|ملاحظه|نوت|note|دون|سجل ملاحظ[هة])\s*:?\s*([\s\S]+)/i))) { D().tasks.push({ id: S.uid(), title: mm[1].trim(), done: false, date: null, created: new Date().toISOString() }); S.save(); undo0('حطيتها في المهام ✓'); return; }
    if (/شربت|شرب(?:ت)? (?:كاس|كوب|ماء|مويه)/.test(ct) && /ماء|مويه|موي|كاس|كوب|كاسات|اكواب/.test(ct)) {
      const n = +(ct.match(/(\d+)/) || [])[1] || (/كاسين|كوبين/.test(ct) ? 2 : 1);
      const cur = hlog(todayKey(), 'water'); setHabit('water', cur + n);
      undo0('سجلت ' + n + ' كوب ماء ✓ صرت ' + (cur + n) + ' من ' + ((D().habits.find(h => h.id === 'water') || {}).target || 8));
      return;
    }
    const HAB = [[/اذكار الصباح|أذكار الصباح|ذكار الصبح/, 'azkar-am'], [/اذكار المساء|أذكار المساء|اذكار المسا/, 'azkar-pm'], [/(?:قريت|قرأت|قريت ورد|ختمت).*(?:قران|قرآن|ورد|جز)/, 'quran'], [/تمرنت|رحت (?:الجيم|النادي)|لعبت (?:كوره|بادل|رياضه)|مشيت|خلصت (?:التمرين|الجيم)/, 'sport']];
    if (/^(?:قلت|خلصت|قريت|قرأت|سويت|تمرنت|رحت|لعبت|مشيت|ختمت)/.test(ct)) {
      for (const [re, id] of HAB) if (re.test(ct)) { setHabit(id, 1); const h = D().habits.find(x => x.id === id); undo0('عاش! حطيت ✓ على «' + esc(h ? h.name : id) + '»'); return; }
    }
    if (/(?:كم|متى).*(?:امتحان|اختبار)/.test(ct)) {
      const ex = D().events.filter(e => e.cat === 'exam' && evEnd(e) > new Date()).sort((a, b) => evStart(a) - evStart(b))[0];
      if (!ex) { say('ما عندك امتحان مسجل. قول مثلاً: «امتحان NBS يوم ٢٠ ديسمبر».'); return; }
      const days = Math.ceil((sod(evStart(ex)) - sod(new Date())) / 86400000), left = modLectures().filter(l => !l.study).length;
      say('باقي <b>' + days + '</b> يوم على «' + esc(ex.title) + '». باقي ' + left + ' محاضرة، يعني تقريباً ' + Math.ceil(left / Math.max(1, days)) + ' باليوم.');
      return;
    }
    const r = P.parse(text), snap = snapshot();
    const withUndo = (html, extra) => { const m = say(html + '<div class="acts">' + (extra || '') + undoBtn + '</div>'); m.querySelector('[data-undo]').onclick = () => { restore(snap); say('رجعتها زي ما كانت.'); }; return m; };

    if (r.intent === 'query') {
      const day = r.hasDate ? r.start : new Date(), evs = eventsOn(day), x = P.describe(day);
      const when = Math.abs(x.diff) <= 2 ? x.day : 'يوم ' + x.dayName + ' ' + x.date;
      say(evs.length ? 'عندك ' + evs.length + ' ' + when + ':' + evs.map(evBlock).join('') : 'ما عندك شي ' + when + '.');
      setDay(day); return;
    }
    if (r.intent === 'delete') {
      let pool = D().events; if (r.hasDate) pool = pool.filter(e => sameDay(evStart(e), r.start));
      const ev = bestMatch(pool, text.replace(/(?:احذف|امسح|الغ|الغي|ألغ|كنسل|شيل)/g, ''), e => e.title) || (r.hasDate && pool.length === 1 ? pool[0] : null);
      if (!ev) { say('ما لقيت موعد بهذا الاسم. جرب تقول اسمه زي ما هو مكتوب.'); return; }
      D().events = D().events.filter(e => e !== ev); S.save();
      withUndo('حذفته' + evBlock(ev)); return;
    }
    if (r.intent === 'done') {
      const k = /راجعت|مراجع/.test(ct) ? 'rev' : /حليت|اسئل|mcq|كويز/i.test(ct) ? 'mcq' : 'study';
      const q = text.replace(/(?:خلصت|انهيت|أنهيت|ذاكرت|راجعت|حليت|مذاكرة|مراجعة|اسئلة|أسئلة)/g, '');
      const lec = bestMatch(D().lectures, q, l => l.title + ' ' + subjOf(l.subject).name + ' ' + subjOf(l.subject).ar);
      if (lec) { lec[k] = true; lec.at = lec.at || {}; lec.at[k] = new Date().toISOString(); S.save(); withUndo({ study: 'حطيت ✓ مذاكرة على', rev: 'حطيت ✓ مراجعة على', mcq: 'حطيت ✓ أسئلة على' }[k] + ' «' + esc(lec.title) + '»'); return; }
      const t = bestMatch(D().tasks.filter(x => !x.done), q, x => x.title);
      if (t) { t.done = true; t.doneAt = new Date().toISOString(); S.save(); withUndo('خلصت «' + esc(t.title) + '»'); return; }
      say('ما لقيت محاضرة أو مهمة بهذا الاسم. اكتب جزء من اسمها بالإنجليزي، مثلاً «خلصت مذاكرة Coordination».'); return;
    }
    if (r.intent === 'lecture') {
      const title = ct.replace(/^(?:اضف|أضف|ضيف|سجل|حط)\s+(?:محاضر[هة]|درس|lecture)\s*/i, '')
        .replace(/\s*(?:ل|في|حق|ب)?\s*ماد[هة]\s+\S+/g, '')
        .replace(/\s*(?:ل|حق|في)\s*(?:ال)?(?:فسيو|اناتومي|باثو|بايو|هستو|هيستو|امبريو|امينو|مايكرو|فارما|راديو)\S*/g, '').trim() || 'محاضرة جديدة';
      const l = { id: S.uid(), title, subject: r.subject || D().subjects[0].id, week: '', module: curModule() || 'بدون موديول', study: false, rev: false, mcq: false, notes: '' };
      D().lectures.push(l); S.save();
      const m = withUndo('سجلت المحاضرة «' + esc(l.title) + '» في ' + esc(subjOf(l.subject).name), '<button data-edit>' + icon('i-edit') + 'تعديل</button>');
      m.querySelector('[data-edit]').onclick = () => openLecture(l); return;
    }
    // طلب ناقص مثل «ضيف موعدين»: نسأل بدل ما نخمن
    if (!r.hasDate && !r.hasTime && /^(?:ضيف|اضف|أضف|حط|سجل|ابي|ابغى)?\s*(?:لي\s*)?(?:موعد|موعدين|مواعيد|اجتماع|محاضره|محاضرة)\s*[.!]?$/.test(ct)) {
      say('أبشر، بس قول لي التفاصيل: وش الموعد ومتى؟ مثلاً «موعد أسنان الخميس الساعة ٤ العصر». لو أكثر من موعد قولهم واحد واحد.');
      return;
    }
    if (r.intent === 'task' || (!r.hasDate && !r.hasTime)) {
      const title = r.intent === 'task' ? ct.replace(/^(?:مهم[هة]|تاسك|task)\s*:?\s*/i, '') : r.title;
      D().tasks.push({ id: S.uid(), title: title || text, done: false, date: null, created: new Date().toISOString() }); S.save();
      withUndo('حطيتها في المهام: <b>' + esc(title || text) + '</b><br><small class="muted">لو تبيها في وقت معين قول مثلاً «… بكرة الساعة ٥»</small>'); return;
    }
    const ev = { id: S.uid(), title: r.title, cat: r.category, start: r.start.toISOString(), end: r.end ? r.end.toISOString() : null, allDay: r.allDay, remind: r.remindMin, notes: '' };
    const clash = !ev.allDay && D().events.find(e => !e.allDay && evStart(e) < new Date(ev.end) && evEnd(e) > new Date(ev.start));
    D().events.push(ev);
    selDay = sod(r.start); calMonth = new Date(r.start.getFullYear(), r.start.getMonth(), 1);
    S.save();
    const past = !ev.allDay && new Date(ev.start) < new Date();
    const m = withUndo('حطيته في التقويم' + evBlock(ev) +
      (r.vague ? '<small class="muted">الوقت تقريبي، عدّله لو تبي.</small><br>' : '') +
      (clash ? '<small style="color:var(--warn)">يتعارض مع «' + esc(clash.title) + '»</small><br>' : '') +
      (past ? '<small style="color:var(--bad)">الوقت هذا فات، متأكد؟</small><br>' : ''),
      '<button data-edit>' + icon('i-edit') + 'تعديل</button><button data-ics>' + icon('i-bell') + 'للآيفون</button>');
    m.querySelector('[data-edit]').onclick = () => { const x = D().events.find(e => e.id === ev.id); if (x) openEvent(x); };
    m.querySelector('[data-ics]').onclick = () => { const x = D().events.find(e => e.id === ev.id); if (x) downloadIcs([x], x.title); };
  }
  $('#composer').addEventListener('submit', e => { e.preventDefault(); const v = $('#cmd').value; $('#cmd').value = ''; handle(v); });

  // ---------- الصوت ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, heard = '';
  function stopListen() { listening = false; $('#mic').classList.remove('listening'); }
  function listen() {
    if (listening && rec) { rec.stop(); return; }
    if (!SR) { say('المتصفح هذا ما يدعم المايك المباشر. اضغط مايك كيبورد الجوال وتكلم، يكتب كلامك هنا وأنا أفهمه.'); $('#cmd').focus(); return; }
    rec = new SR(); rec.lang = 'ar-SA'; rec.interimResults = true; rec.continuous = false; heard = '';
    rec.onstart = () => { listening = true; $('#mic').classList.add('listening'); $('#cmd').placeholder = 'أسمعك…'; };
    rec.onresult = ev => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; heard = t; $('#cmd').value = t; };
    rec.onerror = ev => {
      stopListen();
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') say('محتاج إذن المايك. اسمح له من إعدادات المتصفح، أو استخدم مايك الكيبورد.');
      else if (ev.error === 'network') say('التعرف على الصوت يحتاج نت. اكتب أو استخدم مايك الكيبورد.');
      else if (ev.error !== 'no-speech' && ev.error !== 'aborted') say('ما سمعت زين، جرب مرة ثانية.');
    };
    rec.onend = () => { stopListen(); $('#cmd').placeholder = 'قول أو اكتب: عندي موعد اسنان الخميس الجاي الساعة ٤ العصر'; if (heard.trim()) { $('#cmd').value = ''; handle(heard); } };
    try { rec.start(); } catch (e) { stopListen(); }
  }
  $('#mic').onclick = listen;

  // ==================== التذكيرات ====================
  function checkReminders() {
    const now = Date.now(), n = D().notified;
    for (const e of D().events) {
      if (!e.remind || e.allDay) continue;
      const s = new Date(e.start).getTime(), key = e.id + '@' + e.start;
      if (now >= s - e.remind * 60000 && now < s + 5 * 60000 && !n[key]) {
        n[key] = 1;
        const body = fmtT(new Date(s)) + ' · ' + CATS[catOk(e.cat)];
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(e.title, { body, icon: 'assets/img/icon-192.png', tag: key }));
            else new Notification(e.title, { body, icon: 'assets/img/icon-192.png' });
          } catch (err) { }
        }
        toast('تذكير: ' + e.title + ' — ' + body);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        S.save();
      }
    }
  }

  // ==================== الإعدادات ====================
  $('#btnSettings').onclick = () => { $('#nameInput').value = D().name || ''; renderSyncSetting(); $('#settingsDlg').showModal(); };
  $('#nameInput').addEventListener('change', e => { D().name = e.target.value.trim() || 'سعيد'; S.save(); });
  $('#btnNotif').onclick = async () => {
    if (!('Notification' in window)) { toast('التنبيهات تحتاج تثبيت التطبيق على الشاشة الرئيسية'); return; }
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'تفعلت التنبيهات' : 'ما تفعلت، تقدر تفعلها من إعدادات المتصفح');
  };
  $('#btnExport').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 1)], { type: 'application/json' }));
    a.download = 'madar-backup-' + ymd(new Date()) + '.json'; a.click();
    toast('نزلت النسخة الاحتياطية (الملفات المرفوعة ما تدخل فيها)');
  };
  $('#importFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text()); if (!j.events) throw 0;
      if (!confirm('أكيد؟ بيستبدل كل بياناتك الحالية بالنسخة هذي.')) return;
      S.replace(j); toast('رجعت بياناتك');
    } catch (err) { toast('الملف هذا مو نسخة صحيحة'); }
    e.target.value = '';
  });
  $('#btnIcsAll').onclick = () => {
    const evs = D().events.filter(e => evEnd(e) > new Date());
    if (!evs.length) { toast('ما عندك مواعيد جاية'); return; }
    downloadIcs(evs, 'مواعيدي');
  };

  // ==================== الجوال: نقاط الأقسام ====================

  // ==================== العادات اليومية ====================
  const todayKey = () => ymd(new Date());
  const hlog = (k, id) => ((D().habitLog[k] || {})[id]) || 0;
  const habitDone = (h, k) => h.type === 'count' ? hlog(k, h.id) >= (h.target || 1) : !!hlog(k, h.id);
  function streak(h) {
    let n = 0, d = sod(new Date());
    if (!habitDone(h, ymd(d))) d = addDays(d, -1); // اليوم لسا ما خلص
    while (habitDone(h, ymd(d)) && n < 999) { n++; d = addDays(d, -1); }
    return n;
  }
  function setHabit(id, val) {
    const k = todayKey(); D().habitLog[k] = D().habitLog[k] || {};
    D().habitLog[k][id] = val; S.save();
  }
  function renderHabits() {
    const k = todayKey(), hs = D().habits;
    const done = hs.filter(h => habitDone(h, k)).length;
    $('#habitCount').textContent = done + ' من ' + hs.length;
    $('#habits').innerHTML = hs.map(h => {
      const v = hlog(k, h.id), ok = habitDone(h, k), st = streak(h);
      const week = Array.from({ length: 7 }, (_, i) => { const dk = ymd(addDays(new Date(), i - 6)); return '<i class="' + (habitDone(h, dk) ? 'on' : '') + '"></i>'; }).join('');
      const ctl = h.type === 'count'
        ? '<div class="cups">' + Array.from({ length: h.target || 8 }, (_, i) => '<button class="cup' + (i < v ? ' on' : '') + '" data-cup="' + (i + 1) + '" aria-label="' + (i + 1) + ' أكواب"></button>').join('') + '</div>'
        : '';
      return '<div class="habit' + (ok ? ' ok' : '') + '" data-h="' + h.id + '">' +
        (h.type === 'count' ? '<span class="h-ic">' + icon(h.icon) + '</span>' : '<button class="tick' + (ok ? ' on' : '') + '" data-ht aria-label="' + esc(h.name) + '">' + icon('i-tick') + '</button>') +
        '<div class="h-main"><b>' + esc(h.name) + (h.type === 'count' ? ' <small>' + v + '/' + (h.target || 8) + '</small>' : '') + '</b>' + ctl + '</div>' +
        '<span class="h-week" title="آخر ٧ أيام">' + week + '</span>' +
        (st ? '<span class="streak" title="أيام متتالية">' + icon('i-flame') + st + '</span>' : '') + '</div>';
    }).join('');
  }
  $('#habits').addEventListener('click', e => {
    const row = e.target.closest('[data-h]'); if (!row) return;
    const h = D().habits.find(x => x.id === row.dataset.h); if (!h) return;
    const cup = e.target.closest('[data-cup]');
    if (cup) { const n = +cup.dataset.cup, cur = hlog(todayKey(), h.id); setHabit(h.id, cur === n ? n - 1 : n); return; }
    if (e.target.closest('[data-ht]')) { const on = !hlog(todayKey(), h.id); setHabit(h.id, on ? 1 : 0); if (on) toast('عاش! ' + h.name + ' ✓'); }
  });

  // ==================== عد تنازلي للامتحان ====================
  function renderExam() {
    const now = new Date();
    const exams = D().events.filter(e => e.cat === 'exam' && evEnd(e) > now).sort((a, b) => evStart(a) - evStart(b));
    const card = $('#examCard');
    const left = modLectures().filter(l => !l.study).length;
    if (!exams.length) {
      card.innerHTML = '<div class="exam-empty">' + icon('c-exam') + '<span>حدد موعد امتحانك وأحسب لك كم محاضرة تذاكر كل يوم</span><button class="btn ghost sm" data-add-exam>' + icon('i-plus') + 'امتحان</button></div>';
      return;
    }
    const ex = exams[0], s = evStart(ex);
    const days = Math.max(0, Math.ceil((sod(s) - sod(now)) / 86400000));
    const perDay = days > 0 ? Math.ceil(left / days) : left;
    card.innerHTML = '<div class="exam-main" data-ev="' + ex.id + '" role="button" tabindex="0">' +
      '<div class="exam-days"><b>' + days + '</b><small>' + (days === 1 ? 'يوم' : days === 2 ? 'يومين' : 'يوم') + '</small></div>' +
      '<div class="exam-txt"><span class="muted">' + (days === 0 ? 'الامتحان اليوم' : 'باقي على') + '</span><b>' + esc(ex.title) + '</b><span class="muted">' + dayLabel(s) + (ex.allDay ? '' : ' · ' + fmtT(s)) + '</span></div>' +
      '<div class="exam-plan">' + (left ? '<b>' + perDay + '</b><small>محاضرة باليوم<br>عشان تخلص الـ' + left + ' الباقية</small>' : '<small>ذاكرت كل المحاضرات 🎉<br>ركز على المراجعة</small>') + '</div></div>' +
      (exams.length > 1 ? '<p class="exam-more muted">بعده: ' + exams.slice(1, 3).map(x => esc(x.title) + ' (' + dayLabel(evStart(x)) + ')').join(' · ') + '</p>' : '');
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-add-exam]')) return;
    openEvent(null, addDays(new Date(), 14));
    pickedCat = 'exam'; renderCatPick(); evForm.allDay.checked = true; toggleTimes(); evForm.title.value = 'امتحان ' + (curModule() || '');
    evForm.remind.value = '1440';
  });

  // ==================== ملاحظات سريعة ====================
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'الحين'; if (m < 60) return 'قبل ' + m + ' د'; const h = Math.round(m / 60);
    if (h < 24) return 'قبل ' + h + ' س'; return dayLabel(new Date(iso));
  };
  function renderNotes() {
    if (!$('#notes')) return;
    const ns = D().notes.slice().sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    $('#noteCount').textContent = ns.length ? ns.length + '' : '';
    $('#notes').innerHTML = ns.map(n => '<li data-note="' + n.id + '"><p>' + esc(n.text).replace(/\n/g, '<br>') + '</p><span class="muted">' + ago(n.created) + '</span><button class="del" aria-label="حذف الملاحظة">' + icon('i-trash') + '</button></li>').join('') || '<li class="empty">ولا ملاحظة للحين</li>';
  }
  function addNote(text) {
    text = String(text || '').trim(); if (!text) return null;
    const n = { id: S.uid(), text, created: new Date().toISOString() }; D().notes.push(n); S.save(); return n;
  }
  const noteTa = $('#noteForm textarea');
  if (noteTa) noteTa.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (addNote(noteTa.value)) noteTa.value = ''; } });
  if ($('#notes')) $('#notes').addEventListener('click', e => {
    const li = e.target.closest('[data-note]'); if (!li || !e.target.closest('.del')) return;
    const snap = snapshot(); D().notes = D().notes.filter(n => n.id !== li.dataset.note); S.save(); toast('انحذفت الملاحظة', () => restore(snap));
  });

  // ==================== ملخص الأسبوع (كل جمعة) ====================
  function weekRange(ref) {
    const end = new Date(ref || new Date());
    const start = sod(addDays(end, -((end.getDay() + 1) % 7))); // من السبت
    return { start, end };
  }
  const inRange = (iso, r) => iso && new Date(iso) >= r.start && new Date(iso) <= r.end;
  function weekSummary() {
    const r = weekRange(), ls = D().lectures, at = k => ls.filter(l => l.at && inRange(l.at[k], r)).length;
    const tasks = D().tasks.filter(t => t.done && inRange(t.doneAt, r)).length;
    const wkEnd = addDays(r.start, 7);
    const evs = D().events.filter(e => evStart(e) >= r.start && evStart(e) < wkEnd).length;
    const notes = D().notes.filter(n => inRange(n.created, r)).length;
    const days = []; for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) days.push(ymd(d));
    const water = days.reduce((s, k) => s + hlog(k, 'water'), 0);
    $('#weekTitle').textContent = 'ملخص الأسبوع · ' + fmtShort.format(r.start) + ' – ' + fmtShort.format(r.end);
    const stat = (n, label, c) => '<div class="wk-stat" style="--c:' + c + '"><b>' + n + '</b><span>' + label + '</span></div>';
    $('#weekBody').innerHTML =
      '<div class="wk-grid">' + stat(at('study'), 'محاضرة ذاكرتها', 'var(--mint)') + stat(at('rev'), 'محاضرة راجعتها', 'var(--amber)') + stat(at('mcq'), 'محاضرة حليت أسئلتها', 'var(--blue)') +
      stat(tasks, 'مهمة خلصتها', 'var(--coral)') + stat(evs, 'موعد في التقويم', 'var(--violet)') + stat(water, 'كوب ماء', 'var(--cyan)') + '</div>' +
      '<h3 class="wk-h">العادات</h3><div class="wk-habits">' + D().habits.map(h => {
        const n = days.filter(k => habitDone(h, k)).length;
        return '<div><span>' + esc(h.name) + '</span><span class="h-week">' + days.map(k => '<i class="' + (habitDone(h, k) ? 'on' : '') + '"></i>').join('') + '</span><b>' + n + '/' + days.length + '</b></div>';
      }).join('') + '</div>' +
      (notes ? '<p class="muted" style="margin-top:10px">كتبت ' + notes + ' ملاحظة هالأسبوع.</p>' : '') +
      '<p class="wk-msg">' + (at('study') >= 5 ? 'أسبوع قوي، كمل على هالنفس 💪' : at('study') ? 'بداية حلوة، الأسبوع الجاي نزيدها شوي.' : 'هالأسبوع خفيف، الأسبوع الجاي نبدأ بمحاضرة وحدة باليوم.') + '</p>';
    $('#weekDlg').showModal();
  }
  $('#btnWeek').onclick = weekSummary;
  function maybeFridaySummary() {
    const now = new Date(); if (now.getDay() !== 5) return;
    const k = 'saeed.week.' + ymd(now);
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
    setTimeout(weekSummary, 1200);
  }

  // ==================== المزامنة ====================
  const SYNC_TXT = { idle: '', syncing: 'يتزامن…', ok: 'متزامن', offline: 'بدون نت', error: 'تعذرت المزامنة' };
  function renderSync(s) {
    const el = $('#syncState'); el.dataset.s = s; el.querySelector('span').textContent = SYNC_TXT[s] || '';
  }
  function renderSyncSetting() {
    const inn = window.Sync && Sync.signedIn;
    $('#syncInfo').textContent = inn ? 'هذا الجهاز داخل ✓ أي تعديل يتزامن لحاله مع أجهزتك.' : 'ادخل بكلمة سر مدار وتتزامن أجهزتك لحالها.';
    $('#btnSyncAccount').textContent = inn ? 'تسجيل خروج' : 'دخول';
  }
  $('#btnSyncAccount').onclick = () => {
    if (window.Sync && Sync.signedIn) { if (confirm('تسجيل خروج من المزامنة في هذا الجهاز؟ بياناتك تبقى.')) { Sync.logout(); renderSyncSetting(); } }
    else { $('#settingsDlg').close(); $('#loginDlg').showModal(); }
  };
  $('#loginLater').onclick = $('#loginClose').onclick = () => $('#loginDlg').close();
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pass = e.target.pass.value, err = $('#loginErr'), go = $('#loginGo');
    if (pass.trim().length < 6) { err.textContent = 'كلمة السر لازم تكون ٦ حروف أو أكثر.'; return; }
    go.disabled = true; err.textContent = 'لحظة…';
    try {
      const had = await Sync.login(pass);
      $('#loginDlg').close(); e.target.reset(); err.textContent = '';
      toast(had ? 'دخلت ✓ جبت بياناتك من أجهزتك الثانية ودمجتها' : 'تم ✓ ادخل بنفس كلمة السر في جوالك');
    } catch (x) { err.textContent = navigator.onLine ? 'ما قدرت أتصل، جرب مرة ثانية.' : 'تحتاج نت أول مرة بس.'; }
    go.disabled = false;
  });

  // ==================== التقويم الكامل (عرض الشهر) ====================
  const calDlg = $('#calDlg');
  let cfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const hhmm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  function renderBigCal() {
    if (!calDlg.open) return;
    const first = cfMonth, start = addDays(first, -first.getDay()), now = new Date();
    $('#cfTitle').textContent = fmtGY.format(first);
    $('#cfHijri').textContent = fmtHM.format(first) + ' – ' + fmtHM.format(addDays(first, 27));
    const today = ymd(now), sel = ymd(selDay), used = new Set();
    let html = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), k = ymd(d);
      if (i === 35 && d.getMonth() !== first.getMonth()) break;
      const evs = eventsOn(d), MAX = 3;
      evs.forEach(e => used.add(catOk(e.cat)));
      html += '<div class="cf-cell' + (d.getMonth() !== first.getMonth() ? ' out' : '') + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + '" data-cday="' + k + '">' +
        '<div class="cf-n"><span>' + d.getDate() + '</span><small>' + fmtHD.format(d) + '</small></div>' +
        evs.slice(0, MAX).map(e => '<button class="pill' + (!e.allDay && evEnd(e) < now ? ' past' : '') + '" style="--c:' + cvar(e.cat) + '" data-ev="' + e.id + '" title="' + esc(e.title) + '">' +
          (e.allDay ? '' : '<b>' + hhmm(evStart(e)) + '</b>') + '<span>' + esc(e.title) + '</span></button>').join('') +
        (evs.length > MAX ? '<button class="more" data-cday="' + k + '">+' + (evs.length - MAX) + '</button>' : '') + '</div>';
    }
    $('#cfGrid').innerHTML = html;
    $('#cfLegend').innerHTML = [...used].map(c => '<span style="--c:' + cvar(c) + '"><i></i>' + CATS[c] + '</span>').join('');
    // جدول اليوم المختار
    const x = P.describe(selDay), evs = eventsOn(selDay);
    $('#cfDayTitle').textContent = (Math.abs(x.diff) <= 2 ? x.day + ' · ' : '') + fmtG.format(selDay);
    $('#cfDaySub').textContent = hijri(selDay) + (evs.length ? ' · ' + evs.length + ' مواعيد' : '');
    $('#cfAgenda').innerHTML = evs.length ? evs.map(e => evRow(e, now)).join('') : '<div class="empty">' + icon('i-cal') + 'ما فيه مواعيد. اضغط مرتين على أي يوم تضيف فيه.</div>';
  }
  function openBigCal() {
    cfMonth = new Date(selDay.getFullYear(), selDay.getMonth(), 1);
    calDlg.showModal(); renderBigCal();
    if (window.gsap && !reduceMotion) gsap.from('.cf-cell', { opacity: 0, y: 6, duration: .5, ease: 'expo.out', stagger: .008 });
  }
  $('#calExpand').onclick = openBigCal;
  $('#calTitle').style.cursor = 'pointer'; $('#calTitle').onclick = openBigCal;
  $('#cfClose').onclick = () => calDlg.close();
  $('#cfPrev').onclick = () => { cfMonth = new Date(cfMonth.getFullYear(), cfMonth.getMonth() - 1, 1); renderBigCal(); };
  $('#cfNext').onclick = () => { cfMonth = new Date(cfMonth.getFullYear(), cfMonth.getMonth() + 1, 1); renderBigCal(); };
  $('#cfToday').onclick = () => { selDay = sod(new Date()); cfMonth = new Date(selDay.getFullYear(), selDay.getMonth(), 1); renderBigCal(); renderCalendar(); renderDay(); };
  $('#cfAdd').onclick = () => openEvent(null, selDay);
  $('#cfGrid').addEventListener('click', e => {
    if (e.target.closest('[data-ev]')) return; // الموعد نفسه يفتح التعديل
    const c = e.target.closest('[data-cday]'); if (!c) return;
    selDay = fromYmd(c.dataset.cday); renderBigCal(); renderCalendar(); renderDay();
  });
  $('#cfGrid').addEventListener('dblclick', e => { if (e.target.closest('[data-ev]')) return; const c = e.target.closest('[data-cday]'); if (c) openEvent(null, fromYmd(c.dataset.cday)); });

  // ==================== الرسم ====================
  function render() { renderTime(); renderNext(); renderHadith(); renderCalendar(); renderDay(); renderExam(); renderLectures(); renderTasks(); renderHabits(); renderNotes(); renderBigCal(); }
  S.onChange(render);
  render(); renderFixtures(); loadFixtures();
  if (window.Sync) { Sync.onState(renderSync); if (!Sync.start()) setTimeout(() => $('#loginDlg').showModal(), 700); }
  maybeFridaySummary();
  say('هلا ' + esc(D().name || 'سعيد') + '. قول لي مواعيدك أو أي شي في بالك وأنا أرتبه.<br><small class="muted">أفهم: «الخميس الجاي الساعة ٤ العصر»، «وش عندي بكرة؟»، «خلصت مذاكرة Coordination»، «شربت كاستين ماء»</small>');
  replies.hidden = true;
  setInterval(renderTime, 10000);
  setInterval(() => { checkReminders(); renderNext(); renderDay(); }, 30000);
  if (TEAMS.length) setInterval(loadFixtures, 15 * 60000);
  checkReminders();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });

  // ==================== الحركة (GSAP) ====================
  // لحظة وحدة: البطاقات تطفو لمكانها بالترتيب أول ما تفتح. المحتوى ظاهر من الأساس لو GSAP ما وصل.
  window.addEventListener('load', () => {
    if (!window.gsap || reduceMotion) return;
    const cards = $$('.page-head > *, .dash .col > *');
    const tl = gsap.timeline();
    tl.from(cards, { y: 14, opacity: .35, scale: .985, duration: .8, ease: 'expo.out', stagger: .045, clearProps: 'transform,opacity' })
      .from('.prog3 .bar i', { width: 0, duration: 1.1, ease: 'expo.out' }, .25);
    // لو الصفحة مخفية وقت الفتح (الحركة توقف)، نكمّلها عشان ما يبقى شي باهت
    setTimeout(() => { if (tl.progress() < 1) tl.progress(1); }, 1800);
  });
})();

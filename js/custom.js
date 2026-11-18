/* ============ التخصيص: ترتيب الأقسام + أقسام يضيفها سعيد بنفسه ============
   كل شي ينحفظ في البيانات (layout / titles / widgets) ويتزامن مع أجهزته. */
(function () {
  'use strict';
  const S = window.Store, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const D = () => S.data;
  const cols = () => $$('.dash > .col');
  const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NUM = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  const TYPES = {
    list: { name: 'قائمة', hint: 'مهام أو أهداف تشطب عليها', icon: 'i-tick', title: 'قائمتي' },
    note: { name: 'ملاحظة', hint: 'نص حر تكتب فيه أي شي', icon: 'i-note', title: 'ملاحظات' },
    links: { name: 'روابط', hint: 'مواقع تفتحها بسرعة', icon: 'i-link', title: 'روابط' },
    countdown: { name: 'عد تنازلي', hint: 'كم باقي على يوم معين', icon: 'i-cal', title: 'باقي على' },
    counter: { name: 'عدّاد', hint: 'تزيد وتنقص رقم (صفحات، أيام…)', icon: 'i-chart', title: 'عدّاد' }
  };

  // ---------- الترتيب ----------
  const defaultLayout = cols().map(c => [...c.children].filter(x => x.dataset.blk).map(x => x.dataset.blk));
  function blkEl(id) { return document.querySelector('.dash [data-blk="' + id + '"]'); }
  function layout() {
    const saved = Array.isArray(D().layout) && D().layout.length === 4 ? D().layout.map(a => (a || []).slice()) : defaultLayout.map(a => a.slice());
    const seen = new Set(saved.flat());
    defaultLayout.forEach((a, i) => a.forEach(id => { if (!seen.has(id)) saved[i].push(id); }));
    (D().widgets || []).forEach(w => { if (!seen.has(w.id) && !saved.flat().includes(w.id)) saved[Math.min(w.col ?? 2, 3)].push(w.id); });
    const live = new Set([...defaultLayout.flat(), ...(D().widgets || []).map(w => w.id)]);
    const used = new Set();
    return saved.map(a => a.filter(id => live.has(id) && !used.has(id) && used.add(id)));
  }
  function placeAll() {
    const L = layout(), cs = cols();
    L.forEach((ids, i) => {
      const col = cs[i]; let k = 0;
      ids.forEach(id => {
        const el = blkEl(id); if (!el) return;
        if (col.children[k] !== el) col.insertBefore(el, col.children[k] || null);
        k++;
      });
      let add = col.querySelector(':scope > .add-blk');
      if (!add) { add = document.createElement('button'); add.type = 'button'; add.className = 'add-blk'; add.dataset.col = i; add.innerHTML = '<svg><use href="#i-plus"/></svg>قسم'; }
      if (col.lastElementChild !== add) col.appendChild(add);
    });
  }
  function saveLayout(L) { D().layout = L; save(); placeAll(); decorate(); }

  // ---------- العناوين ----------
  function applyTitles() {
    const t = D().titles || {};
    $$('.dash [data-blk]').forEach(el => {
      const h = el.querySelector('[data-title]'); if (!h) return;
      if (!h.dataset.orig) h.dataset.orig = h.textContent;
      h.textContent = t[el.dataset.blk] || h.dataset.orig;
    });
  }

  // ---------- الأقسام الخاصة ----------
  function daysLeft(date) {
    if (!date) return null;
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(date + 'T00:00:00');
    return Math.round((b - a) / 864e5);
  }
  function body(w) {
    if (w.type === 'list') {
      const items = w.items || [], left = items.filter(x => !x.done).length;
      return {
        meta: items.length ? NUM(left) + ' باقي' : '',
        html: '<ul class="w-list scroll">' + items.map(x => '<li class="' + (x.done ? 'done' : '') + '"><button type="button" class="tick' + (x.done ? ' on' : '') + '" data-w-toggle="' + x.id + '" aria-label="تم"><svg><use href="#i-tick"/></svg></button><span>' + esc(x.t) + '</span><button type="button" class="w-x" data-w-del="' + x.id + '" aria-label="حذف"><svg><use href="#i-x"/></svg></button></li>').join('') + '</ul>' +
          '<form class="quickadd" data-w-add><span class="plus" aria-hidden="true"><svg><use href="#i-plus"/></svg></span><input name="t" placeholder="أضف…" aria-label="عنصر جديد"></form>'
      };
    }
    if (w.type === 'note') return { meta: '', html: '<textarea class="w-note" data-w-note placeholder="اكتب أي شي…">' + esc(w.text || '') + '</textarea>' };
    if (w.type === 'links') {
      return {
        meta: '',
        html: '<div class="w-links">' + (w.items || []).map(x => '<span class="w-link"><a href="' + esc(x.url) + '" target="_blank" rel="noopener"><svg><use href="#i-link"/></svg>' + esc(x.t) + '</a><button type="button" class="w-x" data-w-del="' + x.id + '" aria-label="حذف"><svg><use href="#i-x"/></svg></button></span>').join('') + '</div>' +
          '<form class="w-linkform" data-w-addlink><input name="t" placeholder="الاسم" aria-label="اسم الرابط"><input name="u" placeholder="الرابط" aria-label="الرابط" dir="ltr"><button class="btn sm">إضافة</button></form>'
      };
    }
    if (w.type === 'countdown') {
      const d = daysLeft(w.date);
      const big = d == null ? '—' : d > 0 ? NUM(d) : d === 0 ? 'اليوم' : 'خلص';
      const unit = d == null ? 'اختر التاريخ' : d > 0 ? (d === 1 ? 'يوم' : d <= 10 ? 'أيام' : 'يوم') : '';
      return { meta: '', html: '<div class="w-count"><b>' + big + '</b><span>' + unit + '</span></div><label class="w-date"><span class="muted small">التاريخ</span><input type="date" data-w-date value="' + esc(w.date || '') + '"></label>' };
    }
    if (w.type === 'counter') {
      const n = +w.n || 0, tg = +w.target || 0;
      return {
        meta: tg ? NUM(Math.min(100, Math.round(n / tg * 100))) + '٪' : '',
        html: '<div class="w-counter"><button type="button" class="icon-btn" data-w-step="-1" aria-label="نقص">−</button><b>' + NUM(n) + (tg ? '<small> / ' + NUM(tg) + '</small>' : '') + '</b><button type="button" class="icon-btn" data-w-step="1" aria-label="زيد">+</button></div>' +
          (tg ? '<div class="w-bar"><i style="width:' + Math.min(100, n / tg * 100) + '%"></i></div>' : '') +
          '<label class="w-date"><span class="muted small">الهدف</span><input type="number" min="0" data-w-target value="' + (tg || '') + '" placeholder="بدون"></label>'
      };
    }
    return { meta: '', html: '' };
  }
  function renderWidgets() {
    const ws = D().widgets || (D().widgets = []);
    const ids = new Set(ws.map(w => w.id));
    $$('.dash .wdg').forEach(el => { if (!ids.has(el.dataset.blk)) el.remove(); });
    ws.forEach(w => {
      let el = blkEl(w.id);
      if (!el) { el = document.createElement('section'); el.className = 'glass panel wdg'; el.dataset.blk = w.id; cols()[Math.min(w.col ?? 2, 3)].appendChild(el); }
      el.dataset.type = w.type;
      const b = body(w);
      el.innerHTML = '<div class="panel-h"><h2>' + esc(w.title || TYPES[w.type].title) + '</h2><span class="muted">' + b.meta + '</span></div><div class="w-body">' + b.html + '</div>';
    });
  }
  const W = el => (D().widgets || []).find(w => w.id === (el.closest('[data-blk]') || {}).dataset?.blk);

  // ---------- وضع التخصيص ----------
  const editing = () => document.body.classList.contains('editing');
  function decorate() {
    $$('.dash [data-blk] > .blk-tools').forEach(x => x.remove());
    if (!editing()) return;
    const hidden = (D().theme && D().theme.hidden) || [];
    $$('.dash [data-blk]').forEach(el => {
      const id = el.dataset.blk, isW = el.classList.contains('wdg');
      const canName = isW || el.querySelector('[data-title]');
      const off = hidden.includes(id);
      el.classList.toggle('blk-off', off);
      const t = document.createElement('div'); t.className = 'blk-tools';
      t.innerHTML =
        '<button type="button" data-mv="up" title="فوق">↑</button><button type="button" data-mv="down" title="تحت">↓</button>' +
        '<button type="button" data-mv="right" title="العمود اليمين">→</button><button type="button" data-mv="left" title="العمود اليسار">←</button>' +
        (canName ? '<button type="button" data-ren title="غيّر الاسم"><svg><use href="#i-edit"/></svg></button>' : '') +
        (isW ? '<button type="button" data-rm title="احذف القسم"><svg><use href="#i-trash"/></svg></button>'
          : '<button type="button" data-hide title="' + (off ? 'أظهر' : 'أخفِ') + '">' + (off ? 'أظهر' : 'أخفِ') + '</button>');
      el.prepend(t);
    });
  }
  function setEditing(on) {
    document.body.classList.toggle('editing', on);
    $('#editBar').hidden = !on;
    const th = D().theme || {};
    $$('.dash [data-blk]').forEach(el => {
      const off = (th.hidden || []).includes(el.dataset.blk);
      el.toggleAttribute('data-hidden-sec', off && !on);
      el.classList.toggle('blk-off', off && on);
    });
    decorate();
  }

  let selfSave = false;
  function save() { selfSave = true; try { S.save(); } finally { selfSave = false; } }
  function full() { renderWidgets(); applyTitles(); placeAll(); decorate(); }

  // ---------- الأحداث ----------
  document.addEventListener('click', e => {
    const tool = e.target.closest('.blk-tools button');
    if (tool) {
      e.preventDefault(); e.stopPropagation();
      const el = tool.closest('[data-blk]'), id = el.dataset.blk, L = layout();
      const ci = L.findIndex(a => a.includes(id)), k = L[ci].indexOf(id);
      const mv = tool.dataset.mv;
      if (mv === 'up' && k > 0) { L[ci].splice(k, 1); L[ci].splice(k - 1, 0, id); return saveLayout(L); }
      if (mv === 'down' && k < L[ci].length - 1) { L[ci].splice(k, 1); L[ci].splice(k + 1, 0, id); return saveLayout(L); }
      // الصفحة عربية: العمود الأول على اليمين
      if (mv === 'right' && ci > 0) { L[ci].splice(k, 1); L[ci - 1].push(id); return saveLayout(L); }
      if (mv === 'left' && ci < 3) { L[ci].splice(k, 1); L[ci + 1].push(id); return saveLayout(L); }
      if ('ren' in tool.dataset) {
        const w = W(el), h = el.querySelector('[data-title]');
        const cur = w ? (w.title || '') : (D().titles || {})[id] || (h && h.dataset.orig) || '';
        const v = prompt('اسم القسم:', cur); if (v == null) return;
        if (w) w.title = v.trim() || TYPES[w.type].title;
        else { D().titles = Object.assign({}, D().titles); if (v.trim()) D().titles[id] = v.trim(); else delete D().titles[id]; }
        save(); full(); return;
      }
      if ('rm' in tool.dataset) {
        const w = W(el); if (!w || !confirm('تحذف قسم «' + (w.title || TYPES[w.type].title) + '» وكل اللي فيه؟')) return;
        D().widgets = D().widgets.filter(x => x.id !== w.id); D().layout = layout().map(a => a.filter(x => x !== w.id));
        save(); full(); return;
      }
      if ('hide' in tool.dataset) {
        const th = Object.assign({ hidden: [] }, D().theme), hid = (th.hidden || []).filter(x => x !== id);
        if (!(th.hidden || []).includes(id)) hid.push(id);
        D().theme = Object.assign({}, th, { hidden: hid }); save(); setEditing(true); return;
      }
      return;
    }
    const add = e.target.closest('.add-blk');
    if (add) { openAdd(+add.dataset.col); return; }
    if (e.target.closest('#btnEdit')) { setEditing(!editing()); return; }
    if (e.target.closest('#editDone')) { setEditing(false); return; }
    if (e.target.closest('#editLook')) { setEditing(false); $('#btnSettings').click(); setTimeout(() => { const a = $('#appearance'); a && a.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 120); return; }

    // داخل الأقسام الخاصة
    const wel = e.target.closest('.wdg'); if (!wel) return;
    const w = W(wel); if (!w) return;
    const tg = e.target.closest('[data-w-toggle]');
    if (tg) { const it = w.items.find(x => x.id === tg.dataset.wToggle); if (it) { it.done = !it.done; save(); full(); } return; }
    const del = e.target.closest('[data-w-del]');
    if (del) { w.items = (w.items || []).filter(x => x.id !== del.dataset.wDel); save(); full(); return; }
    const st = e.target.closest('[data-w-step]');
    if (st) { w.n = Math.max(0, (+w.n || 0) + +st.dataset.wStep); save(); full(); return; }
  }, true);

  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.matches('[data-w-add]')) {
      e.preventDefault(); const w = W(f), t = f.t.value.trim(); if (!w || !t) return;
      (w.items = w.items || []).push({ id: uid(), t, done: false }); save(); full();
      const nf = blkEl(w.id).querySelector('[data-w-add] input'); nf && nf.focus();
    }
    if (f.matches('[data-w-addlink]')) {
      e.preventDefault(); const w = W(f); let t = f.t.value.trim(), u = f.u.value.trim(); if (!w || !u) return;
      if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
      if (!/^(https?|mailto|tel):/i.test(u)) { alert('الرابط لازم يبدأ بـ https'); return; }
      if (!t) { try { t = new URL(u).hostname.replace(/^www\./, ''); } catch (er) { t = u; } }
      (w.items = w.items || []).push({ id: uid(), t, url: u }); save(); full();
    }
  });
  let noteT;
  document.addEventListener('input', e => {
    const n = e.target.closest('[data-w-note]'); if (!n) return;
    const w = W(n); if (!w) return;
    w.text = n.value; clearTimeout(noteT); noteT = setTimeout(save, 400);
  });
  document.addEventListener('change', e => {
    const t = e.target, w = t.closest('.wdg') && W(t); if (!w) return;
    if (t.matches('[data-w-date]')) { w.date = t.value; save(); full(); }
    if (t.matches('[data-w-target]')) { w.target = Math.max(0, +t.value || 0); save(); full(); }
  });

  // ---------- إضافة قسم ----------
  let addCol = 2, addType = 'list';
  function openAdd(col) {
    addCol = col; addType = 'list';
    $('#wTypes').innerHTML = Object.entries(TYPES).map(([k, v]) => '<button type="button" class="w-type' + (k === addType ? ' on' : '') + '" data-wt="' + k + '"><svg><use href="#' + v.icon + '"/></svg><b>' + v.name + '</b><small>' + v.hint + '</small></button>').join('');
    $('#wTitle').value = ''; $('#wTitle').placeholder = 'مثلاً: ' + TYPES.list.title;
    $('#widgetDlg').showModal();
  }
  $('#wTypes').addEventListener('click', e => {
    const b = e.target.closest('[data-wt]'); if (!b) return;
    addType = b.dataset.wt; $$('#wTypes .w-type').forEach(x => x.classList.toggle('on', x === b));
    $('#wTitle').placeholder = 'مثلاً: ' + TYPES[addType].title;
  });
  $('#widgetForm').addEventListener('submit', e => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    const w = { id: uid(), type: addType, title: $('#wTitle').value.trim() || TYPES[addType].title, col: addCol, items: [] };
    if (addType === 'counter') { w.n = 0; w.target = 0; }
    (D().widgets = D().widgets || []).push(w);
    const L = layout(); if (!L[addCol].includes(w.id)) L[addCol].push(w.id);
    D().layout = L; save(); full();
    setTimeout(() => { const el = blkEl(w.id); if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); const i = el.querySelector('input, textarea'); i && !matchMedia('(max-width: 640px)').matches && i.focus(); } }, 60);
  });

  // تحديث من جهاز ثاني أو من باقي الموقع
  S.onChange(() => {
    if (selfSave) return;
    const a = document.activeElement;
    if (a && a.closest && a.closest('.wdg')) return; // لا تقطع عليه الكتابة
    full();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && editing() && !document.querySelector('dialog[open]')) setEditing(false); });
  full();
  // العد التنازلي يتحدث مع بداية يوم جديد
  setInterval(() => { if (!document.activeElement || !document.activeElement.closest || !document.activeElement.closest('.wdg')) renderWidgets(); placeAll(); decorate(); }, 10 * 60 * 1000);
})();

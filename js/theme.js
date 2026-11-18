/* ============ محرر المظهر: سعيد يغير الخلفية والألوان والأقسام ============
   الإعدادات تنحفظ في البيانات (data.theme) وتتزامن مع أجهزته،
   إلا صورة الخلفية: تنحفظ في الجهاز نفسه بس.                              */
(function () {
  'use strict';
  const S = window.Store, $ = s => document.querySelector(s);
  const D = () => S.data;
  const DEFAULT = { bg: 'sunset', color: '#2a1636', accent: '#ff9a62', glass: 1, radius: 14, size: 'm', dim: .35, hidden: [], font: 'sans', logo: '' };
  const BGS = [['sunset', 'غروب'], ['night', 'ليل'], ['forest', 'غابة'], ['ocean', 'بحر'], ['light', 'فاتح'], ['color', 'لون'], ['image', 'صورة']];
  const ACCENTS = ['#ff9a62', '#ff6f91', '#ffcf5c', '#7be0a6', '#7fb8ff', '#b39bff', '#ff5d5d', '#f2f2f2'];
  const SECS = [['next', 'الجاي', '#nextCard'], ['day', 'جدول اليوم', '#agenda'], ['exam', 'الامتحان', '#examCard'], ['lec', 'المحاضرات', '#lecTable'],
    ['habits', 'العادات', '#habits'], ['tasks', 'المهام', '#tasksOpen'], ['pray', 'الصلاة', '#prayGrid'], ['cal', 'التقويم', '#calGrid'], ['hadith', 'حديث اليوم', '#hadithCard']];
  const secEl = sel => { const el = $(sel); return el && (el.closest('section, .next, .exam, blockquote') || el); };
  const T = () => Object.assign({}, DEFAULT, D().theme || {});
  const setT = patch => { D().theme = Object.assign(T(), patch); S.save(); };
  let imgUrl = null;

  async function apply() {
    const t = T(), root = document.documentElement;
    root.dataset.bg = t.bg;
    root.style.setProperty('--coral', t.accent);
    root.style.setProperty('--ga', String(t.glass));
    root.style.setProperty('--r', t.radius + 'px');
    root.style.setProperty('--zoom', { s: .92, m: 1, l: 1.08 }[t.size] || 1);
    root.style.setProperty('--bg-color', t.color);
    root.style.setProperty('--bg-dim', String(t.dim));
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = { sunset: '#2a1636', night: '#0a1330', forest: '#0c1d16', ocean: '#052233', light: '#f3ece2', color: t.color, image: '#111111' }[t.bg] || '#2a1636';
    SECS.forEach(([id, , sel]) => { const el = secEl(sel); if (el) el.toggleAttribute('data-hidden-sec', t.hidden.includes(id) && !document.body.classList.contains('editing')); });
    const wl = $('#wordLogo'); if (wl) wl.textContent = t.logo || D().name || 'سعيد';
    root.dataset.font = t.font || 'sans';
    if (t.bg === 'image' && !imgUrl) {
      try { const blob = await S.getFile('saeed-bg'); if (blob) { imgUrl = URL.createObjectURL(blob); root.style.setProperty('--bg-image', 'url("' + imgUrl + '")'); } } catch (e) { }
    }
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function renderEditor() {
    const t = T(), box = $('#appearance'); if (!box) return;
    box.innerHTML =
      '<div><h4>الخلفية</h4><div class="bg-grid">' + BGS.map(([k, n]) => '<button type="button" class="bg-opt' + (t.bg === k ? ' on' : '') + '" data-bg="' + k + '"><span>' + n + '</span></button>').join('') + '</div></div>' +
      (t.bg === 'color' ? '<div class="sw-row"><span class="muted">لون الخلفية</span><input type="color" id="thBgColor" value="' + t.color + '"></div>' : '') +
      (t.bg === 'image' ? '<div class="sw-row"><label class="btn ghost sm">اختر صورة<input type="file" id="thImg" accept="image/*" hidden></label><span class="muted small">الصورة تنحفظ في هذا الجهاز بس</span></div>' +
        '<label class="rng"><span>تعتيم الصورة</span><input type="range" id="thDim" min="0" max=".8" step=".05" value="' + t.dim + '"><output>' + Math.round(t.dim * 100) + '%</output></label>' : '') +
      '<div><h4>اللون الأساسي (الأزرار والتحديد)</h4><div class="sw-row">' + ACCENTS.map(c => '<button type="button" class="sw' + (t.accent === c ? ' on' : '') + '" data-acc="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') +
        '<input type="color" id="thAccent" value="' + t.accent + '" title="لون ثاني"></div></div>' +
      '<label class="rng"><span>شفافية البطاقات</span><input type="range" id="thGlass" min="0" max="2.5" step=".1" value="' + t.glass + '"><output>' + Math.round(t.glass * 100) + '%</output></label>' +
      '<label class="rng"><span>استدارة الزوايا</span><input type="range" id="thRadius" min="0" max="28" step="1" value="' + t.radius + '"><output>' + t.radius + '</output></label>' +
      '<div><h4>حجم الخط</h4><div class="seg" id="thSize">' + [['s', 'صغير'], ['m', 'متوسط'], ['l', 'كبير']].map(([k, n]) => '<button type="button" data-size="' + k + '" class="' + (t.size === k ? 'active' : '') + '">' + n + '</button>').join('') + '</div></div>' +
      '<div><h4>الخط</h4><div class="seg" id="thFont">' + [['sans', 'ثمانية'], ['serif', 'عناوين فاخرة'], ['system', 'خط الجهاز']].map(([k, n]) => '<button type="button" data-font="' + k + '" class="' + (t.font === k ? 'active' : '') + '">' + n + '</button>').join('') + '</div></div>' +
      '<label class="rng"><span>نص الشعار</span><input class="mini-input" id="thLogo" maxlength="14" value="' + esc(t.logo || '') + '" placeholder="' + esc(D().name || 'سعيد') + '" style="grid-column:span 2"></label>' +
      '<div><h4>الأقسام اللي تطلع</h4><div class="sec-list">' + SECS.map(([id, n]) => '<label><input type="checkbox" data-sec="' + id + '"' + (t.hidden.includes(id) ? '' : ' checked') + '> ' + n + '</label>').join('') + '</div></div>' +
      '<div><h4>العادات</h4><div class="hab-edit">' + D().habits.map(h => '<div><span>' + esc(h.name) + (h.type === 'count' ? ' <small class="muted">(' + (h.target || 8) + ')</small>' : '') + '</span><button type="button" data-delhab="' + h.id + '" aria-label="حذف ' + esc(h.name) + '"><svg><use href="#i-trash"/></svg></button></div>').join('') +
        '<form id="habAdd"><input class="mini-input" name="h" placeholder="عادة جديدة، مثلاً: نوم بدري" style="width:auto!important"><button class="btn sm">إضافة</button></form></div></div>' +
      '<button type="button" class="btn ghost sm" id="thReset" style="align-self:flex-start">رجّع المظهر الافتراضي</button>';
  }

  document.addEventListener('click', async e => {
    const box = e.target.closest('#appearance'); if (!box) return;
    const bg = e.target.closest('.bg-opt[data-bg]'); if (bg) { setT({ bg: bg.dataset.bg }); renderEditor(); return; }
    const acc = e.target.closest('[data-acc]'); if (acc) { setT({ accent: acc.dataset.acc }); renderEditor(); return; }
    const fo = e.target.closest('[data-font]'); if (fo) { setT({ font: fo.dataset.font }); renderEditor(); return; }
    const sz = e.target.closest('[data-size]'); if (sz) { setT({ size: sz.dataset.size }); renderEditor(); return; }
    const dh = e.target.closest('[data-delhab]');
    if (dh) { if (D().habits.length <= 1) return; D().habits = D().habits.filter(h => h.id !== dh.dataset.delhab); S.save(); renderEditor(); return; }
    if (e.target.closest('#thReset')) { if (confirm('ترجع المظهر الافتراضي؟')) { D().theme = Object.assign({}, DEFAULT); S.save(); renderEditor(); } }
  });
  document.addEventListener('input', e => {
    if (!e.target.closest('#appearance')) return;
    const id = e.target.id, v = e.target.value, out = e.target.parentElement.querySelector('output');
    if (id === 'thGlass') { setT({ glass: +v }); if (out) out.textContent = Math.round(v * 100) + '%'; }
    if (id === 'thRadius') { setT({ radius: +v }); if (out) out.textContent = v; }
    if (id === 'thDim') { setT({ dim: +v }); if (out) out.textContent = Math.round(v * 100) + '%'; }
    if (id === 'thAccent') setT({ accent: v });
    if (id === 'thBgColor') setT({ color: v });
    if (id === 'thLogo') setT({ logo: v.trim() });
  });
  document.addEventListener('change', async e => {
    if (!e.target.closest('#appearance')) return;
    if (e.target.matches('[data-sec]')) {
      const id = e.target.dataset.sec, hidden = T().hidden.filter(x => x !== id);
      if (!e.target.checked) hidden.push(id);
      setT({ hidden });
    }
    if (e.target.id === 'thImg' && e.target.files[0]) {
      try {
        await S.putFile('saeed-bg', e.target.files[0]);
        if (imgUrl) URL.revokeObjectURL(imgUrl); imgUrl = null;
        setT({ bg: 'image' }); await apply();
      } catch (err) { alert('ما قدرت أحفظ الصورة'); }
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'habAdd') return;
    e.preventDefault();
    const name = e.target.h.value.trim(); if (!name) return;
    D().habits.push({ id: 'h' + Date.now().toString(36), name, icon: 'c-personal', type: 'check' });
    S.save(); renderEditor();
  });
  const btn = $('#btnSettings'); if (btn) btn.addEventListener('click', renderEditor);

  S.onChange(apply);
  apply();
})();

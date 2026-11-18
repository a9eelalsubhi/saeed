/* ============ مزامنة تلقائية بين أجهزتك ============
   تدخل كلمة سر مدار مرة وحدة في كل جهاز، وبعدها كل تعديل يتزامن لحاله.
   كلمة السر ما تنرسل ولا تنحفظ: يتحول منها "رمز" سري (SHA-256) هو اللي يربط أجهزتك.
   أول دخول من جهاز فيه بيانات: ندمج بياناته مع اللي في السحابة بدل ما نمسح شي.
   بعدها: آخر تعديل يكسب.                                                         */
(function (root) {
  'use strict';
  const URL_ = 'https://iorqgtgszskthfsmizxo.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_yZ_LEuSqMeaGrx6vIDwNDw_9G11enWg';
  const S = root.Store;
  const CODE_KEY = 'saeed.sync.code', MODE_KEY = 'saeed.sync.mode';
  let code = null, applying = false, pushTimer = null, state = 'idle', started = false;
  const listeners = [];

  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { } }
  };
  function setState(s) { state = s; listeners.forEach(f => f(s)); }
  async function rpc(fn, body) {
    const r = await fetch(URL_ + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('sync ' + r.status);
    return r.json();
  }
  async function codeFromPassword(pass) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('madar·saeed·v1:' + pass.trim()));
    return 'p_' + btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ---------- دمج بيانات جهازين (أول دخول بس) ----------
  function mergeData(a, b) {
    // a = السحابة، b = هذا الجهاز
    const out = JSON.parse(JSON.stringify(a));
    const byKey = (arrA, arrB, key) => {
      const m = new Map(); (arrA || []).forEach(x => m.set(key(x), x));
      (arrB || []).forEach(x => { const k = key(x), y = m.get(k); if (!y) m.set(k, x); else m.set(k, mergeItem(y, x)); });
      return [...m.values()];
    };
    const mergeItem = (x, y) => {
      const z = Object.assign({}, x, y);
      // المحاضرات: أي ✓ في أي جهاز تبقى
      ['study', 'rev', 'mcq', 'done'].forEach(k => { if (k in x || k in y) z[k] = !!(x[k] || y[k]); });
      if (x.at || y.at) z.at = Object.assign({}, x.at, y.at);
      return z;
    };
    out.events = byKey(a.events, b.events, x => x.id);
    out.tasks = byKey(a.tasks, b.tasks, x => x.id);
    out.notes = byKey(a.notes, b.notes, x => x.id);
    out.widgets = byKey(a.widgets, b.widgets, x => x.id);
    out.removedLectures = [...new Set([...(a.removedLectures || []), ...(b.removedLectures || [])])];
    const gone = new Set(out.removedLectures);
    out.lectures = byKey(a.lectures, b.lectures, x => (x.module || '') + '|' + (x.title || '').toLowerCase().trim()).filter(x => !gone.has((x.module || '') + '|' + (x.title || '').toLowerCase().trim()));
    const hl = Object.assign({}, a.habitLog);
    Object.entries(b.habitLog || {}).forEach(([d, v]) => {
      hl[d] = Object.assign({}, hl[d]);
      Object.entries(v).forEach(([h, n]) => { hl[d][h] = Math.max(+hl[d][h] || 0, +n || 0); });
    });
    out.habitLog = hl;
    out.notified = Object.assign({}, a.notified, b.notified);
    return out;
  }

  async function pull() {
    if (!code) return;
    if (!navigator.onLine) { setState('offline'); return; }
    try {
      setState('syncing');
      const rows = await rpc('madar_get', { p_code: code });
      const remote = rows && rows[0];
      const local = S.data._updated || '1970-01-01T00:00:00Z';
      if (!remote) { await push(true); return; }
      if (new Date(remote.updated_at) > new Date(local)) {
        applying = true;
        S.replace(Object.assign({}, remote.data, { _updated: remote.updated_at, notified: Object.assign({}, remote.data.notified, S.data.notified) }));
        applying = false;
        setState('ok');
      } else if (new Date(local) > new Date(remote.updated_at)) {
        await push(true);
      } else setState('ok');
    } catch (e) { applying = false; setState('error'); }
  }
  async function push(now) {
    clearTimeout(pushTimer);
    const go = async () => {
      if (!code) return;
      if (!navigator.onLine) { setState('offline'); return; }
      try {
        setState('syncing');
        const data = JSON.parse(JSON.stringify(S.data));
        await rpc('madar_put', { p_code: code, p_data: data, p_updated: data._updated || new Date().toISOString() });
        setState('ok');
      } catch (e) { setState('error'); }
    };
    if (now) return go();
    pushTimer = setTimeout(go, 1000);
  }

  // أول دخول بكلمة السر: ندمج بيانات هذا الجهاز مع السحابة
  async function login(pass) {
    if (!pass || pass.trim().length < 6) throw new Error('short');
    const c = await codeFromPassword(pass);
    const rows = await rpc('madar_get', { p_code: c });
    const remote = rows && rows[0];
    code = c; ls.set(CODE_KEY, c); ls.set(MODE_KEY, 'pass');
    const now = new Date().toISOString();
    applying = true;
    if (remote) S.replace(Object.assign(mergeData(remote.data, S.data), { _updated: now }));
    else { S.data._updated = now; S.save(); }
    applying = false;
    await push(true);
    begin();
    return !!remote;
  }
  function logout() { code = null; ls.del(CODE_KEY); ls.del(MODE_KEY); setState('idle'); }

  function begin() {
    if (started) return; started = true;
    S.onChange(() => {
      if (applying || !code) return;
      S.data._updated = new Date().toISOString();
      try { localStorage.setItem('saeed.aseel.v1', JSON.stringify(S.data)); } catch (e) { }
      push();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
    window.addEventListener('focus', pull);
    window.addEventListener('online', pull);
    window.addEventListener('offline', () => setState('offline'));
    setInterval(() => { if (!document.hidden) pull(); }, 10000);
  }

  // يرجع true لو الجهاز داخل، false لو يحتاج كلمة السر
  function start() {
    code = ls.get(CODE_KEY);
    if (code && ls.get(MODE_KEY) === 'pass') { begin(); pull(); return true; }
    return false;
  }

  root.Sync = {
    start, login, logout, pull, push,
    get state() { return state; },
    get code() { return code; },
    get signedIn() { return !!code && ls.get(MODE_KEY) === 'pass'; },
    onState(f) { listeners.push(f); }
  };
})(window);

/* سماء الليل: درب التبانة (ترسم مرة وحدة) + نجوم تلمع + شهاب نادر */
(function () {
  'use strict';
  const cv = document.getElementById('stars'), mw = document.getElementById('milky');
  if (!cv) return;
  const ctx = cv.getContext('2d'), mctx = mw && mw.getContext('2d');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, stars = [], shoot = null, last = 0;
  const TINTS = ['255,255,255', '220,234,255', '200,222,255', '255,244,226'];

  // رقم عشوائي ثابت عشان شكل درب التبانة ما يتغير كل مرة
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;

  function drawMilky() {
    if (!mctx || !W || !H || getComputedStyle(mw).display === "none") return;
    mw.width = W * dpr; mw.height = H * dpr; mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, W, H);
    seed = 11;
    // الحزمة: خط مائل من أسفل اليسار لأعلى اليمين
    const x0 = -W * .05, y0 = H * .95, x1 = W * 1.05, y1 = -H * .1;
    const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux;
    const width = Math.min(W, H) * .22;
    // سحب ضوء ناعمة
    for (let i = 0; i < 70; i++) {
      const t = rnd(), off = gauss() * width * .55;
      const x = x0 + ux * len * t + nx * off, y = y0 + uy * len * t + ny * off;
      const r = width * (.35 + rnd() * .6);
      const g = mctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = rnd() < .3;
      g.addColorStop(0, warm ? 'rgba(255,225,200,.07)' : 'rgba(170,200,255,.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g; mctx.beginPath(); mctx.arc(x, y, r, 0, 6.283); mctx.fill();
    }
    // خيوط غبار داكنة داخل الحزمة
    for (let i = 0; i < 26; i++) {
      const t = rnd(), off = gauss() * width * .18;
      const x = x0 + ux * len * t + nx * off, y = y0 + uy * len * t + ny * off, r = width * (.12 + rnd() * .2);
      const g = mctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(5,10,30,.22)'); g.addColorStop(1, 'rgba(5,10,30,0)');
      mctx.fillStyle = g; mctx.beginPath(); mctx.arc(x, y, r, 0, 6.283); mctx.fill();
    }
    // غبار نجوم كثيف داخل الحزمة
    const n = Math.round(W * H / 260);
    for (let i = 0; i < n; i++) {
      const t = rnd(), off = gauss() * width * .7;
      const x = x0 + ux * len * t + nx * off, y = y0 + uy * len * t + ny * off;
      const a = .08 + rnd() * .35 * (1 - Math.min(1, Math.abs(off) / width));
      mctx.fillStyle = 'rgba(' + TINTS[(rnd() * 4) | 0] + ',' + a.toFixed(3) + ')';
      mctx.fillRect(x, y, rnd() < .9 ? .7 : 1.2, rnd() < .9 ? .7 : 1.2);
    }
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 3800);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H * .88,
      r: Math.random() < .07 ? 1.3 + Math.random() * .9 : .35 + Math.random() * .75,
      a: .3 + Math.random() * .6, s: .4 + Math.random() * 1.4, p: Math.random() * 6.28,
      c: TINTS[(Math.random() * TINTS.length) | 0]
    }));
    drawMilky();
    draw(0);
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = reduce ? s.a : s.a * (.55 + .45 * Math.sin(t / 1000 * s.s + s.p));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')'; ctx.fill();
      if (s.r > 1.3) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.4, 0, 6.283); ctx.fillStyle = 'rgba(' + s.c + ',' + (a * .09).toFixed(3) + ')'; ctx.fill(); }
    }
    if (shoot) {
      const k = (t - shoot.t0) / shoot.d;
      if (k > 1) shoot = null;
      else {
        const x = shoot.x + shoot.dx * k, y = shoot.y + shoot.dy * k, f = Math.sin(k * Math.PI);
        const g = ctx.createLinearGradient(x, y, x - shoot.dx * .2, y - shoot.dy * .2);
        g.addColorStop(0, 'rgba(255,255,255,' + (.85 * f) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shoot.dx * .2, y - shoot.dy * .2); ctx.stroke();
      }
    }
  }
  function loop(t) {
    if (!document.hidden && t - last > 50) {
      if (!shoot && Math.random() < .0015) shoot = { x: W * (.3 + Math.random() * .6), y: H * Math.random() * .35, dx: -(160 + Math.random() * 220), dy: 70 + Math.random() * 90, t0: t, d: 900 };
      draw(t); last = t;
    }
    requestAnimationFrame(loop);
  }
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
  size();
  if (!reduce) requestAnimationFrame(loop);
})();

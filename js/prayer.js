/* مواقيت الصلاة — مكة المكرمة، طريقة أم القرى، تنحسب في الجهاز بدون نت
   الفجر ١٨٫٥° · العصر (المثل) · العشاء بعد المغرب بـ٩٠ دقيقة (١٢٠ في رمضان) */
(function (root) {
  'use strict';
  const MAKKAH = { lat: 21.4225, lng: 39.8262, tz: 3 };
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const dsin = d => Math.sin(rad(d)), dcos = d => Math.cos(rad(d)), dtan = d => Math.tan(rad(d));
  const darcsin = x => deg(Math.asin(x)), darccos = x => deg(Math.acos(x)), darctan2 = (y, x) => deg(Math.atan2(y, x)), darccot = x => deg(Math.atan(1 / x));

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - fix(RA, 24) };
  }

  function compute(date, loc) {
    loc = loc || MAKKAH;
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - loc.lng / (15 * 24);
    const midDay = t => fix(12 - sunPos(jd + t).eqt, 24);
    const angleTime = (angle, t, ccw) => {
      const p = sunPos(jd + t);
      const T = darccos((-dsin(angle) - dsin(p.decl) * dsin(loc.lat)) / (dcos(p.decl) * dcos(loc.lat))) / 15;
      return midDay(t) + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const p = sunPos(jd + t);
      return angleTime(-darccot(factor + dtan(Math.abs(loc.lat - p.decl))), t);
    };
    // تقدير أولي ثم تصحيح مرة
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        fajr: angleTime(18.5, t.fajr / 24, true),
        sunrise: angleTime(0.833, t.sunrise / 24, true),
        dhuhr: midDay(t.dhuhr / 24),
        asr: asrTime(1, t.asr / 24),
        maghrib: angleTime(0.833, t.maghrib / 24)
      };
    }
    const adj = h => h + loc.tz - loc.lng / 15;
    let ramadan = false;
    try { ramadan = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(date) === '9'; } catch (e) { }
    const toDate = (h, up) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return new Date(d.getTime() + (up ? Math.ceil(h * 60) : Math.round(h * 60)) * 60000); };
    const out = {
      fajr: toDate(adj(t.fajr)), sunrise: toDate(adj(t.sunrise)), dhuhr: toDate(adj(t.dhuhr)),
      asr: toDate(adj(t.asr), true), maghrib: toDate(adj(t.maghrib))
    };
    out.isha = new Date(out.maghrib.getTime() + (ramadan ? 120 : 90) * 60000);
    return out;
  }

  const NAMES = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
  const ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  function next(now) {
    now = now || new Date();
    const today = compute(now);
    for (const k of ORDER) if (today[k] > now) return { key: k, name: NAMES[k], at: today[k], times: today };
    const tm = new Date(now); tm.setDate(tm.getDate() + 1);
    const t2 = compute(tm);
    return { key: 'fajr', name: NAMES.fajr, at: t2.fajr, times: today, tomorrow: true };
  }

  const api = { compute, next, NAMES, ORDER, MAKKAH };
  root.Prayer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

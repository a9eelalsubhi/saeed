/* =========================================================
   مساعد أصيل — فهم الكلام العربي محلياً (بدون نت وبدون اشتراك)
   يحوّل جملة مثل: "عندي موعد اسنان الخميس الجاي الساعة ٤ العصر"
   إلى: { intent:'add', title:'موعد أسنان', start: Date, category:'health' }
   ========================================================= */
(function (root) {
  'use strict';

  // ---------- أدوات ----------
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function clean(text) {
    return String(text || '')
      .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))
      .replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d))
      .replace(/[ً-ْـ]/g, '') // تشكيل وتطويل
      .replace(/[؟?!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // يحوّل كلمة إلى نمط متسامح مع الهمزات والتاء المربوطة والياء
  function w(word) {
    return word
      .replace(/[اأإآ]/g, '[اأإآ]')
      .replace(/[هة](?=$|\s|\))/g, '[هة]')
      .replace(/[يى](?=$|\s|\))/g, '[يى]');
  }
  const B = '(?:^|(?<=[\\s،,.]))';
  const E = '(?=$|[\\s،,.])';
  function rx(words, flags) {
    const alt = words.map(w).join('|');
    return new RegExp(B + '(?:' + alt + ')' + E, flags || 'i');
  }
  function any(text, words) { return rx(words).test(text); }

  // ---------- قواميس ----------
  const DAYS = [
    { i: 0, w: ['الاحد', 'الأحد', 'احد'] },
    { i: 1, w: ['الاثنين', 'الإثنين', 'الاثنينن', 'الثنين', 'اثنين'] },
    { i: 2, w: ['الثلاثاء', 'الثلاثا', 'الثلوث', 'ثلاثاء'] },
    { i: 3, w: ['الاربعاء', 'الأربعاء', 'الاربعا', 'الربوع', 'اربعاء'] },
    { i: 4, w: ['الخميس', 'خميس'] },
    { i: 5, w: ['الجمعه', 'الجمعة', 'جمعه'] },
    { i: 6, w: ['السبت', 'سبت'] }
  ];
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const MONTHS = [
    ['يناير', 'جنوري'], ['فبراير'], ['مارس'], ['ابريل', 'أبريل'], ['مايو'], ['يونيو'],
    ['يوليو'], ['اغسطس', 'أغسطس'], ['سبتمبر'], ['اكتوبر', 'أكتوبر'], ['نوفمبر'], ['ديسمبر']
  ];
  const HOUR_WORDS = {
    'واحده': 1, 'وحده': 1, 'واحد': 1, 'ثنتين': 2, 'اثنين': 2, 'اتنين': 2, 'ثنين': 2,
    'ثلاث': 3, 'ثلاثه': 3, 'تلات': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5,
    'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'ثمان': 8, 'ثمانيه': 8, 'ثمنيه': 8, 'تمانيه': 8,
    'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10, 'احدعش': 11, 'حدعش': 11, 'احد عشر': 11,
    'اثنعش': 12, 'اطنعش': 12, 'اثنا عشر': 12, 'ثنعش': 12
  };
  // فترات اليوم: am / pm / noon + وقت افتراضي لو ما ذُكرت ساعة
  const PERIODS = [
    { k: 'am', def: [5, 30], w: ['الفجر', 'فجرا', 'بعد الفجر', 'بعد صلاه الفجر'] },
    { k: 'am', def: [9, 0], w: ['الصبح', 'الصباح', 'صباحا', 'صباح', 'ص', 'الضحى'] },
    { k: 'noon', def: [12, 30], w: ['الظهر', 'ظهرا', 'بعد الظهر', 'بعد صلاه الظهر', 'الضهر'] },
    { k: 'pm', def: [16, 0], w: ['العصر', 'عصرا', 'بعد العصر', 'بعد صلاه العصر'] },
    { k: 'pm', def: [18, 0], w: ['المغرب', 'بعد المغرب', 'بعد صلاه المغرب'] },
    { k: 'pm', def: [20, 0], w: ['العشاء', 'بعد العشاء', 'بعد صلاه العشاء', 'العشا'] },
    { k: 'pm', def: [19, 0], w: ['المسا', 'المساء', 'مساء', 'مساءا', 'مسا', 'م'] },
    { k: 'night', def: [21, 0], w: ['الليل', 'بالليل', 'الليله', 'ليلا', 'في الليل'] }
  ];

  const CATEGORIES = [
    { id: 'exam', w: ['امتحان', 'اختبار', 'كويز', 'quiz', 'exam', 'ميد', 'فاينل', 'ميدترم', 'اوسكي', 'osce'] },
    { id: 'study', w: ['محاضره', 'محاضرة', 'محاضرات', 'كلاس', 'درس', 'مذاكره', 'اذاكر', 'ذاكر', 'لاب', 'lab', 'عملي', 'سكشن', 'مراجعه', 'تيوتوريال', 'tbl', 'pbl', 'lecture'] },
    { id: 'health', w: ['اسنان', 'الاسنان', 'دكتور', 'الدكتور', 'طبيب', 'مستشفى', 'المستشفى', 'عياده', 'العياده', 'تحليل', 'تحاليل', 'صيدليه', 'مراجعه طبيه', 'تطعيم'] },
    { id: 'meeting', w: ['اجتماع', 'ميتنق', 'ميتنج', 'meeting', 'مقابله', 'زوم', 'zoom', 'تيمز', 'كول'] },
    { id: 'deen', w: ['صلاه', 'مسجد', 'المسجد', 'قران', 'القران', 'عمره', 'حلقه', 'تراويح', 'جمعه'] },
    { id: 'match', w: ['مباراه', 'مباراة', 'ماتش', 'الماتش', 'ارسنال', 'الارسنال', 'آرسنال', 'ارسنل', 'الجانرز', 'الاتحاد', 'اتحاد', 'العميد', 'دوري الابطال', 'دوري روشن', 'الدوري', 'البريميرليق', 'ديربي', 'الديربي'] },
    { id: 'sport', w: ['جيم', 'الجيم', 'نادي', 'النادي', 'رياضه', 'مشي', 'تمرين', 'كوره', 'بادل', 'سباحه'] },
    { id: 'social', w: ['عزيمه', 'زواج', 'عرس', 'طلعه', 'الاهل', 'اهلي', 'الربع', 'الشباب', 'قهوه', 'عشاء مع', 'غداء مع', 'فطور مع', 'زياره'] },
    { id: 'project', w: ['مشروع', 'بحث', 'ريسيرش', 'research', 'تصميم', 'موقع', 'فيديو', 'فلوق', 'تصوير', 'مونتاج', 'حديث الاسبوع', 'ريلز', 'تيك توك', 'يوتيوب', 'شرح'] }
  ];

  const FILLERS = [
    'ترى', 'تراه', 'تراني', 'يا', 'اقول لك', 'اقولك', 'ابغاك', 'ابيك', 'ابغى', 'ابي', 'ودي', 'ابغاك تضيف',
    'اضف', 'أضف', 'ضيف', 'حط', 'سجل', 'ذكرني', 'ذكرني ب', 'نبهني', 'عندي', 'عندنا', 'فيه', 'لي', 'لو سمحت',
    'الله يخليك', 'تكفى', 'يعني', 'طيب', 'اوكي', 'بس', 'انه', 'ان', 'انا', 'وعندي', 'وبعدين', 'كمان',
    'في التقويم', 'بالتقويم', 'على التقويم', 'الجاي', 'الجايه', 'القادم', 'القادمه', 'اللي جاي'
  ];

  const pad = n => String(n).padStart(2, '0');
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // ---------- استخراج التاريخ ----------
  function findDate(text, now, spans) {
    const today = startOfDay(now);
    let m;
    const mark = (mm) => spans.push([mm.index, mm.index + mm[0].length]);

    // بعد بكرة
    m = new RegExp(B + w('بعد') + '\\s+(?:' + ['بكره', 'بكرة', 'باكر', 'غدا'].map(w).join('|') + ')' + E, 'i').exec(text);
    if (m) { mark(m); return { date: addDays(today, 2), explicit: true }; }
    // بعد X أيام / يومين / أسبوع
    m = new RegExp(B + 'بعد\\s+(\\d+)\\s*(?:يوم|ايام|أيام)' + E).exec(text);
    if (m) { mark(m); return { date: addDays(today, +m[1]), explicit: true }; }
    m = new RegExp(B + 'بعد\\s+يومين' + E).exec(text);
    if (m) { mark(m); return { date: addDays(today, 2), explicit: true }; }
    m = new RegExp(B + 'بعد\\s+(?:[اأ]سبوع|جمعه|جمعة)' + E).exec(text);
    if (m) { mark(m); return { date: addDays(today, 7), explicit: true }; }
    m = new RegExp(B + 'بعد\\s+[اأ]سبوعين' + E).exec(text);
    if (m) { mark(m); return { date: addDays(today, 14), explicit: true }; }

    // تاريخ رقمي 25/11 أو 25-11-2026
    m = /(?:^|\s)(?:يوم\s+)?(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?(?=$|\s)/.exec(text);
    if (m) {
      mark(m);
      let y = m[3] ? +m[3] : now.getFullYear();
      if (y < 100) y += 2000;
      let d = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && d < today) d = new Date(y + 1, +m[2] - 1, +m[1]);
      return { date: d, explicit: true };
    }
    // 25 نوفمبر
    for (let mi = 0; mi < 12; mi++) {
      m = new RegExp('(?:^|\\s)(?:يوم\\s+)?(\\d{1,2})\\s+(?:' + MONTHS[mi].map(w).join('|') + ')' + E).exec(text);
      if (m) {
        mark(m);
        let d = new Date(now.getFullYear(), mi, +m[1]);
        if (d < today) d = new Date(now.getFullYear() + 1, mi, +m[1]);
        return { date: d, explicit: true };
      }
    }

    // اسم يوم (+ الجاي / الأسبوع الجاي)
    for (const day of DAYS) {
      const re = new RegExp(B + '(?:يوم\\s+)?(?:' + day.w.map(w).join('|') + ')' +
        '(?:\\s+(' + ['الجاي', 'الجايه', 'الجاية', 'القادم', 'القادمه', 'اللي جاي', 'هذا', 'ذا'].map(w).join('|') + '))?' +
        '(?:\\s+(?:(?:من|في|ب)\\s*)?(?:ال)?([اأ]سبوع|الاسبوع)\\s+(?:الجاي|القادم|الجاي|اللي بعده|الي بعده))?' + E, 'i');
      m = re.exec(text);
      if (m) {
        // "الجمعة" قد تكون صلاة الجمعة — نتجاهلها لو جاءت بعد "صلاة"
        if (day.i === 5 && /صلا[هة]\s+$/.test(text.slice(0, m.index))) continue;
        mark(m);
        let diff = (day.i - today.getDay() + 7) % 7;
        if (diff === 0) diff = m[1] ? 7 : 0; // "الخميس" اليوم = اليوم، "الخميس الجاي" = الأسبوع الجاي
        const nextWeek = m[2] || new RegExp(w('الاسبوع') + '\\s+(?:الجاي|القادم)').test(text);
        if (nextWeek) {
          // الأسبوع الجاي يبدأ من الأحد القادم
          const daysToSunday = (7 - today.getDay()) % 7 || 7;
          diff = daysToSunday + day.i;
          const wk = new RegExp(B + '(?:في\\s+|ب)?' + w('الاسبوع') + '\\s+(?:الجاي|القادم)' + E).exec(text);
          if (wk) spans.push([wk.index, wk.index + wk[0].length]);
        }
        return { date: addDays(today, diff), explicit: true, dayOnlyNoTimeToday: diff === 0 };
      }
    }

    // يوم 25 (من هذا الشهر أو الجاي)
    m = /(?:^|\s)يوم\s+(\d{1,2})(?=$|\s)/.exec(text);
    if (m && +m[1] <= 31) {
      mark(m);
      let d = new Date(now.getFullYear(), now.getMonth(), +m[1]);
      if (d < today) d = new Date(now.getFullYear(), now.getMonth() + 1, +m[1]);
      return { date: d, explicit: true };
    }

    m = rx(['بكره', 'بكرة', 'باكر', 'غدا', 'بكرا', 'الغد']).exec(text);
    if (m) { mark(m); return { date: addDays(today, 1), explicit: true }; }
    m = rx(['اليوم', 'الحين', 'هاليوم', 'الليله']).exec(text);
    if (m) { if (!/الليل/.test(m[0])) mark(m); return { date: today, explicit: true }; }
    m = rx(['امس']).exec(text);
    if (m) { mark(m); return { date: addDays(today, -1), explicit: true }; }

    m = new RegExp(B + '(?:في\\s+)?(?:' + w('الاسبوع') + '|' + w('الاسبوع') + ')\\s+(?:الجاي|القادم)' + E).exec(text);
    if (m) { mark(m); const s = (7 - today.getDay()) % 7 || 7; return { date: addDays(today, s), explicit: true, vague: true }; }

    return { date: today, explicit: false };
  }

  // ---------- استخراج الوقت ----------
  function parseHourToken(tok) {
    if (/^\d+$/.test(tok)) return +tok;
    const k = tok.replace(/[ةه]$/, 'ه').replace(/[أإآ]/g, 'ا');
    return HOUR_WORDS[k] != null ? HOUR_WORDS[k] : null;
  }
  const HOUR_WORD_RE = Object.keys(HOUR_WORDS).sort((a, b) => b.length - a.length).map(w).join('|');

  function detectPeriod(text, spans) {
    for (const p of PERIODS) {
      const m = rx(p.w).exec(text);
      if (m) {
        // "م" و "ص" لا نحذفها إلا لو جت بعد رقم
        if (/^\s*[مص]\s*$/.test(m[0]) && !/\d\s*[مص](?=$|\s)/.test(text)) continue;
        spans.push([m.index, m.index + m[0].length]);
        return p;
      }
    }
    return null;
  }

  function applyPeriod(h, period) {
    if (!period) {
      if (h >= 1 && h <= 6) return h + 12;     // ٤ = العصر غالباً
      return h;                                  // ٨ = الصبح
    }
    if (period.k === 'am') return h === 12 ? 0 : h;
    if (period.k === 'noon') return h < 6 ? h + 12 : h;
    if (period.k === 'pm') return h < 12 ? h + 12 : h;
    if (period.k === 'night') { if (h === 12) return 0; return h < 5 ? h + 24 /*بعد منتصف الليل*/ : (h < 12 ? h + 12 : h); }
    return h;
  }

  function findTime(text, now, spans) {
    let m;
    const mark = (mm) => spans.push([mm.index, mm.index + mm[0].length]);

    // نسبي: بعد ساعة / ساعتين / نص ساعة / ٢٠ دقيقة
    m = new RegExp(B + 'بعد\\s+(?:(\\d+)\\s*(دقيقه|دقيقة|دقايق|دقائق|ساعه|ساعة|ساعات)|(ساعه|ساعة|ساعتين|نص ساعه|نص ساعة|نصف ساعه|ربع ساعه|ربع ساعة|دقيقتين))' + E).exec(text);
    if (m) {
      mark(m);
      let mins = 0;
      if (m[1]) mins = /دق/.test(m[2]) ? +m[1] : +m[1] * 60;
      else mins = { 'ساعه': 60, 'ساعة': 60, 'ساعتين': 120, 'نص ساعه': 30, 'نص ساعة': 30, 'نصف ساعه': 30, 'ربع ساعه': 15, 'ربع ساعة': 15, 'دقيقتين': 2 }[m[3]] || 60;
      return { relative: new Date(now.getTime() + mins * 60000) };
    }

    const period = detectPeriod(text, spans);
    const MIN_RE = '(?:\\s*(?:و\\s*)?(نص|النص|ربع|الربع|ثلث|الثلث|عشر|خمس)|\\s*[اإ]لا\\s*(ربع|ثلث|عشر|خمس)|\\s*و\\s*(\\d{1,2})\\s*(?:دقيقه|دقيقة|د)?)?';

    // 4:30 أو 16:30
    m = /(?:^|\s)(?:الساع[هة]\s*)?(\d{1,2})[:٫.](\d{2})(?:\s*([مص])(?=$|\s))?/.exec(text);
    if (m) {
      mark(m);
      let h = +m[1], mi = +m[2];
      let p = period;
      if (m[3]) p = m[3] === 'م' ? { k: 'pm' } : { k: 'am' };
      if (h <= 12) h = applyPeriod(h, p);
      return { h, mi };
    }

    // الساعة ٤ / الساعة اربع ونص / ٤ العصر
    const reH = new RegExp('(?:^|\\s)(?:(?:على|عل|ع)\\s*)?(?:ال)?(?:ساع[هة])\\s*(\\d{1,2}|' + HOUR_WORD_RE + ')' + MIN_RE + '(?:\\s*([مص])(?=$|\\s))?' + E);
    m = reH.exec(text);
    if (!m && period) {
      const reH2 = new RegExp('(?:^|\\s)(\\d{1,2}|' + HOUR_WORD_RE + ')' + MIN_RE + '(?:\\s*([مص])(?=$|\\s))?\\s+(?=' + period.w.map(w).join('|') + ')');
      m = reH2.exec(text);
    }
    if (!m) {
      m = new RegExp('(?:^|\\s)(\\d{1,2})' + MIN_RE + '\\s*([مص])' + E).exec(text);
    }
    if (!m) { // من ٤ الى ٦
      m = new RegExp('(?:^|\\s)من\\s*(?:الساع[هة]\\s*)?(\\d{1,2}|' + HOUR_WORD_RE + ')' + MIN_RE + '(?:\\s*([مص]))?(?=\\s+(?:[اإ]لى|الين|لين|حتى|ل))').exec(text);
    }
    if (m) {
      const h0 = parseHourToken(m[1]);
      if (h0 != null && h0 <= 24) {
        mark(m);
        let mi = 0, h = h0;
        const frac = { 'نص': 30, 'النص': 30, 'ربع': 15, 'الربع': 15, 'ثلث': 20, 'الثلث': 20, 'عشر': 10, 'خمس': 5 };
        if (m[2]) mi = frac[m[2]] || 0;
        if (m[3]) { mi = 60 - (frac[m[3]] || 0); h = h - 1; if (h === 0) h = 12; }
        if (m[4]) mi = +m[4];
        let p = period;
        if (m[5]) p = m[5] === 'م' ? { k: 'pm' } : { k: 'am' };
        if (h <= 12) h = applyPeriod(h, p);
        return { h, mi };
      }
    }

    if (period) return { h: period.def[0], mi: period.def[1], fromPeriod: true };
    return null;
  }

  // ---------- المدة / وقت النهاية ----------
  function findDuration(text, spans) {
    let m = new RegExp(B + '(?:لمد[هة]|مدته|مدتها|تطول|تاخذ)\\s+(?:(\\d+)\\s*(دقيقه|دقيقة|ساعه|ساعة|ساعات)|(ساعه|ساعة|ساعتين|نص ساعه|نص ساعة|ساعه ونص|ساعة ونص))' + E).exec(text);
    if (!m) return null;
    spans.push([m.index, m.index + m[0].length]);
    if (m[1]) return /دق/.test(m[2]) ? +m[1] : +m[1] * 60;
    return { 'ساعه': 60, 'ساعة': 60, 'ساعتين': 120, 'نص ساعه': 30, 'نص ساعة': 30, 'ساعه ونص': 90, 'ساعة ونص': 90 }[m[3]] || 60;
  }
  function findEndHour(text, spans) {
    const m = new RegExp('(?:^|\\s)(?:[اإ]لى|الين|لين|حتى|ل)\\s*(?:الساع[هة]\\s*)?(\\d{1,2}|' + HOUR_WORD_RE + ')(?:\\s*(?:و\\s*)?(نص|ربع))?' + E).exec(text);
    if (!m) return null;
    const h = parseHourToken(m[1]);
    if (h == null) return null;
    spans.push([m.index, m.index + m[0].length]);
    return { h, mi: m[2] === 'نص' ? 30 : m[2] === 'ربع' ? 15 : 0 };
  }

  // ---------- التذكير ----------
  function findReminder(text, spans) {
    const m = new RegExp('(?:ذكرني|نبهني|تذكير)\\s*(?:قبل(?:ه|ها)?)\\s*(?:ب)?\\s*(?:(\\d+)\\s*(دقيقه|دقيقة|دقايق|ساعه|ساعة|ساعات|يوم|ايام)|(ساعه|ساعة|ساعتين|نص ساعه|نص ساعة|يوم|يومين|ربع ساعه))').exec(text);
    if (!m) return null;
    spans.push([m.index, m.index + m[0].length]);
    if (m[1]) { const n = +m[1]; return /دق/.test(m[2]) ? n : /يوم|ايام/.test(m[2]) ? n * 1440 : n * 60; }
    return { 'ساعه': 60, 'ساعة': 60, 'ساعتين': 120, 'نص ساعه': 30, 'نص ساعة': 30, 'يوم': 1440, 'يومين': 2880, 'ربع ساعه': 15 }[m[3]] || 30;
  }

  const SUBJECTS = [
    { id: 'anatomy', w: ['اناتومي', 'الاناتومي', 'تشريح', 'التشريح', 'anatomy'] },
    { id: 'physio', w: ['فسيو', 'الفسيو', 'فسيولوجي', 'physio', 'physiology'] },
    { id: 'biochem', w: ['بايو', 'البايو', 'بايوكيم', 'كيمياء حيويه', 'biochem', 'bio'] },
    { id: 'embryo', w: ['امبريو', 'الامبريو', 'اجنه', 'embryo'] },
    { id: 'histo', w: ['هستو', 'هيستو', 'الهستو', 'الهيستو', 'انسجه', 'histo', 'histology'] },
    { id: 'immuno', w: ['امينو', 'الامينو', 'مناعه', 'المناعه', 'immuno'] },
    { id: 'micro', w: ['مايكرو', 'المايكرو', 'ميكرو', 'micro'] },
    { id: 'patho', w: ['باثو', 'الباثو', 'باثولوجي', 'patho', 'pathology'] },
    { id: 'pharma', w: ['فارما', 'الفارما', 'فارم', 'ادويه', 'pharma'] },
    { id: 'radio', w: ['راديو', 'الراديو', 'اشعه', 'الاشعه', 'radiology'] }
  ];
  function findSubject(text) {
    for (const s of SUBJECTS) if (any(text, s.w)) return s.id;
    return null;
  }

  function findCategory(text) {
    for (const c of CATEGORIES) if (any(text, c.w)) return c.id;
    return 'personal';
  }

  // ---------- العنوان ----------
  const PRETTY = [
    [/اسنان/g, 'أسنان'], [/محاضره/g, 'محاضرة'], [/مراجعه/g, 'مراجعة'], [/عياده/g, 'عيادة'],
    [/مقابله/g, 'مقابلة'], [/صلاه/g, 'صلاة'], [/رياضه/g, 'رياضة'], [/^اذاكر\s/, 'مذاكرة '], [/^اراجع\s/, 'مراجعة ']
  ];
  function buildTitle(text, spans) {
    let chars = text.split('');
    for (const [a, b] of spans) for (let i = a; i < b && i < chars.length; i++) chars[i] = ' ';
    let t = chars.join('').replace(/\s+/g, ' ').trim();
    // احذف الحشو
    const fillers = FILLERS.slice().sort((a, b) => b.length - a.length);
    let prev;
    do {
      prev = t;
      for (const f of fillers) t = t.replace(new RegExp(B + w(f) + E, 'gi'), ' ').replace(/\s+/g, ' ').trim();
      // حروف جر يتيمة في الأطراف
      t = t.replace(/^(?:و|في|على|عن|من|مع|الساع[هة]|يوم|ب|ل|عشان)\s+/, '').replace(/\s+(?:و|في|على|عن|من|مع|الساع[هة]|يوم|ب|ل|عشان|قبل|بعد)$/, '').trim();
    } while (t !== prev);
    t = t.replace(/^[،,.\-\s]+|[،,.\-\s]+$/g, '');
    for (const [a, b] of PRETTY) t = t.replace(a, b);
    return t;
  }

  // ---------- النية ----------
  function detectIntent(text) {
    if (/(?:^|\s)(?:وش|ايش|شو|إيش|ش|ويش)\s+(?:عندي|عندنا|ورا[يى]|جدولي|مواعيدي)/.test(text) ||
        /(?:^|\s)(?:جدولي|مواعيدي|برنامجي)(?:\s|$)/.test(text) || /(?:^|\s)(?:عندي شي|فيه شي|عندي ش[يى]ء)/.test(text)) return 'query';
    if (/(?:^|\s)(?:احذف|امسح|الغ|الغي|ألغ|كنسل|شيل)(?:\s|$)/.test(text)) return 'delete';
    if (/(?:^|\s)(?:خلصت|انهيت|أنهيت|ذاكرت|راجعت|خلّصت|حليت|حلّيت)(?:\s|$)/.test(text)) return 'done';
    if (/^(?:اضف|أضف|ضيف|سجل|حط)\s+(?:محاضر[هة]|درس|lecture)/.test(text)) return 'lecture';
    if (/^(?:مهم[هة]|تاسك|task|سوي|لازم)(?:\s|:)/.test(text)) return 'task';
    return 'add';
  }

  // ---------- الواجهة الرئيسية ----------
  function parse(input, nowArg) {
    const now = nowArg ? new Date(nowArg) : new Date();
    const text = clean(input);
    const spans = [];
    const intent = detectIntent(text);
    const category = findCategory(text);

    const remind = findReminder(text, spans);
    const duration = findDuration(text, spans);
    const dateInfo = findDate(text, now, spans);
    const time = findTime(text, now, spans);
    const endT = time ? findEndHour(text, spans) : null;

    let start = new Date(dateInfo.date), allDay = false;
    if (time && time.relative) {
      start = time.relative;
    } else if (time) {
      let h = time.h, dayShift = 0;
      if (h >= 24) { h -= 24; dayShift = 1; }
      start.setHours(h, time.mi, 0, 0);
      if (dayShift) start = addDays(start, 1);
      // لو قال وقت بس بدون يوم والوقت راح → بكرة
      if (!dateInfo.explicit && start < now) start = addDays(start, 1);
    } else {
      allDay = true;
    }

    let end = null;
    if (!allDay) {
      if (endT) {
        end = new Date(start);
        let eh = endT.h;
        if (eh < 12 && eh + 12 > start.getHours() && eh <= start.getHours() % 12 + 12 && start.getHours() >= 12) eh += 12;
        if (eh <= start.getHours() && eh + 12 < 24) eh += 12;
        end.setHours(eh, endT.mi, 0, 0);
        if (end <= start) end = new Date(start.getTime() + 60 * 60000);
      } else {
        const defDur = { study: 60, exam: 120, health: 45, meeting: 60, deen: 30, sport: 60, social: 120, match: 120 }[category] || 60;
        end = new Date(start.getTime() + (duration || defDur) * 60000);
      }
    }

    const defaultRemind = { exam: 1440, health: 60, study: 30, meeting: 15 }[category] || 30;
    const title = buildTitle(text, spans) || defaultTitle(category);

    return {
      intent, title, category, allDay, subject: findSubject(text),
      start, end,
      remindMin: remind != null ? remind : (allDay ? 0 : defaultRemind),
      hasDate: dateInfo.explicit, hasTime: !!time,
      vague: !!dateInfo.vague || !!(time && time.fromPeriod),
      raw: input, cleaned: text
    };
  }

  function defaultTitle(cat) {
    return { study: 'محاضرة', exam: 'امتحان', health: 'موعد طبي', meeting: 'اجتماع', deen: 'عبادة', sport: 'رياضة', social: 'مناسبة', project: 'مشروع' }[cat] || 'موعد';
  }

  // وصف عربي لطيف للتاريخ
  function describe(d, now) {
    now = now || new Date();
    const t0 = startOfDay(now), t1 = startOfDay(d);
    const diff = Math.round((t1 - t0) / 86400000);
    let day;
    if (diff === 0) day = 'اليوم';
    else if (diff === 1) day = 'بكرة';
    else if (diff === 2) day = 'بعد بكرة';
    else if (diff === -1) day = 'أمس';
    else day = DAY_NAMES[d.getDay()];
    const date = d.getDate() + '/' + (d.getMonth() + 1);
    return { day, date, diff, dayName: DAY_NAMES[d.getDay()] };
  }
  function fmtTime(d) {
    let h = d.getHours(); const m = d.getMinutes();
    const suf = h < 12 ? 'ص' : 'م';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + pad(m) + ' ' + suf;
  }

  const api = { parse, describe, fmtTime, clean, DAY_NAMES, CATEGORIES };
  root.AseelParser = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

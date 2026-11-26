/*
 * All Trips Considered: theme boot. Loaded in <head>, right after
 * calendar-data.js, so the saved mode and the day's colors apply before the
 * page paints. Exposes window.ATC for app.js.
 *
 * Storage keys are "<app>-theme" and "<app>-scheme", where <app> is the
 * data-app attribute on <html> (TEMPLATE: set it per app).
 */
(function () {
  "use strict";
  var D = self.ATC_DATA;
  var html = document.documentElement;
  var APP = /^[a-z0-9-]{1,40}$/.test(html.getAttribute("data-app") || "") ? html.getAttribute("data-app") : "atc";
  var DEFAULT_THEME_COLOR = "#1f4fd6";

  function load(key) { try { return localStorage.getItem(APP + "-" + key); } catch (e) { return null; } }
  function save(key, value) {
    try { if (value === null) localStorage.removeItem(APP + "-" + key); else localStorage.setItem(APP + "-" + key, value); } catch (e) {}
  }

  /* ---------- Light, dark or automatic mode ---------- */
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var mode = load("theme");
  if (mode !== "light" && mode !== "dark") mode = "auto";
  function applyMode(m) {
    if (m === "light" || m === "dark") html.setAttribute("data-theme", m); else html.removeAttribute("data-theme");
  }
  applyMode(mode);
  var theme = {
    media: media,
    get: function () { return mode; },
    set: function (m) {
      if (m !== "light" && m !== "dark") m = "auto";
      mode = m; applyMode(m); save("theme", m === "auto" ? null : m);
    },
    effective: function () { return html.getAttribute("data-theme") || (media && media.matches ? "dark" : "light"); }
  };

  /* ---------- Where the visitor is, from device settings ---------- */
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  // Exact time zone first, then the longest matching "Area/" prefix.
  function byZone(table) {
    if (Object.prototype.hasOwnProperty.call(table, tz)) return table[tz];
    var best = "", hit = "";
    Object.keys(table).forEach(function (k) {
      if (k.charAt(k.length - 1) === "/" && tz.indexOf(k) === 0 && k.length > best.length) { best = k; hit = table[k]; }
    });
    return hit;
  }
  var langTag = "";
  try { langTag = (navigator.languages && navigator.languages[0]) || navigator.language || ""; } catch (e) {}
  var parts = String(langTag).split("-");
  var LANG = (parts[0] || "en").toLowerCase();
  if (LANG === "no") LANG = "nb"; // plain Norwegian: Bokmål
  if (!/^[a-z]{2,3}$/.test(LANG)) LANG = "en";
  var langRegion = "";
  for (var p = 1; p < parts.length; p++) if (/^[A-Za-z]{2}$/.test(parts[p])) { langRegion = parts[p].toUpperCase(); break; }
  // The time zone says where the device is set to live; the language region is the fallback.
  var COUNTRY = byZone(D.timeZones) || langRegion;
  var southern = D.southern.some(function (z) { return z.charAt(z.length - 1) === "/" ? tz.indexOf(z) === 0 : tz === z; });

  /* ---------- Schemes ---------- */
  var byId = {};
  // Copies, so names can be translated without touching the frozen data.
  var SCHEMES = D.schemes.map(function (s) {
    var c = {}; for (var k in s) c[k] = s[k];
    byId[c.id] = c; return c;
  });
  function expand(list) {
    var out = [];
    (list || []).forEach(function (c) { out = out.concat(D.regions[c] || [c]); });
    return out;
  }
  SCHEMES.forEach(function (s) { if (s.where) s.countries = expand(s.where); });
  // Is this holiday celebrated where the visitor is (or by speakers of their language)?
  function applies(s) {
    if (s.group !== "holiday" || !s.countries) return true;
    return s.countries.indexOf(COUNTRY) !== -1 || (s.langs || []).indexOf(LANG) !== -1;
  }

  /* ---------- Dates ---------- */
  function day(y, m, d) { return new Date(y, m - 1, d); }
  function add(date, n) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); }
  function easter(y) { // Western, anonymous Gregorian algorithm
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return day(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
  }
  function orthodoxEaster(y) { // Julian computus, +13 days (1900-2099)
    var a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    return add(day(y, Math.floor((d + e + 114) / 31), ((d + e + 114) % 31) + 1), 13);
  }
  function nth(y, m, wd, n) {
    if (n < 0) { var last = day(y, m + 1, 0); return add(last, -((last.getDay() - wd + 7) % 7)); }
    var first = day(y, m, 1); return add(first, ((wd - first.getDay() + 7) % 7) + 7 * (n - 1));
  }
  function span(d, from, to) { return [add(d, from), add(d, to)]; }
  // Every window a rule gives for year y, as [first day, last day].
  function windows(rule, y) {
    switch (rule[0]) {
      case "d": return [[day(y, rule[1], rule[2]), day(rule[3] > 12 ? y + 1 : y, rule[3] > 12 ? rule[3] - 12 : rule[3], rule[4])]];
      case "n": return [span(nth(y, rule[1], rule[2], rule[3]), rule[4], rule[5])];
      case "b": var b = day(y, rule[1], rule[2]); return [span(add(b, -((b.getDay() - rule[3] + 7) % 7)), rule[4], rule[5])];
      case "a": var a = day(y, rule[1], rule[2]); return [span(add(a, (rule[3] - a.getDay() + 7) % 7), rule[4], rule[5])];
      case "k": var k = day(y, rule[1], rule[2]); return [span(k.getDay() === 0 ? add(k, -1) : k, rule[3], rule[4])];
      case "e": return [span(D.orthodox.indexOf(COUNTRY) !== -1 ? orthodoxEaster(y) : easter(y), rule[1], rule[2])];
      case "w": return [span(easter(y), rule[1], rule[2])];
      case "t":
        var v = (D.tables[rule[1]] || {})[y];
        return (Array.isArray(v) ? v : v ? [v] : []).map(function (md) {
          return span(day(y, +md.slice(0, 2), +md.slice(3)), rule[2], rule[3]);
        });
    }
    return [];
  }

  // The holiday showing on a date. A pinned rule wins outright; otherwise the
  // holiday celebrated in fewer countries wins (a national day over a
  // widespread one), then the shorter window.
  function holiday(date) {
    var today = day(date.getFullYear(), date.getMonth() + 1, date.getDate()).getTime();
    var best = null, bestPin = false, bestReach = Infinity, bestLen = Infinity;
    SCHEMES.forEach(function (s) {
      if (s.group !== "holiday" || !applies(s)) return;
      var reach = s.countries ? s.countries.length : 1000;
      s.when.forEach(function (w) {
        var rule = Array.isArray(w) ? w : w.r;
        if (!Array.isArray(w) && ((w["in"] && w["in"].indexOf(COUNTRY) === -1) || (w.out && w.out.indexOf(COUNTRY) !== -1))) return;
        var pin = rule[rule.length - 1] === "pin";
        [date.getFullYear() - 1, date.getFullYear()].forEach(function (y) {
          windows(rule, y).forEach(function (win) {
            if (today < win[0].getTime() || today > win[1].getTime()) return;
            var len = win[1] - win[0];
            var better = pin !== bestPin ? pin
              : reach !== bestReach ? reach < bestReach
              : len < bestLen;
            if (better) { best = s; bestPin = pin; bestReach = reach; bestLen = len; }
          });
        });
      });
    });
    return best;
  }
  function season(date) {
    var m = date.getMonth(); // meteorological seasons
    var n = m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";
    return southern ? { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" }[n] : n;
  }
  function resolveAuto(date) { date = date || new Date(); return holiday(date) || byId[season(date)]; }

  /* ---------- Applying a scheme ---------- */
  function tint(hex, amount) { // blend toward white for dark mode
    var n = parseInt(hex.slice(1), 16);
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(function (c) {
      return Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
    }).join("");
  }
  function apply(id) {
    var chosen = byId[id] || byId.auto;
    var s = chosen.id === "auto" ? resolveAuto() : chosen;
    var st = html.style;
    if (s.color) {
      st.setProperty("--scheme-primary", s.color);
      st.setProperty("--scheme-primary-dark", tint(s.color, 0.25));
      st.setProperty("--scheme-link", s.color);
      st.setProperty("--scheme-link-dark", tint(s.color, 0.5));
    } else {
      ["--scheme-primary", "--scheme-primary-dark", "--scheme-link", "--scheme-link-dark"].forEach(function (n) { st.removeProperty(n); });
    }
    html.setAttribute("data-scheme", s.id);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", s.color || DEFAULT_THEME_COLOR);
    return chosen;
  }
  var current = apply(byId[load("scheme")] ? load("scheme") : "auto").id;
  // A page left open past midnight picks up the new day's colors.
  document.addEventListener("visibilitychange", function () { if (!document.hidden && current === "auto") apply("auto"); });

  self.ATC = Object.freeze({
    app: APP, lang: LANG, country: COUNTRY, theme: theme,
    scheme: {
      byId: byId,
      // Schemes the color list shows: base and seasons, plus the visitor's holidays.
      listed: function () { return SCHEMES.filter(applies); },
      current: function () { return current; },
      choose: function (id) {
        current = apply(id).id;
        save("scheme", current === "auto" ? null : current);
        return current;
      },
      resolveAuto: resolveAuto
    }
  });
})();

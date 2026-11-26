/*
 * All Trips Considered: page behavior (loaded with defer).
 * Appearance panel, translations, back to top, Add to Home Screen, copyright year.
 * Builds all UI with DOM APIs and textContent; nothing is inserted as HTML.
 */
(function () {
  "use strict";
  var ATC = self.ATC;
  var S = ATC.scheme, T = ATC.theme;

  /* ---------- Translations ---------- */
  // English labels; a language file replaces any of these it provides.
  var UI = {
    title: "Appearance", mode: "Mode", auto: "Auto", light: "Light", dark: "Dark",
    hintAuto: null, hintLight: "Always light, whatever your device is set to.", hintDark: "Always dark, whatever your device is set to.",
    color: "Color", automatic: "Automatic (default)", now: "Now:", classic: "Classic",
    seasons: "Seasons", holidays: "Holidays", spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter"
  };
  var RTL = ["ar", "fa", "he", "ur", "ps", "ckb"];
  var uiLang = "en";
  function str(v) { return typeof v === "string" && v.length > 0 && v.length <= 120; }
  // Copies only known keys with short string values from untrusted JSON.
  function merge(target, source, allowed) {
    if (!source || typeof source !== "object") return 0;
    var n = 0;
    Object.keys(source).forEach(function (k) {
      if (allowed(k) && str(source[k])) { target[k] = source[k]; n++; }
    });
    return n;
  }
  function applyStrings(data) {
    var names = {}, ui = {};
    var isUi = function (k) { return Object.prototype.hasOwnProperty.call(UI, k); };
    var isId = function (k) { return Object.prototype.hasOwnProperty.call(S.byId, k); };
    merge(names, data.names, isId);
    var uiCount = merge(ui, data.ui, isUi);
    var cc = data.country && data.country[ATC.country];
    if (cc) { merge(names, cc.names, isId); uiCount += merge(ui, cc.ui, isUi); }
    Object.keys(names).forEach(function (id) { S.byId[id].name = names[id]; });
    if (uiCount) { Object.keys(ui).forEach(function (k) { UI[k] = ui[k]; }); uiLang = ATC.lang; }
  }
  function loadStrings() {
    var lang = ATC.lang;
    if (self.ATC_DATA.i18n.indexOf(lang) === -1 || !/^[a-z]{2,3}$/.test(lang) || !self.fetch) return Promise.resolve();
    return fetch("assets/i18n/" + lang + ".json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) applyStrings(data); })
      .catch(function () { /* keep English */ });
  }

  /* ---------- Appearance panel ---------- */
  var button = document.getElementById("appearance-button");
  var panel = document.getElementById("appearance-panel");
  var list = document.getElementById("scheme-list");
  var hint = document.getElementById("mode-hint");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function label(s) {
    if (s.id === "auto") return UI.automatic;
    if (s.id === "classic" || s.group === "season") return UI[s.id];
    return s.name;
  }
  function renderLabels() {
    panel.setAttribute("lang", uiLang);
    if (RTL.indexOf(uiLang) !== -1) panel.setAttribute("dir", "rtl"); else panel.removeAttribute("dir");
    document.getElementById("appearance-title").textContent = UI.title;
    var legends = panel.querySelectorAll(".appearance-group legend");
    legends[0].textContent = UI.mode;
    legends[1].textContent = UI.color;
    ["auto", "light", "dark"].forEach(function (m) {
      panel.querySelector('input[name="mode"][value="' + m + '"] + span').textContent = UI[m];
    });
    button.setAttribute("aria-label", UI.title);
    button.setAttribute("title", UI.title);
  }
  function renderList() {
    list.textContent = "";
    var group = "base";
    S.listed().forEach(function (s) {
      if (s.group !== group) {
        group = s.group;
        list.appendChild(el("p", "scheme-subhead", group === "season" ? UI.seasons : UI.holidays));
      }
      var row = el("label", "scheme-option");
      var input = el("input");
      input.type = "radio"; input.name = "scheme"; input.value = s.id;
      var name = el("span", "scheme-name", label(s));
      if (s.id === "auto") {
        var now = S.resolveAuto();
        name.appendChild(el("small", "scheme-now", UI.now + (/：$/.test(UI.now) ? "" : " ") + label(now)));
      }
      var swatch = el("span", "scheme-swatch");
      swatch.setAttribute("aria-hidden", "true");
      var stripe = s.id === "auto" ? S.resolveAuto().stripe : s.stripe;
      (stripe || []).forEach(function (c) {
        var i = el("i");
        i.style.width = (27 / stripe.length) + "px";
        i.style.background = c;
        swatch.appendChild(i);
      });
      var flag = el("span", "scheme-flag", s.icon);
      flag.setAttribute("aria-hidden", "true");
      var check = el("span", "scheme-check", "✓");
      check.setAttribute("aria-hidden", "true");
      row.append(input, flag, name, swatch, check);
      list.appendChild(row);
    });
  }
  function sync() {
    var m = T.get();
    panel.querySelectorAll('input[name="mode"]').forEach(function (r) { r.checked = r.value === m; });
    var c = S.current();
    list.querySelectorAll('input[name="scheme"]').forEach(function (r) { r.checked = r.value === c; });
    hint.textContent = m === "auto"
      ? (UI.hintAuto || "Follows your device, which is set to " + T.effective() + " right now.")
      : m === "light" ? UI.hintLight : UI.hintDark;
  }
  function render() { renderLabels(); renderList(); sync(); }

  panel.addEventListener("change", function (e) {
    if (e.target.name === "mode") T.set(e.target.value);
    if (e.target.name === "scheme") S.choose(e.target.value);
    sync();
  });
  if (T.media && T.media.addEventListener) T.media.addEventListener("change", sync);
  function open() {
    sync();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    var checked = panel.querySelector('input[name="mode"]:checked');
    if (checked) checked.focus();
  }
  function close(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (returnFocus) button.focus();
  }
  button.addEventListener("click", function () { if (panel.hidden) open(); else close(true); });
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); close(true); } });
  document.addEventListener("click", function (e) { if (!panel.hidden && !panel.parentNode.contains(e.target)) close(false); });
  panel.addEventListener("focusout", function (e) { if (e.relatedTarget && !panel.parentNode.contains(e.relatedTarget)) close(false); });

  render();
  loadStrings().then(render);

  /* ---------- Back to top ---------- */
  var top = document.getElementById("back-to-top");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function toggleTop() { top.hidden = window.scrollY < 400; }
  window.addEventListener("scroll", toggleTop, { passive: true });
  toggleTop();
  top.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    document.getElementById("page-title").focus({ preventScroll: true });
  });

  /* ---------- Add to Home Screen ---------- */
  (function () {
    var KEY = ATC.app + "-install-dismissed";
    var banner = document.getElementById("install-banner");
    var accept = document.getElementById("install-accept");
    var instructions = document.getElementById("install-instructions");
    var deferred = null;
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    var dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (standalone || dismissed) return;
    function setHeight() { document.body.style.setProperty("--install-banner-height", banner.offsetHeight + "px"); }
    function show() { banner.hidden = false; document.body.classList.add("has-install-banner"); setHeight(); }
    function hide(remember) {
      banner.hidden = true;
      document.body.classList.remove("has-install-banner");
      if (remember) { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
    }
    var ua = navigator.userAgent;
    var iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) show();
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      instructions.textContent = "Open it like an app, straight from your Home Screen.";
      accept.hidden = false;
      show();
    });
    accept.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; hide(true); });
    });
    document.getElementById("install-dismiss").addEventListener("click", function () { hide(true); });
    window.addEventListener("appinstalled", function () { hide(true); });
    window.addEventListener("resize", function () { if (!banner.hidden) setHeight(); });
  })();

  /* ---------- Copyright year ---------- */
  document.getElementById("copyright-year").textContent = String(new Date().getFullYear());
})();

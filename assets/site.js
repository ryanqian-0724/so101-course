/* Shared behaviour for every page: navigation rail, progress, tabs, quizzes, copy buttons, glossary popovers. */
(function () {
  "use strict";

  var CHAPTERS = [
    { part: "Start here" },
    { id: "big-picture", file: "big-picture.html", title: "The big picture", kind: "think" },
    { id: "robot-basics", file: "robot-basics.html", title: "How a robot arm works", kind: "think" },
    { part: "Get ready" },
    { id: "kit", file: "kit.html", title: "What is in your kit", kind: "do" },
    { id: "setup", file: "setup.html", title: "Set up your computer", kind: "do" },
    { part: "Build" },
    { id: "motors", file: "motors.html", title: "Give every motor an ID", kind: "do" },
    { id: "assembly", file: "assembly.html", title: "Assemble the arms", kind: "do" },
    { id: "calibrate", file: "calibrate.html", title: "Calibrate", kind: "do" },
    { id: "teleop", file: "teleop.html", title: "Teleoperate and add cameras", kind: "do" },
    { part: "Teach the robot" },
    { id: "learning", file: "learning.html", title: "How machines learn", kind: "think" },
    { id: "imitation", file: "imitation.html", title: "Policies, imitation and ACT", kind: "think" },
    { id: "record", file: "record.html", title: "Record a dataset", kind: "do" },
    { id: "train", file: "train.html", title: "Train your first policy", kind: "do" },
    { id: "evaluate", file: "evaluate.html", title: "Let the robot act", kind: "do" },
    { part: "Go further" },
    { id: "frontier", file: "frontier.html", title: "Diffusion, VLAs and world models", kind: "think" },
    { part: "Reference" },
    { id: "troubleshooting", file: "troubleshooting.html", title: "Troubleshooting", kind: "ref" },
    { id: "glossary", file: "glossary.html", title: "Glossary", kind: "ref" },
    { id: "sources", file: "sources.html", title: "Sources and links", kind: "ref" }
  ];
  var PAGES = CHAPTERS.filter(function (c) { return c.id; });
  var COUNTED = PAGES.filter(function (c) { return c.kind !== "ref"; });
  window.SO101_CHAPTERS = CHAPTERS;

  /* ---------- storage (always optional) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("so101." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("so101." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  window.SO101_STORE = store;

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  var pageId = document.body.getAttribute("data-page") || "home";
  var done = store.get("done", []);

  /* ---------- theme ---------- */
  var theme = store.get("theme", null);
  if (theme) document.documentElement.setAttribute("data-theme", theme);

  /* ---------- top bar + rail ---------- */
  var main = document.querySelector("main");
  var topbar = el("header", { "class": "topbar" });
  topbar.innerHTML =
    '<button class="iconbtn" id="menuBtn" aria-label="Open chapter list" aria-expanded="false">☰</button>' +
    '<a class="brand" href="index.html">SO-101 <b>from zero</b></a><span class="spacer"></span>' +
    '<span class="meter" title="Chapters you have marked as finished"><span class="bar"><i></i></span><span class="txt"></span></span>' +
    '<button class="iconbtn" id="themeBtn" aria-label="Switch between light and dark">◐</button>';
  var shell = el("div", { "class": "shell" });
  var rail = el("nav", { "class": "rail", "aria-label": "Chapters" });
  var n = 0, html = "";
  CHAPTERS.forEach(function (c) {
    if (c.part) { html += "<h4>" + c.part + "</h4>"; return; }
    var num = c.kind === "ref" ? "·" : String(++n);
    html += '<a href="' + c.file + '" data-id="' + c.id + '"' + (c.id === pageId ? ' aria-current="page"' : "") +
      '><span class="n">' + num + "</span><span>" + c.title + '</span><span class="tick" aria-hidden="true">✓</span></a>';
    c.num = num;
  });
  rail.innerHTML = html;
  document.body.insertBefore(topbar, document.body.firstChild);
  main.parentNode.insertBefore(shell, main);
  shell.appendChild(rail);
  shell.appendChild(main);

  function paintProgress() {
    rail.querySelectorAll("a").forEach(function (a) { a.classList.toggle("done", done.indexOf(a.getAttribute("data-id")) >= 0); });
    var k = COUNTED.filter(function (c) { return done.indexOf(c.id) >= 0; }).length;
    topbar.querySelector(".bar i").style.width = (100 * k / COUNTED.length) + "%";
    topbar.querySelector(".txt").textContent = k + " / " + COUNTED.length + " done";
    document.querySelectorAll(".roadmap a[data-id]").forEach(function (a) { a.classList.toggle("done", done.indexOf(a.getAttribute("data-id")) >= 0); });
  }

  document.getElementById("menuBtn").addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    this.setAttribute("aria-expanded", open ? "true" : "false");
  });
  main.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  document.getElementById("themeBtn").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.set("theme", next);
    document.dispatchEvent(new Event("so101-theme"));
  });

  /* ---------- home roadmap ---------- */
  var road = document.getElementById("roadmap");
  if (road) {
    var blurbs = window.SO101_BLURBS || {};
    var out = "";
    PAGES.forEach(function (c) {
      var label = c.kind === "do" ? "Hands-on" : c.kind === "think" ? "Ideas" : "Reference";
      out += '<li><a href="' + c.file + '" data-id="' + c.id + '"><span class="n">' + c.num + "</span><span><b>" + c.title +
        '</b><span class="small">' + (blurbs[c.id] || "") + '</span></span><span class="kind ' + c.kind + '">' + label + "</span></a></li>";
    });
    road.innerHTML = out;
  }

  /* ---------- chapter footer: done checkbox + pager ---------- */
  var idx = PAGES.findIndex(function (c) { return c.id === pageId; });
  var col = document.querySelector("main .col");
  if (idx >= 0 && col) {
    if (PAGES[idx].kind !== "ref") {
      var row = el("div", { "class": "done-row" });
      row.innerHTML = '<input type="checkbox" id="chapterDone"><label for="chapterDone">I have finished this chapter</label>';
      col.appendChild(row);
      var cb = row.querySelector("input");
      cb.checked = done.indexOf(pageId) >= 0;
      row.classList.toggle("is-done", cb.checked);
      cb.addEventListener("change", function () {
        done = done.filter(function (d) { return d !== pageId; });
        if (cb.checked) done.push(pageId);
        store.set("done", done);
        row.classList.toggle("is-done", cb.checked);
        paintProgress();
      });
    }
    var pager = el("div", { "class": "pager" });
    var prev = PAGES[idx - 1], next = PAGES[idx + 1];
    pager.innerHTML =
      (prev ? '<a href="' + prev.file + '"><small>← Previous</small><b>' + prev.title + "</b></a>" : '<a href="index.html"><small>← Back to</small><b>Start page</b></a>') +
      (next ? '<a class="next" href="' + next.file + '"><small>Next →</small><b>' + next.title + "</b></a>" : "");
    col.appendChild(pager);
  }
  paintProgress();

  /* ---------- copy buttons ---------- */
  document.querySelectorAll("pre:not(.out):not(.nocopy)").forEach(function (pre) {
    var b = el("button", { "class": "copy", type: "button" }, "Copy");
    b.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      var text = code.innerText.replace(/\n$/, "");
      function ok() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1400); }
      function fallback() {
        var r = document.createRange(); r.selectNodeContents(code);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        b.textContent = "Selected — press Ctrl+C";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    });
    pre.insertBefore(b, pre.firstChild);
  });

  /* ---------- tabs (synchronised by group, remembered) ---------- */
  var tabGroups = {};
  document.querySelectorAll(".tabs").forEach(function (box, bi) {
    var group = box.getAttribute("data-group") || ("solo" + bi);
    var secs = Array.prototype.filter.call(box.children, function (c) { return c.tagName === "SECTION"; });
    var list = el("div", { "class": "tablist", role: "tablist" });
    secs.forEach(function (s) {
      var b = el("button", { type: "button", role: "tab" }, s.getAttribute("data-label"));
      b.addEventListener("click", function () { pick(group, s.getAttribute("data-label"), true); });
      list.appendChild(b);
    });
    box.insertBefore(list, box.firstChild);
    (tabGroups[group] = tabGroups[group] || []).push({ secs: secs, btns: list.children });
  });
  function pick(group, label, save) {
    (tabGroups[group] || []).forEach(function (t) {
      /* "macOS / Linux" and "Linux" count as the same choice, so two-tab and three-tab boxes stay in sync */
      var hit = t.secs.filter(function (s) {
        var a = s.getAttribute("data-label");
        return label && (a === label || a.indexOf(label) >= 0 || label.indexOf(a) >= 0);
      })[0] || t.secs[0];
      var use = hit.getAttribute("data-label");
      t.secs.forEach(function (s, i) {
        var on = s.getAttribute("data-label") === use;
        s.hidden = !on;
        t.btns[i].setAttribute("aria-selected", on ? "true" : "false");
      });
    });
    if (save) store.set("tab." + group, label);
  }
  function guessOS() {
    var p = (navigator.userAgent || "") + (navigator.platform || "");
    return /Mac/i.test(p) ? "macOS" : /Linux|X11/i.test(p) && !/Android/i.test(p) ? "Linux" : "Windows";
  }
  Object.keys(tabGroups).forEach(function (g) {
    pick(g, store.get("tab." + g, g === "os" ? guessOS() : null), false);
  });

  /* ---------- persistent checklists ---------- */
  var checks = store.get("checks", {});
  document.querySelectorAll(".checks input[type=checkbox]").forEach(function (c, i) {
    var key = pageId + ":" + (c.getAttribute("data-key") || i);
    c.id = c.id || ("chk-" + pageId + "-" + i);
    c.checked = !!checks[key];
    c.addEventListener("change", function () { checks[key] = c.checked; store.set("checks", checks); });
  });

  /* ---------- quizzes ----------
     <div class="quiz"><p class="q">…</p><div class="opts">
       <button data-ok data-fb="why right">…</button><button data-fb="why wrong">…</button></div></div> */
  document.querySelectorAll(".quiz").forEach(function (q) {
    q.insertBefore(el("span", { "class": "tag" }, "Check yourself"), q.firstChild);
    var fb = el("p", { "class": "fb", "aria-live": "polite" });
    fb.hidden = true;
    q.appendChild(fb);
    q.querySelectorAll(".opts button").forEach(function (b) {
      b.type = "button";
      b.addEventListener("click", function () {
        var ok = b.hasAttribute("data-ok");
        q.querySelectorAll(".opts button").forEach(function (o) { o.classList.remove("wrong"); });
        b.classList.add(ok ? "right" : "wrong");
        fb.hidden = false;
        fb.innerHTML = (ok ? "<b>Right.</b> " : "<b>Not quite.</b> ") + (b.getAttribute("data-fb") || "");
      });
    });
  });

  /* ---------- command dissector ----------
     <div class="dissect"><div class="line"><span class="part" data-info="…">lerobot-record</span> …</div></div> */
  document.querySelectorAll(".dissect").forEach(function (d) {
    var info = el("div", { "class": "info", "aria-live": "polite" }, "Click any underlined part of the command to see what it does and why it is there.");
    d.appendChild(info);
    d.querySelectorAll(".part").forEach(function (p) {
      p.tabIndex = 0;
      p.setAttribute("role", "button");
      function show() {
        d.querySelectorAll(".part").forEach(function (o) { o.classList.remove("on"); });
        p.classList.add("on");
        info.innerHTML = "<b>" + p.textContent.replace(/</g, "&lt;") + "</b><br>" + p.getAttribute("data-info");
      }
      p.addEventListener("click", show);
      p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
    });
  });

  /* ---------- glossary popovers: <dfn data-g="policy">policy</dfn> ---------- */
  var G = window.SO101_GLOSSARY || {};
  var pop = null;
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(d) {
    var key = d.getAttribute("data-g") || d.textContent.trim().toLowerCase();
    var entry = G[key];
    if (!entry) return;
    hidePop();
    pop = el("div", { id: "gpop", role: "tooltip" }, "<b>" + entry.t + "</b>" + entry.d);
    document.body.appendChild(pop);
    var r = d.getBoundingClientRect();
    var left = Math.max(12, Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 12));
    pop.style.left = left + "px";
    pop.style.top = (r.bottom + window.scrollY + 8) + "px";
  }
  document.querySelectorAll("dfn").forEach(function (d) {
    d.tabIndex = 0;
    d.addEventListener("mouseenter", function () { showPop(d); });
    d.addEventListener("mouseleave", hidePop);
    d.addEventListener("focus", function () { showPop(d); });
    d.addEventListener("blur", hidePop);
    d.addEventListener("click", function (e) { e.stopPropagation(); showPop(d); });
  });
  document.addEventListener("click", hidePop);

  /* ---------- glossary page ---------- */
  var gl = document.getElementById("glossaryList");
  if (gl) {
    var keys = Object.keys(G).sort(function (a, b) { return G[a].t.toLowerCase() < G[b].t.toLowerCase() ? -1 : 1; });
    function render(f) {
      gl.innerHTML = keys.filter(function (k) { return !f || (G[k].t + " " + G[k].d).toLowerCase().indexOf(f) >= 0; })
        .map(function (k) { return '<div class="box" id="g-' + k.replace(/[^a-z0-9]+/g, "-") + '"><b>' + G[k].t + "</b><p>" + G[k].d + "</p></div>"; }).join("") ||
        "<p>No term matches. Try a shorter word.</p>";
    }
    render("");
    var gs = document.getElementById("glossarySearch");
    if (gs) gs.addEventListener("input", function () { render(gs.value.trim().toLowerCase()); });
  }
})();

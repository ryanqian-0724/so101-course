/* Interactive demos. Each one mounts on <div class="widget" data-widget="NAME">.
   All demos are simplified simulations built to show one idea; their numbers are illustrative, not measurements. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function tok(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888"; }
  function C() {
    return { bg: tok("--surface"), ink: tok("--ink"), muted: tok("--muted"), line: tok("--line"), accent: tok("--accent"),
      leader: tok("--leader"), follower: tok("--follower"), good: tok("--good"), bad: tok("--bad"), bench: tok("--bench"), warn: tok("--warn"),
      font: getComputedStyle(document.body).fontFamily };
  }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  var uid = 0;

  function host(el) {
    var hst = document.createElement("div");
    el.insertBefore(hst, el.querySelector(".caption"));
    return hst;
  }
  function stage(parent, aspect, draw) {
    var cv = document.createElement("canvas");
    cv.setAttribute("role", "img");
    parent.appendChild(cv);
    var ctx = cv.getContext("2d");
    var st = { cv: cv, ctx: ctx, w: 0, h: 0 };
    function fit() {
      var w = cv.clientWidth || 600;
      if (w !== st.w) {
        var hh = Math.round(w * (typeof aspect === "function" ? aspect(w) : aspect));
        var d = window.devicePixelRatio || 1;
        cv.width = Math.round(w * d); cv.height = Math.round(hh * d); cv.style.height = hh + "px";
        ctx.setTransform(d, 0, 0, d, 0, 0); st.w = w; st.h = hh;
      }
      draw();
    }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(cv); else window.addEventListener("resize", fit);
    document.addEventListener("so101-theme", draw);
    if (window.matchMedia) { var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", draw); }
    requestAnimationFrame(fit);
    return st;
  }
  function controls(parent) { var c = document.createElement("div"); c.className = "controls"; parent.appendChild(c); return c; }
  function slider(ctrls, name, min, max, val, step, fmt, on) {
    var id = "w" + (++uid);
    var lab = document.createElement("label"); lab.setAttribute("for", id);
    var top = document.createElement("span"); top.innerHTML = name + " <b></b>";
    var inp = document.createElement("input"); inp.type = "range"; inp.id = id; inp.min = min; inp.max = max; inp.step = step || 1; inp.value = val;
    lab.appendChild(top); lab.appendChild(inp); ctrls.appendChild(lab);
    var b = top.querySelector("b");
    inp.show = function () { b.textContent = fmt ? fmt(+inp.value) : inp.value; };
    inp.show();
    inp.addEventListener("input", function () { inp.show(); if (on) on(+inp.value); });
    return inp;
  }
  function button(ctrls, text, on, ghost) {
    var b = document.createElement("button"); b.type = "button"; b.className = "btn" + (ghost ? " ghost" : ""); b.textContent = text;
    b.addEventListener("click", on); ctrls.appendChild(b); return b;
  }
  function seg(ctrls, opts, cur, on) {
    var s = document.createElement("div"); s.className = "seg"; s.setAttribute("role", "group");
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = o[1];
      b.setAttribute("aria-pressed", o[0] === cur ? "true" : "false");
      b.addEventListener("click", function () {
        s.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); on(o[0]);
      });
      s.appendChild(b);
    });
    ctrls.appendChild(s); return s;
  }
  function readout(parent) { var r = document.createElement("div"); r.className = "readout"; parent.appendChild(r); return r; }
  function animate(el, step) {
    var on = false, last = 0, raf = 0;
    function f(t) { if (!on) return; var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; step(dt); raf = requestAnimationFrame(f); }
    function start() { if (on) return; on = true; last = 0; raf = requestAnimationFrame(f); }
    function stop() { on = false; cancelAnimationFrame(raf); }
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }).observe(el);
    else start();
    return { start: start, stop: stop };
  }
  function text(ctx, c, s, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || c.muted;
    ctx.font = (o.weight || 500) + " " + (o.size || 12) + "px " + c.font;
    ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function f1(v) { return (v >= 0 ? " " : "") + v.toFixed(1); }

  /* ---------- the arm drawing (side view, proportions approximate) ---------- */
  var LINK = [1.16, 1.35, 0.62], JAW = 0.42, REACH = 3.0;
  function dir(deg) { var r = deg * Math.PI / 180; return [Math.sin(r), -Math.cos(r)]; }
  function armPts(x, y, s, a) {
    var p0 = [x, y], a1 = a.lift, d = dir(a1);
    var p1 = [p0[0] + LINK[0] * s * d[0], p0[1] + LINK[0] * s * d[1]];
    var a2 = a1 + a.elbow; d = dir(a2);
    var p2 = [p1[0] + LINK[1] * s * d[0], p1[1] + LINK[1] * s * d[1]];
    var a3 = a2 + a.wrist; d = dir(a3);
    var p3 = [p2[0] + LINK[2] * s * d[0], p2[1] + LINK[2] * s * d[1]];
    return { p: [p0, p1, p2, p3], a3: a3, tip: [p3[0] + d[0] * JAW * s, p3[1] + d[1] * JAW * s] };
  }
  function drawArm(ctx, color, jointColor, x, y, s, a, o) {
    o = o || {};
    var k = armPts(x, y, s, a), P = k.p, i;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (o.dash) ctx.setLineDash([6, 5]);
    if (!o.ghost) { ctx.fillStyle = color; ctx.fillRect(x - 0.38 * s, y, 0.76 * s, 0.3 * s); }
    ctx.strokeStyle = color; ctx.lineWidth = o.ghost ? 2 : Math.max(5, 0.22 * s);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (i = 1; i < 4; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
    var g = (a.grip == null ? 20 : a.grip) / 100, roll = Math.abs(Math.cos((a.roll || 0) * Math.PI / 180));
    var open = (0.1 + 0.36 * g) * s * Math.max(0.2, roll), d = dir(k.a3), n = [-d[1], d[0]], L = JAW * s;
    ctx.lineWidth = o.ghost ? 2 : Math.max(3, 0.1 * s);
    [-1, 1].forEach(function (sg) {
      var bx = P[3][0] + n[0] * open * sg * 0.5, by = P[3][1] + n[1] * open * sg * 0.5;
      ctx.beginPath(); ctx.moveTo(P[3][0], P[3][1]); ctx.lineTo(bx, by); ctx.lineTo(bx + d[0] * L, by + d[1] * L); ctx.stroke();
    });
    if (!o.ghost) {
      ctx.fillStyle = jointColor;
      for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(P[i][0], P[i][1], Math.max(4, 0.12 * s), 0, 7); ctx.fill(); }
    }
    ctx.restore();
    return k;
  }
  function drawPan(ctx, c, x, y, r, deg, color) {
    ctx.save();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    var d = dir(deg);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d[0] * r * 0.85, y + d[1] * r * 0.85); ctx.stroke();
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    ctx.restore();
    text(ctx, c, "top view (pan)", x, y + r + 14, { align: "center", size: 11 });
  }
  function ground(ctx, c, w, y) { ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  function deg2tick(d) { return Math.round(2048 + d * 4096 / 360); }

  var W = {};

  /* =====================================================================
     1. ARM — modes: explore | teleop | calibrate
     ===================================================================== */
  var JOINTS = [
    ["pan", "shoulder_pan", -110, 110, 0],
    ["lift", "shoulder_lift", -100, 100, -10],
    ["elbow", "elbow_flex", -40, 150, 80],
    ["wrist", "wrist_flex", -100, 100, 20],
    ["roll", "wrist_roll", -180, 180, 0],
    ["grip", "gripper", 0, 100, 20]
  ];
  function pose0() { var p = {}; JOINTS.forEach(function (j) { p[j[0]] = j[4]; }); return p; }

  W.arm = function (el) {
    var mode = el.getAttribute("data-mode") || "explore";
    if (mode === "teleop") return armTeleop(el);
    if (mode === "calibrate") return armCalibrate(el);
    var h = host(el), pose = pose0();
    var st = stage(h, function (w) { return w < 520 ? 0.85 : 0.58; }, draw);
    var ctr = controls(h);
    JOINTS.forEach(function (j) {
      slider(ctr, j[1], j[2], j[3], j[4], 1, function (v) { return j[0] === "grip" ? v + " %" : v + "°"; }, function (v) { pose[j[0]] = v; draw(); });
    });
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var gy = hh * 0.8, s = Math.min(hh * 0.66 / REACH, w * 0.62 / REACH), bx = w * 0.36;
      ground(ctx, c, w, gy + 0.3 * s);
      var k = drawArm(ctx, c.follower, c.ink, bx, gy, s, pose);
      drawPan(ctx, c, w - Math.min(60, w * 0.12) - 10, Math.min(60, w * 0.12) + 12, Math.min(48, w * 0.1), pose.pan, c.follower);
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(k.tip[0], k.tip[1], 5, 0, 7); ctx.fill();
      text(ctx, c, "gripper tip", k.tip[0] + 9, k.tip[1] + 4, { color: c.accent, size: 11, weight: 600 });
      var ex = (k.tip[0] - bx) / s * 10, ey = (gy - k.tip[1]) / s * 10;
      var lines = ["joint            angle   raw encoder (0-4095)"];
      JOINTS.forEach(function (j) {
        var v = pose[j[0]];
        lines.push((j[1] + "                ").slice(0, 16) + (j[0] === "grip" ? (v + " %").padStart(6) + "   (opening)" : (v + "°").padStart(6) + "   " + deg2tick(v)));
      });
      lines.push("");
      lines.push("state vector = [" + JOINTS.map(function (j) { return pose[j[0]]; }).join(", ") + "]");
      lines.push("gripper tip ≈ " + ex.toFixed(0) + " cm forward, " + ey.toFixed(0) + " cm up (side view)");
      ro.textContent = lines.join("\n");
    }
  };

  function armTeleop(el) {
    var h = host(el), leader = pose0(), follower = pose0(), goal = pose0();
    var hz = 30, auto = true, tAuto = 0, acc = 0, sends = 0, maxSpeed = 260;
    var st = stage(h, function (w) { return w < 520 ? 0.9 : 0.5; }, draw);
    var ctr = controls(h), sl = {};
    ["lift", "elbow", "wrist", "grip"].forEach(function (key) {
      var j = JOINTS.filter(function (x) { return x[0] === key; })[0];
      sl[key] = slider(ctr, "leader " + j[1], j[2], j[3], j[4], 1, function (v) { return key === "grip" ? v + " %" : v + "°"; },
        function (v) { leader[key] = v; auto = false; autoBtn.textContent = "Wiggle the leader for me"; });
    });
    var hzS = slider(ctr, "control loop rate", 1, 60, hz, 1, function (v) { return v + " Hz (times per second)"; }, function (v) { hz = v; });
    var autoBtn = button(ctr, "Stop wiggling", function () { auto = !auto; autoBtn.textContent = auto ? "Stop wiggling" : "Wiggle the leader for me"; }, true);
    var ro = readout(h);
    animate(el, function (dt) {
      if (auto) {
        tAuto += dt;
        leader.lift = 15 * Math.sin(tAuto * 1.3); leader.elbow = 60 + 25 * Math.sin(tAuto * 0.9 + 1);
        leader.wrist = 10 + 25 * Math.sin(tAuto * 1.7); leader.grip = 50 + 45 * Math.sin(tAuto * 2.1);
        ["lift", "elbow", "wrist", "grip"].forEach(function (k) { sl[k].value = Math.round(leader[k]); sl[k].show(); });
      }
      acc += dt;
      var period = 1 / hz;
      if (acc >= period) { acc = acc % period; Object.keys(leader).forEach(function (k) { goal[k] = leader[k]; }); sends++; }
      Object.keys(follower).forEach(function (k) {
        var e = goal[k] - follower[k], m = maxSpeed * dt;
        follower[k] += clamp(e, -m, m);
      });
      draw();
    });
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var narrow = w < 520;
      var s = narrow ? Math.min(hh * 0.3 / REACH, w * 0.55 / REACH) : Math.min(hh * 0.62 / REACH, w * 0.3 / REACH);
      var L = narrow ? [w * 0.3, hh * 0.42] : [w * 0.14, hh * 0.78], F = narrow ? [w * 0.3, hh * 0.9] : [w * 0.6, hh * 0.78];
      ground(ctx, c, w, L[1] + 0.3 * s); if (narrow) ground(ctx, c, w, F[1] + 0.3 * s);
      drawArm(ctx, c.leader, c.ink, L[0], L[1], s, leader);
      drawArm(ctx, c.ink, c.ink, F[0], F[1], s, goal, { ghost: true, dash: true, alpha: 0.5 });
      drawArm(ctx, c.follower, c.ink, F[0], F[1], s, follower);
      text(ctx, c, "LEADER (you move it)", L[0] - 0.3 * s, L[1] + 0.3 * s + 18, { color: c.leader, weight: 700, size: 12 });
      text(ctx, c, "FOLLOWER (motors move it)", F[0] - 0.3 * s, F[1] + 0.3 * s + 18, { color: c.follower, weight: 700, size: 12 });
      if (!narrow) {
        var ax = w * 0.4, ay = hh * 0.22;
        ctx.strokeStyle = c.muted; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ax - 40, ay); ctx.lineTo(ax + 40, ay); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.muted; ctx.beginPath(); ctx.moveTo(ax + 46, ay); ctx.lineTo(ax + 36, ay - 6); ctx.lineTo(ax + 36, ay + 6); ctx.fill();
        text(ctx, c, "read angles → send as goal", ax, ay - 10, { align: "center", size: 11 });
        text(ctx, c, hz + " times per second", ax, ay + 20, { align: "center", size: 11 });
      }
      var lag = 0; Object.keys(leader).forEach(function (k) { if (k !== "grip") lag = Math.max(lag, Math.abs(leader[k] - follower[k])); });
      ro.textContent =
        "leader reads    [lift " + f1(leader.lift) + ", elbow " + f1(leader.elbow) + ", wrist " + f1(leader.wrist) + ", grip " + f1(leader.grip) + "]\n" +
        "goal sent       [lift " + f1(goal.lift) + ", elbow " + f1(goal.elbow) + ", wrist " + f1(goal.wrist) + ", grip " + f1(goal.grip) + "]   (dashed ghost)\n" +
        "follower is at  [lift " + f1(follower.lift) + ", elbow " + f1(follower.elbow) + ", wrist " + f1(follower.wrist) + ", grip " + f1(follower.grip) + "]\n" +
        "goals sent so far: " + sends + "    biggest gap right now: " + lag.toFixed(1) + "°";
    }
  }

  function armCalibrate(el) {
    var h = host(el), want = { lift: 0, elbow: 70, wrist: 15, grip: 30 }, calibrated = false;
    var OFF = { A: { lift: 14, elbow: -22, wrist: 27, grip: 0 }, B: { lift: -19, elbow: 11, wrist: -16, grip: 0 } };
    var st = stage(h, function (w) { return w < 520 ? 0.95 : 0.5; }, draw);
    var ctr = controls(h);
    ["lift", "elbow", "wrist"].forEach(function (key) {
      var j = JOINTS.filter(function (x) { return x[0] === key; })[0];
      slider(ctr, "command " + j[1], j[2], j[3], want[key], 1, function (v) { return v + "°"; }, function (v) { want[key] = v; draw(); });
    });
    var sg = seg(ctr, [[false, "Not calibrated"], [true, "Calibrated"]], false, function (v) { calibrated = v; draw(); });
    var ro = readout(h);
    function actual(arm) {
      var p = {};
      Object.keys(want).forEach(function (k) { p[k] = want[k] + (calibrated ? 0 : OFF[arm][k]); });
      return p;
    }
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var narrow = w < 520;
      var s = narrow ? Math.min(hh * 0.3 / REACH, w * 0.55 / REACH) : Math.min(hh * 0.62 / REACH, w * 0.3 / REACH);
      var A = narrow ? [w * 0.3, hh * 0.42] : [w * 0.14, hh * 0.78], B = narrow ? [w * 0.3, hh * 0.9] : [w * 0.6, hh * 0.78];
      [["A", A], ["B", B]].forEach(function (q) {
        ground(ctx, c, w, q[1][1] + 0.3 * s);
        drawArm(ctx, c.ink, c.ink, q[1][0], q[1][1], s, want, { ghost: true, dash: true, alpha: 0.45 });
        drawArm(ctx, c.follower, c.ink, q[1][0], q[1][1], s, actual(q[0]));
        text(ctx, c, "Arm " + q[0], q[1][0] - 0.3 * s, q[1][1] + 0.3 * s + 18, { color: c.follower, weight: 700, size: 12 });
      });
      text(ctx, c, "dashed = the pose you asked for", 10, 18, { size: 11 });
      var lines = [calibrated
        ? "CALIBRATED: the software knows where each motor's middle is, and corrects for it."
        : "NOT CALIBRATED: the same command makes the two arms do different things."];
      lines.push("");
      lines.push("Each motor's raw reading when its arm is held in the true middle pose:");
      ["A", "B"].forEach(function (arm) {
        lines.push("  Arm " + arm + ":  lift " + deg2tick(-OFF[arm].lift) + "   elbow " + deg2tick(-OFF[arm].elbow) + "   wrist " + deg2tick(-OFF[arm].wrist) + "    (an ideal motor would read 2048)");
      });
      ro.textContent = lines.join("\n");
    }
  }

  /* =====================================================================
     2. PCONTROL — how a servo chases a target (P and D gains, load)
     ===================================================================== */
  W.pcontrol = function (el) {
    var h = host(el), Kp = 20, Kd = 3, load = false;
    var st = stage(h, function (w) { return w < 520 ? 0.7 : 0.42; }, draw);
    var ctr = controls(h);
    slider(ctr, "P gain (push toward target)", 1, 60, Kp, 1, null, function (v) { Kp = v; draw(); });
    slider(ctr, "D gain (brake on speed)", 0, 20, Kd, 0.5, null, function (v) { Kd = v; draw(); });
    seg(ctr, [[false, "No load"], [true, "Holding a weight"]], false, function (v) { load = v; draw(); });
    var ro = readout(h);
    function target(t) { return t < 0.4 ? 0 : t < 3.2 ? 60 : 20; }
    function sim() {
      var dt = 0.001, x = 0, v = 0, out = [], T = 6;
      for (var t = 0; t <= T; t += dt) {
        var a = 12 * Kp * (target(t) - x) - 3 * Kd * v - (load ? 1500 : 0);
        v += a * dt; x += v * dt;
        if (Math.abs(x) > 1e4) x = Math.sign(x) * 1e4;
        if (Math.round(t / dt) % 10 === 0) out.push([t, x]);
      }
      return out;
    }
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var pl = 40, pr = 12, pt = 14, pb = 28, T = 6, ymin = -20, ymax = 100;
      function X(t) { return pl + (w - pl - pr) * t / T; }
      function Y(v) { return pt + (hh - pt - pb) * (1 - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin)); }
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      for (var g = 0; g <= 100; g += 20) { ctx.beginPath(); ctx.moveTo(pl, Y(g)); ctx.lineTo(w - pr, Y(g)); ctx.stroke(); text(ctx, c, g + "°", pl - 6, Y(g) + 4, { align: "right", size: 10 }); }
      for (var s = 0; s <= 6; s++) text(ctx, c, s + " s", X(s), hh - 8, { align: "center", size: 10 });
      ctx.strokeStyle = c.muted; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath();
      for (var t = 0; t <= T; t += 0.01) { var yy = Y(target(t)); if (t === 0) ctx.moveTo(X(t), yy); else ctx.lineTo(X(t), yy); }
      ctx.stroke(); ctx.setLineDash([]);
      var d = sim();
      ctx.strokeStyle = c.follower; ctx.lineWidth = 2.5; ctx.beginPath();
      d.forEach(function (p, i) { if (i === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1])); });
      ctx.stroke();
      text(ctx, c, "target", X(1.2), Y(60) - 8, { size: 11 });
      text(ctx, c, "motor position", X(4.2), Y(d[Math.min(d.length - 1, 470)][1]) - 10, { color: c.follower, size: 11, weight: 600 });
      var peak = -1e9, end = 0, unstable = false;
      d.forEach(function (p) { if (p[0] > 0.4 && p[0] < 3.2) peak = Math.max(peak, p[1]); if (p[0] > 3.0 && p[0] < 3.2) end = p[1]; if (Math.abs(p[1]) > 500) unstable = true; });
      var over = Math.max(0, peak - 60);
      var verdict = unstable ? "UNSTABLE: the motor shakes harder and harder." :
        over > 15 ? "Overshoots a lot and wobbles: this is the 'jittery arm' you may see." :
        over > 3 ? "Small overshoot, then settles." :
        Math.abs(60 - end) > 4 ? "Stops short of the target." : "Smooth and accurate.";
      ro.textContent = "overshoot past 60°: " + over.toFixed(1) + "°     error after settling: " + (60 - end).toFixed(1) + "°\n" + verdict;
    }
  };

  /* =====================================================================
     3. GRADIENT — learning a line by gradient descent
     ===================================================================== */
  W.gradient = function (el) {
    var h = host(el), r = rng(7), pts = [], wv, bv, lr = 0.5, hist = [], timer = null;
    for (var i = 0; i < 24; i++) { var x = r(); pts.push([x, 0.8 * x + 0.1 + 0.08 * gauss(r)]); }
    function reset() { wv = -0.6; bv = 0.9; hist = [loss()]; stopRun(); draw(); }
    function loss() { var s = 0; pts.forEach(function (p) { var e = wv * p[0] + bv - p[1]; s += e * e; }); return s / pts.length; }
    function step() {
      var gw = 0, gb = 0;
      pts.forEach(function (p) { var e = wv * p[0] + bv - p[1]; gw += 2 * e * p[0]; gb += 2 * e; });
      wv -= lr * gw / pts.length; bv -= lr * gb / pts.length;
      if (!isFinite(wv) || Math.abs(wv) > 1e6) { wv = clamp(wv || 0, -1e6, 1e6); }
      hist.push(loss()); if (hist.length > 200) hist.shift();
      draw();
    }
    function stopRun() { if (timer) { clearInterval(timer); timer = null; runBtn.textContent = "Train 60 steps"; } }
    var st = stage(h, function (w) { return w < 520 ? 1.0 : 0.45; }, draw);
    var ctr = controls(h);
    slider(ctr, "learning rate (step size)", 0.05, 2.2, lr, 0.05, function (v) { return v.toFixed(2); }, function (v) { lr = v; });
    button(ctr, "One step", function () { stopRun(); step(); });
    var runBtn = button(ctr, "Train 60 steps", function () {
      if (timer) return stopRun();
      var n = 0; runBtn.textContent = "Stop";
      timer = setInterval(function () { step(); if (++n >= 60) stopRun(); }, 40);
    });
    button(ctr, "Reset", reset, true);
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w || wv === undefined) return;
      ctx.clearRect(0, 0, w, hh);
      var narrow = w < 520, A, B;
      if (narrow) { A = [36, 10, w - 10, hh * 0.5 - 16]; B = [36, hh * 0.5 + 16, w - 10, hh - 24]; }
      else { A = [36, 10, w * 0.5 - 16, hh - 24]; B = [w * 0.5 + 40, 10, w - 10, hh - 24]; }
      function ax(box, x) { return box[0] + (box[2] - box[0]) * x; }
      function ay(box, y, lo, hi) { return box[3] - (box[3] - box[1]) * (clamp(y, lo, hi) - lo) / (hi - lo); }
      ctx.strokeStyle = c.line; ctx.strokeRect(A[0], A[1], A[2] - A[0], A[3] - A[1]); ctx.strokeRect(B[0], B[1], B[2] - B[0], B[3] - B[1]);
      ctx.fillStyle = c.ink;
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(ax(A, p[0]), ay(A, p[1], -0.2, 1.2), 3.5, 0, 7); ctx.fill(); });
      ctx.save(); ctx.beginPath(); ctx.rect(A[0], A[1], A[2] - A[0], A[3] - A[1]); ctx.clip();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(ax(A, 0), ay(A, bv, -50, 50) * 0 + (A[3] - (A[3] - A[1]) * (bv + 0.2) / 1.4));
      ctx.lineTo(ax(A, 1), A[3] - (A[3] - A[1]) * (wv + bv + 0.2) / 1.4); ctx.stroke(); ctx.restore();
      text(ctx, c, "data + the model's line", A[0] + 6, A[1] + 16, { size: 11 });
      var hi = Math.max(0.05, Math.min(5, Math.max.apply(null, hist.slice(0, 1).concat([0.3]))));
      ctx.strokeStyle = c.bad; ctx.lineWidth = 2.5; ctx.beginPath();
      hist.forEach(function (L, i) { var x = B[0] + (B[2] - B[0]) * i / Math.max(60, hist.length - 1), y = ay(B, L, 0, hi); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
      text(ctx, c, "loss (how wrong) over training steps", B[0] + 6, B[1] + 16, { size: 11 });
      text(ctx, c, "0", B[0] - 6, B[3], { align: "right", size: 10 });
      var L = hist[hist.length - 1];
      ro.textContent = "model: y = " + wv.toFixed(3) + " · x + " + bv.toFixed(3) + "      (the true rule was about y = 0.8 · x + 0.1)\n" +
        "steps: " + (hist.length - 1) + "     loss: " + (isFinite(L) ? L.toFixed(4) : "exploded") +
        (L > hist[0] * 1.5 ? "     ← too-large steps jump past the bottom and get worse" : "");
    }
    reset();
  };

  /* =====================================================================
     4. OVERFIT — polynomial degree vs train/test error
     ===================================================================== */
  W.overfit = function (el) {
    var h = host(el), deg = 3, seed = 3, train, test;
    function truth(x) { return 0.8 * Math.sin(2.6 * x); }
    function makeData() {
      var r = rng(seed); train = []; test = [];
      for (var i = 0; i < 8; i++) { var x = -0.95 + 1.9 * (i + 0.2 + 0.6 * r()) / 8; train.push([x, truth(x) + 0.18 * gauss(r)]); }
      for (i = 0; i < 40; i++) { x = -1 + 2 * r(); test.push([x, truth(x) + 0.18 * gauss(r)]); }
    }
    function fit(d) {
      var n = d + 1, M = [], i, j, k;
      for (i = 0; i < n; i++) { M.push(new Array(n + 1).fill(0)); }
      train.forEach(function (p) {
        for (i = 0; i < n; i++) { for (j = 0; j < n; j++) M[i][j] += Math.pow(p[0], i + j); M[i][n] += Math.pow(p[0], i) * p[1]; }
      });
      for (i = 0; i < n; i++) M[i][i] += 1e-9;
      for (i = 0; i < n; i++) {
        var piv = i; for (k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
        var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
        for (k = i + 1; k < n; k++) { var f = M[k][i] / M[i][i]; for (j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
      }
      var cf = new Array(n).fill(0);
      for (i = n - 1; i >= 0; i--) { var s = M[i][n]; for (j = i + 1; j < n; j++) s -= M[i][j] * cf[j]; cf[i] = s / M[i][i]; }
      return cf;
    }
    function ev(cf, x) { var s = 0; for (var i = cf.length - 1; i >= 0; i--) s = s * x + cf[i]; return s; }
    function mse(cf, set) { var s = 0; set.forEach(function (p) { var e = ev(cf, p[0]) - p[1]; s += e * e; }); return s / set.length; }
    makeData();
    var st = stage(h, function (w) { return w < 520 ? 0.75 : 0.5; }, draw);
    var ctr = controls(h);
    slider(ctr, "model flexibility (polynomial degree)", 0, 7, deg, 1, function (v) { return v + (v === 0 ? " (a flat line)" : v === 1 ? " (a straight line)" : v === 7 ? " (passes through every point)" : ""); }, function (v) { deg = v; draw(); });
    button(ctr, "New random data", function () { seed++; makeData(); draw(); }, true);
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      function X(x) { return 12 + (w - 24) * (x + 1) / 2; }
      function Y(y) { return hh / 2 - (hh / 2 - 12) * clamp(y, -1.8, 1.8) / 1.6; }
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
      ctx.strokeStyle = c.muted; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (var x = -1; x <= 1.001; x += 0.01) { if (x === -1) ctx.moveTo(X(x), Y(truth(x))); else ctx.lineTo(X(x), Y(truth(x))); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
      test.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, 7); ctx.stroke(); });
      ctx.fillStyle = c.ink;
      train.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, 7); ctx.fill(); });
      var cf = fit(deg);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hh); ctx.clip();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.beginPath();
      for (x = -1; x <= 1.001; x += 0.005) { var yy = Y(ev(cf, x)); if (x === -1) ctx.moveTo(X(x), yy); else ctx.lineTo(X(x), yy); }
      ctx.stroke(); ctx.restore();
      text(ctx, c, "● training examples (what the model studies)    ○ new examples (the real test)", 12, hh - 8, { size: 11 });
      var tr = mse(cf, train), te = mse(cf, test);
      var verdict = deg <= 1 ? "UNDERFITTING: too simple to capture the pattern; wrong on both." :
        te > tr * 3 && deg >= 5 ? "OVERFITTING: memorised the training points (tiny training error) but does badly on new ones." :
        "GOOD FIT: captures the pattern and works on new examples too.";
      ro.textContent = "error on training examples: " + tr.toFixed(3) + "\nerror on new examples:      " + te.toFixed(3) + "\n" + verdict;
    }
  };

  /* =====================================================================
     5. DRIFT — compounding errors in behaviour cloning
     ===================================================================== */
  W.drift = function (el) {
    var h = host(el), recovery = false, sigma = 0.004, seed = 11, runs = [];
    var HALF = 0.07;
    function centre(x) { return 0.5 + 0.17 * Math.sin(2 * Math.PI * 1.3 * x + 0.4); }
    function simulate() {
      runs = [];
      var r = rng(seed);
      for (var k = 0; k < 10; k++) {
        var e = 0, pts = [], N = 260, off = false;
        for (var i = 0; i <= N; i++) {
          var x = i / N;
          pts.push([x, centre(x) + e, Math.abs(e) > HALF]);
          if (Math.abs(e) > HALF) off = true;
          var sd = recovery ? sigma : sigma * (1 + 40 * Math.abs(e));
          var corr = recovery ? -0.06 * e : 0;
          e = clamp(e + corr + sd * gauss(r), -0.6, 0.6);
        }
        runs.push({ pts: pts, off: off });
      }
      draw();
    }
    var st = stage(h, function (w) { return w < 520 ? 0.75 : 0.45; }, draw);
    var ctr = controls(h);
    seg(ctr, [[false, "Only perfect demos"], [true, "Demos include recoveries"]], false, function (v) { recovery = v; simulate(); });
    slider(ctr, "policy's small error per step", 1, 10, 4, 1, function (v) { return v === 1 ? "tiny" : v >= 8 ? "large" : String(v); }, function (v) { sigma = v / 1000; simulate(); });
    button(ctr, "Drive 10 more times", function () { seed++; simulate(); }, true);
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      function X(x) { return 10 + (w - 20) * x; }
      function Y(y) { return hh * y; }
      ctx.fillStyle = c.bench; ctx.beginPath();
      for (var x = 0; x <= 1.001; x += 0.01) ctx.lineTo(X(x), Y(centre(x) - HALF));
      for (x = 1; x >= -0.001; x -= 0.01) ctx.lineTo(X(x), Y(centre(x) + HALF));
      ctx.fill();
      ctx.strokeStyle = c.muted; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (x = 0; x <= 1.001; x += 0.01) { if (x === 0) ctx.moveTo(X(x), Y(centre(x))); else ctx.lineTo(X(x), Y(centre(x))); }
      ctx.stroke(); ctx.setLineDash([]);
      var good = 0;
      runs.forEach(function (run) {
        if (!run.off) good++;
        ctx.lineWidth = 2;
        for (var i = 1; i < run.pts.length; i++) {
          var a = run.pts[i - 1], b = run.pts[i];
          ctx.strokeStyle = b[2] ? c.bad : c.follower; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      text(ctx, c, "shaded = situations seen in the demonstrations", 12, 16, { size: 11 });
      ro.textContent = good + " of 10 runs stayed inside the shaded band.\n" + (recovery
        ? "The demos showed how to steer back after a small mistake, so the policy corrects itself."
        : "A small mistake puts the robot somewhere it never saw in training. There it guesses worse, so the mistakes snowball.");
    }
    simulate();
  };

  /* =====================================================================
     6. MODES — why averaging different demos fails
     ===================================================================== */
  function modeScene(w, hh) {
    return { S: [w * 0.08, hh * 0.5], G: [w * 0.92, hh * 0.5], O: [w * 0.5, hh * 0.5], R: Math.min(w, hh) * 0.16 };
  }
  function bez(P0, P1, P2, t) { var u = 1 - t; return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]]; }
  function drawScene(ctx, c, sc) {
    ctx.fillStyle = c.bench; ctx.beginPath(); ctx.arc(sc.O[0], sc.O[1], sc.R, 0, 7); ctx.fill();
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, c, "obstacle", sc.O[0], sc.O[1] + 4, { align: "center", size: 12, weight: 600, color: c.muted });
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(sc.S[0], sc.S[1], 6, 0, 7); ctx.fill();
    text(ctx, c, "start", sc.S[0], sc.S[1] + 22, { align: "center", size: 11 });
    ctx.strokeStyle = c.good; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sc.G[0], sc.G[1], 9, 0, 7); ctx.stroke();
    text(ctx, c, "goal", sc.G[0], sc.G[1] + 24, { align: "center", size: 11 });
  }
  W.modes = function (el) {
    var h = host(el), r = rng(5), demos = [], result = null;
    for (var i = 0; i < 12; i++) demos.push({ side: i % 2 ? 1 : -1, k: 0.85 + 0.35 * r(), j: (r() - 0.5) * 0.15 });
    function path(d, sc, hh) { var cp = [sc.O[0] + d.j * sc.R * 3, sc.O[1] + d.side * hh * 0.62 * d.k]; var out = []; for (var t = 0; t <= 1.0001; t += 0.02) out.push(bez(sc.S, cp, sc.G, t)); return out; }
    var st = stage(h, function (w) { return w < 520 ? 0.8 : 0.5; }, draw);
    var ctr = controls(h);
    button(ctr, "Average all demos", function () { result = "avg"; draw(); });
    button(ctr, "Copy one style of demo", function () { result = "sample"; pick = demos[Math.floor(Math.random() * demos.length)]; draw(); });
    button(ctr, "Clear", function () { result = null; draw(); }, true);
    var pick = demos[0];
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var sc = modeScene(w, hh);
      drawScene(ctx, c, sc);
      ctx.lineWidth = 1.5; ctx.strokeStyle = c.leader; ctx.globalAlpha = 0.45;
      var all = demos.map(function (d) { return path(d, sc, hh); });
      all.forEach(function (p) { ctx.beginPath(); p.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); });
      ctx.globalAlpha = 1;
      var msg = "Thin amber lines: 12 human demonstrations. Half went over the obstacle, half went under. Both are correct.";
      if (result) {
        var P;
        if (result === "avg") { P = all[0].map(function (_, i) { var sx = 0, sy = 0; all.forEach(function (p) { sx += p[i][0]; sy += p[i][1]; }); return [sx / all.length, sy / all.length]; }); }
        else P = path(pick, sc, hh);
        var hit = -1;
        P.forEach(function (q, i) { if (hit < 0 && Math.hypot(q[0] - sc.O[0], q[1] - sc.O[1]) < sc.R) hit = i; });
        var end = hit < 0 ? P.length : hit + 1;
        ctx.strokeStyle = result === "avg" ? c.bad : c.follower; ctx.lineWidth = 4; ctx.beginPath();
        for (var i = 0; i < end; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); }
        ctx.stroke();
        if (hit >= 0) {
          var q = P[hit]; ctx.strokeStyle = c.bad; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(q[0] - 9, q[1] - 9); ctx.lineTo(q[0] + 9, q[1] + 9); ctx.moveTo(q[0] + 9, q[1] - 9); ctx.lineTo(q[0] - 9, q[1] + 9); ctx.stroke();
          msg = "CRASH. The average of 'go over' and 'go under' is 'go straight through'. A model trained only to minimise average error learns exactly this.";
        } else msg = "Reached the goal. A model that learns the whole range of possible demos, and then commits to one of them, avoids the trap. ACT and diffusion policies are built to do this.";
      }
      ro.textContent = msg.replace(/(.{1,92})(\s|$)/g, "$1\n").trim();
    }
  };

  /* =====================================================================
     7. CHUNKING — action chunks and temporal ensembling
     ===================================================================== */
  W.chunking = function (el) {
    var h = host(el), k = 20, ens = false, seed = 2, N = 240;
    function truth(t) { return 40 + 30 * Math.sin(t / 38) + 12 * Math.sin(t / 13 + 1); }
    var st = stage(h, function (w) { return w < 520 ? 0.7 : 0.42; }, draw);
    var ctr = controls(h);
    slider(ctr, "chunk size (actions predicted per look)", 1, 60, k, 1, null, function (v) { k = v; draw(); });
    seg(ctr, [[false, "Play each chunk to the end"], [true, "Temporal ensembling"]], false, function (v) { ens = v; draw(); });
    button(ctr, "New noise", function () { seed++; draw(); }, true);
    var ro = readout(h);
    function predict(r, q) { var bias = 4 * gauss(r), drift = 0.08 * gauss(r), out = []; for (var i = 0; i < k; i++) out.push(truth(q + i) + bias + drift * i + 0.6 * gauss(r)); return out; }
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var r = rng(seed), exec = [], calls = 0, t, i;
      if (!ens) {
        for (t = 0; t < N; t += k) { var p = predict(r, t); calls++; for (i = 0; i < k && t + i < N; i++) exec.push(p[i]); }
      } else {
        var preds = [];
        for (t = 0; t < N; t++) {
          preds.push({ q: t, a: predict(r, t) }); calls++;
          var sw = 0, sv = 0, m = 0.05;
          preds.forEach(function (pp) { var age = t - pp.q; if (age < k) { var idx = preds.length; void idx; } });
          var valid = preds.filter(function (pp) { return t - pp.q < k; });
          valid.forEach(function (pp, j) { var wgt = Math.exp(-m * j); sw += wgt; sv += wgt * pp.a[t - pp.q]; });
          exec.push(sv / sw);
          if (preds.length > k) preds.shift();
        }
      }
      function X(t) { return 8 + (w - 16) * t / (N - 1); }
      function Y(v) { return hh - 20 - (hh - 34) * (v - 0) / 90; }
      ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath();
      for (t = 0; t < N; t++) { if (t) ctx.lineTo(X(t), Y(truth(t))); else ctx.moveTo(X(t), Y(truth(t))); }
      ctx.stroke(); ctx.setLineDash([]);
      if (!ens && k > 1) { ctx.strokeStyle = c.line; ctx.lineWidth = 1; for (t = k; t < N; t += k) { ctx.beginPath(); ctx.moveTo(X(t), 6); ctx.lineTo(X(t), hh - 18); ctx.stroke(); } }
      ctx.strokeStyle = c.follower; ctx.lineWidth = 2.5; ctx.beginPath();
      exec.forEach(function (v, j) { if (j) ctx.lineTo(X(j), Y(v)); else ctx.moveTo(X(j), Y(v)); });
      ctx.stroke();
      text(ctx, c, "dashed: ideal motion     blue: what the robot executes" + (!ens && k > 1 ? "     thin lines: new chunk starts" : ""), 10, 14, { size: 11 });
      var jerk = 0; for (i = 2; i < exec.length; i++) jerk += Math.abs(exec[i] - 2 * exec[i - 1] + exec[i - 2]);
      ro.textContent = "times the network was asked:  " + calls + " (for " + N + " control steps)\n" +
        "jerkiness score:              " + (jerk / exec.length).toFixed(2) + "   (lower is smoother)\n" +
        (ens ? "Ensembling asks every step and averages all the chunks that cover 'now': smooth, but more computing." :
          k === 1 ? "Chunk size 1 = a fresh guess every step: each guess has its own error, so the motion jitters." :
          "Big chunks = few decisions and smooth stretches, but a jump where one chunk hands over to the next.");
    }
  };

  /* =====================================================================
     8. DIFFUSION — denoising a trajectory out of noise
     ===================================================================== */
  W.diffusion = function (el) {
    var h = host(el), N = 26, T = 40, step = 0, pts = [], timer = null, seed = 9;
    var st = stage(h, function (w) { return w < 520 ? 0.8 : 0.5; }, draw);
    function modes(w, hh) {
      var sc = modeScene(w, hh), out = [];
      [-1, 1].forEach(function (side) { var cp = [sc.O[0], sc.O[1] + side * hh * 0.62], m = []; for (var i = 0; i < N; i++) m.push(bez(sc.S, cp, sc.G, i / (N - 1))); out.push(m); });
      return out;
    }
    var rr = rng(seed);
    function noise() { stop(); step = 0; rr = rng(++seed); pts = []; for (var i = 0; i < N; i++) pts.push([rr(), rr()]); draw(); }
    function denoise() {
      if (step >= T || !st.w) return false;
      var M = modes(st.w, st.h), w = st.w, hh = st.h;
      var P = pts.map(function (p) { return [p[0] * w, p[1] * hh]; });
      var d = M.map(function (m) { var s = 0; m.forEach(function (q, i) { s += Math.hypot(q[0] - P[i][0], q[1] - P[i][1]); }); return s; });
      var tgt = M[d[0] < d[1] ? 0 : 1], a = 1 / (T - step), sig = 0.03 * (1 - step / T);
      pts = P.map(function (p, i) {
        var x = p[0] + (tgt[i][0] - p[0]) * a, y = p[1] + (tgt[i][1] - p[1]) * a;
        return [(x / w) + sig * gauss(rr) * (step < T - 1 ? 1 : 0), (y / hh) + sig * gauss(rr) * (step < T - 1 ? 1 : 0)];
      });
      step++; draw(); return true;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    var ctr = controls(h);
    button(ctr, "Start from fresh noise", noise, true);
    button(ctr, "One denoising step", function () { stop(); denoise(); });
    button(ctr, "Denoise all the way", function () { stop(); timer = setInterval(function () { if (!denoise()) stop(); }, 60); });
    var ro = readout(h);
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w || !pts.length) return;
      ctx.clearRect(0, 0, w, hh);
      drawScene(ctx, c, modeScene(w, hh));
      ctx.strokeStyle = c.follower; ctx.lineWidth = 2; ctx.globalAlpha = 0.35 + 0.65 * step / T;
      ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * w, p[1] * hh); else ctx.moveTo(p[0] * w, p[1] * hh); }); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = c.follower;
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * w, p[1] * hh, 3.5, 0, 7); ctx.fill(); });
      ro.textContent = "denoising step " + step + " of " + T + "\n" + (step === 0
        ? "These " + N + " dots are a planned path of positions, but right now they are pure random noise."
        : step < T ? "Each step removes a little noise, nudging the dots toward a path that looks like the demonstrations."
          : "Done: a clean path that goes cleanly around one side. Fresh noise can land on the other side; it never lands on the 'average'.");
    }
    noise();
  };

  /* =====================================================================
     9. EPISODE — what one recorded episode contains
     ===================================================================== */
  W.episode = function (el) {
    var h = host(el), FPS = 30, N = 150, frame = 0, playing = false;
    var KEY = [
      [0.0, 0, -10, 80, 50, 0, 10], [1.0, -25, 30, 45, 55, 0, 75], [1.6, -25, 46, 38, 52, 0, 75], [2.0, -25, 46, 38, 52, 0, 4],
      [2.8, 30, 18, 62, 50, 15, 4], [3.3, 30, 22, 58, 52, 15, 4], [3.6, 30, 22, 58, 52, 15, 75], [4.4, 0, -10, 80, 50, 0, 10], [5.0, 0, -10, 80, 50, 0, 10]
    ];
    function at(t) {
      t = clamp(t, 0, 5);
      for (var i = 1; i < KEY.length; i++) if (t <= KEY[i][0]) {
        var a = KEY[i - 1], b = KEY[i], u = smooth((t - a[0]) / (b[0] - a[0] || 1));
        return [1, 2, 3, 4, 5, 6].map(function (j) { return lerp(a[j], b[j], u); });
      }
      return KEY[KEY.length - 1].slice(1);
    }
    function toPose(v) { return { pan: v[0], lift: v[1], elbow: v[2], wrist: v[3], roll: v[4], grip: v[5] }; }
    var r = rng(4), jit = []; for (var i = 0; i < N * 6; i++) jit.push(0.3 * gauss(r));
    function action(f) { return at(f / FPS); }
    function state(f) { return at(f / FPS - 0.12).map(function (v, j) { return v + jit[f * 6 + j]; }); }
    var st = stage(h, function (w) { return w < 520 ? 0.75 : 0.45; }, draw);
    var ctr = controls(h);
    var fs = slider(ctr, "frame", 0, N - 1, 0, 1, function (v) { return v + " / " + (N - 1) + "  (t = " + (v / FPS).toFixed(2) + " s)"; }, function (v) { frame = v; playing = false; pb.textContent = "Play"; draw(); });
    var pb = button(ctr, "Play", function () { playing = !playing; pb.textContent = playing ? "Pause" : "Play"; if (playing && frame >= N - 1) frame = 0; });
    var ro = readout(h);
    var accT = 0;
    animate(el, function (dt) {
      if (!playing) return;
      accT += dt;
      while (accT > 1 / FPS) { accT -= 1 / FPS; frame++; if (frame >= N - 1) { frame = N - 1; playing = false; pb.textContent = "Play"; break; } }
      fs.value = frame; fs.show(); draw();
    });
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var gy = hh * 0.8, s = Math.min(hh * 0.62 / REACH, w * 0.55 / REACH), bx = w * 0.3;
      ground(ctx, c, w, gy + 0.3 * s);
      var grasp = armPts(bx, gy, s, toPose(at(1.95))).tip, drop = armPts(bx, gy, s, toPose(at(3.55))).tip;
      var cube = 0.32 * s;
      ctx.strokeStyle = c.muted; ctx.lineWidth = 2;
      ctx.strokeRect(drop[0] - cube * 1.1, gy + 0.3 * s - cube * 1.3, cube * 2.2, cube * 1.3);
      text(ctx, c, "box", drop[0], gy + 0.3 * s + 16, { align: "center", size: 11 });
      drawArm(ctx, c.leader, c.leader, bx, gy, s, toPose(action(frame)), { ghost: true, alpha: 0.7 });
      var k = drawArm(ctx, c.follower, c.ink, bx, gy, s, toPose(state(frame)));
      var t = frame / FPS, cx, cy;
      if (t < 2.05) { cx = grasp[0]; cy = gy + 0.3 * s - cube / 2; }
      else if (t < 3.65) { cx = k.tip[0]; cy = k.tip[1]; }
      else { cx = drop[0]; cy = gy + 0.3 * s - cube / 2; }
      ctx.fillStyle = c.bad; ctx.fillRect(cx - cube / 2, cy - cube / 2, cube, cube);
      text(ctx, c, "blue: follower (its angles = observation.state)", 10, 16, { size: 11, color: c.follower, weight: 600 });
      text(ctx, c, "amber outline: leader (its angles = action)", 10, 32, { size: 11, color: c.leader, weight: 600 });
      function vec(v) { return "[" + v.map(function (x) { return x.toFixed(1).padStart(6); }).join(",") + " ]"; }
      ro.textContent =
        "episode_index            0\n" +
        "frame_index              " + frame + "\n" +
        "timestamp                " + t.toFixed(3) + " s\n" +
        "observation.state        " + vec(state(frame)) + "   ← measured follower joints\n" +
        "action                   " + vec(action(frame)) + "   ← leader joints = the command\n" +
        "observation.images.front video frame " + frame + " (stored inside an MP4 file)\n" +
        "task                     \"Pick up the red brick and put it in the box\"\n" +
        "joint order: shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll, gripper";
    }
  };

  /* =====================================================================
     10. WORLDMODEL — imagine outcomes, then act on the best plan
     ===================================================================== */
  W.worldmodel = function (el) {
    var h = host(el), shown = false, acted = null, anim = 0;
    var ANG = [-60, -40, -20, 0, 20, 40, 60];
    var st = stage(h, function (w) { return w < 520 ? 0.8 : 0.5; }, draw);
    var ctr = controls(h);
    button(ctr, "Imagine all 7 pushes", function () { shown = true; acted = null; draw(); });
    button(ctr, "Act on the best one", function () { shown = true; acted = best(); anim = 0; });
    button(ctr, "Reset", function () { shown = false; acted = null; draw(); }, true);
    var ro = readout(h);
    function geo(w, hh) { return { B: [w * 0.2, hh * 0.62], G: [w * 0.74, hh * 0.3], D: Math.min(w * 0.5, hh * 0.9) }; }
    function predicted(g, a) { var r = a * Math.PI / 180; return [g.B[0] + g.D * Math.cos(r), g.B[1] - g.D * Math.sin(r)]; }
    function real(g, a) { var r = (a + 6) * Math.PI / 180, d = g.D * 0.93; return [g.B[0] + d * Math.cos(r), g.B[1] - d * Math.sin(r)]; }
    function best() {
      var g = geo(st.w || 600, st.h || 300), bi = 0, bd = 1e9;
      ANG.forEach(function (a, i) { var p = predicted(g, a), d = Math.hypot(p[0] - g.G[0], p[1] - g.G[1]); if (d < bd) { bd = d; bi = i; } });
      return ANG[bi];
    }
    animate(el, function (dt) { if (acted !== null && anim < 1) { anim = Math.min(1, anim + dt * 0.8); draw(); } });
    function draw() {
      var c = C(), ctx = st.ctx, w = st.w, hh = st.h;
      if (!w) return;
      ctx.clearRect(0, 0, w, hh);
      var g = geo(w, hh), sz = Math.max(14, w * 0.035);
      ctx.strokeStyle = c.good; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.G[0], g.G[1], sz * 0.9, 0, 7); ctx.stroke();
      text(ctx, c, "target spot", g.G[0], g.G[1] - sz - 6, { align: "center", size: 11 });
      var lines = [];
      if (shown) {
        var bestA = best();
        ANG.forEach(function (a) {
          var p = predicted(g, a), isB = a === bestA;
          ctx.strokeStyle = isB ? c.accent : c.muted; ctx.globalAlpha = isB ? 0.9 : 0.4; ctx.lineWidth = isB ? 2.5 : 1.5;
          ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.B[0], g.B[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeRect(p[0] - sz / 2, p[1] - sz / 2, sz, sz);
          ctx.beginPath(); ctx.arc(p[0], p[1], sz * 0.95, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
          lines.push("push at " + String(a).padStart(3) + "°  → imagined miss: " + (Math.hypot(p[0] - g.G[0], p[1] - g.G[1]) / g.D * 30).toFixed(1) + " cm" + (isB ? "   ← best plan" : ""));
        });
      }
      var pos = g.B;
      if (acted !== null) { var rp = real(g, acted); pos = [lerp(g.B[0], rp[0], smooth(anim)), lerp(g.B[1], rp[1], smooth(anim))]; }
      ctx.fillStyle = c.bad; ctx.fillRect(pos[0] - sz / 2, pos[1] - sz / 2, sz, sz);
      text(ctx, c, "block", g.B[0], g.B[1] + sz + 6, { align: "center", size: 11 });
      if (acted !== null && anim >= 1) {
        var rp2 = real(g, acted);
        lines.push("");
        lines.push("Real result: missed by " + (Math.hypot(rp2[0] - g.G[0], rp2[1] - g.G[1]) / g.D * 30).toFixed(1) + " cm. The imagined future was close, but not perfect:");
        lines.push("a world model is only as good as the experience it learned from.");
      }
      ro.textContent = lines.length ? lines.join("\n") : "A world model predicts what will happen if the robot does something.\nPress 'Imagine' to let it try 7 pushes in its head before moving at all.";
    }
  };

  /* ---------- mount ---------- */
  function mount() {
    document.querySelectorAll(".widget[data-widget]").forEach(function (el) {
      var f = W[el.getAttribute("data-widget")];
      if (f) { try { f(el); } catch (e) { console.error("widget failed:", el.getAttribute("data-widget"), e); } }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();

/* Niijima UI: split, Network menu, wipes, stamps, HUD, sounds. Sets window.Niijima. Same code as the Niijima Network design system. */
/* Niijima Network UI — vanilla JS, no dependencies. Exposes window.Niijima. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var counter = 0;

  /* ───────── helpers ───────── */
  function uid(p) { counter += 1; return 'nj-' + p + '-' + counter + '-' + Math.floor(Math.random() * 1e6).toString(36); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function make(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed : hash(String(seed));
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function hostOf(item) { return item.host || ''; }
  function urlOf(item) { return item.url || (item.host ? 'https://' + item.host : '#'); }
  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  function plainClick(e) { return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function focusQuiet(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }

  var ACCENT_FIELD = { makoto: 'var(--thief-red)', sae: 'var(--sae-gold)' };
  /* render silhouettes: [thin outline, offset left, offset right] */
  var SLOT_SHADOWS = {
    makoto: ['var(--makoto-cyan)', 'var(--thief-red)', 'transparent'],
    sae: ['transparent', 'var(--sae-crimson)', 'var(--sae-gold)'],
    none: ['transparent', 'var(--thief-red)', 'var(--paper)']
  };
  function setSlotShadows(el, accent) {
    var v = SLOT_SHADOWS[accent] || SLOT_SHADOWS.none;
    el.style.setProperty('--slot-line', v[0]); el.style.setProperty('--slot-shadow-1', v[1]); el.style.setProperty('--slot-shadow-2', v[2]);
  }

  /* ───────── RansomTitle ───────── */
  var FACES = [
    { family: 'var(--font-ransom-a)', scale: 1.0 },
    { family: 'var(--font-ransom-b)', scale: 0.84 },
    { family: 'var(--font-ransom-c)', scale: 0.82 },
    { family: 'var(--font-ransom-d)', scale: 1.04 },
    { family: 'var(--font-display)', scale: 1.1 }
  ];
  function pct(rand) { return (rand() * 9).toFixed(1) + '%'; }

  function ransom(target, text, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text);
    var rand = rng(opts.seed != null ? opts.seed : text);
    var tiles = opts.tiles || ['paper', 'ink', 'red'];
    var tilt = opts.tilt != null ? opts.tilt : 8;
    target.classList.add('nj-ransom');
    if (opts.size) target.style.setProperty('--nj-ransom-size', typeof opts.size === 'number' ? opts.size + 'px' : opts.size);
    target.textContent = '';
    var sr = make('span', 'nj-sr'); sr.textContent = text; target.appendChild(sr);
    var lastTile = null, lastFace = -1, n = 0;
    text.split(/\s+/).forEach(function (word) {
      if (!word) return;
      var w = make('span', 'nj-ransom__word'); w.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach(function (ch) {
        var f = Math.floor(rand() * FACES.length); if (f === lastFace) f = (f + 1) % FACES.length;
        var t = tiles[Math.floor(rand() * tiles.length)];
        if (t === lastTile && tiles.length > 1) t = tiles[(tiles.indexOf(t) + 1) % tiles.length];
        lastFace = f; lastTile = t;
        var sc = FACES[f].scale * (n === 0 ? (opts.first || 1.2) : 0.9 + rand() * 0.2);
        var tile = make('span', 'nj-ransom__tile t-' + t);
        tile.style.cssText = '--rot:' + ((rand() * 2 - 1) * tilt).toFixed(1) + 'deg;--sc:' + sc.toFixed(3) +
          ';--dy:' + ((rand() * 2 - 1) * 0.06).toFixed(3) + 'em;--d:' + (n * (opts.stagger || 40)) + 'ms';
        var face = make('span', 'nj-ransom__face');
        face.style.cssText = 'font-family:' + FACES[f].family + ';--c1:' + pct(rand) + ';--c2:' + pct(rand) + ';--c3:' + pct(rand) + ';--c4:' + pct(rand);
        face.textContent = ch;
        tile.appendChild(face); w.appendChild(tile); n += 1;
      });
      target.appendChild(w);
    });
    if (opts.animate !== false && !reduced()) restart(target, 'is-in');
    return target;
  }

  /* ───────── PhantomButton / StatusStamp / UptimeHUD markup ───────── */
  function buttonHTML(label, opts) {
    opts = opts || {};
    var cls = 'nj-btn' + (opts.variant ? ' nj-btn--' + opts.variant : '') + (opts.down ? ' nj-btn--down' : '');
    var inner = esc(label) + '<i class="nj-btn__arrow" aria-hidden="true"></i>';
    if (opts.href) return '<a class="' + cls + '" href="' + esc(opts.href) + '"' + (opts.attrs || '') + '>' + inner + '</a>';
    if (opts.span) return '<span class="' + cls + '">' + inner + '</span>';
    return '<button type="button" class="' + cls + '"' + (opts.attrs || '') + '>' + inner + '</button>';
  }
  var STAMPS = { online: 'Online', down: 'Down', pending: 'Pending', maintenance: 'Maintenance', soon: 'Coming soon', locked: 'Locked' };
  var TAGS = { down: 'Down', pending: 'Pending', maintenance: 'Maint', soon: 'Soon', locked: 'Locked' };
  var TRACKED = { online: 1, down: 1, pending: 1, maintenance: 1 };
  function stampHTML(status) {
    if (!STAMPS[status]) return '';
    return '<span class="nj-stamp nj-stamp--' + status + '">' + STAMPS[status] + '</span>';
  }
  function tagHTML(status) {
    return TAGS[status] ? '<span class="nj-menu__lock is-' + status + '">' + TAGS[status] + '</span>' : '';
  }
  function uptimeHTML(up, total, live) {
    return '<span class="nj-uptime-hud__num"><b>' + up + '</b><i>/</i><b>' + total + '</b></span>' +
      '<span class="nj-uptime-hud__lbl">Online</span>' +
      '<span class="nj-uptime-hud__src' + (live ? ' is-live' : '') + '">' + (live === 'ping' ? 'Ping' : live ? 'Live' : 'Config') + '</span>';
  }

  /* ───────── Sound: named UI cues, files supplied by the site (e.g. your own P5R rips) ───────── */
  var sfx = (function () {
    var bank = {}, vol = 0.6, muted = false;
    try { muted = window.localStorage.getItem('nj-muted') === '1'; } catch (e) { /* storage blocked */ }
    function configure(map, o) {
      bank = {}; o = o || {};
      if (o.volume != null) vol = o.volume;
      Object.keys(map || {}).forEach(function (k) {
        if (!map[k]) return;
        var a = new Audio(); a.preload = 'auto'; a.src = map[k];
        a.addEventListener('error', function () { delete bank[k]; });
        bank[k] = a;
      });
    }
    function play(name) {
      var a = bank[name];
      if (!a || muted) return;
      try { var c = a.cloneNode(); c.volume = vol; var pr = c.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* not ready */ }
    }
    function setMuted(m) { muted = !!m; try { window.localStorage.setItem('nj-muted', muted ? '1' : '0'); } catch (e) { /* storage blocked */ } }
    return { configure: configure, play: play, setMuted: setMuted, isMuted: function () { return muted; }, has: function () { return Object.keys(bank).length > 0; } };
  })();

  /* ───────── ShardTransition + stamp overlay ───────── */
  var SHARDS = '<i class="nj-wipe__s nj-wipe__s--1"></i><i class="nj-wipe__s nj-wipe__s--2"></i><i class="nj-wipe__s nj-wipe__s--3"></i><i class="nj-wipe__s nj-wipe__s--4"></i>';
  function wipe(o) {
    o = o || {};
    var w = make('div', 'nj-wipe' + (o.rev ? ' nj-wipe--rev' : ''));
    w.setAttribute('aria-hidden', 'true');
    w.style.setProperty('--nj-wipe-accent', ACCENT_FIELD[o.accent] || 'var(--thief-red)');
    w.innerHTML = SHARDS + (o.title ? '<div class="nj-wipe__title"></div>' : '') + (o.host ? '<div class="nj-wipe__host"></div>' : '');
    if (o.title) ransom(w.querySelector('.nj-wipe__title'), String(o.title).toUpperCase(), { tiles: o.accent === 'sae' ? ['paper', 'ink', 'crimson'] : ['paper', 'ink', 'gold'], animate: false });
    if (o.host) w.querySelector('.nj-wipe__host').textContent = o.host;
    document.body.appendChild(w);
    return w;
  }

  /* Leave the site: shards cover the screen, then the browser navigates. */
  function go(item, opts) {
    opts = opts || {};
    if (item.status === 'soon' || item.status === 'locked') { sfx.play('error'); stamp(item, opts); return; }
    sfx.play('confirm');
    var url = urlOf(item);
    if (reduced()) { if (!opts.dry) { if (opts.navigate) opts.navigate(url, item, null); else window.location.href = url; } return; }
    var w = wipe({ title: item.label || item.name, host: hostOf(item), accent: item.accent });
    window.setTimeout(function () {
      if (opts.dry) {
        w.classList.add('is-leaving');
        window.setTimeout(function () { w.remove(); }, 520);
      } else if (opts.navigate) {
        opts.navigate(url, item, w);
      } else {
        window.location.href = url;
      }
    }, opts.dry ? 1000 : 640);
  }

  /* Swap screens: shards cover, onCover swaps what is underneath, shards slash away. */
  function slash(o, onCover) {
    o = o || {};
    function finish() { if (o.done) o.done(); }
    sfx.play(o.rev ? 'back' : 'slash');
    if (reduced()) { onCover(); finish(); return; }
    var w = wipe(o);
    var cover = o.rev ? 340 : 430, hold = o.title ? 240 : 40;
    window.setTimeout(onCover, cover);
    window.setTimeout(function () { w.classList.add('is-leaving'); }, cover + hold);
    window.setTimeout(function () { w.remove(); finish(); }, cover + hold + 500);
  }

  function stamp(item) {
    var soon = item.status === 'soon';
    var ov = make('div', 'nj-stampov');
    ov.setAttribute('role', 'status');
    ov.innerHTML = '<div class="nj-stampov__box"><div class="nj-stampov__name"></div>' +
      '<div class="nj-stampov__big' + (soon ? '' : ' is-locked') + '">' + (soon ? 'Coming soon' : 'Locked') + '</div>' +
      '<div class="nj-stampov__note">' + esc(soon ? hostOf(item) + ' isn’t open yet' : (item.hint || 'Not unlocked yet')) + '</div></div>';
    ransom(ov.querySelector('.nj-stampov__name'), soon ? String(item.label || item.name).toUpperCase() : '???',
      { tiles: soon ? ['paper', 'ink', 'red'] : ['paper', 'ink'], animate: !reduced() });
    document.body.appendChild(ov);
    var timer;
    function close() {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      ov.classList.add('is-out');
      window.setTimeout(function () { ov.remove(); }, 180);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); }
    }
    ov.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    timer = window.setTimeout(close, 1900);
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) Array.prototype.forEach.call(document.querySelectorAll('.nj-wipe, .nj-stampov'), function (n) { n.remove(); });
  });

  /* ───────── DateHUD ───────── */
  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var PHASES = [[0, 'Late night'], [5, 'Early morning'], [8, 'Morning'], [11, 'Lunchtime'], [13, 'Afternoon'], [16, 'After school'], [18, 'Evening'], [22, 'Late night']];
  function phaseOf(hr) { var p = PHASES[0][1]; PHASES.forEach(function (x) { if (hr >= x[0]) p = x[1]; }); return p; }
  function burstPoints(seed, spikes, ro, ri) {
    var rand = rng(seed), pts = [];
    for (var i = 0; i < spikes * 2; i++) {
      var a = (Math.PI * i) / spikes - Math.PI / 2;
      var r = i % 2 ? ri * (0.85 + rand() * 0.3) : ro * (0.78 + rand() * 0.22);
      pts.push(r1(50 + Math.cos(a) * r) + ',' + r1(50 + Math.sin(a) * r));
    }
    return pts.join(' ');
  }
  function hud(target, opts) {
    opts = opts || {};
    target.classList.add('nj-hud');
    target.setAttribute('role', 'img');
    target.innerHTML = '<svg class="nj-hud__burst" viewBox="0 0 100 100" aria-hidden="true"><polygon points="' + burstPoints('hud', 11, 48, 30) + '"/></svg>' +
      '<div class="nj-hud__date" aria-hidden="true"><span class="nj-hud__m"></span><span class="nj-hud__sl">/</span><span class="nj-hud__d"></span></div>' +
      '<div class="nj-hud__dow" aria-hidden="true"></div>' +
      '<div class="nj-hud__phase" aria-hidden="true"><span class="nj-hud__ph"></span><span class="nj-hud__clock"></span></div>';
    function q(s) { return target.querySelector(s); }
    function parts(d) {
      if (!opts.timezone) return { m: d.getMonth() + 1, d: d.getDate(), day: d.getDay(), h: d.getHours(), min: d.getMinutes() };
      try {
        var f = new Intl.DateTimeFormat('en-GB', { timeZone: opts.timezone, month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
        var o = {}; f.formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
        return { m: +o.month, d: +o.day, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), h: +o.hour, min: +o.minute };
      } catch (e) { return { m: d.getMonth() + 1, d: d.getDate(), day: d.getDay(), h: d.getHours(), min: d.getMinutes() }; }
    }
    function render() {
      var d0 = opts.date ? new Date(opts.date) : new Date();
      var P = parts(d0);
      var d = { getDay: function () { return P.day; }, getHours: function () { return P.h; }, getMinutes: function () { return P.min; },
        toLocaleDateString: function (a, b) { return d0.toLocaleDateString(a, Object.assign({ timeZone: opts.timezone || undefined }, b)); } };
      var day = d.getDay();
      q('.nj-hud__m').textContent = String(P.m);
      q('.nj-hud__d').textContent = String(P.d);
      var dow = q('.nj-hud__dow');
      dow.textContent = DOW[day];
      dow.classList.toggle('is-sun', day === 0);
      dow.classList.toggle('is-sat', day === 6);
      q('.nj-hud__ph').textContent = phaseOf(d.getHours()).toUpperCase();
      q('.nj-hud__clock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      target.setAttribute('aria-label', d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ', ' + phaseOf(d.getHours()).toLowerCase());
    }
    render();
    if (!opts.date) window.setInterval(render, 30000);
    if (opts.weather && opts.weather.latitude != null && window.fetch) {
      var WX = function (c) {
        if (c === 0) return 'Clear'; if (c <= 2) return 'Sunny'; if (c === 3) return 'Cloudy'; if (c === 45 || c === 48) return 'Fog';
        if (c >= 51 && c <= 67) return 'Rain'; if (c >= 71 && c <= 77) return 'Snow'; if (c >= 80 && c <= 82) return 'Showers';
        if (c >= 85 && c <= 86) return 'Snow'; if (c >= 95) return 'Storm'; return 'Cloudy';
      };
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(opts.weather.latitude) + '&longitude=' + encodeURIComponent(opts.weather.longitude) + '&current=weather_code,temperature_2m&timezone=auto')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var c = j && j.current; if (!c || typeof c.weather_code !== 'number') return;
          var wx = make('span', 'nj-hud__wx');
          wx.textContent = WX(c.weather_code).toUpperCase() + (typeof c.temperature_2m === 'number' ? ' ' + Math.round(c.temperature_2m) + '\u00b0' : '');
          target.appendChild(wx);
        })['catch'](function () {});
    }
    return target;
  }

  /* ───────── RenderSlot ───────── */
  function slot(target, opts) {
    opts = opts || {};
    var src = opts.src != null ? opts.src : target.getAttribute('data-src');
    var label = opts.label || target.getAttribute('data-label') || 'Render';
    target.classList.add('nj-slot');
    target.classList.remove('is-loaded');
    target.classList.toggle('nj-slot--cover', opts.fit === 'cover');
    target.classList.toggle('nj-slot--flip', !!opts.flip);
    target.innerHTML = '<span class="nj-slot__ph" aria-hidden="true"><span class="nj-slot__big">Render</span>' +
      '<span class="nj-slot__label">' + esc(label) + (src ? '<b>' + esc(src) + '</b>' : '') + '</span></span>';
    if (src && opts.load !== false) {
      var img = new Image();
      img.alt = opts.alt || '';
      img.decoding = 'async';
      img.onload = function () { target.classList.add('is-loaded'); };
      img.onerror = function () { img.remove(); };
      img.src = src;
      target.appendChild(img);
    }
    return target;
  }

  /* ───────── SplitLanding ───────── */
  /* The bolt: one razor-edged guillotine cut with a single offset break in the middle. Units 0–1000; x across, y down. */
  var BOLT = {
    start: [575, 0],
    segs: [
      ['L', 475, 485],
      ['L', 525, 505],
      ['L', 415, 1000]
    ]
  };
  var SHIFT = 140;
  function mapPt(x, y, o, off) {
    var nx = 480 + (x - 480) * o.amp + o.shift + (off || 0);
    return o.orient === 'h' ? [y, nx] : [nx, y];
  }
  function boltD(o, lead) {
    var p = mapPt(BOLT.start[0], BOLT.start[1], o);
    var d = (lead || 'M') + r1(p[0]) + ' ' + r1(p[1]);
    BOLT.segs.forEach(function (s) {
      var parts = [s[0]];
      for (var i = 1; i < s.length; i += 2) { var q = mapPt(s[i], s[i + 1], o); parts.push(r1(q[0]) + ' ' + r1(q[1])); }
      d += ' ' + parts.join(' ');
    });
    return d;
  }
  function regionD(side, o) {
    var b = boltD(o, 'L');
    if (o.orient === 'h') return side === 'a' ? 'M0 0 ' + b + ' L1000 0 Z' : 'M0 1000 ' + b + ' L1000 1000 Z';
    return side === 'a' ? 'M0 0 ' + b + ' L0 1000 Z' : 'M1000 0 ' + b + ' L1000 1000 Z';
  }
  /* Torn paper: the cut is sampled every ~11 units and each side gets its own fibrous offset.
     Makoto's edge and Sae's edge never quite meet, and the white paper shows through between them.
     The noise is generated once, so hovering only slides the tear. */
  function makeTear(seed) {
    var r = rng(seed || 'niijima'), out = [];
    var P = [BOLT.start].concat(BOLT.segs.map(function (s) { return [s[1], s[2]]; }));
    var walk = 0;
    for (var i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(len / 11));
      for (var k = 0; k < n; k++) {
        var t = k / n, corner = k === 0;
        walk = Math.max(-2.2, Math.min(2.2, walk + (r() - 0.5) * 1.6));
        var teeth = (k % 2 ? 1 : -1) * (0.6 + r() * 1.8);
        out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t,
          a: corner ? 0 : walk + teeth, b: corner ? 13 : 13 + walk * 0.6 + (r() - 0.3) * 4.2 });
      }
    }
    var last = P[P.length - 1]; out.push({ x: last[0], y: last[1], a: 0, b: 13 });
    return out;
  }
  function tearD(tear, o, layer, lead) {
    return tear.map(function (p, i) {
      var q = mapPt(p.x, p.y, o, p[layer]);
      return (i === 0 ? (lead || 'M') : 'L') + r1(q[0]) + ' ' + r1(q[1]);
    }).join(' ');
  }
  function tornRegionD(tear, side, o) {
    var b = tearD(tear, o, side, 'L');
    if (o.orient === 'h') return side === 'a' ? 'M0 0 ' + b + ' L1000 0 Z' : 'M0 1000 ' + b + ' L1000 1000 Z';
    return side === 'a' ? 'M0 0 ' + b + ' L0 1000 Z' : 'M1000 0 ' + b + ' L1000 1000 Z';
  }
  function easeOutBack(k) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }

  function split(root, opts) {
    opts = opts || {};
    var halves = [root.querySelector('.nj-half--a'), root.querySelector('.nj-half--b')];
    var ids = [uid('clip-a'), uid('clip-b')];
    var defs = document.createElementNS(SVGNS, 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs.innerHTML = '<defs>' + ids.map(function (id) {
      return '<clipPath id="' + id + '" clipPathUnits="objectBoundingBox"><path transform="scale(0.001)"/></clipPath>';
    }).join('') + '</defs>';
    root.appendChild(defs);
    var clips = ids.map(function (id) { return defs.querySelector('#' + id + ' path'); });
    halves.forEach(function (h, i) { h.style.clipPath = 'url(#' + ids[i] + ')'; h.style.webkitClipPath = 'url(#' + ids[i] + ')'; });

    function boltSVG(cls, inner) {
      var s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('class', cls); s.setAttribute('viewBox', '0 0 1000 1000'); s.setAttribute('preserveAspectRatio', 'none');
      s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
      s.innerHTML = inner; root.appendChild(s); return s;
    }
    var tear = opts.edge === 'torn' ? makeTear(opts.tearSeed) : null;
    if (tear) root.classList.add('nj-split--torn');
    var echo = boltSVG('nj-bolt nj-bolt--echo', '<path class="nj-bolt__outer"/>');
    var bolt = boltSVG('nj-bolt', '<path class="nj-bolt__outer"/><path class="nj-bolt__core"/><path class="nj-bolt__tear-a"/><path class="nj-bolt__tear-b"/>');
    var strokes = [].slice.call(echo.querySelectorAll('path')).concat([].slice.call(bolt.querySelectorAll('.nj-bolt__outer, .nj-bolt__core')));
    var tearA = bolt.querySelector('.nj-bolt__tear-a'), tearB = bolt.querySelector('.nj-bolt__tear-b');

    var st = { orient: null, shift: 0, side: null };
    function draw() {
      var o = { orient: st.orient, shift: st.shift, amp: st.orient === 'h' ? 0.62 : 1 };
      if (tear) {
        clips[0].setAttribute('d', tornRegionD(tear, 'a', o));
        clips[1].setAttribute('d', tornRegionD(tear, 'b', o));
        tearA.setAttribute('d', tearD(tear, o, 'a'));
        tearB.setAttribute('d', tearD(tear, o, 'b'));
        return;
      }
      clips[0].setAttribute('d', regionD('a', o));
      clips[1].setAttribute('d', regionD('b', o));
      var d = boltD(o);
      strokes.forEach(function (p) { p.setAttribute('d', d); });
    }
    function measure() {
      var r = root.getBoundingClientRect();
      var orient = opts.orient || ((r.width / Math.max(1, r.height)) < 0.85 ? 'h' : 'v');
      if (orient !== st.orient) { st.orient = orient; root.setAttribute('data-orient', orient); }
      draw();
    }
    var raf = 0;
    function tweenTo(target) {
      window.cancelAnimationFrame(raf);
      if (reduced()) { st.shift = target; draw(); return; }
      var from = st.shift, t0 = performance.now();
      function step(now) {
        var k = Math.min(1, (now - t0) / 320);
        st.shift = from + (target - from) * easeOutBack(k);
        draw();
        if (k < 1) raf = window.requestAnimationFrame(step);
      }
      raf = window.requestAnimationFrame(step);
    }
    function hover(side) {
      if (side === st.side) return;
      if (side) sfx.play('hover');
      st.side = side || null;
      if (side) root.setAttribute('data-hover', side); else root.removeAttribute('data-hover');
      halves.forEach(function (h, i) { var b = h.querySelector('.nj-btn'); if (b) b.classList.toggle('is-hot', side === (i ? 'b' : 'a')); });
      tweenTo(side === 'a' ? SHIFT : side === 'b' ? -SHIFT : 0);
    }
    halves.forEach(function (h, i) {
      var side = i ? 'b' : 'a';
      h.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover(side); });
      h.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover(null); });
      h.addEventListener('focus', function () { hover(side); });
      h.addEventListener('blur', function () { hover(null); });
      h.addEventListener('click', function (e) {
        if (!plainClick(e)) return;
        if (opts.onPick) { e.preventDefault(); opts.onPick(i); return; }
        if (!opts.items) return;
        e.preventDefault();
        go(opts.items[i], opts);
      });
    });

    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(root);
    else window.addEventListener('resize', measure);
    function replay() {
      if (reduced() || opts.animate === false) return;
      restart(root, 'is-in');
      [].forEach.call(root.querySelectorAll('.nj-half__name'), function (n) { restart(n, 'is-in'); });
    }
    replay();
    return { hover: hover, redraw: measure, replay: replay, side: function () { return st.side; } };
  }

  function halfHTML(s, side) {
    var plates = (s.plates || []).map(function (p, i) {
      var v = i === 0 ? '' : (side === 'a' ? ' nj-plate--paper' : ' nj-plate--gold');
      return '<span class="nj-plate' + v + '">' + esc(p) + '</span>';
    }).join('');
    var fx = side === 'b' ? '<span class="nj-half__neon"></span>' : '';
    var st = s.status || 'online';
    return '<a class="nj-half nj-half--' + side + '" href="' + esc(urlOf(s)) + '" aria-label="' + esc(s.name + ' — ' + hostOf(s)) + '">' +
      '<span class="nj-half__in">' +
        '<span class="nj-half__bg" aria-hidden="true"><span class="nj-half__shard nj-half__shard--1"></span><span class="nj-half__numeral">' + esc(s.glyph || s.arcana || '') + '</span>' +
        '<span class="nj-half__dots"></span><span class="nj-half__shard nj-half__shard--2"></span><span class="nj-half__fx"></span>' + fx + '</span>' +
        '<span class="nj-half__slot" data-src="' + esc(s.render || '') + '" data-label="' + esc(s.name + ' · landing render') + '"></span>' +
        '<span class="nj-half__info"><span class="nj-half__name"></span><span class="nj-half__meta">' + plates + '</span>' +
          (s.tagline ? '<span class="nj-half__tag">' + esc(s.tagline) + '</span>' : '') + '</span>' +
        '<span class="nj-half__foot"><span class="nj-half__stamp">' + (st === 'online' ? '' : stampHTML(st)) + '</span><span class="nj-half__host">' + esc(hostOf(s)) + '</span>' +
          buttonHTML(s.cta || 'Enter', { span: true, variant: side === 'a' ? 'on-makoto' : 'on-sae' }) + '</span>' +
      '</span><span class="nj-half__veil" aria-hidden="true"></span></a>';
  }

  function landing(target, sisters, opts) {
    opts = opts || {};
    target.classList.add('nj-split');
    target.innerHTML = halfHTML(sisters[0], 'a') + halfHTML(sisters[1], 'b') +
      '<div class="nj-split__mark" aria-hidden="true">' + esc(opts.wordmark || 'NIIJIMA SISTERS') + '<small>新島姉妹</small></div>' +
      (opts.cue === false ? '' : '<div class="nj-split__cue">' + buttonHTML(opts.cueLabel || 'The Network', { down: true, attrs: ' data-cue' }) + '</div>');
    [].forEach.call(target.querySelectorAll('.nj-half__name'), function (n, i) {
      ransom(n, sisters[i].name, { tiles: i ? ['paper', 'ink', 'gold', 'crimson'] : ['paper', 'ink', 'red', 'steel'], seed: sisters[i].id || sisters[i].name, animate: false });
    });
    [].forEach.call(target.querySelectorAll('.nj-half__slot'), function (n, i) { slot(n, { load: opts.renders !== false, fit: sisters[i].renderFit, flip: sisters[i].renderFlip }); });
    var cue = target.querySelector('[data-cue]');
    if (cue) cue.addEventListener('click', function () { if (opts.onCue) opts.onCue(); });
    var ctl = split(target, { items: sisters, dry: opts.dry, orient: opts.orient, animate: opts.animate, onPick: opts.onPick, navigate: opts.navigate, edge: opts.edge, tearSeed: opts.tearSeed });
    ctl.setStatus = function (i, status) {
      var box = target.querySelectorAll('.nj-half__stamp')[i];
      if (box) box.innerHTML = status === 'online' ? '' : stampHTML(status);
    };
    return ctl;
  }

  /* ───────── NetworkMenu ───────── */
  var TILTS = [-2, 1.5, -1, 2, -2.5, 1];
  var TILESET = { makoto: ['ink', 'red', 'paper'], sae: ['ink', 'red', 'gold'], locked: ['ink', 'paper'] };
  function itemLabel(item, status) {
    return item.label + ' — ' + hostOf(item) + (STAMPS[status] && status !== 'online' ? ' (' + STAMPS[status].toLowerCase() + ')' : '');
  }
  function menuItemHTML(item, i, status) {
    status = status || item.status;
    var locked = status === 'locked';
    var inner = '<span class="nj-menu__label">' + esc(locked ? '???' : item.label) + '</span><span class="nj-menu__ransom" aria-hidden="true"></span>';
    var cls = 'nj-menu__item' + (locked ? ' is-locked' : '') + (item.accent ? ' is-' + item.accent : '');
    var el = locked
      ? '<button type="button" class="' + cls + '" data-i="' + i + '" aria-disabled="true" aria-label="Locked: ' + esc(item.hint || 'unknown destination') + '">' + inner + '</button>'
      : '<a class="' + cls + '" data-i="' + i + '" href="' + esc(urlOf(item)) + '" aria-label="' + esc(itemLabel(item, status)) + '">' + inner + '</a>';
    return '<li class="nj-menu__li" style="--i:' + i + ';--r:' + TILTS[i % TILTS.length] + 'deg">' + el + '</li>';
  }
  function portalHTML(item, i) {
    var locked = item.status === 'locked';
    var cls = 'nj-portal' + (item.accent ? ' nj-portal--' + item.accent : '') + (locked ? ' is-locked' : '');
    var inner = '<span class="nj-portal__arc">' + esc(item.arcana || '?') + '</span>' +
      '<span class="nj-portal__title">' + esc(locked ? '???' : item.label) + '</span>' +
      '<span class="nj-portal__host">' + esc(locked ? (item.hint || 'Unknown destination') : hostOf(item)) + '</span>' +
      '<span class="nj-portal__desc">' + esc(item.desc || '') + '</span>' +
      '<span class="nj-portal__stamp">' + stampHTML(item.status) + '</span>' +
      (locked ? '' : '<span class="nj-portal__go" aria-hidden="true"></span>');
    return '<li class="' + cls + '">' + (locked
      ? '<div class="nj-portal__a" aria-label="Locked: ' + esc(item.hint || 'unknown destination') + '">' + inner + '</div>'
      : '<a class="nj-portal__a" data-i="' + i + '" href="' + esc(urlOf(item)) + '">' + inner + '</a>') + '</li>';
  }
  function cardHTML(item) {
    var locked = item.status === 'locked', soon = item.status === 'soon';
    return '<h3 class="nj-card__title">' + esc(locked ? '???' : item.label) + '</h3>' +
      '<p class="nj-card__host">' + esc(locked ? (item.hint || 'Unknown destination') : hostOf(item)) + '</p>' +
      '<p class="nj-card__desc">' + esc(item.desc || '') + '</p>' +
      '<div class="nj-card__row">' + stampHTML(item.status) +
        (locked ? '' : buttonHTML(soon ? 'Peek' : 'Enter', { href: urlOf(item), attrs: ' data-go tabindex="-1"' })) + '</div>';
  }

  function network(target, items, opts) {
    opts = opts || {};
    var live = {}, isLive = false;
    function statusOf(i) { var it = items[i]; return (it.id && live[it.id]) || it.status || 'online'; }
    function cur(i) { return Object.assign({}, items[i], { status: statusOf(i) }); }

    target.classList.add('nj-net');
    target.innerHTML =
      '<div class="nj-net__bg" aria-hidden="true"><svg class="nj-net__burst" viewBox="0 0 100 100"><polygon points="' + burstPoints('net', 14, 49, 33) + '"/></svg>' +
        '<span class="nj-net__band"></span><span class="nj-net__band nj-net__band--thin"></span><span class="nj-net__ghost">NETWORK</span></div>' +
      '<div class="nj-detail" aria-hidden="true"><span class="nj-detail__slot nj-slot--on-ink"></span></div>' +
      '<div class="nj-net__hud"><div class="nj-net__hudbox"></div></div>' +
      (opts.back === false ? '' : '<button type="button" class="nj-back" data-back aria-label="Back to the sisters (Escape)"><i class="nj-back__arrow" aria-hidden="true"></i>Back<kbd>Esc</kbd></button>') +
      '<nav class="nj-menu" aria-label="Destinations"><svg class="nj-menu__hl" aria-hidden="true"><polygon class="hl-accent"/><polygon class="hl-back"/><polygon class="hl-front"/></svg>' +
        '<ul class="nj-menu__list">' + items.map(function (it, i) { return menuItemHTML(it, i); }).join('') + '</ul></nav>' +
      '<div class="nj-speech"><svg class="nj-speech__shape" aria-hidden="true"><polygon/></svg><div class="nj-speech__tag"></div>' +
        '<article class="nj-card"></article></div>' +
      '<div class="nj-uptime-hud" role="status"></div>' +
      '<p class="nj-net__credit">' + esc(opts.credit || 'Fan site · Persona 5 © ATLUS / SEGA · not affiliated') + '</p>';

    hud(target.querySelector('.nj-net__hudbox'), { date: opts.date, timezone: opts.timezone, weather: opts.weather });

    var menuEl = target.querySelector('.nj-menu');
    var hl = target.querySelector('.nj-menu__hl');
    var polys = { accent: hl.querySelector('.hl-accent'), back: hl.querySelector('.hl-back'), front: hl.querySelector('.hl-front') };
    var speech = target.querySelector('.nj-speech');
    var speechSvg = target.querySelector('.nj-speech__shape');
    var tag = target.querySelector('.nj-speech__tag');
    var card = target.querySelector('.nj-card');
    var dslot = target.querySelector('.nj-detail__slot');
    var hudEl = target.querySelector('.nj-uptime-hud');
    var backBtn = target.querySelector('[data-back]');
    var btns = [].slice.call(target.querySelectorAll('.nj-menu__item'));
    var jitter = rng('menu');
    var active = -1, base = null, boilTimer = 0, running = true, lastPT = 'mouse', downActive = -1, hudKey = '';

    /* selection plate: three layered polygons, the front one ending in a dagger point */
    function J(a) { return (jitter() * 2 - 1) * a; }
    function shape(btn) {
      var mr = menuEl.getBoundingClientRect(), br = btn.getBoundingClientRect();
      if (!br.width) return null;
      var k = mr.width / (menuEl.offsetWidth || mr.width) || 1;
      var x = (br.left - mr.left) / k, y = (br.top - mr.top) / k, w = br.width / k, h = br.height / k;
      var dag = Math.max(40, h * 0.78) + J(8);
      return {
        front: [[x - 18 + J(5), y + 8 + J(4)], [x + w + 8 + J(6), y - 6 + J(4)], [x + w + 8 + dag * 0.78, y + h * 0.1 + J(4)],
          [x + w + 8 + dag * 0.46, y + h * 0.36 + J(3)], [x + w + 16 + dag * 1.15, y + h * 0.5 + J(4)], [x + w + 4 + J(6), y + h + 4 + J(3)], [x - 8 + J(5), y + h - 3 + J(3)]],
        back: [[x - 38 + J(6), y + 20 + J(5)], [x + w * 0.45, y + 8 + J(5)], [x + w + 30 + J(8), y + 4 + J(5)], [x + w + 30 + dag * 1.05, y + h * 0.26 + J(5)],
          [x + w + 30 + dag * 0.74, y + h * 0.5 + J(4)], [x + w + 40 + dag * 1.7, y + h * 0.74 + J(6)], [x + w + 12 + J(6), y + h + 16 + J(5)], [x + w * 0.38, y + h + 9 + J(4)], [x - 22 + J(5), y + h + 24 + J(5)]],
        accent: [[x - 30 + J(5), y + h * 0.62 + J(4)], [x + w * 0.6, y + h * 0.3 + J(5)], [x + w + 50 + J(8), y + h * 0.36 + J(5)], [x + w + 60 + dag * 2.3, y + h * 0.66 + J(5)], [x + w + 30 + J(6), y + h + 26 + J(4)], [x - 10 + J(5), y + h + 36 + J(5)]]
      };
    }
    function pts(list, amp) { return list.map(function (p) { return r1(p[0] + (amp ? J(amp) : 0)) + ',' + r1(p[1] + (amp ? J(amp) : 0)); }).join(' '); }
    function draw(amp) {
      if (!base) return;
      polys.front.setAttribute('points', pts(base.front, amp));
      polys.back.setAttribute('points', pts(base.back, amp * 1.4));
      polys.accent.setAttribute('points', pts(base.accent, amp * 1.8));
    }
    function place(pop) {
      if (active < 0) return;
      var s = shape(btns[active]);
      if (!s) return;
      base = s; draw(0);
      var st = statusOf(active), it = items[active];
      hl.style.setProperty('--nj-hl-back', st === 'locked' ? 'var(--locked)' : 'var(--thief-red)');
      hl.style.setProperty('--nj-hl-accent', st === 'locked' ? 'var(--ink-raised)' : it.accent === 'makoto' ? 'var(--makoto-cyan)' : it.accent === 'sae' ? 'var(--sae-gold)' : 'var(--paper)');
      if (pop && !reduced()) restart(hl, 'is-pop');
    }
    function startBoil() {
      window.clearInterval(boilTimer);
      if (reduced() || opts.boil === false) return;
      boilTimer = window.setInterval(function () { if (running && !document.hidden) draw(3.2); }, opts.boilMs || 110);
    }
    function stopBoil() { window.clearInterval(boilTimer); boilTimer = 0; draw(0); }

    btns.forEach(function (b, i) {
      var it = items[i], locked = it.status === 'locked';
      ransom(b.querySelector('.nj-menu__ransom'), (locked ? '???' : it.label).toUpperCase(), {
        tiles: TILESET[locked ? 'locked' : it.accent] || ['ink', 'red', 'paper'], tilt: 7, first: 1.12, stagger: 26, seed: it.id || it.label, animate: false
      });
    });

    /* the speech box and its zigzag tail are one outlined polygon, sized to the box */
    function layoutSpeech() {
      var w = speech.offsetWidth, h = speech.offsetHeight;
      if (!w || !h) return;
      var T = parseFloat(getComputedStyle(speech).paddingTop) || 70, bh = h - T;
      function edge(x) { return T + 0.08 * bh * (1 - (x - 0.03 * w) / (0.95 * w)); }
      var P = [[0, h], [0.03 * w, T + 0.08 * bh],
        [0.60 * w, edge(0.60 * w)], [0.715 * w, 0.58 * T], [0.695 * w, 0.42 * T], [0.90 * w, 0],
        [0.785 * w, 0.40 * T], [0.81 * w, 0.60 * T], [0.79 * w, edge(0.79 * w)],
        [0.98 * w, T], [w, T + 0.9 * bh]];
      speechSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      speechSvg.querySelector('polygon').setAttribute('points', P.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' '));
    }
    function renderCard(swap) {
      var it = cur(active), locked = it.status === 'locked';
      speech.className = 'nj-speech nj-speech--' + (it.accent || 'red') + (locked ? ' is-locked' : '');
      tag.innerHTML = '<span class="nj-card__arc">' + esc(it.arcana || '?') + '</span><span class="nj-card__arcname">' + esc(it.arcanaName || '') + '</span>';
      card.innerHTML = cardHTML(it);
      layoutSpeech();
      if (swap && !reduced()) restart(speech, 'is-swap');
      var ctaBtn = card.querySelector('[data-go]');
      if (ctaBtn) ctaBtn.addEventListener('click', function (e) { if (!plainClick(e)) return; e.preventDefault(); go(cur(active), opts); });
    }
    function activate(i) {
      if (i === active || i < 0 || i >= items.length) return;
      var prev = active; active = i;
      btns.forEach(function (b, k) { b.classList.toggle('is-active', k === i); });
      if (running && !reduced()) restart(btns[i].querySelector('.nj-menu__ransom'), 'is-in');
      renderCard(true);
      var it = items[i];
      setSlotShadows(dslot, statusOf(i) === 'locked' ? 'none' : it.accent);
      if (running && !reduced()) restart(dslot, 'is-in');
      slot(dslot, { src: it.render || '', label: (statusOf(i) === 'locked' ? 'Locked' : it.label) + ' · menu render', load: opts.renders !== false, fit: it.renderFit, flip: it.renderFlip });
      place(true);
      window.requestAnimationFrame(function () { place(false); });
    }
    function step(d) {
      var n = items.length, i = ((active < 0 ? 0 : active) + d + n) % n;
      sfx.play('move'); activate(i); focusQuiet(btns[i]);
    }
    function confirm() { if (active >= 0) go(cur(active), opts); }

    btns.forEach(function (b, i) {
      b.addEventListener('pointerdown', function (e) { lastPT = e.pointerType || 'mouse'; downActive = active; });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && i !== active) { sfx.play('move'); activate(i); } });
      b.addEventListener('focus', function () { activate(i); });
      b.addEventListener('click', function (e) {
        if (!plainClick(e)) return;
        e.preventDefault();
        var pt = e.pointerType || (e.detail === 0 ? 'keyboard' : lastPT);
        if ((pt === 'touch' || pt === 'pen') && i !== downActive) { activate(i); return; }
        activate(i); confirm();
      });
    });
    if (backBtn) backBtn.addEventListener('click', function () { if (opts.onBack) opts.onBack(); });

    function renderHud() {
      var total = 0, up = 0;
      items.forEach(function (it, i) { var s = statusOf(i); if (TRACKED[s]) { total += 1; if (s === 'online') up += 1; } });
      var key = up + '/' + total + '/' + isLive;
      if (key === hudKey) return;
      hudKey = key;
      hudEl.innerHTML = uptimeHTML(up, total, isLive);
      hudEl.setAttribute('aria-label', up + ' of ' + total + ' destinations online' + (isLive ? ' (live)' : ''));
    }
    function setStatuses(map, liveFlag) {
      live = map || {}; isLive = liveFlag || false;
      btns.forEach(function (b, i) {
        var s = statusOf(i);
        if (s !== 'locked' && b.tagName === 'A') b.setAttribute('aria-label', itemLabel(items[i], s));
      });
      if (active >= 0) renderCard(false);
      renderHud();
      place(false);
    }

    activate(opts.active != null ? opts.active : 0);
    renderHud();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(false); });
    if (window.ResizeObserver) {
      new ResizeObserver(function () { place(false); }).observe(menuEl);
      new ResizeObserver(layoutSpeech).observe(speech);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutSpeech);
    startBoil();

    return {
      activate: activate,
      activateById: function (id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) { activate(i); return i; } return -1; },
      step: step,
      confirm: confirm,
      statusOf: function (id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return statusOf(i); return null; },
      setStatuses: setStatuses,
      enter: function (focus) { running = true; place(true); startBoil(); if (focus) focusQuiet(btns[active]); },
      leave: function () { running = false; stopBoil(); }
    };
  }

  /* ───────── the whole homepage: a locked two-screen state machine ───────── */
  function home(target, cfg, opts) {
    opts = opts || {};
    cfg = cfg || Niijima.demo;
    var useHistory = opts.history !== false;
    target.classList.add('nj', 'nj-home');
    target.innerHTML = '<div class="nj-stage"><section class="nj-screen nj-home__landing" id="top" aria-label="Choose a sister" tabindex="-1"></section>' +
      '<section class="nj-screen nj-home__net" id="network" aria-label="The Niijima Network" tabindex="-1"></section></div>';
    var stage = target.querySelector('.nj-stage');
    var DESIGN = opts.design || [1440, 900];
    function fit() {
      var W = target.clientWidth, H = target.clientHeight, k = 1;
      if (W >= 900 && H >= 520) k = Math.min(W / DESIGN[0], H / DESIGN[1]);
      target.style.setProperty('--nj-k', k);
      target.style.setProperty('--nj-stage-w', (W / k) + 'px');
      target.style.setProperty('--nj-stage-h', (H / k) + 'px');
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(target); else window.addEventListener('resize', fit);
    sfx.configure(cfg.sounds, { volume: cfg.soundVolume });
    if (cfg.sounds && Object.keys(cfg.sounds).some(function (k) { return cfg.sounds[k]; })) {
      var tog = make('button', 'nj-sound'); tog.type = 'button';
      function paint() { tog.classList.toggle('is-muted', sfx.isMuted()); tog.textContent = sfx.isMuted() ? 'Sound off' : 'Sound on'; tog.setAttribute('aria-pressed', String(!sfx.isMuted())); }
      tog.addEventListener('click', function () { sfx.setMuted(!sfx.isMuted()); paint(); sfx.play('move'); });
      paint(); target.appendChild(tog);
    }
    var land = target.querySelector('.nj-home__landing');
    var netEl = target.querySelector('.nj-home__net');
    var current = null, busy = false, liveMap = {};

    function sisterAt(i) {
      var s = cfg.sisters[i];
      return Object.assign({}, s, { status: (s.id && liveMap[s.id]) || s.status || 'online', label: s.name });
    }
    function pick(i) {
      var s = cfg.sisters[i];
      if (cfg.sisterOpens === 'site') { go(sisterAt(i), opts); return; }
      sfx.play('confirm');
      toNetwork({ select: s.id, title: s.name, accent: s.accent });
    }
    var landCtl = landing(land, cfg.sisters, Object.assign({}, opts, { onPick: pick, onCue: function () { sfx.play('confirm'); toNetwork(); } }));
    var netCtl = network(netEl, cfg.network, Object.assign({}, opts, { onBack: back }));

    function hashScreen() { return location.hash === '#network' ? 'network' : 'top'; }
    function show(name, initial) {
      current = name;
      target.setAttribute('data-screen', name);
      [land, netEl].forEach(function (el) {
        var on = (el === netEl) === (name === 'network');
        el.classList.toggle('is-active', on);
        if (on) el.removeAttribute('inert'); else el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (name === 'network') { landCtl.hover(null); netCtl.enter(!initial); }
      else { netCtl.leave(); landCtl.replay(); if (!initial) focusQuiet(land); }
    }
    function settle() {
      busy = false;
      if (useHistory) { var want = hashScreen(); if (want !== current) show(want); }
    }
    function toNetwork(o) {
      o = o || {};
      if (busy || current === 'network') return;
      if (o.select != null) netCtl.activateById(o.select);
      busy = true;
      if (useHistory) { try { history.pushState({ nj: 'network' }, '', '#network'); } catch (e) { /* sandboxed */ } }
      slash({ title: o.title || 'THE NETWORK', accent: o.accent, done: settle }, function () { show('network'); });
    }
    function back() {
      if (busy || current !== 'network') return;
      if (useHistory && history.state && history.state.nj === 'network') { history.back(); return; }
      if (useHistory) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sandboxed */ } }
      busy = true;
      slash({ rev: true, done: settle }, function () { show('top'); });
    }
    if (useHistory) {
      window.addEventListener('popstate', function () {
        var want = hashScreen();
        if (busy || want === current) return;
        busy = true;
        if (want === 'network') slash({ title: 'THE NETWORK', done: settle }, function () { show('network'); });
        else slash({ rev: true, done: settle }, function () { show('top'); });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      var k = e.key;
      var nav = k === 'Enter' || k === ' ' || k === 'Escape' || k.indexOf('Arrow') === 0;
      if (!nav) return;
      if (busy) { e.preventDefault(); return; }
      var ctl = e.target && e.target.closest ? e.target.closest('a, button') : null;
      function activateOrClick() {
        if (ctl) { if (k === ' ') { e.preventDefault(); ctl.click(); } return true; }
        return false;
      }
      if (current === 'top') {
        if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); landCtl.hover('a'); }
        else if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); landCtl.hover('b'); }
        else if (k === 'Escape') { landCtl.hover(null); }
        else if (!activateOrClick()) {
          e.preventDefault();
          var side = landCtl.side();
          if (side) pick(side === 'a' ? 0 : 1); else { sfx.play('confirm'); toNetwork(); }
        }
      } else {
        if (k === 'Escape') { e.preventDefault(); back(); }
        else if (k === 'ArrowDown') { e.preventDefault(); netCtl.step(1); }
        else if (k === 'ArrowUp') { e.preventDefault(); netCtl.step(-1); }
        else if (k === 'Enter' || k === ' ') { if (!activateOrClick()) { e.preventDefault(); netCtl.confirm(); } }
      }
    });

    show(opts.start || (useHistory ? hashScreen() : 'top'), true);

    return {
      show: function (name) { show(name); },
      toNetwork: toNetwork,
      back: back,
      /* map: { <item id>: 'online' | 'down' | 'pending' | 'maintenance' }, live: true when it came from a monitor */
      setStatuses: function (map, live) {
        liveMap = map || {};
        netCtl.setStatuses(liveMap, live);
        cfg.sisters.forEach(function (s, i) { landCtl.setStatus(i, sisterAt(i).status); });
      }
    };
  }

  var Niijima = {
    version: '2.0.0',
    ransom: ransom,
    hud: hud,
    slot: slot,
    split: split,
    landing: landing,
    network: network,
    home: home,
    go: go,
    slash: slash,
    sfx: sfx,
    stamp: stamp,
    buttonHTML: buttonHTML,
    stampHTML: stampHTML,
    uptimeHTML: uptimeHTML,
    portalHTML: portalHTML,
    menuItemHTML: menuItemHTML,
    cardHTML: cardHTML,
    bolt: BOLT,
    demo: null
  };
  window.Niijima = Niijima;
})();

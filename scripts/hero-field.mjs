// SPDX-FileCopyrightText: Copyright (c) 2026 MissionHub Open Source Community
// SPDX-License-Identifier: MIT

// Interactive 3D perspective dot-sea wave field inspired by Process Mission's hero canvas,
// calibrated for MissionHub's asymmetric split hero layout.
export function initHeroField(canvas) {
  if (!canvas || !canvas.getContext) return () => {};
  const hero = canvas.closest('.hero');
  const copyBoxEl = hero?.querySelector('.hero-copy');
  if (!hero) return () => {};

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const INK = (css.getPropertyValue('--c-ink') || '#141414').trim();
  const RED = (css.getPropertyValue('--c-red') || '#C30003').trim();
  const RED_RGB = '195,0,3';
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduce = Boolean(reducedMotionQuery?.matches);

  const CFG = {
    step: 0.14,
    ratio: 1.06,
    zNear: 3.2,
    zFar: 38,
    speed: 0.32,
    horizonAt: 0.16,
    crest: 0.74,
    textFade: 0.88,
    runners: [
      { col: -14, lap: 11, ph: 0.15 },
      { col: 2, lap: 9.5, ph: 0.52 },
      { col: 19, lap: 12.5, ph: 0.8 },
    ],
    runnerTrail: 0.42,
    lineSpan: 0.28,
    idleAfter: 2.6,
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let horizon = 0;
  let focal = 0;
  let camH = 2.2;
  let clearZone = null;
  let mx = 0;
  let my = 0;
  let px = 0;
  let py = 0;
  const ptr = { x: 0, y: 0, inside: false, last: -1e9 };
  const key = { x: 0, y: 0, a: 0, init: false };
  let running = false;
  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  const lnNear = Math.log(CFG.zNear);
  const lnFar = Math.log(CFG.zFar);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    if (!W || !H) return;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    horizon = H * CFG.horizonAt;
    focal = Math.max(W * 0.54, 420);
    camH = ((H + 28 - horizon) * CFG.zNear) / focal;

    if (copyBoxEl) {
      const box = copyBoxEl.getBoundingClientRect();
      clearZone = {
        cx: box.left + box.width * 0.48 - rect.left,
        cy: box.top + box.height * 0.52 - rect.top,
        rx: Math.max(box.width * 0.7, 220),
        ry: Math.max(box.height * 0.72, 180),
      };
    }

    if (!key.init) {
      key.x = W * 0.56;
      key.y = H * 0.76;
      key.init = true;
    }
    if (!running) draw(reduce ? 5.5 : (performance.now() - t0) / 1000, 0);
  }

  function waveHeight(x, z, t) {
    return (
      Math.sin(x * 0.88 + t * 0.58) * Math.cos(z * 0.68 - t * 0.42) * 0.28 +
      Math.sin(x * 0.34 + z * 0.48 - t * 0.48) * 0.44 +
      Math.sin(Math.hypot(x, z - 3) * 1.15 - t * 0.75) * 0.16
    );
  }

  function draw(time, dt) {
    const t = time * CFG.speed;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W * 0.52 + px * 12;
    const cam = camH + py * 0.1;
    const vSpan = Math.max(1, H - horizon);

    const heads = CFG.runners.map(
      r => lnFar - (((time / r.lap + r.ph) % 1) * (lnFar - lnNear + CFG.runnerTrail)),
    );

    ctx.fillStyle = INK;
    let isRed = false;

    for (let z = CFG.zFar; z >= CFG.zNear; z /= CFG.ratio) {
      const k = focal / z;
      const lz = Math.log(z);
      const baseSize = Math.min(Math.max(k * 0.0086, 0.5), 2.4);
      const half = Math.ceil((W * 0.55 + 24) / k / CFG.step);

      for (let i = -half; i <= half; i++) {
        const x = i * CFG.step;
        const y = waveHeight(x, z, t);
        const sx = cx + x * k;
        const sy = horizon + (cam - y) * k;
        if (sy < -4 || sy > H + 4) continue;

        const v = Math.max(0, (sy - horizon) / vSpan);
        const hN = (y + 0.9) / 1.8;
        const edge = Math.abs(sx - W / 2) / (W / 2);
        let alpha =
          Math.min(1, v / 0.08) *
          (0.1 + 0.54 * Math.pow(v, 1.35)) *
          (0.48 + 0.52 * hN) *
          (1 - 0.46 * edge * edge * edge);
        let size = baseSize;
        let wantRed = false;

        for (let n = 0; n < heads.length; n++) {
          if (i !== CFG.runners[n].col) continue;
          const dist = lz - heads[n];
          if (dist >= 0 && dist <= CFG.runnerTrail) {
            const glow = 1 - dist / CFG.runnerTrail;
            alpha = Math.min(0.95, 0.28 + glow * 0.72) * Math.min(1, v * 5 + 0.2);
            size = baseSize * (1.2 + glow * 0.85);
            wantRed = true;
          }
        }

        if (!wantRed && hN > CFG.crest) {
          const crestAmt = (hN - CFG.crest) / (1 - CFG.crest);
          alpha = Math.min(0.92, alpha * (0.8 + crestAmt * 1.15));
          size = baseSize * (1 + crestAmt * 0.32);
          wantRed = true;
        }

        if (alpha < 0.02) continue;
        if (wantRed !== isRed) {
          ctx.fillStyle = wantRed ? RED : INK;
          isRed = wantRed;
        }
        ctx.globalAlpha = alpha;
        if (size < 1.15) {
          ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Pointer-reactive telemetry curve gliding along the wave surface
    const idle = time - ptr.last > CFG.idleAfter || !ptr.inside;
    const tx = idle ? W * (0.56 + Math.sin(time * 0.16) * 0.2) : ptr.x;
    const ty = idle
      ? H * (0.76 + 0.08 * Math.sin(time * 0.11 + 1))
      : Math.max(ptr.y, horizon + vSpan * 0.16);
    const ta = idle ? 0.65 : 0.92;
    const ease = dt ? Math.min(1, dt * (idle ? 1.2 : 6.5)) : 1;
    key.x += (tx - key.x) * ease;
    key.y += (ty - key.y) * ease;
    key.a += (ta - key.a) * (dt ? Math.min(1, dt * 3) : 1);

    if (key.a > 0.02) {
      const kz = Math.min(CFG.zFar, Math.max(CFG.zNear, (focal * cam) / Math.max(8, key.y - horizon)));
      const kk = focal / kz;
      const spanPx = W * CFG.lineSpan;
      const x0 = key.x - spanPx;
      const x1 = key.x + spanPx;
      const surf = sxp => horizon + (cam - waveHeight((sxp - cx) / kk, kz, t)) * kk;

      const grad = ctx.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, `rgba(${RED_RGB},0)`);
      grad.addColorStop(0.5, `rgba(${RED_RGB},${(0.85 * key.a).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${RED_RGB},0)`);

      ctx.beginPath();
      for (let sxp = x0; sxp <= x1; sxp += 5) {
        const syp = surf(sxp);
        if (sxp === x0) ctx.moveTo(sxp, syp);
        else ctx.lineTo(sxp, syp);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.min(1.9, 0.9 + kk * 0.0038);
      ctx.lineJoin = 'round';
      ctx.stroke();

      const hy = surf(key.x);
      ctx.fillStyle = RED;
      ctx.globalAlpha = key.a;
      ctx.beginPath();
      ctx.arc(key.x, hy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      const ring = (time * 0.48) % 1;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1;
      ctx.globalAlpha = key.a * (1 - ring) * 0.72;
      ctx.beginPath();
      ctx.arc(key.x, hy, 5 + ring * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Softly clear dots behind hero typography for crisp readability
    if (clearZone) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(clearZone.cx, clearZone.cy);
      ctx.scale(1, clearZone.ry / clearZone.rx);
      const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, clearZone.rx);
      mask.addColorStop(0, `rgba(0,0,0,${CFG.textFade})`);
      mask.addColorStop(0.68, `rgba(0,0,0,${(CFG.textFade * 0.85).toFixed(2)})`);
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.arc(0, 0, clearZone.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let lastNow = 0;
  function frame(now) {
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    px += (mx - px) * 0.04;
    py += (my - py) * 0.04;
    draw((now - t0) / 1000, dt);
    raf = requestAnimationFrame(frame);
  }

  function sync() {
    const shouldRun = !reduce && visible && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      lastNow = 0;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(hero);
  }

  document.addEventListener('visibilitychange', sync);
  reducedMotionQuery?.addEventListener('change', event => {
    reduce = event.matches;
    sync();
    if (reduce) draw(5.5, 0);
  });

  if (window.matchMedia?.('(hover: hover)').matches) {
    window.addEventListener(
      'pointermove',
      event => {
        if (reduce) return;
        mx = (event.clientX / window.innerWidth - 0.5) * 2;
        my = (event.clientY / window.innerHeight - 0.5) * 2;
        const rect = canvas.getBoundingClientRect();
        ptr.x = event.clientX - rect.left;
        ptr.y = event.clientY - rect.top;
        ptr.inside = ptr.x >= 0 && ptr.x <= rect.width && ptr.y >= 0 && ptr.y <= rect.height;
        if (ptr.inside) ptr.last = (performance.now() - t0) / 1000;
      },
      { passive: true },
    );
  }

  resize();
  sync();
  return resize;
}

// SPDX-FileCopyrightText: Copyright (c) 2026 MissionHub Open Source Community
// SPDX-License-Identifier: MIT

// Interactive 20-frame full-body desktop pet for MissionHub-chan inspired by ChatGPT Desktop pets:
// renders a single preloaded 5x4 transparent WebP sprite atlas on a Retina canvas at 60 FPS with
// natural eye blinking, curious head-tilt, waving greetings, smooth eased 4-frame walking cycle,
// 4-phase jump/fall/landing arc, 3-phase kendo bamboo-shinai strike, 2-frame mid-air foot kicking,
// 2-frame sitting nap breathing, head-pat hearts, and drag-toss gravity physics.

const ATLAS_SRC = './assets/mascot/pet-sprites.webp';
const CELL = 256;
const COLS = 5;

const FRAME = {
  idle: 0,
  idle_blink: 1,
  curious: 2,
  idle_wave: 3,
  happy: 4,
  happy2: 5,
  walk1: 6,
  walk_pass1: 7,
  walk2: 8,
  walk_pass2: 9,
  crouch: 10,
  jump: 11,
  fall: 12,
  swing_windup: 13,
  swing: 14,
  swing_follow: 15,
  dangling: 16,
  dangling2: 17,
  sleep: 18,
  sleep2: 19,
};

const WALK_SEQ = ['walk1', 'walk_pass1', 'walk2', 'walk_pass2'];

export function initMascotPet(rootEl) {
  if (!rootEl) return;

  const mover = rootEl.querySelector('.pet-mover');
  const body = rootEl.querySelector('.pet-body');
  const canvas = rootEl.querySelector('.pet-canvas');
  const shadow = rootEl.querySelector('.pet-shadow');
  const fxLayer = rootEl.querySelector('.pet-fx');

  if (!mover || !body || !canvas || !shadow) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  const GRAVITY = 1580;
  const EDGE_PAD = 18;

  // Preload single 5x4 sprite atlas (0ms frame switches once decoded)
  const atlas = new Image();
  let atlasReady = false;
  let lastDrawnFrame = -1;

  function drawFrame(frameName) {
    const idx = FRAME[frameName] ?? 0;
    rootEl.dataset.pose = frameName;
    if (!atlasReady || idx === lastDrawnFrame) return;
    lastDrawnFrame = idx;
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    ctx.clearRect(0, 0, CELL, CELL);
    ctx.drawImage(atlas, col * CELL, row * CELL, CELL, CELL, 0, 0, CELL, CELL);
  }

  atlas.onload = () => {
    atlasReady = true;
    lastDrawnFrame = -1;
    drawFrame(currentFrame);
  };
  atlas.src = ATLAS_SRC;

  let petW = isMobile() ? 100 : 132;
  let x = Math.max(EDGE_PAD, window.innerWidth - petW - (isMobile() ? 18 : 48));
  let y = 0; // altitude above floor in px
  let vx = 0;
  let vy = 0;
  let facing = -1; // -1 faces left (natural orientation), +1 faces right

  // States: idle | stroll | follow | crouch_takeoff | jump | crouch_land | strike | emote | drag | fall | sleep
  let state = 'idle';
  let currentFrame = 'idle';
  let stateStartedAt = performance.now();
  let stateUntil = 0;
  let nextAiAt = performance.now() + 3200;
  let lastInteractAt = performance.now();

  // Blinking & hover wave
  let nextBlinkAt = performance.now() + 2600 + Math.random() * 2400;
  let blinkUntil = 0;
  let hoverWaveCooldown = 0;

  // Walk & physics spring values
  let walkTargetX = x;
  let walkPhase = 0;
  let spinDeg = 0;
  let spinSpeed = 0;
  let tiltDeg = 0;
  let targetTiltDeg = 0;
  let scaleX = 1;
  let scaleY = 1;
  let targetScaleX = 1;
  let targetScaleY = 1;

  // Queued jump / strike parameters
  let pendingJump = null;
  let landEmote = 'happy';
  let queuedHop = false;
  let strikeSparked = false;
  let actionIndex = 0;
  let rapidClicks = 0;
  let rapidTimer = 0;
  let zzzTimer = 0;

  // Pointer tracking for curiosity/follow & head-pat
  const pointer = { x: -9999, y: -9999, active: false, lastMove: 0 };
  let patLastX = null;
  let patDir = 0;
  let patFlips = 0;
  let patResetTimer = 0;
  let patCooldownUntil = 0;

  // Drag state
  let pointerDown = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;
  let lastDragClientX = 0;
  let lastDragClientY = 0;
  let lastDragTime = 0;
  let dragVx = 0;
  let dragVy = 0;

  let rafId = 0;
  let lastNow = 0;

  function floorBottomPx() {
    return isMobile() ? 18 : 50;
  }

  function maxX() {
    return Math.max(EDGE_PAD, window.innerWidth - petW - EDGE_PAD);
  }

  function clampX(val) {
    return Math.min(maxX(), Math.max(EDGE_PAD, val));
  }

  function setFrame(name) {
    currentFrame = name;
    drawFrame(name);
  }

  function triggerSquash(sx, sy) {
    scaleX = sx;
    scaleY = sy;
  }

  function spawnFx(symbols, count = 4, offsetY = -74, driftUp = true) {
    if (!fxLayer || reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const node = document.createElement('span');
      node.className = driftUp ? 'pet-fx-item' : 'pet-fx-zzz';
      node.textContent = symbols[i % symbols.length];
      const spread = (i - (count - 1) / 2) * 20 + (Math.random() - 0.5) * 14;
      node.style.left = `calc(50% + ${spread.toFixed(1)}px)`;
      node.style.top = `${offsetY + (Math.random() - 0.5) * 12}px`;
      node.style.setProperty('--dx', `${((Math.random() - 0.5) * 48).toFixed(1)}px`);
      node.style.setProperty('--dy', `${(-40 - Math.random() * 28).toFixed(1)}px`);
      node.style.setProperty('--rot', `${((Math.random() - 0.5) * 32).toFixed(1)}deg`);
      fxLayer.appendChild(node);
      window.setTimeout(() => node.remove(), driftUp ? 820 : 1600);
    }
  }

  function enterIdle(now, delayMin = 3000, delayMax = 6400) {
    state = 'idle';
    stateStartedAt = now;
    vx = 0;
    vy = 0;
    y = 0;
    spinDeg = 0;
    spinSpeed = 0;
    targetTiltDeg = 0;
    queuedHop = false;
    pendingJump = null;
    setFrame('idle');
    nextAiAt = now + delayMin + Math.random() * (delayMax - delayMin);
  }

  function enterEmote(kind, durationMs, now) {
    state = 'emote';
    stateStartedAt = now;
    stateUntil = now + durationMs;
    vx = 0;
    rootEl.dataset.emote = kind;
    setFrame(kind === 'wave' ? 'idle_wave' : kind);
  }

  function startJumpArc(now, jumpVy, horizontalVx = 0, withSpin = false, onLand = 'happy', skipCrouch = false) {
    landEmote = onLand;
    if (skipCrouch) {
      state = 'jump';
      stateStartedAt = now;
      vy = jumpVy;
      vx = horizontalVx;
      spinDeg = 0;
      spinSpeed = withSpin ? (facing < 0 ? -780 : 780) : 0;
      setFrame('jump');
      triggerSquash(0.84, 1.18);
      return;
    }
    state = 'crouch_takeoff';
    stateStartedAt = now;
    stateUntil = now + 85;
    pendingJump = { jumpVy, horizontalVx, withSpin };
    setFrame('crouch');
    triggerSquash(1.16, 0.84);
  }

  function startKendoStrike(now, lungeVx = 0) {
    state = 'strike';
    stateStartedAt = now;
    stateUntil = now + 780;
    vx = lungeVx;
    strikeSparked = false;
    setFrame('swing_windup');
    triggerSquash(1.08, 0.92);
  }

  function performChoreographedClick(now) {
    lastInteractAt = now;
    rapidClicks += 1;
    clearTimeout(rapidTimer);
    rapidTimer = window.setTimeout(() => {
      rapidClicks = 0;
    }, 2200);

    if (reducedMotion.matches) {
      const order = ['idle', 'idle_wave', 'curious', 'happy', 'swing', 'sleep'];
      const next = order[(order.indexOf(currentFrame) + 1) % order.length];
      setFrame(next);
      return;
    }

    // 5+ rapid clicks combo: startled jump -> heroic kendo wind-up & strike!
    if (rapidClicks >= 5) {
      rapidClicks = 0;
      queuedHop = false;
      startJumpArc(now, 520, (Math.random() - 0.5) * 140, false, 'strike', true);
      setFrame('dangling');
      spawnFx(['!', '✦', '★'], 7, -84);
      return;
    }

    const step = actionIndex % 4;
    actionIndex += 1;
    queuedHop = false;

    if (step === 0) {
      // Full 4-phase jump arc (crouch -> jump -> fall -> crouch -> happy)
      startJumpArc(now, 515, 0, false, 'happy', false);
      spawnFx(['✦', '♪', '♥'], 5, -78);
    } else if (step === 1) {
      // Full 3-phase kendo bamboo-shinai dash strike (windup -> swing -> follow-through)
      facing = x > window.innerWidth * 0.65 ? -1 : 1;
      startKendoStrike(now, facing * 240);
    } else if (step === 2) {
      // Celebratory 360-degree airborne spin-flip landing into kendo follow-through
      startJumpArc(now, 505, facing * 75, true, 'wave', false);
      spawnFx(['★', '✦', '♪'], 5, -78);
    } else {
      // Cheerful bunny double-hop with waving finish
      queuedHop = true;
      startJumpArc(now, 355, facing * 26, false, 'happy', false);
      spawnFx(['♥', '♪', '✦'], 5, -76);
    }
  }

  /* ---------- Pointer Events: Hover Wave, Cursor Follow, Head-Pat, Drag & Toss ---------- */
  if (window.matchMedia?.('(hover: hover)').matches) {
    window.addEventListener(
      'pointermove',
      event => {
        if (event.pointerType !== 'mouse') return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
        pointer.lastMove = performance.now();

        if (state === 'sleep') {
          const petCenterX = x + petW * 0.5;
          const petCenterY = window.innerHeight - floorBottomPx() - 62;
          if (Math.hypot(pointer.x - petCenterX, pointer.y - petCenterY) < 170) {
            lastInteractAt = pointer.lastMove;
            startJumpArc(pointer.lastMove, 310, 0, false, 'wave', false);
            spawnFx(['✦', '♪'], 3, -72);
          }
        }
      },
      { passive: true },
    );
  }

  // Friendly wave when hovering over her while idle
  body.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || pointerDown || reducedMotion.matches) return;
    const now = performance.now();
    if (state === 'idle' && now > hoverWaveCooldown) {
      hoverWaveCooldown = now + 4500;
      lastInteractAt = now;
      enterEmote('wave', 1200, now);
      spawnFx(['♪'], 2, -82);
    }
  });

  // Head-pat stroke detection on upper half of MissionHub-chan
  body.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || pointerDown || reducedMotion.matches) return;
    const rect = body.getBoundingClientRect();
    const relY = (event.clientY - rect.top) / Math.max(1, rect.height);
    if (relY > 0.55) return;

    const now = performance.now();
    if (now < patCooldownUntil) return;

    if (patLastX !== null) {
      const delta = event.clientX - patLastX;
      if (Math.abs(delta) >= 6) {
        const dir = delta > 0 ? 1 : -1;
        if (patDir !== 0 && dir !== patDir) {
          patFlips += 1;
          clearTimeout(patResetTimer);
          patResetTimer = window.setTimeout(() => {
            patFlips = 0;
            patDir = 0;
          }, 1100);

          if (patFlips >= 3) {
            patFlips = 0;
            patDir = 0;
            patCooldownUntil = now + 1800;
            lastInteractAt = now;
            triggerSquash(1.18, 0.84);
            enterEmote('happy', 2200, now);
            spawnFx(['♥', '✦', '♪'], 6, -86);
          }
        }
        patDir = dir;
        patLastX = event.clientX;
      }
    } else {
      patLastX = event.clientX;
    }
  });

  body.addEventListener('pointerleave', () => {
    patLastX = null;
    patDir = 0;
    patFlips = 0;
  });

  body.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointerDown = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = x;
    dragOriginY = y;
    lastDragClientX = event.clientX;
    lastDragClientY = event.clientY;
    lastDragTime = performance.now();
    dragVx = 0;
    dragVy = 0;
    body.setPointerCapture?.(event.pointerId);
  });

  body.addEventListener('pointermove', event => {
    if (!pointerDown) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    const now = performance.now();

    if (!dragMoved && Math.hypot(dx, dy) > 6) {
      dragMoved = true;
      state = 'drag';
      stateStartedAt = now;
      queuedHop = false;
      pendingJump = null;
      lastInteractAt = now;
      rootEl.classList.add('is-dragging');
      setFrame('dangling');
      triggerSquash(0.9, 1.12);
    }
    if (!dragMoved) return;

    const dt = Math.max(0.008, (now - lastDragTime) / 1000);
    const stepX = event.clientX - lastDragClientX;
    const stepY = event.clientY - lastDragClientY;
    dragVx = dragVx * 0.55 + (stepX / dt) * 0.45;
    dragVy = dragVy * 0.55 + (-stepY / dt) * 0.45;
    lastDragClientX = event.clientX;
    lastDragClientY = event.clientY;
    lastDragTime = now;

    x = clampX(dragOriginX + dx);
    const maxY = Math.max(0, window.innerHeight - floorBottomPx() - 150);
    y = Math.min(maxY, Math.max(0, dragOriginY - dy));
    if (Math.abs(stepX) > 1.5) facing = stepX > 0 ? 1 : -1;
    targetTiltDeg = Math.max(-24, Math.min(24, -dragVx * 0.022));
  });

  function finishDrag(event) {
    if (!pointerDown) return;
    pointerDown = false;
    if (event.pointerId != null) {
      try {
        body.releasePointerCapture?.(event.pointerId);
      } catch {
        // Ignore capture errors.
      }
    }
    if (!dragMoved) return;

    rootEl.classList.remove('is-dragging');
    const now = performance.now();
    lastInteractAt = now;
    targetTiltDeg = 0;

    if (y > 4 && !reducedMotion.matches) {
      state = 'fall';
      stateStartedAt = now;
      vx = Math.max(-540, Math.min(540, dragVx * 0.45));
      vy = Math.max(-220, Math.min(480, dragVy * 0.35));
      landEmote = 'happy';
      setFrame(vy > 140 ? 'jump' : 'fall');
    } else {
      y = 0;
      state = 'crouch_land';
      stateStartedAt = now;
      stateUntil = now + 100;
      landEmote = 'happy';
      setFrame('crouch');
      triggerSquash(1.18, 0.84);
      spawnFx(['✦', '♪'], 4, -74);
    }
  }

  body.addEventListener('pointerup', finishDrag);
  body.addEventListener('pointercancel', finishDrag);

  body.addEventListener('click', () => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    performChoreographedClick(performance.now());
  });

  body.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      performChoreographedClick(performance.now());
    }
  });

  /* ---------- Main 60 FPS Physics & Multi-Frame Animation Loop ---------- */
  function tick(now) {
    const dt = lastNow ? Math.min(0.045, (now - lastNow) / 1000) : 0.016;
    lastNow = now;

    if (!reducedMotion.matches) {
      const petCenterX = x + petW * 0.5;
      const floorY = window.innerHeight - floorBottomPx();
      const nearPointer =
        pointer.active &&
        now - pointer.lastMove < 1800 &&
        pointer.y > window.innerHeight * 0.48;
      const pointerDx = pointer.x - petCenterX;
      const pointerDist = Math.hypot(pointerDx, pointer.y - (floorY - 64));

      if (state === 'idle') {
        vx *= Math.pow(0.001, dt);

        // Curious head-tilt when cursor approaches nearby
        if (nearPointer && pointerDist < 330) {
          facing = pointerDx >= 0 ? 1 : -1;
          targetTiltDeg = Math.max(-5.5, Math.min(5.5, pointerDx * 0.018));
          if (pointerDist > 125 && pointerDist < 290 && pointer.y > window.innerHeight * 0.68) {
            state = 'follow';
            stateStartedAt = now;
            walkPhase = 0;
          } else {
            setFrame('curious');
          }
        } else {
          targetTiltDeg = 0;
          // Natural periodic blinking while standing idle
          if (now >= nextBlinkAt) {
            blinkUntil = now + 135;
            nextBlinkAt = now + (Math.random() < 0.22 ? 320 : 2800 + Math.random() * 3200);
          }
          setFrame(now < blinkUntil ? 'idle_blink' : 'idle');
        }

        // Soft standing breath
        targetScaleX = 1 + Math.sin(now * 0.0032) * 0.014;
        targetScaleY = 1 - Math.sin(now * 0.0032) * 0.018;

        // Sit down to nap after 16s untouched
        if (now - lastInteractAt > 16000) {
          state = 'sleep';
          stateStartedAt = now;
          setFrame('sleep');
          triggerSquash(1.1, 0.9);
          zzzTimer = now + 900;
        } else if (now >= nextAiAt && state === 'idle') {
          const roll = Math.random();
          if (roll < 0.64) {
            const span = Math.min(360, Math.max(120, window.innerWidth * 0.3));
            const minZone = isMobile() ? EDGE_PAD : Math.max(EDGE_PAD, window.innerWidth * 0.34);
            const rawTarget = x + (Math.random() < 0.5 ? -1 : 1) * (100 + Math.random() * span);
            walkTargetX = Math.min(maxX(), Math.max(minZone, rawTarget));
            if (Math.abs(walkTargetX - x) < 48) {
              walkTargetX = x > window.innerWidth * 0.7 ? clampX(x - 180) : clampX(x + 180);
            }
            facing = walkTargetX >= x ? 1 : -1;
            walkPhase = 0;
            state = 'stroll';
            stateStartedAt = now;
          } else if (roll < 0.84) {
            // Spontaneous 3-phase kendo practice swing in place
            startKendoStrike(now, facing * 90);
          } else {
            // Friendly autonomous wave / cheer
            enterEmote('wave', 1500, now);
            spawnFx(['♪'], 2, -82);
          }
        }
      } else if (state === 'stroll' || state === 'follow') {
        let destX = walkTargetX;
        let maxSpeed = 96;

        if (state === 'follow') {
          if (!nearPointer || pointerDist > 360 || pointer.y < window.innerHeight * 0.54) {
            enterIdle(now, 2400, 4800);
          } else {
            destX = clampX(pointer.x - petW * 0.5 - Math.sign(pointerDx || 1) * 82);
            maxSpeed = 144;
          }
        }

        if (state === 'stroll' || state === 'follow') {
          const diff = destX - x;
          const absDiff = Math.abs(diff);
          if (absDiff <= 6) {
            vx = 0;
            y = 0;
            if (state === 'follow') {
              facing = pointerDx >= 0 ? 1 : -1;
              enterEmote('happy', 1350, now);
              spawnFx(['✦', '♪'], 2, -78);
            } else {
              enterIdle(now, 3200, 6800);
            }
          } else {
            const dir = Math.sign(diff);
            facing = dir;
            // Smooth ease-in acceleration & ease-out braking near destination
            const brake = Math.min(1, absDiff / 48);
            const desiredVx = dir * maxSpeed * Math.max(0.28, brake);
            vx += (desiredVx - vx) * Math.min(1, dt * 11);
            x = clampX(x + vx * dt);

            // 4-frame stride cycle driven smoothly by real travel speed
            walkPhase += Math.abs(vx) * dt * 0.085;
            const frameIdx = Math.floor(walkPhase) % WALK_SEQ.length;
            setFrame(WALK_SEQ[frameIdx]);

            // Subtle rhythmic chibi step-bob synced to 4-frame walk cycle
            y = Math.abs(Math.sin(walkPhase * Math.PI * 0.5)) * 5.2;
            targetTiltDeg = (vx / maxSpeed) * 4.5 + Math.sin(walkPhase * Math.PI) * 1.8;
            targetScaleX = 1.015;
            targetScaleY = 0.985;
          }
        }
      } else if (state === 'crouch_takeoff') {
        y = 0;
        targetTiltDeg = 0;
        targetScaleX = 1.12;
        targetScaleY = 0.88;
        if (now >= stateUntil && pendingJump) {
          const { jumpVy, horizontalVx, withSpin } = pendingJump;
          pendingJump = null;
          startJumpArc(now, jumpVy, horizontalVx, withSpin, landEmote, true);
        }
      } else if (state === 'crouch_land') {
        y = 0;
        vx = 0;
        targetTiltDeg = 0;
        targetScaleX = 1.1;
        targetScaleY = 0.9;
        if (now >= stateUntil) {
          if (queuedHop) {
            queuedHop = false;
            facing = -facing;
            startJumpArc(now, 365, facing * 24, false, 'happy', true);
            spawnFx(['✦', '♪'], 3, -76);
          } else if (landEmote === 'strike') {
            startKendoStrike(now, facing * 130);
          } else {
            enterEmote(landEmote || 'happy', 1450, now);
          }
        }
      } else if (state === 'strike') {
        // 3-phase kendo strike: windup (0..135ms) -> swing impact (135..275ms) -> follow-through (275..780ms)
        const elapsed = now - stateStartedAt;
        if (elapsed < 135) {
          setFrame('swing_windup');
          targetTiltDeg = -facing * 4;
          targetScaleX = 1.04;
          targetScaleY = 0.96;
        } else if (elapsed < 275) {
          setFrame('swing');
          x = clampX(x + vx * dt);
          vx *= Math.pow(0.18, dt);
          y = Math.sin(((elapsed - 135) / 140) * Math.PI) * 10;
          targetTiltDeg = facing * 6;
          targetScaleX = 1.08;
          targetScaleY = 0.94;
          if (!strikeSparked) {
            strikeSparked = true;
            spawnFx(['✦', '★', '✦'], 6, -66);
          }
        } else {
          setFrame('swing_follow');
          x = clampX(x + vx * dt);
          vx *= Math.pow(0.015, dt);
          y = 0;
          targetTiltDeg = facing * 2;
          targetScaleX = 1;
          targetScaleY = 1;
        }
        if (now >= stateUntil) {
          enterIdle(now, 3000, 6400);
        }
      } else if (state === 'emote') {
        const elapsed = now - stateStartedAt;
        const kind = rootEl.dataset.emote || 'happy';
        if (kind === 'happy') {
          // Animated 2-frame celebration wiggle (happy <-> idle_wave)
          setFrame(Math.floor(elapsed / 240) % 2 === 0 ? 'happy' : 'idle_wave');
          const phase = elapsed * 0.014;
          y = Math.abs(Math.sin(phase)) * 4.5;
          targetTiltDeg = Math.sin(phase) * 4.2;
        } else if (kind === 'wave') {
          setFrame(Math.floor(elapsed / 320) % 2 === 0 ? 'idle_wave' : 'idle');
          y = 0;
          targetTiltDeg = Math.sin(elapsed * 0.01) * 3.5;
        } else {
          y = 0;
          targetTiltDeg = 0;
        }
        targetScaleX = 1;
        targetScaleY = 1;
        if (now >= stateUntil) {
          enterIdle(now, 3000, 6400);
        }
      } else if (state === 'jump' || state === 'fall') {
        vy -= GRAVITY * dt;
        x += vx * dt;
        y += vy * dt;

        // Switch smoothly from rising jump frame to descending fall frame past apex
        if (currentFrame !== 'dangling') {
          setFrame(vy > 45 ? 'jump' : 'fall');
        }

        // Soft wall bounce when tossed against left/right screen edge
        if (x < EDGE_PAD) {
          x = EDGE_PAD;
          vx = Math.abs(vx) * 0.55;
          facing = 1;
        } else if (x > maxX()) {
          x = maxX();
          vx = -Math.abs(vx) * 0.55;
          facing = -1;
        }

        if (spinSpeed) {
          spinDeg += spinSpeed * dt;
          if (Math.abs(spinDeg) >= 360) {
            spinDeg = 0;
            spinSpeed = 0;
          }
        } else {
          targetTiltDeg = Math.max(-16, Math.min(16, vx * 0.024));
        }

        targetScaleX = vy > 0 ? 0.92 : 0.96;
        targetScaleY = vy > 0 ? 1.09 : 1.04;

        if (y <= 0) {
          y = 0;
          const impact = Math.abs(vy);
          vx = 0;
          vy = 0;
          spinDeg = 0;
          spinSpeed = 0;
          targetTiltDeg = 0;
          state = 'crouch_land';
          stateStartedAt = now;
          stateUntil = now + 95;
          setFrame('crouch');
          triggerSquash(1.22, 0.78);
          if (impact > 340) {
            spawnFx(['✦', '♪'], 4, -24);
          }
        }
      } else if (state === 'sleep') {
        // Gentle 2-frame breathing nap (sleep <-> sleep2)
        const elapsed = now - stateStartedAt;
        setFrame(Math.floor(elapsed / 1150) % 2 === 0 ? 'sleep' : 'sleep2');
        y = 0;
        targetTiltDeg = Math.sin(now * 0.0018) * 1.8;
        targetScaleX = 1 + Math.sin(now * 0.0024) * 0.018;
        targetScaleY = 1 - Math.sin(now * 0.0024) * 0.02;
        if (now >= zzzTimer) {
          zzzTimer = now + 1850;
          spawnFx(['z', 'Z'], 1, -76, false);
        }
      } else if (state === 'drag') {
        // Playful 2-frame mid-air foot kicking (dangling <-> dangling2)
        const elapsed = now - stateStartedAt;
        setFrame(Math.floor(elapsed / 170) % 2 === 0 ? 'dangling' : 'dangling2');
        targetScaleX = 0.95;
        targetScaleY = 1.05;
        // Relax pendulum back toward 0 when mouse holds steady
        targetTiltDeg *= Math.pow(0.08, dt);
      }

      // Smooth spring damping on scale & tilt for fluid 60 FPS motion
      scaleX += (targetScaleX - scaleX) * Math.min(1, dt * 14);
      scaleY += (targetScaleY - scaleY) * Math.min(1, dt * 14);
      tiltDeg += (targetTiltDeg - tiltDeg) * Math.min(1, dt * 12);
    }

    const flip = -facing;
    mover.style.transform = `translate3d(${x.toFixed(1)}px, ${(-y).toFixed(1)}px, 0)`;
    body.style.transform = `rotate(${(tiltDeg + spinDeg).toFixed(1)}deg) scale(${(scaleX * flip).toFixed(3)}, ${scaleY.toFixed(3)})`;

    const heightRatio = Math.max(0.32, 1 - y / 340);
    shadow.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scaleX(${heightRatio.toFixed(3)}) scaleY(${(0.75 + heightRatio * 0.25).toFixed(3)})`;
    shadow.style.opacity = (0.14 + heightRatio * 0.28).toFixed(3);

    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId || document.hidden) return;
    lastNow = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function onResize() {
    petW = isMobile() ? 100 : 132;
    x = clampX(x);
  }

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else startLoop();
  });

  rootEl.dataset.pose = 'idle';
  startLoop();
}

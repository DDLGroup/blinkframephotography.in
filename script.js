/**
 * BLINK FRAME PHOTOGRAPHY
 * Wedding Photography & Films • Luxury Maintenance Page
 * Features: Shutter Opening Intro, Web Audio Synthesizer, 7-Day Countdown, Particle Canvas
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIS VIA WEB AUDIO API (NO EXTERNAL MP3 DEPENDENCIES) ---
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * Synthesizes a realistic mechanical DSLR shutter sound:
   * 1. Mirror reflex flip (low thump + subtle noise)
   * 2. Mechanical shutter curtain opening click (metallic ping)
   * 3. Curtain closing snap (snappy transients)
   */
  function playShutterSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      // 1. First Mirror Up Clack (Noise burst + Low frequency pitch drop)
      const bufferSize = audioCtx.sampleRate * 0.05; // 50ms buffer
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200, now);
      noiseFilter.Q.setValueAtTime(3, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      whiteNoise.start(now);

      // Low frequency mechanical body thud
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.06);

      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.065);

      // 2. Second Curtain Snap after 55ms
      const snapTime = now + 0.055;
      const snapOsc = audioCtx.createOscillator();
      const snapGain = audioCtx.createGain();
      const snapFilter = audioCtx.createBiquadFilter();

      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(2400, snapTime);
      snapOsc.frequency.exponentialRampToValueAtTime(180, snapTime + 0.04);

      snapFilter.type = 'highpass';
      snapFilter.frequency.setValueAtTime(800, snapTime);

      snapGain.gain.setValueAtTime(0.8, snapTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.045);

      snapOsc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(audioCtx.destination);
      snapOsc.start(snapTime);
      snapOsc.stop(snapTime + 0.05);

    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  // --- TRIGGER FLASH AND SHUTTER SNAP ---
  const interactiveFlash = document.getElementById('interactiveFlash');
  const snapTriggerBtn = document.getElementById('snapTriggerBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const logoWrapper = document.getElementById('logoWrapper');

  function triggerCameraSnap() {
    playShutterSound();

    if (interactiveFlash) {
      interactiveFlash.classList.remove('firing');
      void interactiveFlash.offsetWidth; // Trigger reflow
      interactiveFlash.classList.add('firing');
      setTimeout(() => {
        interactiveFlash.classList.remove('firing');
      }, 250);
    }

    if (logoWrapper) {
      logoWrapper.style.transform = 'scale(0.96)';
      setTimeout(() => {
        logoWrapper.style.transform = '';
      }, 200);
    }
  }

  if (snapTriggerBtn) {
    snapTriggerBtn.addEventListener('click', triggerCameraSnap);
  }

  if (logoWrapper) {
    logoWrapper.addEventListener('click', triggerCameraSnap);
  }

  // Sound toggle button handler
  if (soundToggleBtn && soundIcon) {
    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        soundIcon.className = 'fa-solid fa-volume-high';
        soundToggleBtn.title = 'Sound: ON (Click to Mute)';
        triggerCameraSnap();
      } else {
        soundIcon.className = 'fa-solid fa-volume-xmark';
        soundToggleBtn.title = 'Sound: MUTED (Click to Enable)';
      }
    });
  }

  // --- OPENING CAMERA SHUTTER SEQUENCE ---
  const shutterOverlay = document.getElementById('shutterIntro');
  const cameraFlash = document.getElementById('cameraFlash');

  function runOpeningSequence() {
    // Attempt audio unlock on first user gesture or default
    const unlockAudio = () => {
      initAudio();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    setTimeout(() => {
      playShutterSound();

      if (cameraFlash) {
        cameraFlash.classList.add('flash-active');
      }

      if (shutterOverlay) {
        shutterOverlay.classList.add('opening');
        setTimeout(() => {
          shutterOverlay.classList.add('completed');
        }, 1100);
      }
    }, 600);
  }

  // --- 7-DAY AUTOMATIC PERSISTENT COUNTDOWN ---
  const STORAGE_KEY = 'blinkframe_countdown_deadline_v1';
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  function getTargetDeadline() {
    let stored = localStorage.getItem(STORAGE_KEY);
    let deadline = stored ? parseInt(stored, 10) : NaN;
    const now = Date.now();

    // If no deadline or deadline has expired by more than 1 hour, reset to fresh 7 days
    if (isNaN(deadline) || deadline <= now) {
      deadline = now + SEVEN_DAYS_MS;
      localStorage.setItem(STORAGE_KEY, deadline.toString());
    }
    return deadline;
  }

  const targetDeadline = getTargetDeadline();

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');

  let prevVals = { days: '', hours: '', minutes: '', seconds: '' };

  function updateCountdown() {
    const now = Date.now();
    const remaining = Math.max(0, targetDeadline - now);

    const totalSeconds = Math.floor(remaining / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const dStr = String(d).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');

    animateDigit(daysEl, dStr, 'days');
    animateDigit(hoursEl, hStr, 'hours');
    animateDigit(minutesEl, mStr, 'minutes');
    animateDigit(secondsEl, sStr, 'seconds');

    // Calculate dynamic preparation percentage (starts at 85% and progresses towards 99%)
    const elapsedRatio = 1 - (remaining / SEVEN_DAYS_MS);
    const calcPercent = Math.min(99, Math.max(85, Math.floor(85 + elapsedRatio * 14)));
    if (progressBar && progressPercent) {
      progressBar.style.width = calcPercent + '%';
      progressPercent.textContent = calcPercent + '%';
    }
  }

  function animateDigit(el, newVal, key) {
    if (!el) return;
    if (prevVals[key] !== newVal) {
      el.textContent = newVal;
      el.style.transform = 'scale(1.12)';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 150);
      prevVals[key] = newVal;
    }
  }

  // Update countdown immediately then tick every 1 second
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- LIVE CAMERA TIMECODE HUD (00:00:07:xx) ---
  const liveTimecodeEl = document.getElementById('liveTimecode');
  let frameCount = 0;
  let secondsRunning = 7;
  let minutesRunning = 0;
  let hoursRunning = 0;

  function updateTimecode() {
    frameCount++;
    if (frameCount >= 60) {
      frameCount = 0;
      secondsRunning++;
      if (secondsRunning >= 60) {
        secondsRunning = 0;
        minutesRunning++;
        if (minutesRunning >= 60) {
          minutesRunning = 0;
          hoursRunning++;
        }
      }
    }

    if (liveTimecodeEl) {
      const hh = String(hoursRunning).padStart(2, '0');
      const mm = String(minutesRunning).padStart(2, '0');
      const ss = String(secondsRunning).padStart(2, '0');
      const ff = String(frameCount).padStart(2, '0');
      liveTimecodeEl.textContent = `${hh}:${mm}:${ss}:${ff}`;
    }
    requestAnimationFrame(updateTimecode);
  }
  requestAnimationFrame(updateTimecode);

  // --- CURRENT YEAR COPYRIGHT ---
  const currentYearEl = document.getElementById('currentYear');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // --- QUICK INQUIRY FORM DIRECT TO WHATSAPP ---
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('inqName').value.trim();
      const phone = document.getElementById('inqPhone').value.trim();
      const eventDetails = document.getElementById('inqEvent').value.trim();

      const messageText = `Hi Blink Frame Photography,\nI would like to inquire about wedding/film bookings.\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Event & City:* ${eventDetails}\n\nPlease share your packages and availability.`;
      
      const whatsappUrl = `https://wa.me/917001870391?text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank');
    });
  }

  // --- 3D TILT EFFECT ON LOGO ---
  if (logoWrapper) {
    logoWrapper.addEventListener('mousemove', (e) => {
      const rect = logoWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const tiltX = (y / (rect.height / 2)) * -12;
      const tiltY = (x / (rect.width / 2)) * 12;
      logoWrapper.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
    });

    logoWrapper.addEventListener('mouseleave', () => {
      logoWrapper.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  // --- GOLDEN BOKEH PARTICLES CANVAS SYSTEM ---
  const canvas = document.getElementById('bokehCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let width = 0;
    let height = 0;

    function resizeCanvas() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const count = Math.floor((width * height) / 18000); // Responsive particle density
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 4 + 1.2,
          speedY: Math.random() * 0.4 + 0.15,
          speedX: (Math.random() - 0.5) * 0.25,
          opacity: Math.random() * 0.6 + 0.15,
          color: Math.random() > 0.3 ? '#d4af37' : '#faebb3',
          pulseSpeed: Math.random() * 0.02 + 0.005,
          pulseVal: Math.random() * Math.PI
        });
      }
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY;
        p.x += p.speedX;
        p.pulseVal += p.pulseSpeed;

        const currentOpacity = p.opacity + Math.sin(p.pulseVal) * 0.15;

        // Wrap around borders smoothly
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(renderParticles);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(renderParticles);
  }

  // --- INITIALIZE OPENING ON DOM READY ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOpeningSequence);
  } else {
    runOpeningSequence();
  }

})();

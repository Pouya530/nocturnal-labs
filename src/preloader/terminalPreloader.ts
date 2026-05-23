import { BOOT_SCRIPT, type BootLine } from '@/preloader/bootScript';

const FADE_OUT_MS = 500;

export type TerminalPreloaderOpts = {
  /** When dismissal fade begins (parallel with backdrop / early hooks). */
  onGone?: () => void;
  /** When fade-out has finished and the overlay is removed — use for hero intros. */
  onFadeComplete?: () => void;
  /** Skip slow streaming (also implied when `reduced` is true). */
  fast?: boolean;
  /** If true, auto-dismiss after `autoAdvanceMs` from when the prompt becomes visible. */
  autoAdvance?: boolean;
  autoAdvanceMs?: number;
  timeScale?: number;
  /** `prefers-reduced-motion` — compresses boot timing. */
  reduced?: boolean;
  /** Dev wormhole5: visible ENTER control; dismiss via Enter key or button (no auto-advance). */
  enterToProceed?: boolean;
  /** Fires when user presses Enter / ENTER (arm ambient audio, etc.). */
  onEnterProceed?: () => void;
};

let activeTeardown: (() => void) | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildLineHtml(line: BootLine, scheduledAtMs: number): string {
  const ts = (scheduledAtMs / 1000).toFixed(6).padStart(10, ' ');
  const tsHtml = `<span class="ts">[${ts}]</span>`;

  let tagHtml = '';
  if (line.tag === 'OK') tagHtml = ' <span class="ok">[  OK  ]</span>';
  if (line.tag === 'WARN') tagHtml = ' <span class="warn">[ WARN ]</span>';
  if (line.tag === 'FAIL') tagHtml = ' <span class="fail">[ FAIL ]</span>';
  if (line.tag === 'INFO') tagHtml = ' <span class="info">[ INFO ]</span>';

  const serviceHtml = line.service ? ` <span class="svc">${escapeHtml(line.service)}:</span>` : '';

  let messageHtml = escapeHtml(line.message);
  if (line.highlight) {
    for (const h of line.highlight) {
      const escaped = escapeHtml(h);
      messageHtml = messageHtml.split(escaped).join(`<span class="bright">${escaped}</span>`);
    }
  }
  if (line.special) {
    for (const s of line.special) {
      const escaped = escapeHtml(s);
      messageHtml = messageHtml.split(escaped).join(`<span class="special">${escaped}</span>`);
    }
  }

  return `${tsHtml}${tagHtml}${serviceHtml} ${messageHtml}`;
}

/**
 * Mounts the terminal boot overlay on `document.body`.
 * @returns Teardown for React cleanup: aborts mid-boot without callbacks; if a user dismiss is mid-fade, completes `onFadeComplete`.
 */
export function mountTerminalPreloader(opts: TerminalPreloaderOpts): () => void {
  const fast = opts.fast === true || opts.reduced === true;
  const timeScale = fast ? 0.05 : (opts.timeScale ?? 1);
  const autoAdvance = opts.autoAdvance ?? true;
  const autoAdvanceMs = opts.autoAdvanceMs ?? 1800;

  const root = document.createElement('div');
  root.id = 'term-preloader';
  root.className = 'term-preloader';
  root.setAttribute('aria-label', 'Booting application');
  root.setAttribute('role', 'status');
  root.innerHTML = `
      <div class="term-preloader__inner">
        <div class="term-preloader__output" id="term-output"></div>
        <div class="term-preloader__progress" id="term-progress">
          <span class="term-preloader__progress-bar" id="term-progress-bar"></span>
          <span class="term-preloader__progress-pct" id="term-progress-pct">0%</span>
        </div>
        <div class="term-preloader__prompt" id="term-prompt" aria-hidden="true">
          <span class="term-preloader__cursor" aria-hidden="true">▊</span>
          <span class="term-preloader__prompt-text">${
            opts.enterToProceed
              ? 'press enter to enter the labs'
              : 'press any key to enter the labs…'
          }</span>
          ${
            opts.enterToProceed
              ? `<button type="button" class="term-preloader__enter-btn" id="term-enter-btn" aria-label="Enter the labs">ENTER</button>`
              : ''
          }
        </div>
      </div>
    `;
  document.body.appendChild(root);

  const output = root.querySelector('#term-output') as HTMLDivElement;
  const progressBar = root.querySelector('#term-progress-bar') as HTMLSpanElement;
  const progressPct = root.querySelector('#term-progress-pct') as HTMLSpanElement;
  const prompt = root.querySelector('#term-prompt') as HTMLDivElement;
  const enterBtn = root.querySelector('#term-enter-btn') as HTMLButtonElement | null;
  const enterOnly = opts.enterToProceed === true;

  const canProceedEnter = () => prompt.getAttribute('data-visible') === 'true';

  const proceedEnter = () => {
    if (!canProceedEnter()) return;
    opts.onEnterProceed?.();
    dismiss();
  };

  const onEnterBtnClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    proceedEnter();
  };

  const totalLines = BOOT_SCRIPT.length;
  const totalDuration = BOOT_SCRIPT.reduce((sum, l) => sum + l.delayMs, 0) * timeScale;

  let cumulativeTime = 0;
  let elapsed = 0;
  /** Stops boot timers / rAF; set by teardown or dismiss. */
  let cancelled = false;
  let fadeCompleteNotified = false;
  /** `onGone` has run and CSS fade is in flight. */
  let fadeOutStarted = false;
  const timeouts: number[] = [];

  const clearTimeouts = () => {
    for (const t of timeouts) window.clearTimeout(t);
    timeouts.length = 0;
  };

  const detachInput = () => {
    document.removeEventListener('keydown', onUserAdvance, true);
    root.removeEventListener('click', onClick);
    root.removeEventListener('touchstart', onTouch);
    enterBtn?.removeEventListener('click', onEnterBtnClick);
  };

  const finishFadeOut = () => {
    if (fadeCompleteNotified) return;
    fadeCompleteNotified = true;
    if (root.parentNode) root.remove();
    opts.onFadeComplete?.();
  };

  const dismiss = () => {
    if (fadeOutStarted) return;
    cancelled = true;
    clearTimeouts();
    detachInput();
    fadeOutStarted = true;

    opts.onGone?.();
    root.setAttribute('data-state', 'gone');

    const instantFade = fast || opts.reduced;
    if (instantFade) {
      window.setTimeout(finishFadeOut, 0);
      return;
    }

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'opacity') return;
      root.removeEventListener('transitionend', onEnd);
      finishFadeOut();
    };
    root.addEventListener('transitionend', onEnd);
    const fallback = window.setTimeout(() => {
      root.removeEventListener('transitionend', onEnd);
      finishFadeOut();
    }, FADE_OUT_MS + 120);
    timeouts.push(fallback);
  };

  function elapsedRatio(): number {
    return totalDuration <= 0 ? 1 : Math.min(1, elapsed / totalDuration);
  }

  function onUserAdvance(e: KeyboardEvent) {
    if (fadeOutStarted) return;
    if (enterOnly) {
      if (e.key === 'Enter') {
        e.preventDefault();
        proceedEnter();
      }
      return;
    }
    const allowEarly = e.key === 'Escape';
    const minProgress = 0.5;
    if (!allowEarly && elapsedRatio() < minProgress) return;
    e.preventDefault();
    dismiss();
  }

  function onClick() {
    if (fadeOutStarted || enterOnly) return;
    if (elapsedRatio() < 0.5) return;
    dismiss();
  }

  function onTouch() {
    if (fadeOutStarted || enterOnly) return;
    if (elapsedRatio() < 0.5) return;
    dismiss();
  }

  const startTime = performance.now();
  let raf = 0;
  function tick() {
    if (cancelled) return;
    elapsed = performance.now() - startTime;
    raf = window.requestAnimationFrame(tick);
  }
  raf = window.requestAnimationFrame(tick);

  const scheduleBoot = () => {
    if (cancelled) return;

    BOOT_SCRIPT.forEach((line, idx) => {
      cumulativeTime += line.delayMs * timeScale;
      const scheduledAt = cumulativeTime;
      const handle = window.setTimeout(() => {
        if (cancelled) return;
        const lineEl = document.createElement('div');
        lineEl.className = 'term-preloader__line';
        lineEl.innerHTML = buildLineHtml(line, scheduledAt);
        output.appendChild(lineEl);
        requestAnimationFrame(() => {
          output.scrollTop = output.scrollHeight;
        });

        const pct = Math.min(100, ((idx + 1) / totalLines) * 100);
        progressBar.style.setProperty('--term-progress', `${pct}%`);
        progressPct.textContent = `${Math.round(pct)}%`;

        if (idx === totalLines - 1) {
          const finishHandle = window.setTimeout(() => {
            if (cancelled) return;
            prompt.setAttribute('data-visible', 'true');
            prompt.setAttribute('aria-hidden', 'false');

            if (autoAdvance) {
              const advanceHandle = window.setTimeout(() => {
                if (cancelled) return;
                dismiss();
              }, autoAdvanceMs);
              timeouts.push(advanceHandle);
            }
          }, 200);
          timeouts.push(finishHandle);
        }
      }, scheduledAt);
      timeouts.push(handle);
    });
  };

  const onWindowLoad = () => scheduleBoot();
  if (document.readyState === 'complete') scheduleBoot();
  else window.addEventListener('load', onWindowLoad, { once: true });

  document.addEventListener('keydown', onUserAdvance, true);
  if (!enterOnly) {
    root.addEventListener('click', onClick);
    root.addEventListener('touchstart', onTouch, { passive: true });
  }
  enterBtn?.addEventListener('click', onEnterBtnClick);

  const teardown = () => {
    window.removeEventListener('load', onWindowLoad);
    cancelled = true;
    window.cancelAnimationFrame(raf);
    clearTimeouts();
    detachInput();
    if (fadeOutStarted && !fadeCompleteNotified) {
      finishFadeOut();
      return;
    }
    if (!fadeCompleteNotified && root.parentNode) root.remove();
  };

  activeTeardown?.();
  activeTeardown = teardown;
  return teardown;
}

export function unmountTerminalPreloader(): void {
  const fn = activeTeardown;
  activeTeardown = null;
  fn?.();
}

/**
 * Quick full-screen black fade on portrait ↔ landscape (touch phones).
 * Hides layout/WebGL reflow during orientation changes.
 */

export const ORIENTATION_FADE_IN_MS = 140;
export const ORIENTATION_FADE_HOLD_MS = 70;
export const ORIENTATION_FADE_OUT_MS = 220;

export function runOrientationTransitionFade(onComplete?: () => void): () => void {
  if (typeof document === 'undefined') {
    onComplete?.();
    return () => {};
  }

  const el = document.createElement('div');
  el.className = 'nl-orientation-transition-fade';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  let done = false;
  let revealed = false;

  const teardown = () => {
    if (done) return;
    done = true;
    el.remove();
  };

  const fadeOut = () => {
    if (revealed) return;
    revealed = true;
    el.classList.remove('nl-orientation-transition-fade--cover');
    el.classList.add('nl-orientation-transition-fade--reveal');

    const finish = () => {
      teardown();
      onComplete?.();
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', onEnd);
      finish();
    };
    el.addEventListener('transitionend', onEnd);

    window.setTimeout(() => {
      el.removeEventListener('transitionend', onEnd);
      finish();
    }, ORIENTATION_FADE_OUT_MS + 80);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('nl-orientation-transition-fade--cover');
    });
  });

  const onCoverEnd = (e: TransitionEvent) => {
    if (e.target !== el || e.propertyName !== 'opacity' || !el.classList.contains('nl-orientation-transition-fade--cover')) {
      return;
    }
    el.removeEventListener('transitionend', onCoverEnd);
    window.setTimeout(fadeOut, ORIENTATION_FADE_HOLD_MS);
  };
  el.addEventListener('transitionend', onCoverEnd);

  window.setTimeout(() => {
    el.removeEventListener('transitionend', onCoverEnd);
    if (!revealed) window.setTimeout(fadeOut, ORIENTATION_FADE_HOLD_MS);
  }, ORIENTATION_FADE_IN_MS + 120);

  return teardown;
}

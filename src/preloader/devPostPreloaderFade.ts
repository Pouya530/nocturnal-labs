/** Full-screen black → transparent after the terminal preloader dismisses (all environments; skipped when reduced motion). */

export const DEV_POST_PRELOADER_FADE_MS = 480;

export type DevPostPreloaderFadeHandle = {
  fadeOut: (onComplete: () => void) => void;
  teardown: () => void;
};

/** Full-screen black (call on terminal `onGone` so it sits under the fading terminal). */
export function mountDevPostPreloaderBlackCover(): DevPostPreloaderFadeHandle | null {
  if (typeof document === 'undefined') return null;

  const el = document.createElement('div');
  el.className = 'nl-post-preloader-fade';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  let done = false;

  const teardown = () => {
    if (done) return;
    done = true;
    el.remove();
  };

  const fadeOut = (onComplete: () => void) => {
    if (done) {
      onComplete();
      return;
    }

    let faded = false;
    const finish = () => {
      if (faded) return;
      faded = true;
      done = true;
      el.remove();
      onComplete();
    };

    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('nl-post-preloader-fade--out')));

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', onEnd);
      finish();
    };
    el.addEventListener('transitionend', onEnd);

    window.setTimeout(() => {
      el.removeEventListener('transitionend', onEnd);
      finish();
    }, DEV_POST_PRELOADER_FADE_MS + 100);
  };

  return { fadeOut, teardown };
}

/** Mount + fade in one step (no terminal overlap). */
export function runDevPostPreloaderBlackFade(
  onComplete: () => void,
  reduced = false,
): () => void {
  if (reduced) {
    onComplete();
    return () => {};
  }
  const handle = mountDevPostPreloaderBlackCover();
  if (!handle) {
    onComplete();
    return () => {};
  }
  handle.fadeOut(onComplete);
  return handle.teardown;
}

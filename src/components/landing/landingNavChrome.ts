/**
 * Shared visual chrome for `LandingTopNav` and `MobileBurgerNav`
 * (matches top-left “Nocturnal Labs” link).
 */
export const LANDING_NAV_LABEL_CLASS =
  'coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke text-[12px] font-medium uppercase leading-[1.5] tracking-[0.28em] transition-opacity hover:opacity-90 focus-visible:opacity-100 outline-none focus:outline-none focus-visible:outline-none';

/** Large fullscreen menu links — iridescent chrome; sizes + motion from UNIVERSAL_MENU (CSS module). */
export const LANDING_NAV_MENU_MAIN_LINK_CLASS =
  'coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke inline-block font-semibold leading-none tracking-[-0.02em] outline-none focus:outline-none focus-visible:outline-none';

/** Secondary row — iridescent chrome; sizes from UNIVERSAL_MENU (CSS module). */
export const LANDING_NAV_MENU_SECOND_LINK_CLASS =
  'coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke inline-block font-normal leading-none outline-none focus:outline-none focus-visible:outline-none';

/**
 * Burger MENU/CLOSE — Universal responsive label sizes (`landing-nav-menu-label-universal`) + iridescent chrome.
 * Use instead of `LANDING_NAV_LABEL_CLASS` on the trigger (that constant fixes `text-[12px]` for the top bar only).
 */
export const LANDING_NAV_MENU_TRIGGER_LABEL_CLASS =
  'coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke font-medium uppercase leading-[1.5] tracking-[0.28em] transition-opacity hover:opacity-90 focus-visible:opacity-100 outline-none focus:outline-none focus-visible:outline-none landing-nav-menu-label-universal';

/** Portaled top-right cluster — optional triggers (e.g. audio) then MENU, anchored to the right. */
export const LANDING_NAV_RIGHT_CLUSTER_CLASS =
  'landing-nav-right-cluster fixed z-[9988] pointer-events-auto inline-flex flex-row flex-nowrap items-center justify-end gap-3 min-[800px]:gap-[14px] min-[1200px]:gap-4 right-[max(1.25rem,env(safe-area-inset-right))] top-1 min-h-11';

/** Inner trigger button — same height/gap as universal menu burger. */
export const LANDING_NAV_TRIGGER_BTN_CLASS =
  'landing-nav-trigger relative flex shrink-0 flex-nowrap min-h-11 items-center border-0 bg-transparent p-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none gap-3 min-[800px]:gap-[14px] min-[1200px]:gap-4';

/** Icon slot — matches `.landing-nav-burger-lines` width tiers. */
export const LANDING_NAV_TRIGGER_ICON_CLASS = 'landing-nav-trigger-icon';

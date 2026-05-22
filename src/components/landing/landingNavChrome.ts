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

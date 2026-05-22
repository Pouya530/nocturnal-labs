/**
 * Early boot: inject `<style id="nl-boot-chrome-hide">` (see root layout `beforeInteractive`
 * script) so fixed header/footer are hidden until {@link SitePreloader} mounts the terminal overlay.
 */
export const NL_BOOT_CHROME_HIDE_STYLE_ID = 'nl-boot-chrome-hide';

/** Applied to fixed chrome — paired with injected CSS until preloader mounts. */
export const NL_BOOT_HIDE_CHROME_CLASS = 'nl-boot-hide-until-preloader';

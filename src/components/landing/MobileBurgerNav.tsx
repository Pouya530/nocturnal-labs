'use client';

import type { MouseEvent, ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import {
  LANDING_NAV_MENU_MAIN_LINK_CLASS,
  LANDING_NAV_MENU_SECOND_LINK_CLASS,
  LANDING_NAV_MENU_TRIGGER_LABEL_CLASS,
  LANDING_NAV_RIGHT_CLUSTER_CLASS,
  LANDING_NAV_TRIGGER_BTN_CLASS,
} from '@/components/landing/landingNavChrome';
import {
  CONTACT_HREF,
  NEWS_HREF,
  NOCTURNAL_CLOUD_HREF,
  NOCTURNAL_LABS_HREF,
  PORTFOLIO_HREF,
} from '@/components/landing/landingNavLinks';
import { motionPrefs } from '@/core/motion';
import { dmSans } from '@/lib/fonts';

import styles from '@/components/landing/MobileBurgerNav.module.css';

const burgerBtnClass = [
  'landing-nav-burger',
  LANDING_NAV_TRIGGER_BTN_CLASS,
].join(' ');

/**
 * Fullscreen universal nav (all viewports) — UNIVERSAL_MENU.md timing + stagger; trigger matches brand chrome.
 */
export function MobileBurgerNav({ prepend }: { prepend?: ReactNode }): ReactElement | null {
  const menuId = useId();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const reducedMotion = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      return;
    }
    /* Reserve scrollbar width so toggling overflow does not reflow the viewport (major jitter source). */
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = gutter > 0 ? `${gutter}px` : '';
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const setClosed = useCallback(() => {
    setOpen(false);
  }, []);

  const onBurgerClick = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const onNavClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('a')) setClosed();
    },
    [setClosed],
  );

  if (!mounted) return null;

  const portal = (
    <>
      <div className={[LANDING_NAV_RIGHT_CLUSTER_CLASS, dmSans.className].join(' ')}>
        {prepend ? <div className="landing-nav-right-cluster__prepend shrink-0">{prepend}</div> : null}
        <button
          ref={burgerRef}
          type="button"
          className={[burgerBtnClass, 'shrink-0', dmSans.className].join(' ')}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={onBurgerClick}
        >
          <span className="landing-nav-burger-lines" aria-hidden>
            <span className="landing-nav-burger-line" />
            <span className="landing-nav-burger-line" />
          </span>
          <span className={LANDING_NAV_MENU_TRIGGER_LABEL_CLASS}>{open ? 'CLOSE' : 'MENU'}</span>
        </button>
      </div>

      <nav
        id={menuId}
        className={[
          styles.menu,
          dmSans.className,
          reducedMotion ? styles.noStagger : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!open}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        onClick={onNavClick}
      >
        <div className={styles.menuPanel}>
          <div className={styles.menuInner}>
            <ul className={[styles.list, styles.listMain].join(' ')}>
              <li>
                <Link className={LANDING_NAV_MENU_MAIN_LINK_CLASS} href={NOCTURNAL_LABS_HREF}>
                  Nocturnal Labs
                </Link>
              </li>
              <li>
                <a
                  className={LANDING_NAV_MENU_MAIN_LINK_CLASS}
                  href={PORTFOLIO_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Portfolio
                </a>
              </li>
              <li>
                <a
                  className={LANDING_NAV_MENU_MAIN_LINK_CLASS}
                  href={NEWS_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  News
                </a>
              </li>
            </ul>

            <div className={styles.divider} aria-hidden />

            <ul className={[styles.list, styles.listSecond].join(' ')}>
              <li>
                <a
                  className={LANDING_NAV_MENU_SECOND_LINK_CLASS}
                  href={CONTACT_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact
                </a>
              </li>
            </ul>

            <footer className={styles.menuFooter}>
              <a
                className={styles.menuFooterLink}
                href={NOCTURNAL_CLOUD_HREF}
                target="_blank"
                rel="noopener noreferrer"
              >
                © 2026 NOCTURNAL CLOUD
              </a>
            </footer>
          </div>
        </div>
      </nav>
    </>
  );

  return createPortal(portal, document.body);
}

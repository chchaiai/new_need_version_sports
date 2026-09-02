"use client";

import { useEffect } from "react";

const SCROLLBAR_FADE_DELAY_MS = 800;
const SCROLLING_ATTRIBUTE = "data-scrollbar-scrolling";

/**
 * Adds a short-lived state to whichever surface is currently scrolling.
 * Visual styling remains in globals.css so every present and future scroll
 * container automatically follows the same scrollbar design.
 */
export function ScrollbarManager() {
  useEffect(() => {
    const fadeTimers = new Map<HTMLElement, number>();

    const revealScrollbar = (target: HTMLElement) => {
      const currentTimer = fadeTimers.get(target);
      if (currentTimer !== undefined) {
        window.clearTimeout(currentTimer);
      } else {
        target.setAttribute(SCROLLING_ATTRIBUTE, "true");
      }

      const fadeTimer = window.setTimeout(() => {
        target.removeAttribute(SCROLLING_ATTRIBUTE);
        fadeTimers.delete(target);
      }, SCROLLBAR_FADE_DELAY_MS);

      fadeTimers.set(target, fadeTimer);
    };

    const handleElementScroll = (event: Event) => {
      if (event.target instanceof HTMLElement) {
        revealScrollbar(event.target);
      }
    };

    const handleViewportScroll = () => {
      const scrollingElement = document.scrollingElement;
      revealScrollbar(
        scrollingElement instanceof HTMLElement
          ? scrollingElement
          : document.documentElement,
      );
    };

    document.addEventListener("scroll", handleElementScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scroll", handleViewportScroll, { passive: true });

    return () => {
      document.removeEventListener("scroll", handleElementScroll, true);
      window.removeEventListener("scroll", handleViewportScroll);

      fadeTimers.forEach((timer, target) => {
        window.clearTimeout(timer);
        target.removeAttribute(SCROLLING_ATTRIBUTE);
      });
      fadeTimers.clear();
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type TabTransitionDirection = "forward" | "backward";

type TabPageTransitionProps<T extends string> = {
  activeKey: T;
  direction: TabTransitionDirection;
  renderPage: (key: T) => ReactNode;
};

type TransitionState<T extends string> = {
  displayedKey: T;
  visitedKeys: T[];
  exitingKey: T | null;
  version: number;
};

export const TAB_PAGE_TRANSITION_EXIT_FALLBACK_MS = 300;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

/**
 * Lazily keeps each visited workspace tab mounted. This preserves local controls
 * (including table scroll positions) while only the visible tab participates in layout.
 */
export function TabPageTransition<T extends string>({
  activeKey,
  direction,
  renderPage,
}: TabPageTransitionProps<T>) {
  const [transition, setTransition] = useState<TransitionState<T>>(() => ({
    displayedKey: activeKey,
    visitedKeys: [activeKey],
    exitingKey: null,
    version: 0,
  }));
  const rootRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef<HTMLDivElement>(null);
  const exitingPageRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (activeKey !== transition.displayedKey || (prefersReducedMotion && transition.exitingKey)) {
    setTransition((current) => {
      if (activeKey !== current.displayedKey) {
        return {
          displayedKey: activeKey,
          visitedKeys: current.visitedKeys.includes(activeKey) ? current.visitedKeys : [...current.visitedKeys, activeKey],
          exitingKey: prefersReducedMotion ? null : current.displayedKey,
          version: current.version + 1,
        };
      }

      return current.exitingKey ? { ...current, exitingKey: null } : current;
    });
  }

  useLayoutEffect(() => {
    const container = rootRef.current;
    if (!container) return;

    if (!transition.exitingKey) {
      container.style.removeProperty("min-height");
      return;
    }

    const incomingHeight = activePageRef.current?.getBoundingClientRect().height ?? 0;
    const outgoingHeight = exitingPageRef.current?.getBoundingClientRect().height ?? 0;
    const nextMinHeight = Math.ceil(Math.max(incomingHeight, outgoingHeight));
    container.style.minHeight = `${nextMinHeight}px`;
  }, [transition.displayedKey, transition.exitingKey, transition.version]);

  useEffect(() => {
    if (!transition.exitingKey) return;

    const timeoutId = window.setTimeout(() => {
      setTransition((current) => current.exitingKey === transition.exitingKey ? { ...current, exitingKey: null } : current);
    }, TAB_PAGE_TRANSITION_EXIT_FALLBACK_MS);

    return () => window.clearTimeout(timeoutId);
  }, [transition.exitingKey]);

  return (
    <div
      ref={rootRef}
      className="teacher-tab-page-transition"
      aria-busy={transition.exitingKey ? true : undefined}
    >
      {transition.visitedKeys.map((key) => {
        const isActive = key === transition.displayedKey;
        const isExiting = key === transition.exitingKey && !isActive;
        const isEntering = isActive && transition.version > 0 && !prefersReducedMotion;
        const pageClassName = [
          "teacher-tab-page-transition__page",
          isActive ? "is-active" : isExiting ? "is-exiting" : "is-idle",
          isEntering ? "is-entering" : "",
          isEntering ? `is-${direction}` : "",
        ].filter(Boolean).join(" ");

        return (
          <div
            className={pageClassName}
            hidden={!isActive && !isExiting}
            aria-hidden={isActive ? undefined : true}
            key={key}
            ref={isActive ? activePageRef : isExiting ? exitingPageRef : undefined}
            onAnimationEnd={(event) => {
              if (!isExiting || event.target !== event.currentTarget) return;
              setTransition((current) => current.exitingKey === key ? { ...current, exitingKey: null } : current);
            }}
          >
            {renderPage(key)}
          </div>
        );
      })}
    </div>
  );
}

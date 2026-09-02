"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type SidebarRole = "teacher" | "admin";

// 84px keeps the compact rail comfortable for a 44px brand mark, 48px menu
// targets and the 40px profile avatar without relying on content scaling.
export const SIDEBAR_COLLAPSED_WIDTH = 84;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 320;
export const SIDEBAR_DEFAULT_WIDTH = 272;
export const SIDEBAR_TRANSITION_MS = 260;

const SIDEBAR_FLING_VELOCITY = .65;
const SIDEBAR_STORAGE_KEYS: Record<SidebarRole, string> = {
  teacher: "bnbu-teacher-sidebar",
  admin: "bnbu-admin-sidebar",
};
const SIDEBAR_LEGACY_STORAGE_KEY = "bnbu-sidebar-width";

export type SidebarState = {
  width: number;
  collapsed: boolean;
  expandedWidth: number;
};

type SidebarStates = Record<SidebarRole, SidebarState>;

function clampExpandedWidth(width: number) {
  return Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)));
}

function contentVisibility(width: number) {
  return Math.max(0, Math.min(1, (width - SIDEBAR_COLLAPSED_WIDTH) / (SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSED_WIDTH)));
}

function loadSidebarState(role: SidebarRole): SidebarState {
  const fallback = { width: SIDEBAR_DEFAULT_WIDTH, collapsed: false, expandedWidth: SIDEBAR_DEFAULT_WIDTH };
  if (typeof window === "undefined") return fallback;

  try {
    const savedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEYS[role]);
    if (savedValue) {
      const savedState = JSON.parse(savedValue) as Partial<SidebarState>;
      if (typeof savedState.collapsed === "boolean" && Number.isFinite(savedState.width)) {
        const expandedWidth = clampExpandedWidth(Number(savedState.expandedWidth ?? savedState.width));
        return savedState.collapsed
          ? { width: SIDEBAR_COLLAPSED_WIDTH, collapsed: true, expandedWidth }
          : { width: clampExpandedWidth(Number(savedState.width)), collapsed: false, expandedWidth };
      }
    }

    if (role === "teacher") {
      const legacyWidth = Number(window.localStorage.getItem(SIDEBAR_LEGACY_STORAGE_KEY));
      if (Number.isFinite(legacyWidth) && legacyWidth > 0) {
        const expandedWidth = clampExpandedWidth(legacyWidth);
        return { width: expandedWidth, collapsed: false, expandedWidth };
      }
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return fallback;
}

function loadSidebarStates(): SidebarStates {
  return { teacher: loadSidebarState("teacher"), admin: loadSidebarState("admin") };
}

type DragState = {
  role: SidebarRole;
  pointerId: number;
  resizer: HTMLDivElement;
  startX: number;
  startWidth: number;
  latestX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
};

export function useResizableSidebar(role: SidebarRole) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [sidebarStates, setSidebarStates] = useState<SidebarStates>(loadSidebarStates);
  const [isResizing, setIsResizing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const statesRef = useRef(sidebarStates);
  const roleRef = useRef(role);
  const widthRef = useRef(sidebarStates[role].width);

  const setShellNode = useCallback((node: HTMLDivElement | null) => {
    shellRef.current = node;
  }, []);

  const writeWidth = useCallback((width: number) => {
    const shell = shellRef.current;
    if (!shell) return;
    const resolvedWidth = Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_COLLAPSED_WIDTH, width)));
    widthRef.current = resolvedWidth;
    shell.style.setProperty("--sidebar-width", `${resolvedWidth}px`);
    shell.style.setProperty("--sidebar-content-visibility", String(contentVisibility(resolvedWidth)));
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const commit = useCallback((sidebarRole: SidebarRole, width: number, collapsed: boolean) => {
    const previous = statesRef.current[sidebarRole];
    const expandedWidth = collapsed
      ? previous.expandedWidth
      : clampExpandedWidth(width);
    const next = collapsed
      ? { width: SIDEBAR_COLLAPSED_WIDTH, collapsed: true, expandedWidth }
      : { width: expandedWidth, collapsed: false, expandedWidth };

    setSidebarStates((current) => {
      const existing = current[sidebarRole];
      if (existing.width === next.width && existing.collapsed === next.collapsed && existing.expandedWidth === next.expandedWidth) return current;
      return { ...current, [sidebarRole]: next };
    });
  }, []);

  const animateTo = useCallback((sidebarRole: SidebarRole, collapsed: boolean, expandedWidth: number) => {
    const targetWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : clampExpandedWidth(expandedWidth);
    clearTransitionTimer();
    if (transitionFrameRef.current !== null) window.cancelAnimationFrame(transitionFrameRef.current);
    setIsTransitioning(true);
    commit(sidebarRole, targetWidth, collapsed);
    transitionFrameRef.current = window.requestAnimationFrame(() => {
      transitionFrameRef.current = null;
      writeWidth(targetWidth);
    });
    transitionTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, SIDEBAR_TRANSITION_MS);
  }, [clearTransitionTimer, commit, writeWidth]);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const applyDragFrame = useCallback(() => {
    frameRef.current = null;
    const drag = dragRef.current;
    if (!drag) return;
    writeWidth(drag.startWidth + drag.latestX - drag.startX);
  }, [writeWidth]);

  const finishResize = useCallback((pointerId?: number, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;

    cancelFrame();
    writeWidth(drag.startWidth + drag.latestX - drag.startX);
    dragRef.current = null;
    if (drag.resizer.hasPointerCapture(drag.pointerId)) drag.resizer.releasePointerCapture(drag.pointerId);
    shellRef.current?.classList.remove("is-resizing-sidebar");
    setIsResizing(false);
    document.body.classList.remove("is-resizing-sidebar");

    const currentWidth = widthRef.current;
    const previous = statesRef.current[drag.role];
    const expandedWidth = previous.collapsed ? previous.expandedWidth : previous.width;
    const midpoint = (SIDEBAR_COLLAPSED_WIDTH + expandedWidth) / 2;
    const collapse = cancelled
      ? currentWidth < midpoint
      : drag.velocity < -SIDEBAR_FLING_VELOCITY || (drag.velocity <= SIDEBAR_FLING_VELOCITY && currentWidth < midpoint);
    animateTo(drag.role, collapse, expandedWidth);
  }, [animateTo, cancelFrame, writeWidth]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 860px)").matches) return;
    event.preventDefault();
    clearTransitionTimer();
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
    }
    const resizer = event.currentTarget;
    resizer.focus();
    resizer.setPointerCapture(event.pointerId);
    dragRef.current = {
      role: roleRef.current,
      pointerId: event.pointerId,
      resizer,
      startX: event.clientX,
      startWidth: widthRef.current,
      latestX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    shellRef.current?.classList.add("is-resizing-sidebar");
    setIsTransitioning(false);
    setIsResizing(true);
    document.body.classList.add("is-resizing-sidebar");
  }, [clearTransitionTimer]);

  const moveResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
    drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    drag.latestX = event.clientX;
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(applyDragFrame);
  }, [applyDragFrame]);

  const resizeWithKeyboard = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const state = statesRef.current[roleRef.current];
    const step = event.shiftKey ? 32 : 12;
    if (event.key === "ArrowLeft") {
      animateTo(roleRef.current, state.width - step < SIDEBAR_MIN_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, state.width - step));
    } else if (event.key === "ArrowRight") {
      animateTo(roleRef.current, false, state.collapsed ? state.expandedWidth : state.width + step);
    } else if (event.key === "Home") {
      animateTo(roleRef.current, true, state.expandedWidth);
    } else if (event.key === "End") {
      animateTo(roleRef.current, false, SIDEBAR_MAX_WIDTH);
    } else return;
    event.preventDefault();
  }, [animateTo]);

  const toggle = useCallback(() => {
    const state = statesRef.current[roleRef.current];
    animateTo(roleRef.current, !state.collapsed, state.expandedWidth);
  }, [animateTo]);

  useLayoutEffect(() => {
    statesRef.current = sidebarStates;
    roleRef.current = role;
    const state = sidebarStates[role];
    writeWidth(state.width);
  }, [role, sidebarStates, writeWidth]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsInitialized(true));
    const onResize = () => {
      const state = statesRef.current[roleRef.current];
      writeWidth(state.width);
    };
    const onBlur = () => finishResize();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.cancelAnimationFrame(frame);
      cancelFrame();
      if (transitionFrameRef.current !== null) window.cancelAnimationFrame(transitionFrameRef.current);
      clearTransitionTimer();
      const drag = dragRef.current;
      if (drag?.resizer.hasPointerCapture(drag.pointerId)) drag.resizer.releasePointerCapture(drag.pointerId);
      dragRef.current = null;
      document.body.classList.remove("is-resizing-sidebar");
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
    };
  }, [cancelFrame, clearTransitionTimer, finishResize, writeWidth]);

  useEffect(() => {
    try {
      (Object.keys(SIDEBAR_STORAGE_KEYS) as SidebarRole[]).forEach((sidebarRole) => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEYS[sidebarRole], JSON.stringify(sidebarStates[sidebarRole]));
      });
    } catch {
      // Keep the interaction working when browser storage is unavailable.
    }
  }, [sidebarStates]);

  const sidebar = sidebarStates[role];
  return {
    setShellNode,
    sidebar,
    isResizing,
    isTransitioning,
    isInitialized,
    startResize,
    moveResize,
    finishResize,
    resizeWithKeyboard,
    toggle,
  };
}

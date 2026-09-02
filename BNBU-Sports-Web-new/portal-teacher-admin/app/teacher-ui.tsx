"use client";

import { ChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  className?: string;
  context?: ReactNode;
  actions?: ReactNode;
  transitionKey?: string;
  transitionDirection?: "forward" | "backward";
};

export function PageHeader({
  title,
  eyebrow,
  className = "",
  context,
  actions,
  transitionKey,
  transitionDirection = "forward",
}: PageHeaderProps) {
  return (
    <header className={`workspace-header ${className}`.trim()}>
      <div
        className={`page-header-copy ${transitionKey ? `page-header-copy--transition is-${transitionDirection}` : ""}`.trim()}
        key={transitionKey ?? "page-header-copy"}
      >
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {context}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

export type SummaryItem = {
  label: string;
  value: ReactNode;
  tone?: "default" | "attention" | "success";
};

export function SummaryMetric({ item }: { item: SummaryItem }) {
  return (
    <article className={`summary-metric is-${item.tone ?? "default"}`}>
      <b>{item.value}</b>
      <span>{item.label}</span>
    </article>
  );
}

export function PageSummaryMetrics({ items, ariaLabel }: { items: SummaryItem[]; ariaLabel: string }) {
  return (
    <section
      className={`page-summary-metrics metrics-count-${Math.min(items.length, 3)}`}
      aria-label={ariaLabel}
    >
      {items.slice(0, 3).map((item) => <SummaryMetric item={item} key={item.label} />)}
    </section>
  );
}

export type TabOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function StatusFilterTabs<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="status-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? "selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          <span>{option.label}</span>
          {option.count !== undefined && <b>{option.count}</b>}
        </button>
      ))}
    </div>
  );
}

export const StatusTabs = StatusFilterTabs;

export function FilterToolbar({
  children,
  action,
  ariaLabel = "筛选工具栏",
}: {
  children: ReactNode;
  action?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="filter-toolbar" aria-label={ariaLabel}>
      <div className="filter-toolbar-fields">{children}</div>
      {action && <div className="filter-toolbar-action">{action}</div>}
    </div>
  );
}

export function DataTable({
  children,
  className = "",
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div className="data-table-scroll">
      <table className={`data-table ${className}`} style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function ProgressCell({
  value,
  target,
  percent,
  detail,
}: {
  value: number;
  target: number;
  percent: number;
  detail?: string;
}) {
  return (
    <div className="progress-cell">
      <div className="progress-cell-copy">
        <b>{value.toFixed(1)} / {target.toFixed(1)}h</b>
        <span>{percent}%</span>
      </div>
      <div className="progress-track" aria-label={`完成进度 ${percent}%`}>
        <i style={{ width: `${percent}%` }} />
      </div>
      {detail && <small title={detail}>{detail}</small>}
    </div>
  );
}

export type TableActionMenuItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger";
  dividerBefore?: boolean;
};

export function TableActionMenuItem({
  children,
  icon,
  tone = "default",
  dividerBefore = false,
  className = "",
  type = "button",
  ...buttonProps
}: TableActionMenuItemProps) {
  return (
    <button
      {...buttonProps}
      className={[
        "table-action-menu-item",
        tone === "danger" ? "is-danger" : "",
        dividerBefore ? "has-divider" : "",
        className,
      ].filter(Boolean).join(" ")}
      type={type}
    >
      {icon && <span className="table-action-menu-item-icon" aria-hidden="true">{icon}</span>}
      <span className="table-action-menu-item-label">{children}</span>
    </button>
  );
}

export type TableActionMenuProps = {
  label?: string;
  children: ReactNode;
  iconOnly?: boolean;
  disabled?: boolean;
};

export function TableActionMenu({
  label = "更多",
  children,
  iconOnly = false,
  disabled = false,
}: TableActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    placement: "top" | "bottom";
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const tooltipId = `${menuId}-tooltip`;

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = () => {
    if (disabled) return;
    setPosition(null);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const viewportMargin = 8;
      const triggerGap = 6;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
      const spaceAbove = triggerRect.top - viewportMargin;
      const placement = menuRect.height > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
      const availableHeight = placement === "top" ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(48, availableHeight - triggerGap);
      const visibleMenuHeight = Math.min(menuRect.height, maxHeight);
      const preferredLeft = triggerRect.right - menuRect.width;
      const left = Math.min(
        window.innerWidth - viewportMargin - menuRect.width,
        Math.max(viewportMargin, preferredLeft),
      );
      const top = placement === "top"
        ? Math.max(viewportMargin, triggerRect.top - triggerGap - visibleMenuHeight)
        : triggerRect.bottom + triggerGap;

      setPosition({ top, left, maxHeight, placement });
    };

    updatePosition();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (observer && triggerRef.current && menuRef.current) {
      observer.observe(triggerRef.current);
      observer.observe(menuRef.current);
    }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const focusFirstItem = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    });
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleEscape);
    return () => {
      cancelAnimationFrame(focusFirstItem);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!disabled) return;
    const closeFrame = requestAnimationFrame(() => {
      setOpen(false);
      setPosition(null);
    });
    return () => cancelAnimationFrame(closeFrame);
  }, [disabled]);

  const moveFocusPastTrigger = (direction: -1 | 1) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const focusable = Array.from(document.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !menuRef.current?.contains(element) && element.getClientRects().length > 0);
    const triggerIndex = focusable.indexOf(trigger);
    const nextTarget = focusable[triggerIndex + direction];
    closeMenu();
    requestAnimationFrame(() => nextTarget?.focus());
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const activeIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(activeIndex + offset + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Tab" && items.length > 0) {
      event.preventDefault();
      if (event.shiftKey) {
        if (activeIndex <= 0) moveFocusPastTrigger(-1);
        else items[activeIndex - 1]?.focus();
      } else if (activeIndex >= items.length - 1) moveFocusPastTrigger(1);
      else items[activeIndex + 1]?.focus();
    }
  };

  const menuItems = Children.map(children, (child) => {
    if (!isValidElement<{ role?: string; tabIndex?: number }>(child)) return child;
    return cloneElement(child, {
      role: child.props.role ?? "menuitem",
      tabIndex: child.props.tabIndex ?? 0,
    });
  });

  const menuStyle: CSSProperties | undefined = position ? {
    top: position.top,
    left: position.left,
    maxHeight: position.maxHeight,
  } : undefined;

  return (
    <div className={`action-menu ${iconOnly ? "is-icon-menu" : ""} ${open ? "is-open" : ""}`.trim()}>
      <button
        ref={triggerRef}
        className="action-menu-trigger"
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-describedby={iconOnly ? tooltipId : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        {iconOnly
          ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
          : <><span>{label}</span><ChevronDown className="action-menu-chevron" aria-hidden="true" /></>}
      </button>
      {iconOnly && <span className="action-menu-tooltip" id={tooltipId} role="tooltip">{label}</span>}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          className="action-menu-popover"
          role="menu"
          aria-label={label}
          data-placement={position?.placement ?? "bottom"}
          data-positioned={position ? "true" : "false"}
          style={menuStyle}
          onClick={() => closeMenu()}
          onKeyDown={handleMenuKeyDown}
        >
          {menuItems}
        </div>,
        document.querySelector<HTMLElement>(".localized-content") ?? document.body,
      )}
    </div>
  );
}

/** @deprecated Use TableActionMenu for new teacher action menus. */
export const ActionMenu = TableActionMenu;

function SurfaceLayout({
  className,
  summary,
  tabs,
  toolbar,
  children,
}: {
  className: string;
  summary?: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`teacher-page-layout ${className}`}>
      {summary}
      {tabs}
      {toolbar}
      {children}
    </div>
  );
}

export function CourseOverviewLayout(props: Omit<Parameters<typeof SurfaceLayout>[0], "className">) {
  return <SurfaceLayout {...props} className="course-overview-layout" />;
}

export function ReviewWorkbenchLayout(props: Omit<Parameters<typeof SurfaceLayout>[0], "className">) {
  return <SurfaceLayout {...props} className="review-workbench-layout" />;
}

export function ManagementTableLayout(props: Omit<Parameters<typeof SurfaceLayout>[0], "className">) {
  return <SurfaceLayout {...props} className="management-table-layout" />;
}

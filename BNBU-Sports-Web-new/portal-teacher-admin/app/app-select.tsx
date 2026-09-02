"use client";

import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type AppSelectValue = string | number;

export type AppSelectOption = {
  value: AppSelectValue;
  label: string;
  disabled?: boolean;
  keywords?: string[];
};

export type AppSelectProps = {
  id?: string;
  label?: string;
  value?: AppSelectValue | null;
  defaultValue?: AppSelectValue | null;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  error?: ReactNode;
  helperText?: ReactNode;
  width?: CSSProperties["width"];
  onChange?: (value: AppSelectValue | null) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  required?: boolean;
  className?: string;
  emptyText?: string;
  loadingText?: string;
  searchPlaceholder?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

function portalTarget() {
  // Keep overlays inside the localized application tree.  This lets the
  // language boundary update an already-open menu immediately after a locale
  // switch instead of leaving a portal mounted under document.body.
  return document.querySelector<HTMLElement>(".localized-content") ?? document.body;
}

function firstEnabledIndex(options: AppSelectOption[], fromEnd = false) {
  if (fromEnd) {
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index].disabled) return index;
    }
    return -1;
  }

  return options.findIndex((option) => !option.disabled);
}

export function AppSelect({
  id,
  label,
  value,
  defaultValue = null,
  options,
  placeholder = "请选择",
  disabled = false,
  loading = false,
  searchable = false,
  clearable = false,
  error,
  helperText,
  width,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  required = false,
  className = "",
  emptyText = "暂无可选项",
  loadingText = "加载中…",
  searchPlaceholder = "搜索选项",
}: AppSelectProps) {
  const [internalValue, setInternalValue] = useState<AppSelectValue | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const labelId = `${menuId}-label`;
  const helperId = `${menuId}-helper`;
  const errorId = `${menuId}-error`;
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const selectedOption = options.find((option) => Object.is(option.value, currentValue));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => (
      [option.label, ...(option.keywords ?? [])]
        .join(" ")
        .toLocaleLowerCase()
      .includes(normalizedQuery)
    ));
  }, [normalizedQuery, options]);
  const selectedFilteredIndex = filteredOptions.findIndex(
    (option) => Object.is(option.value, currentValue) && !option.disabled,
  );
  const resolvedActiveIndex = activeIndex >= 0 && !filteredOptions[activeIndex]?.disabled
    ? activeIndex
    : selectedFilteredIndex >= 0
      ? selectedFilteredIndex
      : firstEnabledIndex(filteredOptions);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    setQuery("");
    setActiveIndex(-1);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = (direction: "first" | "last" | "selected" = "selected") => {
    if (disabled || loading) return;
    const selectedIndex = filteredOptions.findIndex(
      (option) => Object.is(option.value, currentValue) && !option.disabled,
    );
    const nextIndex = direction === "first"
      ? firstEnabledIndex(filteredOptions)
      : direction === "last"
        ? firstEnabledIndex(filteredOptions, true)
        : selectedIndex >= 0
          ? selectedIndex
          : firstEnabledIndex(filteredOptions);
    setActiveIndex(nextIndex);
    setPosition(null);
    setOpen(true);
  };

  const commitValue = (option: AppSelectOption) => {
    if (option.disabled) return;
    if (!isControlled) setInternalValue(option.value);
    onChange?.(option.value);
    closeMenu(true);
  };

  const clearValue = () => {
    if (disabled || loading) return;
    if (!isControlled) setInternalValue(null);
    onChange?.(null);
    closeMenu();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const moveActive = (direction: -1 | 1) => {
    if (!filteredOptions.length) {
      setActiveIndex(-1);
      return;
    }

    let nextIndex = resolvedActiveIndex;
    for (let attempts = 0; attempts < filteredOptions.length; attempts += 1) {
      nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[nextIndex].disabled) {
        setActiveIndex(nextIndex);
        requestAnimationFrame(() => {
          document.getElementById(`${menuId}-option-${nextIndex}`)?.scrollIntoView({ block: "nearest" });
        });
        return;
      }
    }
  };

  const handleNavigationKey = (event: ReactKeyboardEvent, source: "trigger" | "search") => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        openMenu(event.key === "ArrowDown" ? "first" : "last");
      } else {
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }

    if ((event.key === "Home" || event.key === "End") && open) {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(firstEnabledIndex(filteredOptions, event.key === "End"));
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      event.stopPropagation();
      const option = filteredOptions[resolvedActiveIndex];
      if (option) commitValue(option);
      return;
    }

    if (source === "trigger" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      event.stopPropagation();
      if (open) {
        const option = filteredOptions[resolvedActiveIndex];
        if (option) commitValue(option);
      } else {
        openMenu();
      }
    }
  };

  useEffect(() => {
    if (!open || !searchable) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const viewportMargin = 8;
      const triggerGap = 7;
      const triggerRect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
      const spaceAbove = triggerRect.top - viewportMargin;
      const idealHeight = Math.min(menu.scrollHeight, 320);
      const placement = spaceBelow < Math.min(idealHeight, 180) && spaceAbove > spaceBelow
        ? "top"
        : "bottom";
      const availableHeight = placement === "top" ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(96, Math.min(320, availableHeight - triggerGap));
      const width = Math.min(triggerRect.width, window.innerWidth - viewportMargin * 2);
      const left = Math.min(
        window.innerWidth - viewportMargin - width,
        Math.max(viewportMargin, triggerRect.left),
      );
      const renderedHeight = Math.min(idealHeight, maxHeight);
      const top = placement === "top"
        ? Math.max(viewportMargin, triggerRect.top - triggerGap - renderedHeight)
        : triggerRect.bottom + triggerGap;

      setPosition({ top, left, width, maxHeight, placement });
    };

    updatePosition();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (observer && triggerRef.current) observer.observe(triggerRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filteredOptions.length, open, searchable]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.parentElement?.contains(target) && !menuRef.current?.contains(target)) {
        closeMenu();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.parentElement?.contains(target) && !menuRef.current?.contains(target)) {
        closeMenu();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const describedBy = [
    ariaDescribedBy ?? "",
    helperText ? helperId : "",
    error ? errorId : "",
  ].filter(Boolean).join(" ") || undefined;
  const activeDescendant = open && resolvedActiveIndex >= 0
    ? `${menuId}-option-${resolvedActiveIndex}`
    : undefined;
  const visibleValue = loading
    ? loadingText
    : selectedOption?.label ?? placeholder;
  const hasValue = currentValue !== null && currentValue !== undefined && Boolean(selectedOption);
  const rootStyle = width === undefined ? undefined : { width };
  const menuStyle: CSSProperties | undefined = position
    ? {
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }
    : undefined;

  return (
    <div
      className={[
        "app-select",
        open ? "is-open" : "",
        disabled ? "is-disabled" : "",
        loading ? "is-loading" : "",
        error ? "has-error" : "",
        clearable && hasValue ? "is-clearable" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={rootStyle}
      data-app-select=""
    >
      <div className="app-select-control">
        <button
          id={id}
          ref={triggerRef}
          className="app-select-trigger"
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="listbox"
          aria-activedescendant={searchable ? undefined : activeDescendant}
          aria-autocomplete={searchable ? "list" : "none"}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel ?? placeholder}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid ?? Boolean(error)}
          aria-required={required}
          aria-busy={loading}
          disabled={disabled || loading}
          onClick={() => open ? closeMenu() : openMenu()}
          onKeyDown={(event) => handleNavigationKey(event, "trigger")}
        >
          <span className="app-select-copy">
            {label && <span className="app-select-label" id={labelId}>{label}{required && <b aria-hidden="true"> *</b>}</span>}
            <span className={`app-select-value ${hasValue ? "" : "is-placeholder"}`} title={visibleValue}>
              {visibleValue}
            </span>
          </span>
          <span className="app-select-icon-slot" aria-hidden="true">
            {loading
              ? <LoaderCircle className="app-select-spinner" />
              : <ChevronDown className="app-select-chevron" />}
          </span>
        </button>
        {clearable && hasValue && !disabled && !loading && (
          <button
            className="app-select-clear"
            type="button"
            aria-label={`清除${label ?? "当前选择"}`}
            onClick={clearValue}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      {helperText && <small className="app-select-helper" id={helperId}>{helperText}</small>}
      {error && <small className="app-select-error" id={errorId} role="alert">{error}</small>}

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="app-select-popover"
          data-placement={position?.placement ?? "bottom"}
          data-positioned={position ? "true" : "false"}
          style={menuStyle}
        >
          {searchable && (
            <label className="app-select-search">
              <Search aria-hidden="true" />
              <span className="sr-only">{searchPlaceholder}</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={menuId}
                aria-activedescendant={activeDescendant}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => handleNavigationKey(event, "search")}
              />
            </label>
          )}
          <div
            className="app-select-listbox"
            id={menuId}
            role="listbox"
            aria-label={label ?? ariaLabel ?? placeholder}
            aria-busy={loading}
          >
            {filteredOptions.length === 0 ? (
              <div className="app-select-empty" role="status">{emptyText}</div>
            ) : filteredOptions.map((option, index) => {
              const selected = Object.is(option.value, currentValue);
              const active = index === resolvedActiveIndex;
              return (
                <div
                  className={[
                    "app-select-option",
                    selected ? "is-selected" : "",
                    active ? "is-active" : "",
                    option.disabled ? "is-disabled" : "",
                  ].filter(Boolean).join(" ")}
                  id={`${menuId}-option-${index}`}
                  key={`${typeof option.value}:${String(option.value)}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  title={option.label}
                  onPointerMove={() => !option.disabled && setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitValue(option)}
                >
                  <span>{option.label}</span>
                  {selected && <Check className="app-select-check" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </div>,
        portalTarget(),
      )}
    </div>
  );
}

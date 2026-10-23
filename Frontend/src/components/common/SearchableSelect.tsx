import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/utils";

export type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  options?: (string | number | SelectOption)[];
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  className?: string;
  dropdownClassName?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  autoFocusSearch?: boolean;
  emptyText?: string;
  "aria-label"?: string;
  title?: string;
}

export default function SearchableSelect({
  id,
  name,
  label,
  value,
  defaultValue,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled = false,
  required = false,
  hasError = false,
  className = "",
  dropdownClassName = "",
  children,
  size = "md",
  autoFocusSearch = true,
  emptyText = "No results found",
  "aria-label": ariaLabel,
  title,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [internalValue, setInternalValue] = useState<string | number>(
    value !== undefined ? value : (defaultValue ?? ""),
  );
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal value when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const currentValue = value !== undefined ? value : internalValue;

  // Normalize options from prop or children
  const normalizedOptions = useMemo<SelectOption[]>(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === "object" && opt !== null && "value" in opt) {
          return {
            value: opt.value,
            label:
              opt.label !== undefined ? String(opt.label) : String(opt.value),
            disabled: Boolean(opt.disabled),
          };
        }
        return {
          value: opt,
          label: String(opt),
          disabled: false,
        };
      });
    }

    if (children) {
      const list: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as {
            value?: string | number;
            children?: React.ReactNode;
            disabled?: boolean;
          };
          const val =
            childProps.value !== undefined
              ? childProps.value
              : childProps.children;
          const lab = childProps.children
            ? String(childProps.children)
            : String(val ?? "");
          list.push({
            value: (val as string | number) ?? "",
            label: lab,
            disabled: Boolean(childProps.disabled),
          });
        }
      });
      return list;
    }

    return [];
  }, [options, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(
      (opt) => String(opt.value) === String(currentValue),
    );
  }, [normalizedOptions, currentValue]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        String(opt.value).toLowerCase().includes(q),
    );
  }, [normalizedOptions, query]);

  // Position the portal dropdown
  const updatePlacement = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const opensAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      140,
      Math.min(320, opensAbove ? spaceAbove - gap : spaceBelow - gap),
    );
    setMenuStyle({
      left: Math.max(viewportPadding, rect.left),
      width: Math.max(rect.width, 160),
      maxHeight: availableHeight,
      ...(opensAbove
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };

    updatePlacement();
    setHighlightedIndex(0);

    if (autoFocusSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isOpen, autoFocusSearch]);

  const handleSelect = (optionValue: string | number) => {
    const strVal = String(optionValue);
    setInternalValue(strVal);
    setIsOpen(false);
    setQuery("");
    if (onChange) {
      onChange(strVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
      wrapperRef.current?.querySelector("button")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, filteredOptions.length - 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  const displayLabel = selectedOption
    ? selectedOption.label
    : placeholder || (label ? `Select ${label.toLowerCase()}` : "-None-");

  const hasValue =
    selectedOption !== undefined && String(selectedOption.value) !== "";

  const sizeClasses =
    size === "sm"
      ? "h-9 px-2.5 text-xs sm:text-sm"
      : size === "lg"
      ? "h-12 px-3.5 text-base"
      : "h-11 px-3 text-base sm:text-sm";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative min-w-0 text-start",
        isOpen ? "z-30" : "",
      )}
    >
      <button
        id={id}
        name={name}
        type="button"
        title={title}
        aria-label={ariaLabel || label || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown"].includes(e.key) && !isOpen && !disabled) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cn(
          "flex w-full min-w-0 items-center justify-between rounded-lg border border-gray-200 bg-transparent text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800",
          sizeClasses,
          hasError && "border-red-500 dark:border-red-500 focus:border-red-500",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span
          className={cn(
            "truncate pe-2",
            hasValue
              ? "text-gray-800 dark:text-white/90"
              : "text-gray-400 dark:text-gray-500",
          )}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500",
            isOpen && "rotate-180 text-gray-600 dark:text-gray-300",
          )}
        />
      </button>

      {/* Hidden input for standard form submission if name/required is present */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={String(currentValue ?? "")}
          required={required}
        />
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className={cn(
              "fixed z-99999 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark",
              dropdownClassName,
            )}
          >
            <div className="relative mb-1.5 px-0.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  searchPlaceholder ||
                  `Search ${label ? label.toLowerCase() : "options"}...`
                }
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50/60 pl-8.5 pr-8 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/5 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div
              role="listbox"
              className="mt-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isSelected =
                    String(option.value) === String(currentValue);
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={`${option.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition-colors",
                        isSelected
                          ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : isHighlighted
                          ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="size-4 shrink-0 text-brand-500" />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                  {emptyText}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

"use client";

// importing hooks
import { useEffect, useRef, useState } from "react";

// importing components
import { Input, Button, Select } from "@/app/components/ui";

// importing icons
import {
  FaSearch,
  FaThLarge,
  FaList,
  FaTimes,
  FaChevronDown,
  FaFilter,
} from "react-icons/fa";

export type FilterField =
  | {
      type: "search";
      key: string;
      placeholder?: string;
    }
  | {
      type: "select";
      key: string;
      label: string;
      options:
        | { label: string; value: string | number }[]
        | {
            label: string;
            options: { label: string; value: string | number }[];
          }[];
    }
  | {
      type: "custom";
      key: string;
      render: (
        value: any,
        onChange: (value: any) => void
      ) => React.ReactNode;
    };

interface Props {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear?: () => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  loading?: boolean;
  total?: number;
}

export default function DynamicFilters({
  fields,
  values,
  onChange,
  onClear,
  viewMode,
  onViewModeChange,
  loading,
  total,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  const filtersRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const floatingPanelRef = useRef<HTMLDivElement>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const floatingButtonRef = useRef<HTMLButtonElement>(null);

  const searchField = fields.find((f) => f.type === "search");
  const otherFields = fields.filter((f) => f.type !== "search");

  const activeFiltersCount = Object.values(values).filter(
    (value) => value !== undefined && value !== null && value !== ""
  ).length;

  const hasActiveFilters = activeFiltersCount > 0;

  // detecta quando o bloco original dos filtros saiu da tela (mobile)
  useEffect(() => {
    const element = filtersRef.current;
    if (!element) return;

    const media = window.matchMedia("(max-width: 767px)");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!media.matches) {
          setShowFloatingButton(false);
          return;
        }

        setShowFloatingButton(!entry.isIntersecting);
      },
      {
        threshold: 0.05,
      }
    );

    observer.observe(element);

    const handleMediaChange = () => {
      if (!media.matches) {
        setShowFloatingButton(false);
      }
    };

    media.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", handleMediaChange);
    };
  }, []);

  // fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const clickedInsideDesktopPanel =
        panelRef.current?.contains(target) ?? false;

      const clickedInsideMobilePanel =
        floatingPanelRef.current?.contains(target) ?? false;

      const clickedHeaderButton =
        headerButtonRef.current?.contains(target) ?? false;

      const clickedFloatingButton =
        floatingButtonRef.current?.contains(target) ?? false;

      const clickedInsideAllowedArea =
        clickedInsideDesktopPanel ||
        clickedInsideMobilePanel ||
        clickedHeaderButton ||
        clickedFloatingButton;

      if (!clickedInsideAllowedArea) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // fecha com ESC
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const renderFiltersContent = () => (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {searchField && (
          <div className="flex-1 order-1 min-w-0">
            <Input
              value={values[searchField.key] || ""}
              onChange={(e) => onChange(searchField.key, e.target.value)}
              placeholder={searchField.placeholder}
              icon={<FaSearch />}
              disabled={loading}
            />
          </div>
        )}

        <div className="flex items-center gap-2 self-end">
          {viewMode && onViewModeChange && (
            <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "primary" : "ghost"}
                onClick={() => onViewModeChange("grid")}
                icon={<FaThLarge />}
              />
              <Button
                size="sm"
                variant={viewMode === "list" ? "primary" : "ghost"}
                onClick={() => onViewModeChange("list")}
                icon={<FaList />}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {otherFields.map((field) => {
          switch (field.type) {
            case "select":
              return (
                <Select
                  key={field.key}
                  label={field.label}
                  value={values[field.key]}
                  onChange={(value) => onChange(field.key, value)}
                  options={field.options}
                  placeholder="Selecione uma opção"
                  grouped={
                    Array.isArray(field.options) &&
                    field.options.length > 0 &&
                    "options" in field.options[0]
                  }
                />
              );

            case "custom":
              return (
                <div key={field.key}>
                  {field.render(
                    values[field.key],
                    (value) => onChange(field.key, value)
                  )}
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      {(hasActiveFilters || total !== undefined) && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <div className="text-sm text-slate-400">
            {loading ? (
              "Carregando..."
            ) : (
              <>
                {total ?? 0} resultado{total === 1 ? "" : "s"}
                {hasActiveFilters && (
                  <span className="text-slate-500 ml-1">
                    com filtro aplicado
                  </span>
                )}
              </>
            )}
          </div>

          {onClear && hasActiveFilters && (
            <Button
              size="sm"
              variant="link"
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              icon={<FaTimes />}
              className="text-slate-400 hover:text-white w-auto self-start !p-0 !px-0 !py-0 !border-0 !bg-transparent !shadow-none !ring-0 !ring-offset-0 !outline-none hover:!bg-transparent focus:!ring-0 focus:!outline-none cursor-pointer"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Overlay mobile quando painel flutuante está aberto */}
      {showFloatingButton && isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Botão flutuante mobile */}
      {showFloatingButton && (
        <>
          <button
            ref={floatingButtonRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`
              md:hidden fixed top-14 left-0 z-50
              flex items-center justify-between
              transition-all duration-300
              bg-slate-900/95 backdrop-blur-xl
              border border-l-0 shadow-2xl
              px-4 py-3
              ${
                isOpen
                  ? "w-[min(92vw,420px)] rounded-tr-2xl"
                  : "w-auto rounded-tr-xl rounded-br-xl"
              }
              ${isOpen ? "rounded-br-none" : ""}
              ${hasActiveFilters
                ? "border-purple-500/40 text-purple-300"
                : "border-white/10 text-white"}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FaFilter className="text-sm shrink-0" />

              {hasActiveFilters && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-purple-500 text-white text-[11px] font-semibold px-1.5 shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </div>

            <FaChevronDown
              className={`
                text-xs transition-transform duration-300 ml-3 shrink-0
                ${isOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {/* Painel flutuante mobile - abre no botão */}
          <div
            className={`
              md:hidden fixed top-25 left-0 z-50
              w-[min(92vw,420px)]
              transition-all duration-300 origin-top-left
              ${
                isOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }
            `}
          >
            <div
              ref={floatingPanelRef}
              className="rounded-br-2xl p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 border-l-0 shadow-2xl"
            >
              {renderFiltersContent()}
            </div>
          </div>
        </>
      )}

      {/* Bloco original */}
      <div ref={filtersRef} className="sticky top-4 z-30">
        {/* Header sempre visível */}
        <div
          className={`
            rounded-2xl p-4 backdrop-blur-xl border transition-colors duration-300
            ${
              hasActiveFilters
                ? "bg-slate-900/90 border-purple-500/30"
                : "bg-slate-900/80 border-white/10"
            }
          `}
        >
          <button
            ref={headerButtonRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full cursor-pointer"
          >
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex flex-col items-start min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    Filtros
                  </span>

                  {hasActiveFilters && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-purple-500 text-white text-[11px] font-semibold px-1.5">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>

                {total !== undefined && (
                  <span className="text-xs text-slate-400 mt-1 truncate">
                    {loading
                      ? "Carregando..."
                      : `${total} resultado${total === 1 ? "" : "s"}${
                          hasActiveFilters ? " filtrados" : ""
                        }`}
                  </span>
                )}
              </div>

              <FaChevronDown
                className={`
                  text-slate-400 transition-transform duration-300 shrink-0 ml-3
                  ${isOpen && !showFloatingButton ? "rotate-180" : ""}
                `}
              />
            </div>
          </button>
        </div>

        {/* Painel desktop / bloco original */}
        <div
          className={`
            absolute left-0 right-0 mt-2 z-40
            transition-all duration-300 origin-top
            ${showFloatingButton ? "hidden md:block" : ""}
            ${
              isOpen && !showFloatingButton
                ? "opacity-100 scale-y-100 pointer-events-auto"
                : "opacity-0 scale-y-95 pointer-events-none"
            }
          `}
        >
          <div
            ref={panelRef}
            className="rounded-2xl p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            {renderFiltersContent()}
          </div>
        </div>
      </div>
    </>
  );
};

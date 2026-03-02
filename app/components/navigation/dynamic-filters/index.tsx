"use client";

// importing hooks
import { useState } from "react";

// importing components
import { Input, Button, Select } from "@/app/components/ui";

// importing icons
import { FaSearch, FaThLarge, FaList, FaTimes, FaChevronDown } from "react-icons/fa";

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

  const searchField = fields.find((f) => f.type === "search");
  const otherFields = fields.filter((f) => f.type !== "search");

  const hasActiveFilters = Object.values(values).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return (
    <div className="sticky top-4 z-10 rounded-2xl p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 cursor-pointer">
        <span>Filtros</span>

        <FaChevronDown
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 space-y-3 ${isOpen ? "max-h-[1000px] opacity-100 mt-4 border-t border-slate-800 pt-4" : "max-h-0 opacity-0"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {searchField && (
            <div className="flex-1 order-1">
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
                onClick={() => { onClear(); setIsOpen((prev) => !prev);}}
                icon={<FaTimes />}
                className="text-slate-400 hover:text-white w-auto self-start !p-0 !px-0 !py-0 !border-0 !bg-transparent !shadow-none !ring-0 !ring-offset-0 !outline-none hover:!bg-transparent focus:!ring-0 focus:!outline-none cursor-pointer">
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

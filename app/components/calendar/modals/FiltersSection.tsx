"use client";

import { useState } from "react";
import { HiFilter, HiX } from "react-icons/hi";
import { Input, Select, Button } from "@/app/components";
import { motion, AnimatePresence } from "framer-motion";

interface FiltersSectionProps {
  searchTerm?: string;
  filterType?: string;
  filterCategory?: string;
  sortBy?: string;
  sortOrder?: string;
  categories?: any[];
  onSearchChange?: (value: string) => void;
  onFilterTypeChange?: (value: string) => void;
  onFilterCategoryChange?: (value: string) => void;
  onSortChange?: (field: string, order: string) => void;
  onClearFilters?: () => void;
  disabled?: boolean;
}

export default function FiltersSection({
  searchTerm = "",
  filterType = "",
  filterCategory = "",
  sortBy = "",
  sortOrder = "",
  categories = [],
  onSearchChange,
  onFilterTypeChange,
  onFilterCategoryChange,
  onSortChange,
  onClearFilters,
  disabled = false,
}: FiltersSectionProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    searchTerm || filterType || filterCategory || sortBy;

  const handleClear = () => {
    onSearchChange?.("");
    onFilterTypeChange?.("");
    onFilterCategoryChange?.("");
    onSortChange?.("", "");
    onClearFilters?.();
  };

  const sortOptions = [
    { value: "description-asc", label: "Descrição (A-Z)" },
    { value: "description-desc", label: "Descrição (Z-A)" },
    { value: "amount-desc", label: "Valor (maior primeiro)" },
    { value: "amount-asc", label: "Valor (menor primeiro)" },
  ];

  const handleSortChange = (value: string) => {
    if (!value) return onSortChange?.("", "");
    const [field, order] = value.split("-");
    onSortChange?.(field, order);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Toggle */}
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            size="sm"
            disabled={disabled}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          icon={<HiFilter size={14} />}
          className="rounded-xl"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            icon={<HiX size={14} />}
            className="rounded-xl"
          />
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="
                grid grid-cols-1 sm:grid-cols-3 gap-4
                p-4
                rounded-2xl
                bg-white/10 dark:bg-slate-800/40
                backdrop-blur-xl
                border border-white/10 dark:border-slate-800
              "
            >
              <Select
                value={filterType}
                onChange={(v) =>
                  onFilterTypeChange?.(v?.toString() || "")
                }
                options={[
                  { value: "INCOME", label: "Receitas" },
                  { value: "EXPENSE", label: "Despesas" },
                ]}
                placeholder="Tipo"
                size="sm"
              />

              <Select
                value={filterCategory}
                onChange={(v) =>
                  onFilterCategoryChange?.(v?.toString() || "")
                }
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="Categoria"
                size="sm"
              />

              <Select
                value={
                  sortBy && sortOrder ? `${sortBy}-${sortOrder}` : ""
                }
                onChange={(v) =>
                  handleSortChange(v?.toString() || "")
                }
                options={sortOptions}
                placeholder="Ordenar por"
                size="sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

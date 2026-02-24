// importing icons
import { FaSearch, FaThLarge, FaList } from "react-icons/fa";

// importing components
import { Input, Button } from "@/app/components";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  loading: boolean;
}

export default function AccountsListFilters({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  loading,
}: Props) {
  return (
    <div
      className="
        sticky top-4 z-10
        rounded-2xl p-4
        bg-slate-900/80 backdrop-blur-xl
        border border-white/10
        shadow-[0_10px_40px_rgba(0,0,0,0.4)]
      "
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar conta..."
              icon={<FaSearch />}
              variant="filled"
              disabled={loading}
              clearable
            />
          </div>

          <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 shrink-0">
            <Button
              variant={viewMode === "grid" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              icon={<FaThLarge />}
              className={
                viewMode !== "grid"
                  ? "!text-slate-400 hover:!text-white"
                  : ""
              }
            />

            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              icon={<FaList />}
              className={
                viewMode !== "list"
                  ? "!text-slate-400 hover:!text-white"
                  : ""
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

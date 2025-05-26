import { HiOutlineDocumentDownload, HiOutlineDocumentReport } from "react-icons/hi";

interface DashboardExportButtonsProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  loading: boolean;
}

export const DashboardExportButtons = ({
  onExportExcel,
  onExportPDF,
  loading
}: DashboardExportButtonsProps) => (
  <div className="flex gap-2 mt-4 sm:mt-0">
    <button
      onClick={onExportExcel}
      disabled={loading}
      className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
    >
      <HiOutlineDocumentDownload className="h-4 w-4" />
      Exportar Excel
    </button>
    <button
      onClick={onExportPDF}
      disabled={loading}
      className="cursor-pointer flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
    >
      <HiOutlineDocumentReport className="h-4 w-4" />
      Exportar PDF
    </button>
  </div>
);
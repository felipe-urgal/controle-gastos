import { HiOutlineExclamationCircle } from "react-icons/hi";

interface DashboardErrorProps {
  error: string | null;
}

export const DashboardError = ({ error }: DashboardErrorProps) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );
};
import { useTheme } from "@/app/context/ThemeContext";

interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 5 }: LoadingSkeletonProps) {
  const { resolvedTheme } = useTheme();

  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    skeleton: resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300',
    skeletonLight: resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200',
  };

  return (
    <div className="p-4 space-y-3">
      {[...Array(count)].map((_, index) => (
        <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${colors.border} ${colors.bg}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${colors.skeleton}`}></div>
            <div className="space-y-1">
              <div className={`h-3 ${colors.skeleton} rounded w-24 sm:w-32`}></div>
              <div className={`h-2 ${colors.skeletonLight} rounded w-16 sm:w-24`}></div>
            </div>
          </div>
          <div className="space-y-1">
            <div className={`h-3 ${colors.skeleton} rounded w-12 sm:w-20`}></div>
            <div className={`h-2 ${colors.skeletonLight} rounded w-10 sm:w-16`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}
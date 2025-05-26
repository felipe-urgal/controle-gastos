// components/LoadingSkeleton.tsx
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export const LoadingSkeleton = () => (
  <div>
    <Skeleton className="h-40 mb-6" />
    <Skeleton className="h-64" count={5} />
  </div>
);
export interface LoadingSkeletonProps {
  rows?: number;
  label: string;
}

export function LoadingSkeleton({ rows = 3, label }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 p-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          data-skeleton-row
          aria-hidden="true"
          className="h-11 animate-pulse rounded-md bg-gray-200"
        />
      ))}
    </div>
  );
}

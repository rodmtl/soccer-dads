import { Button } from "@/components/Button";

export interface ErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry?(): void;
}

export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 p-6 text-center">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

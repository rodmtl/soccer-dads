import { Button } from "@/components/Button";

export interface EmptyStateAction {
  label: string;
  onClick(): void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-sm text-gray-600">{description}</p> : null}
      {action ? (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

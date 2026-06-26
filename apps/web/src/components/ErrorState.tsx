import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ message, detail, onRetry, retryLabel }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm font-medium">{message}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import { Check, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, buttonVariants } from '@/components/ui/button';

/**
 * Shared action affordances for a `ListCard` header so every tab edits and
 * deletes the same way: compact ghost icon buttons.
 */

/** className for a typed router `<Link>` used as the edit action. */
export const editActionClassName = buttonVariants({
  variant: 'ghost',
  size: 'icon',
  className: 'h-8 w-8',
});

/** Pencil icon for the edit `<Link>` (paired with `editActionClassName`). */
export function EditActionIcon() {
  return <Pencil className="h-3.5 w-3.5" />;
}

export function DeleteAction({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation('common');
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive"
      aria-label={t('actions.delete')}
      title={t('actions.delete')}
      onClick={onClick}
      disabled={disabled}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

export function MarkDoneAction({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-primary hover:text-primary"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Check className="h-3.5 w-3.5" />
    </Button>
  );
}

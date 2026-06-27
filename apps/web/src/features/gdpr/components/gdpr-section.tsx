import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useDeleteAccount, useExportData } from '../queries';

// ─── Export section ────────────────────────────────────────────────────────────

function ExportSection() {
  const { t } = useTranslation('gdpr');
  const exportData = useExportData();

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium">{t('export.title')}</p>
        <p className="text-sm text-muted-foreground">{t('export.description')}</p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          exportData.mutate();
        }}
        disabled={exportData.isPending}
      >
        {exportData.isPending ? t('export.downloading') : t('export.button')}
      </Button>
    </div>
  );
}

// ─── Delete dialog ─────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  userEmail: string;
  onClose: () => void;
}

function DeleteDialog({ userEmail, onClose }: DeleteDialogProps) {
  const { t } = useTranslation('gdpr');
  const deleteAccount = useDeleteAccount();
  const [confirmation, setConfirmation] = useState('');

  const isConfirmed = confirmation.toLowerCase() === userEmail.toLowerCase();

  async function handleConfirm() {
    await deleteAccount.mutateAsync(confirmation);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl">
        <h2 id="delete-dialog-title" className="text-lg font-semibold">
          {t('delete.dialog.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('delete.dialog.description')}</p>
        <p className="mt-2 text-sm font-medium text-destructive">
          {t('delete.dialog.irreversible')}
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="delete-confirmation">{t('delete.dialog.confirmLabel')}</Label>
          <Input
            id="delete-confirmation"
            type="email"
            placeholder={t('delete.dialog.confirmPlaceholder')}
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
            }}
            autoComplete="off"
          />
        </div>

        {deleteAccount.isError && (
          <p className="mt-2 text-sm text-destructive">
            {deleteAccount.error instanceof Error
              ? deleteAccount.error.message
              : t('delete.dialog.title')}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={deleteAccount.isPending}>
            {t('delete.dialog.cancel')}
          </Button>
          <Button
            id="confirm-delete-account-btn"
            variant="destructive"
            disabled={!isConfirmed || deleteAccount.isPending}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {t('delete.dialog.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete section ────────────────────────────────────────────────────────────

interface DeleteSectionProps {
  userEmail: string;
}

function DeleteSection({ userEmail }: DeleteSectionProps) {
  const { t } = useTranslation('gdpr');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 p-4">
        <div>
          <p className="font-medium text-destructive">{t('delete.title')}</p>
          <p className="text-sm text-muted-foreground">{t('delete.description')}</p>
        </div>
        <Button
          id="open-delete-account-dialog-btn"
          variant="destructive"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          {t('delete.button')}
        </Button>
      </div>

      {dialogOpen && (
        <DeleteDialog
          userEmail={userEmail}
          onClose={() => {
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

interface GdprSectionProps {
  userEmail: string;
}

export function GdprSection({ userEmail }: GdprSectionProps) {
  const { t } = useTranslation('gdpr');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('section.title')}</CardTitle>
        <CardDescription>{t('section.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ExportSection />
        <DeleteSection userEmail={userEmail} />
      </CardContent>
    </Card>
  );
}

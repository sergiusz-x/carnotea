import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';

import { QuickAddSheet } from './quick-add-sheet';
import { VehiclePickerSheet } from './vehicle-picker-sheet';

export function Fab() {
  const { t } = useTranslation('nav');
  const { activeVehicleId } = useActiveVehicle();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleClick() {
    if (activeVehicleId) {
      setQuickAddOpen(true);
    } else {
      setPickerOpen(true);
    }
  }

  return (
    <>
      <Button
        size="icon"
        onClick={handleClick}
        aria-label={t('quickAdd')}
        className="fixed right-4 z-50 h-14 w-14 rounded-full shadow-lg md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Button>

      {activeVehicleId && (
        <QuickAddSheet
          vehicleId={activeVehicleId}
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
        />
      )}
      <VehiclePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
}

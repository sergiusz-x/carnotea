import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ServicePart {
  id: string;
  name: string;
  manufacturer: string | null;
  partNumber: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number | null;
}

interface ServiceRecord {
  id: string;
  serviceDate: string;
  mileage: number;
  title: string;
  description: string | null;
  laborCost: number;
  totalCost: number;
  workshopName: string | null;
  parts: ServicePart[];
}

export function ServiceCard({ record }: { record: ServiceRecord }) {
  const { t } = useTranslation('service');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{record.serviceDate}</span>
                <span className="text-sm text-muted-foreground">
                  {t('list.mileage', { mileage: record.mileage })}
                </span>
              </div>
              <h3 className="text-base font-semibold">{record.title}</h3>
            </div>
            <div className="text-right">
              <p className="font-medium">{t('list.cost', { cost: record.totalCost })}</p>
            </div>
          </div>

          {/* Workshop */}
          {record.workshopName && (
            <p className="text-sm text-muted-foreground">
              {t('list.workshop', { workshop: record.workshopName })}
            </p>
          )}

          {/* Parts summary */}
          <div className="flex flex-wrap gap-1">
            {record.parts.length > 0 ? (
              <>
                <Badge variant="secondary">
                  {t('list.partCount', { count: record.parts.length })}
                </Badge>
                {record.parts.slice(0, 2).map((part) => (
                  <Badge key={part.id} variant="outline" className="text-xs">
                    {part.name}
                  </Badge>
                ))}
                {record.parts.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    {`+${String(record.parts.length - 2)}`}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{t('list.noParts')}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

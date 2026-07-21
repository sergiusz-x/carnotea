import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audited_table_name';

export const Audited = (tableName: string) => SetMetadata(AUDITED_KEY, tableName);

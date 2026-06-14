export const CHARGER_TYPE_CODES = [
  'home_socket',
  'ac_type2',
  'dc_ccs',
  'dc_chademo',
  'tesla_sc',
  'other',
] as const;

export type ChargerTypeCode = (typeof CHARGER_TYPE_CODES)[number];

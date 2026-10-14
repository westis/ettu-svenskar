// Country name (as Stupa's ETTU tenant prints it) -> the association code ETTU shows, and that code ->
// the flag-icons file name. The code normally comes straight from `selected_parents[].parent_abbr`;
// this table is only the fallback for a player without one.
//
// Neutral athletes (AIN) play under ETTU's own codes: ETTU1 (Belarus) and ETTU2 (Russia), each with
// ETTU's flag. They are shown as "AIN", never as RUS / BLR.

const NAME_TO_CODE: Record<string, string> = {
  Albania: 'ALB', Andorra: 'AND', Armenia: 'ARM', Austria: 'AUT', Azerbaijan: 'AZE', Belarus: 'ETTU1',
  Belgium: 'BEL', 'European Table Tennis Union 1': 'ETTU1', 'European Table Tennis Union 2': 'ETTU2', 'Bosnia and Herzegovina': 'BIH', Bulgaria: 'BUL', Croatia: 'CRO', Cyprus: 'CYP',
  Czechia: 'CZE', 'Czech Republic': 'CZE', Denmark: 'DEN', England: 'ENG', Estonia: 'EST',
  'Faroe Islands': 'FRO', Finland: 'FIN', France: 'FRA', Georgia: 'GEO', Germany: 'GER', Gibraltar: 'GIB',
  Greece: 'GRE', Greenland: 'GRL', Guernsey: 'GGY', Hungary: 'HUN', Iceland: 'ISL', Ireland: 'IRL',
  Israel: 'ISR', Italy: 'ITA', Jersey: 'JEY', Kosovo: 'KOS', Latvia: 'LAT', Liechtenstein: 'LIE',
  Lithuania: 'LTU', Luxembourg: 'LUX', Malta: 'MLT', Moldova: 'MDA', Monaco: 'MON', Montenegro: 'MNE',
  Netherlands: 'NED', 'North Macedonia': 'MKD', Norway: 'NOR', Poland: 'POL', Portugal: 'POR',
  Romania: 'ROU', Russia: 'ETTU2', 'San Marino': 'SMR', Scotland: 'SCO', Serbia: 'SRB', Slovakia: 'SVK',
  Slovenia: 'SLO', Spain: 'ESP', Sweden: 'SWE', Switzerland: 'SUI', Turkey: 'TUR', 'Türkiye': 'TUR',
  Ukraine: 'UKR', Wales: 'WAL',
};

const CODE_TO_FLAG: Record<string, string> = {
  ALB: 'al', AND: 'ad', ARM: 'am', AUT: 'at', AZE: 'az', BLR: 'by', BEL: 'be', BIH: 'ba', BUL: 'bg',
  CRO: 'hr', CYP: 'cy', CZE: 'cz', DEN: 'dk', ENG: 'gb-eng', EST: 'ee', FRO: 'fo', FIN: 'fi', FRA: 'fr',
  GEO: 'ge', GER: 'de', GIB: 'gi', GRE: 'gr', GRL: 'gl', GGY: 'gg', HUN: 'hu', ISL: 'is', IRL: 'ie',
  ISR: 'il', ITA: 'it', JEY: 'je', KOS: 'xk', LAT: 'lv', LIE: 'li', LTU: 'lt', LUX: 'lu', MLT: 'mt',
  MDA: 'md', MON: 'mc', MNE: 'me', NED: 'nl', MKD: 'mk', NOR: 'no', POL: 'pl', POR: 'pt', ROU: 'ro',
  RUS: 'ru', SMR: 'sm', SCO: 'gb-sct', SRB: 'rs', SVK: 'sk', SLO: 'si', ESP: 'es', SWE: 'se', SUI: 'ch',
  TUR: 'tr', UKR: 'ua', WAL: 'gb-wls',
};

export function codeFromCountry(name: string | null | undefined): string | null {
  return name ? NAME_TO_CODE[name.trim()] ?? null : null;
}

const FLAG_ICONS = 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3';
const ETTU_FLAGS: Record<string, string> = {
  ETTU1: 'https://storage.googleapis.com/stupaprodsguscentral/flags/ETTU_1_FLAG.png',
  ETTU2: 'https://storage.googleapis.com/stupaprodsguscentral/flags/ETTU_2_FLAG.png',
};

/** The code to print: "AIN" for ETTU's neutral athletes, else the association code. */
export function displayCode(code: string): string {
  return ETTU_FLAGS[code.toUpperCase()] ? 'AIN' : code;
}

/** The flag image: ETTU's own flag (2:1) for neutral athletes, else flag-icons (4:3); null if unknown. */
export function flagOf(code: string | null | undefined): { src: string; wide: boolean } | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (ETTU_FLAGS[c]) return { src: ETTU_FLAGS[c], wide: true };
  return CODE_TO_FLAG[c] ? { src: `${FLAG_ICONS}/${CODE_TO_FLAG[c]}.svg`, wide: false } : null;
}

export const HOME_CODE = 'SWE';

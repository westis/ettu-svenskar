// Country name (as Stupa's ETTU tenant prints it) -> the association code ETTU shows, and that code ->
// the flag-icons file name. The code normally comes straight from `selected_parents[].parent_abbr`;
// this table is only the fallback for a player without one.

const NAME_TO_CODE: Record<string, string> = {
  Albania: 'ALB', Andorra: 'AND', Armenia: 'ARM', Austria: 'AUT', Azerbaijan: 'AZE', Belarus: 'BLR',
  Belgium: 'BEL', 'Bosnia and Herzegovina': 'BIH', Bulgaria: 'BUL', Croatia: 'CRO', Cyprus: 'CYP',
  Czechia: 'CZE', 'Czech Republic': 'CZE', Denmark: 'DEN', England: 'ENG', Estonia: 'EST',
  'Faroe Islands': 'FRO', Finland: 'FIN', France: 'FRA', Georgia: 'GEO', Germany: 'GER', Gibraltar: 'GIB',
  Greece: 'GRE', Greenland: 'GRL', Guernsey: 'GGY', Hungary: 'HUN', Iceland: 'ISL', Ireland: 'IRL',
  Israel: 'ISR', Italy: 'ITA', Jersey: 'JEY', Kosovo: 'KOS', Latvia: 'LAT', Liechtenstein: 'LIE',
  Lithuania: 'LTU', Luxembourg: 'LUX', Malta: 'MLT', Moldova: 'MDA', Monaco: 'MON', Montenegro: 'MNE',
  Netherlands: 'NED', 'North Macedonia': 'MKD', Norway: 'NOR', Poland: 'POL', Portugal: 'POR',
  Romania: 'ROU', Russia: 'RUS', 'San Marino': 'SMR', Scotland: 'SCO', Serbia: 'SRB', Slovakia: 'SVK',
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

/** flag-icons file stem ("se", "gb-sct"), or null for neutral athletes ("ETTU2") and unknown codes. */
export function flagOf(code: string | null | undefined): string | null {
  return code ? CODE_TO_FLAG[code.toUpperCase()] ?? null : null;
}

export const HOME_CODE = 'SWE';

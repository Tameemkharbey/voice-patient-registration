// USPS 3-digit ZIP prefix ranges per state (inclusive). Used to catch obvious city/state/ZIP
// mismatches that speech recognition or the LLM let through (e.g. "New York, NY 17800" — 178 is PA).
// Deliberately coarse: only a prefix clearly outside the state's ranges is rejected.
const RANGES: Record<string, [number, number][]> = {
  AL: [[350, 369]], AK: [[995, 999]], AZ: [[850, 865]], AR: [[716, 729]], CA: [[900, 961]],
  CO: [[800, 816]], CT: [[60, 69]], DE: [[197, 199]], DC: [[200, 205], [569, 569]],
  FL: [[320, 349]], GA: [[300, 319], [398, 399]], HI: [[967, 968]], ID: [[832, 838]],
  IL: [[600, 629]], IN: [[460, 479]], IA: [[500, 528]], KS: [[660, 679]], KY: [[400, 427]],
  LA: [[700, 714]], ME: [[39, 49]], MD: [[206, 219]], MA: [[10, 27], [55, 55]],
  MI: [[480, 499]], MN: [[550, 567]], MS: [[386, 397]], MO: [[630, 658]], MT: [[590, 599]],
  NE: [[680, 693]], NV: [[889, 898]], NH: [[30, 38]], NJ: [[70, 89]], NM: [[870, 884]],
  NY: [[5, 5], [63, 63], [100, 149]], NC: [[270, 289]], ND: [[580, 588]], OH: [[430, 459]],
  OK: [[730, 732], [734, 749]], OR: [[970, 979]], PA: [[150, 196]], RI: [[28, 29]], SC: [[290, 299]],
  SD: [[570, 577]], TN: [[370, 385]], TX: [[733, 733], [750, 799], [885, 885]],
  UT: [[840, 847]], VT: [[50, 59]], VA: [[201, 201], [220, 246]], WA: [[980, 994]],
  WV: [[247, 268]], WI: [[530, 549]], WY: [[820, 831]],
  PR: [[6, 9]], VI: [[8, 8]], GU: [[969, 969]], AS: [[967, 967]], MP: [[969, 969]],
  AA: [[340, 340]], AE: [[90, 98]], AP: [[962, 966]],
};

// True when the ZIP is plausible for the state (or the state has no range data).
export const zipMatchesState = (zip: string, state: string): boolean => {
  const ranges = RANGES[state];
  if (!ranges) return true;
  const prefix = Number(zip.slice(0, 3));
  return ranges.some(([lo, hi]) => prefix >= lo && prefix <= hi);
};

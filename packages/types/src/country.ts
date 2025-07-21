export interface Country {
  name: string;    // The name of the country
  iso3166: {
    alpha2: string;   // ISO 3166-1 alpha-2 code
    alpha3: string;   // ISO 3166-1 alpha-3 code
    numeric: string;  // ISO 3166-1 numeric code
  }
  dial_code: string;  // The dial code
  flag: string;       // The path to the flag image (e.g., "public/flags/us.svg")
}
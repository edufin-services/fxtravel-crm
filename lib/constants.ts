export const FOREX_SERVICES = [
  "Currency Exchange",
  "Outward Remittance",
  "Forex Card Reload",
  "International SIM",
] as const;
export type ForexService = (typeof FOREX_SERVICES)[number];

export const SERVICES = ["Tours & Packages", "Flights/Hotels", "Others"] as const;
export type Service = (typeof SERVICES)[number];

export const STAGES = [
  "Initial",
  "Connected",
  "Confirmed",
  "Closed",
] as const;
export type Stage = (typeof STAGES)[number];

export const CHANNELS = ["WhatsApp", "Instagram", "Facebook", "Ads", "Email", "Referral/Others"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CLIENT_VISIT_STAGES = ["Live", "Disc in progress", "Converted", "Not interested"] as const;
export type ClientVisitStage = (typeof CLIENT_VISIT_STAGES)[number];

export const CLIENT_VISIT_STATUSES = CLIENT_VISIT_STAGES;
export type ClientVisitStatus = ClientVisitStage;

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", baseRate: 86.50 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", baseRate: 90.20 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", baseRate: 108.40 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", baseRate: 60.10 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", baseRate: 54.80 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", baseRate: 64.30 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", baseRate: 23.55 },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", baseRate: 2.52 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", baseRate: 0.56 },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const LRS_PURPOSES = [
  "Education Abroad (University Fees)",
  "Family Maintenance / Gift",
  "Medical Treatment Abroad",
  "Personal Travel & Tourism",
  "Business Travel & Seminars",
  "Emigration / Settlement",
] as const;

export const COMPLIANCE_LIMITS = {
  CASH_NOTES_USD_CAP: 3000,
  PAY_ON_DELIVERY_INR_CAP: 49999,
  LRS_ANNUAL_USD_CAP: 250000,
} as const;

export const OPERATING_CITIES = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Pune",
  "Chandigarh",
  "Kochi",
] as const;

export const AGENTS = [
  "Unassigned",
] as const;

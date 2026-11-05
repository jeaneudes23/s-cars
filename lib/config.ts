// Business details used across the public website. Replace with the real ones.
export const WHATSAPP_NUMBER = "250788000000"; // country code + digits only
export const PHONE_DISPLAY = "+250 788 000 000";
export const EMAIL = "hello@scars.rw";

// Suggestions only: a driver can pick up from any address the customer types.
export const PICKUP_SUGGESTIONS = [
  "Kigali International Airport (KGL)",
  "Kigali City Centre",
  "Kimihurura",
  "Nyarutarama",
  "Kacyiru",
  "Remera",
];

export const CATEGORY_LABELS = {
  economy: "Economy",
  suv: "SUV",
  "4x4": "4x4 & Safari",
  luxury: "Executive",
} as const;

export const COST_LABELS = { fuel: "Fuel", repair: "Repair", other: "Other" } as const;

export const JOB_TYPES = ["Airport transfer", "City chauffeur", "Day trip", "Long distance", "Other"];

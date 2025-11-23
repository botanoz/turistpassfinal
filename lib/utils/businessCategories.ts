export const BUSINESS_CATEGORIES = [
  "Historical",
  "Museum",
  "Restaurant",
  "Cafe",
  "Spa & Massage",
  "Shopping",
  "Activity",
  "Beauty",
  "Auto Service",
] as const;

export const BUSINESS_STATUSES = [
  "pending",
  "active",
  "inactive",
  "approved",
  "suspended",
  "rejected",
] as const;

const CATEGORY_SYNONYMS: Record<string, (typeof BUSINESS_CATEGORIES)[number]> = {
  historical: "Historical",
  history: "Historical",
  museum: "Museum",
  gallery: "Museum",
  muze: "Museum",
  restaurant: "Restaurant",
  rest: "Restaurant",
  restoran: "Restaurant",
  dining: "Restaurant",
  food: "Restaurant",
  "food & beverage": "Restaurant",
  "food and beverage": "Restaurant",
  bar: "Restaurant",
  eatery: "Restaurant",
  cafe: "Cafe",
  coffee: "Cafe",
  kafe: "Cafe",
  "spa & massage": "Spa & Massage",
  spa: "Spa & Massage",
  massage: "Spa & Massage",
  wellness: "Spa & Massage",
  shopping: "Shopping",
  retail: "Shopping",
  store: "Shopping",
  mall: "Shopping",
  market: "Shopping",
  activity: "Activity",
  experience: "Activity",
  adventure: "Activity",
  entertainment: "Activity",
  tour: "Activity",
  beauty: "Beauty",
  salon: "Beauty",
  barber: "Beauty",
  kuafor: "Beauty",
  hamam: "Spa & Massage",
  "auto service": "Auto Service",
  auto: "Auto Service",
  car: "Auto Service",
  mechanic: "Auto Service",
};

export function normalizeBusinessCategory(
  value: string | null | undefined,
): (typeof BUSINESS_CATEGORIES)[number] | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();

  const synonymMatch = CATEGORY_SYNONYMS[normalized];
  if (synonymMatch) return synonymMatch;

  const direct = BUSINESS_CATEGORIES.find(
    (category) => category.toLowerCase() === normalized,
  );
  if (direct) return direct;

  const byPrefix = BUSINESS_CATEGORIES.find((category) =>
    category.toLowerCase().startsWith(normalized),
  );
  if (byPrefix) return byPrefix;

  const synonymByInclusion = Object.entries(CATEGORY_SYNONYMS).find(([key]) =>
    normalized.includes(key),
  );
  if (synonymByInclusion) return synonymByInclusion[1];

  return null;
}

export function normalizeBusinessStatus(
  value: string | null | undefined,
): (typeof BUSINESS_STATUSES)[number] | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (
    (BUSINESS_STATUSES.find((status) => status === normalized) ?? null)
  );
}

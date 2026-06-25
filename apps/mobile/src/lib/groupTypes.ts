export const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Church",      color: "#7A9EAF" },
};

export const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPE_CONFIG);

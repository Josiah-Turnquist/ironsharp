export type MembershipTier = "free" | "connect" | "sharpen" | "family";

export type TierInfo = {
  id: MembershipTier;
  name: string;
  price: string;
  priceLabel?: string;
  tagline: string;
  people: string;
  features: string[];
  color: string;
  pale: string;
  mostPopular?: boolean;
};

export const TIERS: TierInfo[] = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    tagline: "Start the habit",
    people: "You + 2 others",
    features: [
      "1-on-1 groups",
      "All 5 color themes",
      "Core devotional plans",
      "Read-aloud and voice memos",
      "Streak tracking",
      "You + 2 others",
    ],
    color: "#A89070",
    pale: "#F5EEE6",
  },
  {
    id: "connect",
    name: "Connect",
    price: "$18",
    priceLabel: "/yr",
    tagline: "Go deeper together",
    people: "Up to 5 people",
    features: [
      "Everything in Free",
      "Themed devotional plans",
      "Discipler tools",
      "Study notes",
      "Priority content",
      "Up to 5 people",
    ],
    color: "#89B4C9",
    pale: "#D8ECF5",
  },
  {
    id: "sharpen",
    name: "Sharpen",
    price: "$40",
    priceLabel: "/yr",
    tagline: "Iron sharpens iron",
    people: "Up to 10 people",
    features: [
      "Everything in Connect",
      "Full group mode",
      "Community devotional",
      "Premium plans",
      "Bonus podcast",
      "Up to 10 people",
    ],
    color: "#5C4A3A",
    pale: "#EDE3D4",
    mostPopular: true,
  },
  {
    id: "family",
    name: "Family",
    price: "$55",
    priceLabel: "/yr",
    tagline: "Faith for the whole house",
    people: "2 adults + 2 kids",
    features: [
      "Everything in Sharpen",
      "Child profiles with Youth Mode",
      "All family combinations",
      "Parental dashboard",
      "2 adults + 2 kids",
      "Shared family streak",
    ],
    color: "#7FAF8A",
    pale: "#D0E8D4",
  },
];

export const getTier = (id: MembershipTier): TierInfo =>
  TIERS.find((t) => t.id === id) ?? TIERS[0];
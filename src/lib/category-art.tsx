import {
  Carrot,
  Apple,
  Sprout,
  Milk,
  Beef,
  Wheat,
  CupSoda,
  Cookie,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react";

type CategoryArt = { icon: LucideIcon; gradient: string };

// Icon + gradient per category slug, used for nav chips and as product-card
// placeholder art in place of photography we don't have yet.
const ART: Record<string, CategoryArt> = {
  vegetables: { icon: Carrot, gradient: "from-leaf-300 to-leaf-500" },
  fruits: { icon: Apple, gradient: "from-tomato-500 to-carrot-400" },
  "herbs-spices": { icon: Sprout, gradient: "from-leaf-500 to-leaf-700" },
  "dairy-eggs": { icon: Milk, gradient: "from-carrot-100 to-carrot-300" },
  "meat-seafood": { icon: Beef, gradient: "from-tomato-600 to-tomato-500" },
  "rice-grains": { icon: Wheat, gradient: "from-carrot-300 to-carrot-500" },
  beverages: { icon: CupSoda, gradient: "from-leaf-200 to-leaf-400" },
  "snacks-sweets": { icon: Cookie, gradient: "from-carrot-400 to-tomato-500" },
};

const FALLBACK: CategoryArt = { icon: ShoppingBasket, gradient: "from-leaf-300 to-leaf-600" };

export function categoryArt(slug: string | null | undefined): CategoryArt {
  return (slug && ART[slug]) || FALLBACK;
}

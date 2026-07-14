import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/hooks/use-cart";
import { WishlistProvider } from "@/hooks/use-wishlist";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>{children}</CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

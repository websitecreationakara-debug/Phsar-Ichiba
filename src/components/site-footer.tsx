import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-leaf-100 bg-leaf-900 text-leaf-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-flex items-center rounded-xl bg-cream px-3 py-2">
            <img src="/brand/wordmark.png" alt="Phsar Ichiba" className="h-8 w-auto object-contain" />
          </Link>
          <p className="mt-3 text-sm text-leaf-200">{t("footer.tagline")}</p>
        </div>

        <FooterCol
          title={t("footer.shop")}
          links={[
            { label: t("footer.allProducts"), to: "/shop" },
            { label: t("footer.catVegetables"), to: "/shop", search: { category: "vegetables" } },
            { label: t("footer.catFruits"), to: "/shop", search: { category: "fruits" } },
            { label: t("footer.catMeatSeafood"), to: "/shop", search: { category: "meat-seafood" } },
          ]}
        />

        <FooterCol
          title={t("footer.customerCare")}
          links={[
            { label: t("footer.myAccount"), to: "/account" },
            { label: t("footer.orderTracking"), to: "/account" },
          ]}
        />

        <div>
          <h4 className="font-display text-sm font-semibold text-white">{t("footer.getInTouch")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-leaf-200">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> Phnom Penh, Cambodia
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> +855 12 345 678
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> hello@phsarichiba.com
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-leaf-800 px-4 py-4 text-center text-xs text-leaf-300">
        © {new Date().getFullYear()} Phsar Ichiba. {t("footer.rights")}
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string; search?: Record<string, string> }[];
}) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-leaf-200">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} search={l.search as never} className="transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

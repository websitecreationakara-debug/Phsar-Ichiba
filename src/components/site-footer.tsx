import { Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-leaf-200 bg-leaf-100 text-leaf-800">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-flex items-center">
            <img src="/brand/wordmark.png" alt="Phsar Ichiba" className="h-12 w-auto object-contain" />
          </Link>
          <p className="mt-3 text-sm text-leaf-800/70">{t("footer.tagline")}</p>
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
          <h4 className="font-display text-sm font-semibold text-leaf-900">{t("footer.getInTouch")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-leaf-800/70">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> Phnom Penh, Cambodia
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <a href="tel:023966313" className="transition hover:text-leaf-900">
                023-966-313
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-leaf-200 px-4 py-4 text-center text-xs text-leaf-800/70">
        © <span className="font-semibold text-leaf-600">{new Date().getFullYear()}</span> Phsar Ichiba. {t("footer.rights")}
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
      <h4 className="font-display text-sm font-semibold text-leaf-900">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-leaf-800/70">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} search={l.search as never} className="transition hover:text-leaf-900">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { useI18n, localizedHeroField } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const GRADIENTS = ["from-leaf-600 to-leaf-800", "from-carrot-500 to-tomato-600", "from-leaf-500 to-leaf-700"];

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const { t, locale } = useI18n();

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const raw = slides[active];
  const slide = {
    ...raw,
    eyebrow: localizedHeroField(raw.eyebrow, raw.eyebrow_en, locale),
    title_top: localizedHeroField(raw.title_top, raw.title_top_en, locale),
    title_accent: localizedHeroField(raw.title_accent, raw.title_accent_en, locale),
    title_bottom: localizedHeroField(raw.title_bottom, raw.title_bottom_en, locale),
    body: localizedHeroField(raw.body, raw.body_en, locale),
    cta_label: localizedHeroField(raw.cta_label, raw.cta_label_en, locale),
  };

  return (
    <section className="relative overflow-hidden rounded-3xl">
      <div
        className={cn(
          "relative flex min-h-[320px] items-center bg-gradient-to-br px-8 py-12 sm:min-h-[380px] sm:px-14",
          GRADIENTS[active % GRADIENTS.length],
        )}
      >
        <div className="max-w-lg">
          {slide.eyebrow && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/80">
              {slide.eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            {slide.title_top} <span className="text-carrot-200">{slide.title_accent}</span>{" "}
            {slide.title_bottom}
          </h1>
          {slide.body && <p className="mt-4 text-sm text-white/85 sm:text-base">{slide.body}</p>}
          {slide.cta_label && (
            <Link
              to={slide.cta_link}
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-leaf-800 shadow-sm transition hover:bg-cream"
            >
              {slide.cta_label}
            </Link>
          )}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
              aria-label={t("a11y.prevSlide")}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActive((i) => (i + 1) % slides.length)}
              aria-label={t("a11y.nextSlide")}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t("a11y.goToSlide", { n: i + 1 })}
              className={cn(
                "h-1.5 rounded-full bg-white/50 transition-all",
                i === active ? "w-6 bg-white" : "w-1.5",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Customers are Japanese-speaking; storefront defaults to Japanese with an
// English toggle. Staff-facing UI (when built) should default to English
// instead, since staff read English, not Japanese or Khmer.
export type Locale = "ja" | "en";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
];

// Categories only have one customer-facing name field (Japanese, from the
// WooCommerce import) plus an admin-only `name_en`. Reuse `name_en` for the
// storefront's English mode too, falling back to the Japanese name when a
// category hasn't been translated yet.
export function localizedCategoryName(
  c: { name: string; name_en?: string | null },
  locale: Locale,
): string {
  return locale === "en" ? c.name_en || c.name : c.name;
}

const ja = {
  "root.title": "プサール・イチバ — フレッシュマーケット",
  "root.description": "新鮮な野菜・果物・日用食品を毎日収穫し、迅速にお届けします。",

  "bar.delivery": "{threshold}$以上のご注文で配送無料 — 午後6時までのご注文で当日配送。",

  "nav.searchPlaceholder": "野菜、果物などを検索…",
  "nav.all": "すべて",
  "nav.wishlist": "お気に入り",
  "nav.account": "アカウント",
  "nav.cart": "カート",
  "nav.allProducts": "すべての商品",

  "home.perk1.title": "毎日新鮮に収穫",
  "home.perk1.body": "毎朝、地元の農家から仕入れています。",
  "home.perk2.title": "当日配送",
  "home.perk2.body": "午後6時までのご注文で当日お届け。",
  "home.perk3.title": "品質保証",
  "home.perk3.body": "ご満足いただけない場合は、責任を持って対応いたします。",
  "home.perk4.title": "年中無休",
  "home.perk4.body": "午前7時〜午後9時、土日も営業。",
  "home.shopByCategory": "カテゴリーから探す",
  "home.onSale": "今週のセール",
  "home.freshPicks": "新鮮なおすすめ商品",
  "home.seeAll": "すべて見る",

  "shop.allProducts": "すべての商品",
  "shop.resultsFor": "「{q}」の検索結果",
  "shop.loading": "読み込み中…",
  "shop.itemCount": "{n}件の商品",
  "shop.categories": "カテゴリー",
  "shop.noProducts": "商品が見つかりませんでした。",
  "shop.noProductsFor": "「{q}」に該当する商品が見つかりませんでした。",
  "shop.filters": "絞り込み",
  "shop.clearAll": "すべてクリア",
  "shop.search": "検索",
  "shop.price": "価格",
  "shop.offers": "オファー",
  "shop.onSaleOnly": "セール中のみ",
  "shop.sort": "並び替え",
  "shop.sort.featured": "おすすめ順",
  "shop.sort.priceAsc": "価格が安い順",
  "shop.sort.priceDesc": "価格が高い順",
  "shop.sort.rating": "評価が高い順",
  "shop.noProductsSub": "フィルターを調整してみてください。",
  "shop.clearFilters": "フィルターをクリア",
  "shop.showResults": "{n}件を表示",

  "product.breadcrumbShop": "ショップ",
  "product.notFound": "商品が見つかりません。",
  "product.backToShop": "ショップに戻る",
  "product.ratings": "({n}件の評価)",
  "product.chooseSize": "サイズを選択",
  "product.addToBasket": "カートに追加",
  "product.soldOut": "売り切れ",
  "product.selectSize": "サイズを選択してください",
  "product.rateThis": "この商品を評価する",
  "product.signInToRate": "ログインして評価する",
  "product.signIn": "ログイン",
  "product.addToCartAria": "{title}をカートに追加",

  "cart.count": "カート ({n})",
  "cart.empty": "カートは空です",
  "cart.emptySub": "新鮮な野菜や果物がすぐそこに。",
  "cart.startShopping": "買い物を始める",
  "cart.viewBasket": "カートを見る",
  "cart.title": "カート",
  "cart.orderSummary": "注文内容",
  "cart.subtotal": "小計",
  "cart.deliveryFeeNotice": "配送料 $2.50 がチェックアウト時に加算されます。",
  "cart.total": "合計",
  "cart.priceEach": "単価 {price}",

  "account.welcomeBack": "おかえりなさい",
  "account.createAccount": "アカウントを作成",
  "account.signInSub": "ログインして注文状況の確認やお気に入りの保存ができます。",
  "account.signUpSub": "会員登録でよりスムーズにお買い物いただけます。",
  "account.fullName": "お名前",
  "account.email": "メールアドレス",
  "account.password": "パスワード",
  "account.pleaseWait": "処理中…",
  "account.signIn": "ログイン",
  "account.createAccountBtn": "アカウント作成",
  "account.noAccount": "アカウントをお持ちでない方は ",
  "account.haveAccount": "すでにアカウントをお持ちの方は ",
  "account.signUp": "新規登録",
  "account.signOut": "ログアウト",
  "account.continueWithGoogle": "Googleでログイン",
  "account.orDivider": "または",
  "account.verifyTitle": "メールアドレスを確認",
  "account.verifySub": "{email} に送信された6桁のコードを入力してください。",
  "account.verificationCode": "認証コード",
  "account.verifyBtn": "メールを確認",
  "account.verifying": "確認中…",
  "account.resendCode": "コードを再送信",
  "account.useDifferentEmail": "別のメールアドレスを使用",
  "account.forgotPassword": "パスワードをお忘れですか？",
  "account.resetTitle": "パスワードをリセット",
  "account.resetSub": "アカウントのメールアドレスを入力すると、6桁のコードをお送りします。",
  "account.sendResetCode": "リセットコードを送信",
  "account.sending": "送信中…",
  "account.backToSignIn": "ログインに戻る",
  "account.resetVerifyTitle": "新しいパスワードを設定",
  "account.resetVerifySub": "{email} に送信された6桁のコードと新しいパスワードを入力してください。",
  "account.newPassword": "新しいパスワード",
  "account.resetBtn": "パスワードをリセット",
  "account.resetting": "リセット中…",

  "footer.tagline": "新鮮な野菜・果物・日用食品を毎日お届けします。",
  "footer.shop": "ショップ",
  "footer.allProducts": "すべての商品",
  "footer.catVegetables": "野菜",
  "footer.catFruits": "果物",
  "footer.catMeatSeafood": "肉・魚介類",
  "footer.customerCare": "カスタマーサポート",
  "footer.myAccount": "マイアカウント",
  "footer.orderTracking": "注文状況の確認",
  "footer.getInTouch": "お問い合わせ",
  "footer.rights": "全著作権所有。",

  "a11y.closeCart": "カートを閉じる",
  "a11y.close": "閉じる",
  "a11y.removeItem": "削除",
  "a11y.decreaseQty": "数量を減らす",
  "a11y.increaseQty": "数量を増やす",
  "a11y.toggleMenu": "メニューを切り替える",
  "a11y.switchLanguage": "言語を切り替える",
  "a11y.prevSlide": "前のスライド",
  "a11y.nextSlide": "次のスライド",
  "a11y.goToSlide": "スライド{n}へ",
} as const;

export type I18nKey = keyof typeof ja;
type Dict = Record<I18nKey, string>;

const en: Dict = {
  "root.title": "Phsar Ichiba — Fresh Market",
  "root.description": "Fresh vegetables, fruit, and everyday groceries, picked daily and delivered fast.",

  "bar.delivery": "Free delivery on orders over {threshold}$ — order before 6pm for same-day delivery.",

  "nav.searchPlaceholder": "Search fresh vegetables, fruit, and more…",
  "nav.all": "All",
  "nav.wishlist": "Wishlist",
  "nav.account": "Account",
  "nav.cart": "Cart",
  "nav.allProducts": "All products",

  "home.perk1.title": "Picked fresh daily",
  "home.perk1.body": "Sourced from local farms every morning.",
  "home.perk2.title": "Same-day delivery",
  "home.perk2.body": "Order before 6pm, delivered today.",
  "home.perk3.title": "Quality guaranteed",
  "home.perk3.body": "Not happy? We'll make it right.",
  "home.perk4.title": "Open every day",
  "home.perk4.body": "7am – 9pm, including weekends.",
  "home.shopByCategory": "Shop by category",
  "home.onSale": "On sale this week",
  "home.freshPicks": "Fresh picks",
  "home.seeAll": "See all",

  "shop.allProducts": "All products",
  "shop.resultsFor": 'Results for "{q}"',
  "shop.loading": "Loading…",
  "shop.itemCount": "{n} item(s)",
  "shop.categories": "Categories",
  "shop.noProducts": "No products found.",
  "shop.noProductsFor": 'No products found for "{q}".',
  "shop.filters": "Filters",
  "shop.clearAll": "Clear all",
  "shop.search": "Search",
  "shop.price": "Price",
  "shop.offers": "Offers",
  "shop.onSaleOnly": "On sale only",
  "shop.sort": "Sort",
  "shop.sort.featured": "Featured",
  "shop.sort.priceAsc": "Price: Low to High",
  "shop.sort.priceDesc": "Price: High to Low",
  "shop.sort.rating": "Top Rated",
  "shop.noProductsSub": "Try adjusting your filters.",
  "shop.clearFilters": "Clear filters",
  "shop.showResults": "Show {n} results",

  "product.breadcrumbShop": "Shop",
  "product.notFound": "Product not found.",
  "product.backToShop": "Back to shop",
  "product.ratings": "({n} rating(s))",
  "product.chooseSize": "Choose a size",
  "product.addToBasket": "Add to basket",
  "product.soldOut": "Sold out",
  "product.selectSize": "Select a size",
  "product.rateThis": "Rate this product",
  "product.signInToRate": "Sign in to rate",
  "product.signIn": "Sign in",
  "product.addToCartAria": "Add {title} to cart",

  "cart.count": "Your basket ({n})",
  "cart.empty": "Your basket is empty",
  "cart.emptySub": "Fresh vegetables and fruit are just a click away.",
  "cart.startShopping": "Start shopping",
  "cart.viewBasket": "View basket",
  "cart.title": "Your basket",
  "cart.orderSummary": "Order summary",
  "cart.subtotal": "Subtotal",
  "cart.deliveryFeeNotice": "A $2.50 delivery fee is added at checkout.",
  "cart.total": "Total",
  "cart.priceEach": "{price} each",

  "account.welcomeBack": "Welcome back",
  "account.createAccount": "Create your account",
  "account.signInSub": "Sign in to track orders and save your favorites.",
  "account.signUpSub": "Join Phsar Ichiba for faster checkout.",
  "account.fullName": "Full name",
  "account.email": "Email",
  "account.password": "Password",
  "account.pleaseWait": "Please wait…",
  "account.signIn": "Sign in",
  "account.createAccountBtn": "Create account",
  "account.noAccount": "Don't have an account? ",
  "account.haveAccount": "Already have an account? ",
  "account.signUp": "Sign up",
  "account.signOut": "Sign out",
  "account.continueWithGoogle": "Continue with Google",
  "account.orDivider": "or",
  "account.verifyTitle": "Verify your email",
  "account.verifySub": "Enter the 6-digit code we sent to {email}.",
  "account.verificationCode": "Verification code",
  "account.verifyBtn": "Verify email",
  "account.verifying": "Verifying...",
  "account.resendCode": "Resend code",
  "account.useDifferentEmail": "Use a different email",
  "account.forgotPassword": "Forgot password?",
  "account.resetTitle": "Reset your password",
  "account.resetSub": "Enter your account email and we'll send you a 6-digit code.",
  "account.sendResetCode": "Send reset code",
  "account.sending": "Sending...",
  "account.backToSignIn": "Back to sign in",
  "account.resetVerifyTitle": "Set a new password",
  "account.resetVerifySub": "Enter the 6-digit code we sent to {email} and your new password.",
  "account.newPassword": "New password",
  "account.resetBtn": "Reset password",
  "account.resetting": "Resetting...",

  "footer.tagline": "Fresh vegetables, fruit, and everyday groceries — picked daily, delivered fast.",
  "footer.shop": "Shop",
  "footer.allProducts": "All products",
  "footer.catVegetables": "Fresh vegetables",
  "footer.catFruits": "Fresh fruits",
  "footer.catMeatSeafood": "Meat & seafood",
  "footer.customerCare": "Customer care",
  "footer.myAccount": "My account",
  "footer.orderTracking": "Order tracking",
  "footer.getInTouch": "Get in touch",
  "footer.rights": "All rights reserved.",

  "a11y.closeCart": "Close cart",
  "a11y.close": "Close",
  "a11y.removeItem": "Remove item",
  "a11y.decreaseQty": "Decrease quantity",
  "a11y.increaseQty": "Increase quantity",
  "a11y.toggleMenu": "Toggle menu",
  "a11y.switchLanguage": "Switch language",
  "a11y.prevSlide": "Previous slide",
  "a11y.nextSlide": "Next slide",
  "a11y.goToSlide": "Go to slide {n}",
};

const DICTS: Record<Locale, Dict> = { ja, en };

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\$?\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && saved in DICTS) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    } else {
      document.documentElement.lang = "ja";
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
  };

  const t = useCallback<Ctx["t"]>(
    (key, vars) => interpolate(DICTS[locale][key] ?? ja[key] ?? key, vars),
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

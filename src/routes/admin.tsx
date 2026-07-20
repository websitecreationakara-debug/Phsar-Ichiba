import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePendingOrderCount } from "@/hooks/use-products";
import { playChime } from "@/lib/chime";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  Settings,
  Image,
  GalleryHorizontalEnd,
  Megaphone,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { authClient } from "@/lib/auth-client";
import { TwoFactorSetup } from "@/components/two-factor-setup";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const SIDEBAR_KEY = "phsar-ichiba:admin-sidebar-collapsed";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/banners", label: "Hero Banner", icon: GalleryHorizontalEnd },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/media", label: "Media", icon: Image },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { user, isAdmin, isSales, isMarketing, isProductManager, isManager, isStaff, canAccessAdmin, loading, signOut } =
    useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: pendingCount = 0 } = usePendingOrderCount(!loading && !!user && isStaff);
  const prevCount = useRef<number | null>(null);

  // Whether this account has a password (credential provider). TOTP setup needs
  // one, so Google-only admins can't be forced through the 2FA gate — they rely
  // on Google's own 2FA instead. null = still loading.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    authClient
      .listAccounts()
      .then((res) => {
        if (active) setHasPassword((res.data ?? []).some((a) => a.providerId === "credential"));
      })
      .catch(() => {
        if (active) setHasPassword(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Collapsed sidebar shows icons only. Persisted so it survives navigation/reload.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });

  // Sales can only ever be on the Orders page.
  const salesBlocked = isSales && !isAdmin && !path.startsWith("/admin/orders");
  // Marketing is scoped to the catalog/marketing sections.
  const marketingPaths = ["/admin/products", "/admin/marketing", "/admin/categories", "/admin/media"];
  const marketingBlocked =
    isMarketing && !isAdmin && path !== "/admin" && !marketingPaths.some((p) => path.startsWith(p));
  // Product manager is scoped to just products/categories/media — no marketing
  // (promotions/promo codes), no dashboard, no orders.
  const productManagerPaths = ["/admin/products", "/admin/categories", "/admin/media"];
  const productManagerBlocked =
    isProductManager && !isAdmin && !productManagerPaths.some((p) => path.startsWith(p));
  // Manager is a full admin in the dashboard (the only difference — no role
  // changes — is enforced on the Users page and server-side).
  const visibleNav =
    isAdmin || isManager
      ? nav
      : isMarketing
        ? nav.filter((n) => n.to === "/admin" || marketingPaths.includes(n.to))
        : isProductManager
          ? nav.filter((n) => productManagerPaths.includes(n.to))
          : nav.filter((n) => n.to === "/admin/orders");

  useEffect(() => {
    if (!loading && (!user || !canAccessAdmin)) navigate({ to: "/" });
  }, [loading, user, canAccessAdmin, navigate]);

  useEffect(() => {
    if (salesBlocked) navigate({ to: "/admin/orders" });
    else if (marketingBlocked) navigate({ to: "/admin" });
    else if (productManagerBlocked) navigate({ to: "/admin/products" });
  }, [salesBlocked, marketingBlocked, productManagerBlocked, navigate]);

  useEffect(() => {
    // Alert only on an actual increase, never on first load.
    if (prevCount.current !== null && pendingCount > prevCount.current) {
      playChime();
      toast.success(`New order! ${pendingCount} pending.`, { duration: 6000 });
    }
    prevCount.current = pendingCount;
  }, [pendingCount]);

  if (loading || !user || !canAccessAdmin) {
    return <div className="grid min-h-screen place-items-center text-ink-soft">Checking access…</div>;
  }

  // Admins and managers hold the keys to the whole store — require 2FA before
  // they can use the dashboard. Google-only accounts (no password) can't set up
  // TOTP here, so they're exempt; assign such staff a password-based account.
  // While hasPassword is still loading (null), don't gate yet.
  const mustSetUp2fa = (isAdmin || isManager) && hasPassword === true && !user.twoFactorEnabled;
  if (mustSetUp2fa) {
    return (
      <div className="grid min-h-screen place-items-center bg-leaf-100 p-4">
        <div className="w-full max-w-lg space-y-5 rounded-2xl border border-leaf-200 bg-white p-6 md:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-leaf-600" />
            <h1 className="font-display text-xl font-bold text-ink">Secure your admin account</h1>
          </div>
          <p className="text-sm text-ink-soft">
            Two-factor authentication is required for {isAdmin ? "admin" : "manager"} accounts. Set it up once to
            continue — you'll enter a code from your authenticator app each time you sign in.
          </p>
          <TwoFactorSetup enabled={false} onChanged={() => window.location.reload()} />
          <button onClick={() => signOut().then(() => navigate({ to: "/" }))} className="text-sm text-ink-soft hover:text-ink">
            Sign out instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-leaf-100">
      <Toaster theme="light" richColors position="top-right" />
      <aside
        className={cn(
          "flex shrink-0 flex-col gap-8 border-r border-leaf-200 bg-leaf-100 transition-[width] duration-200",
          collapsed ? "w-20 items-center p-3" : "w-64 p-6",
        )}
      >
        <Link
          to="/"
          title="Phsar Ichiba"
          className={cn("flex min-w-0 items-center gap-2", collapsed && "justify-center")}
        >
          {collapsed ? (
            <img src={withBase('/brand/icon-mark.png')} alt="Phsar Ichiba" className="h-10 w-10 object-contain" />
          ) : (
            <img src={withBase('/brand/wordmark.png')} alt="Phsar Ichiba" className="h-14 w-auto object-contain" />
          )}
        </Link>
        <nav className="w-full flex-1 space-y-1">
          {visibleNav.map((n) => {
            const active = "exact" in n && n.exact ? path === n.to : path.startsWith(n.to);
            const badge = n.to === "/admin/orders" ? pendingCount : 0;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={cn(
                  "relative flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-leaf-600 text-white"
                    : "text-leaf-800/70 hover:bg-leaf-200 hover:text-leaf-900",
                )}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1">{n.label}</span>}
                {badge > 0 &&
                  (collapsed ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-tomato-500" />
                  ) : (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-500 px-1.5 text-xs font-bold text-white">
                      {badge}
                    </span>
                  ))}
              </Link>
            );
          })}
        </nav>
        <div className="w-full space-y-1">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-lg text-xs font-medium text-leaf-800/70 transition-colors hover:bg-leaf-200 hover:text-leaf-900",
              collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2.5",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && "Collapse"}
          </button>
          <Link
            to="/"
            title={collapsed ? "Back to storefront" : undefined}
            className={cn(
              "flex items-center rounded-lg text-xs text-leaf-800/60 transition-colors hover:bg-leaf-200 hover:text-leaf-900",
              collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2.5",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && "Back to storefront"}
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto bg-cream p-8">
        {salesBlocked || marketingBlocked || productManagerBlocked ? (
          <div className="text-ink-soft">Redirecting…</div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

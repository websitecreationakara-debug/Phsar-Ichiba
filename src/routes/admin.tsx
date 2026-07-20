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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";

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
  const { user, isAdmin, isSales, isMarketing, isProductManager, isUserManager, isStaff, canAccessAdmin, loading } =
    useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: pendingCount = 0 } = usePendingOrderCount(!loading && !!user && isStaff);
  const prevCount = useRef<number | null>(null);

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
  // User manager only sees the Users page — can add accounts, never change roles.
  const userManagerBlocked = isUserManager && !isAdmin && !path.startsWith("/admin/users");
  const visibleNav = isAdmin
    ? nav
    : isMarketing
      ? nav.filter((n) => n.to === "/admin" || marketingPaths.includes(n.to))
      : isProductManager
        ? nav.filter((n) => productManagerPaths.includes(n.to))
        : isUserManager
          ? nav.filter((n) => n.to === "/admin/users")
          : nav.filter((n) => n.to === "/admin/orders");

  useEffect(() => {
    if (!loading && (!user || !canAccessAdmin)) navigate({ to: "/" });
  }, [loading, user, canAccessAdmin, navigate]);

  useEffect(() => {
    if (salesBlocked) navigate({ to: "/admin/orders" });
    else if (marketingBlocked) navigate({ to: "/admin" });
    else if (productManagerBlocked) navigate({ to: "/admin/products" });
    else if (userManagerBlocked) navigate({ to: "/admin/users" });
  }, [salesBlocked, marketingBlocked, productManagerBlocked, userManagerBlocked, navigate]);

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
        {salesBlocked || marketingBlocked || productManagerBlocked || userManagerBlocked ? (
          <div className="text-ink-soft">Redirecting…</div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

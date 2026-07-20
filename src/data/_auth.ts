import { getRequest } from "@tanstack/react-start/server";
import { getAuth } from "@/lib/auth";

export type SessionUser = { id: string; email: string; name: string; role?: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const request = getRequest();
  const res = await getAuth().api.getSession({ headers: request.headers });
  return (res?.user as SessionUser | undefined) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// "manager" is a full admin everywhere in the app except changing user roles
// (that single restriction lives in better-auth's admin permissions — see
// src/lib/admin-permissions.ts), so every gate below treats it like admin.
const isAdminRole = (role?: string | null) => role === "admin" || role === "manager";

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role)) throw new Error("Forbidden: admin only");
  return user;
}

// Catalog/marketing manager: admin or marketing. Gates the writes the marketing
// role is allowed to perform — products, categories, media, promotions, promo
// codes — while keeping users/settings/banners/orders admin-only.
export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role) && user.role !== "marketing")
    throw new Error("Forbidden: manager only");
  return user;
}

// Narrower than requireManager: admin, marketing, or product_manager. Gates
// products/categories/media only — product_manager is scoped to just the
// catalog, not promotions/promo codes/analytics (marketing-only extras).
export async function requireCatalogManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role) && user.role !== "marketing" && user.role !== "product_manager")
    throw new Error("Forbidden: catalog manager only");
  return user;
}

// Admin or sales — sales staff are scoped to order handling only.
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role) && user.role !== "sales") throw new Error("Forbidden: staff only");
  return user;
}

// Read-only order access for the dashboard: admin, sales, or marketing. Order
// mutations stay on requireStaff/requireAdmin — marketing can view, not manage.
export async function requireOrderViewer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role) && user.role !== "sales" && user.role !== "marketing")
    throw new Error("Forbidden");
  return user;
}

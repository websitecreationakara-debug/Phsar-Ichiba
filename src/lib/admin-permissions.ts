import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Shared by the server admin() plugin and the client adminClient() plugin so
// both agree on what each role may do. better-auth enforces these on every
// /api/auth/admin/* endpoint — the UI gating in /admin/users is cosmetic.
export const ac = createAccessControl(defaultStatements);

// No admin-API access at all. Every assignable role must still appear in the
// map below — better-auth refuses to assign a role it doesn't know about.
const noAdminApi = ac.newRole({ user: [], session: [] });

export const roles = {
  admin: ac.newRole({ ...adminAc.statements }),
  // Staff-onboarding role: may create accounts (always with the default "user"
  // role — passing any role requires the "set-role" permission, which this
  // role deliberately lacks), list users, and edit basic fields such as
  // emailVerified. No set-role, ban, delete, set-password, or impersonate, so
  // a user manager can never promote anyone or take over another account.
  user_manager: ac.newRole({ user: ["create", "list", "update"] }),
  user: noAdminApi,
  sales: noAdminApi,
  marketing: noAdminApi,
  product_manager: noAdminApi,
};

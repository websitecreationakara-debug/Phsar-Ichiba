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
  // Everything admin can do except "set-role": a manager can never change
  // anyone's role (better-auth also requires set-role to create an account
  // with a non-default role, so managers only ever create plain users).
  manager: ac.newRole({
    user: ["create", "list", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
  user: noAdminApi,
  sales: noAdminApi,
  marketing: noAdminApi,
  product_manager: noAdminApi,
};

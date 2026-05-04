import { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  adviser: "Adviser",
  panel: "Panel Member",
  adviser_panel: "Adviser + Panel",
  admin: "Admin",
};

export const ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "student",
  "adviser",
  "panel",
  "adviser_panel",
  "admin",
];

export const SELF_REGISTER_ROLES: UserRole[] = [
  "student",
  "adviser",
  "panel",
];

export function canActAsAdviser(role: UserRole): boolean {
  return role === "adviser" || role === "adviser_panel";
}

export function canActAsPanel(role: UserRole): boolean {
  return role === "panel" || role === "adviser_panel";
}

export function getDefaultDashboardRoute(role: UserRole): string {
  switch (role) {
    case "student":
      return "/student";
    case "adviser":
    case "adviser_panel":
      return "/adviser";
    case "panel":
      return "/panel";
    case "admin":
      return "/admin";
  }
}

export function getAllowedRoutePrefixes(role: UserRole): string[] {
  switch (role) {
    case "student":
      return ["/student"];
    case "adviser":
      return ["/adviser"];
    case "panel":
      return ["/panel"];
    case "adviser_panel":
      return ["/adviser", "/panel"];
    case "admin":
      return ["/admin"];
  }
}

export function getRolesForCapability(
  capability: "adviser" | "panel" | "direct",
  role?: UserRole,
): UserRole[] {
  if (capability === "direct" && role) {
    return [role];
  }

  if (capability === "adviser") {
    return ["adviser", "adviser_panel"];
  }

  return ["panel", "adviser_panel"];
}

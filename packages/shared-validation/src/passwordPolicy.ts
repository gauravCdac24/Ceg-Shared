import { hasLongRepeatedRun } from "./spam";

/** Single source of truth for cross-app password rules (mirrors docs/CROSS_APP_AUTH_LOCAL.md). */
export function validatePasswordPolicy(password: string): string | null {
  if (password == null || typeof password !== "string") return "Password is required";
  if (password.length < 8 || password.length > 128) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password needs a digit";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Password needs a special character";
  if (hasLongRepeatedRun(password, 5)) return "Password has too many repeated characters";
  return null;
}

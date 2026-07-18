export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}

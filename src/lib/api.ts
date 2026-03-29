export function getApiUrl(path: string) {
  const base = (import.meta.env.VITE_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (!base) {
    return path;
  }

  return `${base}${path}`;
}

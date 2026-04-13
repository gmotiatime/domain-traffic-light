export const sitePaths = ["/", "/analyzer", "/method", "/safety", "/admin", "/brand", "/changelog", "/presentation", "/articles", "/404"] as const;

export type SitePath = (typeof sitePaths)[number];

export function normalizeHashRoute(hash: string): SitePath {
  let cleaned = hash.trim().toLowerCase();

  // Remove query parameters if present
  const queryIndex = cleaned.indexOf('?');
  if (queryIndex !== -1) {
    cleaned = cleaned.substring(0, queryIndex);
  }

  // Remove all leading hashes
  cleaned = cleaned.replace(/^#+/, "") || "/";

  if (sitePaths.includes(cleaned as SitePath)) {
    return cleaned as SitePath;
  }

  return "/404";
}

export function routeHref(path: SitePath) {
  return `#${path}`;
}

export const sitePaths = ["/", "/analyzer", "/method", "/safety", "/admin", "/404"] as const;

export type SitePath = (typeof sitePaths)[number];

export function normalizeHashRoute(hash: string): SitePath {
  const cleaned = hash.replace(/^#/, "") || "/";

  if (sitePaths.includes(cleaned as SitePath)) {
    return cleaned as SitePath;
  }

  return "/404";
}

export function routeHref(path: SitePath) {
  return `#${path}`;
}

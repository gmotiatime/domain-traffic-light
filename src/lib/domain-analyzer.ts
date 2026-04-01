export type AnalyzerTone = "positive" | "warning" | "critical";
export type AnalyzerVerdict = "low" | "medium" | "high";

export type AnalyzerReason = {
  title: string;
  detail: string;
  scoreDelta: number;
  tone: AnalyzerTone;
};

export type DomainBreakdown = {
  subdomain: string;
  registrableDomain: string;
  tld: string;
};

export type AnalysisResult = {
  host: string;
  score: number;
  verdict: AnalyzerVerdict;
  verdictLabel: string;
  summary: string;
  reasons: AnalyzerReason[];
  actions: string[];
  breakdown: DomainBreakdown;
  analyzedAt: string;
};

// ─── Справочные данные ────────────────────────────────────────────────────────

const officialDomains = new Set([
  "cert.by",
  "cpd.by",
  "fingramota.by",
  "nces.by",
  "edu.gov.by",
  "gov.by",
  "president.gov.by",
  "mil.by",
  "mvd.gov.by",
  "mfa.gov.by",
]);

const officialTokens = [
  "cert",
  "cpd",
  "fingramota",
  "nces",
  "epasluga",
  "pasluga",
  "belarusbank",
  "belinvestbank",
  "priorbank",
  "bps-sberbank",
  "alfabank",
];

const protectedBrands = [
  { name: "Roblox", domains: ["roblox.com"], tokens: ["roblox", "rbx"] },
  { name: "Vercel", domains: ["vercel.com"], tokens: ["vercel"] },
  { name: "OpenAI", domains: ["openai.com", "chatgpt.com"], tokens: ["openai", "chatgpt"] },
  { name: "GitHub", domains: ["github.com"], tokens: ["github"] },
  { name: "Google", domains: ["google.com"], tokens: ["google", "gmail"] },
  { name: "Discord", domains: ["discord.com"], tokens: ["discord"] },
  { name: "Telegram", domains: ["telegram.org", "t.me"], tokens: ["telegram"] },
  { name: "Steam", domains: ["steampowered.com", "steamcommunity.com"], tokens: ["steam"] },
  { name: "PayPal", domains: ["paypal.com"], tokens: ["paypal"] },
  { name: "Apple", domains: ["apple.com"], tokens: ["apple", "icloud"] },
  { name: "Microsoft", domains: ["microsoft.com", "live.com"], tokens: ["microsoft", "outlook"] },
  { name: "Instagram", domains: ["instagram.com"], tokens: ["instagram", "insta"] },
  { name: "Facebook", domains: ["facebook.com"], tokens: ["facebook"] },
  { name: "TikTok", domains: ["tiktok.com"], tokens: ["tiktok"] },
  { name: "Amazon", domains: ["amazon.com", "amazon.co.uk", "amazon.de"], tokens: ["amazon"] },
  { name: "Netflix", domains: ["netflix.com"], tokens: ["netflix"] },
  { name: "WhatsApp", domains: ["whatsapp.com"], tokens: ["whatsapp"] },
  { name: "Binance", domains: ["binance.com"], tokens: ["binance"] },
  { name: "Coinbase", domains: ["coinbase.com"], tokens: ["coinbase"] },
  { name: "LinkedIn", domains: ["linkedin.com"], tokens: ["linkedin"] },
  { name: "Twitter", domains: ["twitter.com", "x.com"], tokens: ["twitter"] },
  { name: "Snapchat", domains: ["snapchat.com"], tokens: ["snapchat"] },
  { name: "Twitch", domains: ["twitch.tv"], tokens: ["twitch"] },
  { name: "Spotify", domains: ["spotify.com"], tokens: ["spotify"] },
  { name: "Dropbox", domains: ["dropbox.com"], tokens: ["dropbox"] },
  { name: "Zoom", domains: ["zoom.us"], tokens: ["zoom"] },
  { name: "AliExpress", domains: ["aliexpress.com", "alibaba.com"], tokens: ["aliexpress", "alibaba"] },
  { name: "Яндекс", domains: ["yandex.by", "yandex.ru", "ya.ru"], tokens: ["yandex", "yandeks"] },
  { name: "ВКонтакте", domains: ["vk.com"], tokens: ["vkontakte", "vkcom"] },
  { name: "Сбербанк", domains: ["sberbank.ru", "online.sberbank.ru"], tokens: ["sberbank", "sber"] },
  { name: "Tinkoff", domains: ["tinkoff.ru"], tokens: ["tinkoff"] },
  { name: "Беларусбанк", domains: ["belarusbank.by"], tokens: ["belarusbank", "belbank"] },
  { name: "Приорбанк", domains: ["priorbank.by"], tokens: ["priorbank", "prior"] },
  { name: "БПС-Сбербанк", domains: ["bps-sberbank.by"], tokens: ["bpssberbank", "bpssber"] },
  { name: "Альфа-Банк", domains: ["alfabank.by"], tokens: ["alfabank", "alfa"] },
] as const;

const suspiciousKeywords = [
  "login",
  "verify",
  "secure",
  "pay",
  "support",
  "update",
  "auth",
  "signin",
  "confirm",
  "account",
  "wallet",
  "banking",
  "password",
  "recover",
  "suspend",
  "gift",
  "free",
  "reward",
  "claim",
  "prize",
  "urgent",
  "reset",
  "activate",
  "unlock",
  "bonus",
  "promo",
  "token",
  "reissue",
  "restore",
  "invoice",
  "refund",
  "alert",
  "notification",
  "security",
  "verification",
  "validate",
  "suspended",
  "limited",
  "action",
  "required",
  "expire",
  "billing",
  "payment",
  "checkout",
  "airdrop",
  "nitro",
  "giveaway",
  "distribution",
  "promotion",
];

// Подозрительные фразы из реальных фишинговых сообщений
const maliciousTerms = [
  "accidentally reported",
  "mistakingly reported",
  "free nitro",
  "nitro for free",
  "discord is giving",
  "steam is giving",
  "steam gave nitro",
  "steam give nitro",
  "catch the gift",
  "catch the nitro",
  "who is first",
  "hurry up and get",
  "before the promotion end",
  "take nitro fast",
  "working nitro gen",
  "nitro code gen",
  "you won free",
  "i accidentally report",
  "free gift discord",
  "click to get",
];

// Подозрительные пути URL из фишинговых ссылок
const suspiciousPaths = new Set([
  "/airdrop",
  "/airdrop-nitro",
  "/claim",
  "/claim-nitro",
  "/free-nitro",
  "/freenitro",
  "/gift",
  "/gift-nitro",
  "/giveaway",
  "/giveaway-nitro",
  "/nitro",
  "/nitro-gift",
  "/nitrogift",
  "/promo",
  "/redeem",
  "/steam-gift",
  "/steamnitro",
  "/trade",
  "/tradeoffer",
  "/drop",
  "/nitrodrop",
]);

const urlShorteners = new Set([
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "is.gd",
  "cutt.ly",
  "clck.ru",
  "goo.gl",
  "ow.ly",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "v.gd",
  "bl.ink",
  "lnkd.in",
  "buff.ly",
  "soo.gd",
  "rebrand.ly",
  "short.io",
  "t.ly",
  "u.to",
  "s.id",
  "bitly.com",
  "tinycc.com",
  "gg.gg",
  "qr.ae",
]);

// Кириллическо-латинские гомоглифы: символы которые выглядят одинаково
const cyrLatHomoglyphs: Array<[string, string]> = [
  ["а", "a"], ["е", "e"], ["о", "o"], ["р", "p"], ["с", "c"],
  ["у", "y"], ["х", "x"], ["і", "i"], ["ё", "e"], ["к", "k"],
  ["н", "h"], ["т", "t"], ["ь", "b"], ["в", "b"],
];

const criticalTlds = new Map<string, number>([
  ["scam", 52],
  ["zip", 24],
  ["mov", 18],
  ["cam", 16],
  ["tk", 22],
  ["ml", 20],
  ["ga", 20],
  ["cf", 20],
  ["gq", 20],
  ["pw", 16],
]);

const elevatedTlds = new Set([
  "xyz",
  "top",
  "site",
  "click",
  "online",
  "live",
  "buzz",
  "rest",
  "monster",
  "icu",
  "quest",
  "tokyo",
  "work",
  "support",
  "fun",
  "club",
  "loan",
  "racing",
  "win",
  "bid",
  "stream",
  "life",
  "link",
  "space",
  "website",
  "today",
  "download",
  "world",
  "trade",
  "review",
  "date",
  "faith",
  "party",
  "cricket",
  "science",
  "accountant",
  "gdn",
  "men",
  "info",
  "mobi",
  "pro",
  "store",
  "shop",
  "gift",
  "gifts",
  "codes",
  "host",
  "digital",
  "cloud",
  "app",
]);

const trustedTlds = new Set([
  "by",
  "gov.by",
  "edu.gov.by",
  "mil.by",
  "org.by",
]);
const compoundSuffixes = [
  "edu.gov.by",
  "gov.by",
  "mil.by",
  "com.by",
  "net.by",
  "org.by",
  "com.ru",
  "net.ru",
  "org.ru",
  "pp.ru",
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
];

const ignoredDomainTokens = new Set([
  "www",
  "com",
  "net",
  "org",
  "gov",
  "edu",
  "mil",
  "by",
  "ru",
  "uk",
  "co",
  "pp",
]);

// Фишинговые префиксы из реальной базы угроз
const phishingPrefixes = new Set([
  "free",
  "get",
  "claim",
  "verify",
  "secure",
  "official",
  "app",
  "login",
  "account",
  "support",
  "help",
  "gift",
  "promo",
  "bonus",
  "reward",
  "win",
  "prize",
]);

// Whitelist легитимных доменов для предотвращения false positives
const legitimateDomains = new Set([
  "discord.gg",
  "discord.com", 
  "discordapp.com",
  "zoom.us",
  "zoom.com",
  "hypixel.net",
  "hypixel.com",
  "pornhub.com",
  "likee.com",
  "likee.video",
  "nvidia.com",
  "nvidia.cn",
]);

// Известные фишинговые паттерны (typosquatting популярных сервисов)
const knownPhishingPatterns = [
  // Discord variations
  /d[i1l][sc][c]?[o0][r]?[d]/i,
  /disc[o0]r[d]?/i,
  /dics[o0]rd/i,
  // Steam variations  
  /st[e3][a@][m]/i,
  /ste[a@]m/i,
  /steam.*community/i,
  /steam.*powered/i,
];

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function hasMixedScripts(value: string): boolean {
  const latin = /[a-z]/i.test(value);
  const cyrillic = /[а-яёіў]/i.test(value);
  return latin && cyrillic;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-zа-яёіў0-9]/gi, "");
}

function extractMeaningfulTokens(host: string): string[] {
  return host
    .split(/[.-]/)
    .map((part) => normalizeToken(part))
    .filter((token) => token.length >= 4 && !ignoredDomainTokens.has(token));
}

function hasHomoglyphPatterns(host: string): boolean {
  // Типичные подмены: 0↔o, 1↔l, rn↔m, vv↔w
  const patterns = [
    /0(?=[a-z])|(?<=[a-z])0/i, // 0 среди букв
    /[a-z]1[a-z]/i, // 1 среди букв
    /rn/, // rn вместо m
    /vv/, // vv вместо w
    /cl(?=[a-z])/i, // cl вместо d
    /ii/, // ii вместо u
    /lI|Il/i, // lI вместо U, Il вместо d
  ];
  return patterns.some((p) => p.test(host));
}

function hasCyrLatHomoglyphs(host: string): boolean {
  // Проверяем только хост без TLD
  const labels = host.split(".");
  if (labels.length < 2) return false;
  const withoutTld = labels.slice(0, -1).join(".");
  for (const [cyr, lat] of cyrLatHomoglyphs) {
    if (withoutTld.includes(cyr) && withoutTld.includes(lat)) {
      return true;
    }
  }
  // Проверяем наличие отдельных кириллических символов среди латиницы
  const hasCyr = /[а-яёіў]/i.test(withoutTld);
  const hasLat = /[a-z]/i.test(withoutTld);
  if (hasCyr && hasLat) {
    // Если есть и кириллица и латиница — это уже ловится hasMixedScripts,
    // но проверим конкретные гомоглифные подмены
    for (const [cyr] of cyrLatHomoglyphs) {
      if (withoutTld.includes(cyr)) {
        return true;
      }
    }
  }
  return false;
}

function entropyOf(value: string): number {
  const freq = new Map<string, number>();
  for (const char of value) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;

  // Оптимизация: используем два массива вместо матрицы
  let prev = Array.from({ length: cols }, (_, i) => i);
  let curr = new Array<number>(cols).fill(0);

  for (let row = 1; row < rows; row++) {
    curr[0] = row;
    for (let col = 1; col < cols; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      curr[col] = Math.min(
        prev[col] + 1,
        curr[col - 1] + 1,
        prev[col - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[right.length];
}

function normalizeInput(input: string):
  | { url: URL; host: string }
  | { error: string } {
  const raw = input.trim();

  if (!raw) {
    return { error: "Введите домен или ссылку." };
  }

  if (raw.length > 2048) {
    return { error: "Слишком длинный ввод. Максимум 2048 символов." };
  }

  // Блокируем опасные схемы
  if (/^(javascript|data|vbscript|file):/i.test(raw)) {
    return { error: "Недопустимая схема URL." };
  }

  let candidate = raw;

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");

    if (!host || !host.includes(".")) {
      return { error: "Нужен домен с точкой, например `portal.example`." };
    }

    if (host.length > 253) {
      return { error: "Имя хоста слишком длинное." };
    }

    const labels = host.split(".");
    if (labels.some((label) => label.length > 63 || label.length === 0)) {
      return { error: "Некорректная структура доменного имени." };
    }

    return { url, host };
  } catch {
    return {
      error:
        "Не удалось распознать ввод. Проверьте адрес и уберите лишние пробелы.",
    };
  }
}

function buildBreakdown(host: string): DomainBreakdown {
  const labels = host.split(".");

  const matchedSuffix = compoundSuffixes.find(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );

  if (matchedSuffix) {
    const suffixLength = matchedSuffix.split(".").length;

    if (labels.length === suffixLength) {
      return {
        subdomain: "",
        registrableDomain: host,
        tld: matchedSuffix,
      };
    }

    return {
      subdomain:
        labels.length > suffixLength + 1
          ? labels.slice(0, -(suffixLength + 1)).join(".")
          : "",
      registrableDomain: labels.slice(-(suffixLength + 1)).join("."),
      tld: matchedSuffix,
    };
  }

  return {
    subdomain: labels.length > 2 ? labels.slice(0, -2).join(".") : "",
    registrableDomain:
      labels.length >= 2 ? labels.slice(-2).join(".") : host,
    tld: labels.at(-1) || "",
  };
}

function actionsForVerdict(verdict: AnalyzerVerdict): string[] {
  if (verdict === "high") {
    return [
      "Не переходите по ссылке. Не вводите данные.",
      "Откройте официальный адрес вручную через поисковик.",
      "Покажите ссылку взрослому или специалисту.",
      "При необходимости сообщите через официальный канал CERT.BY.",
    ];
  }

  if (verdict === "medium") {
    return [
      "Не спешите. Сначала сверяйте домен вручную.",
      "Проверьте ядро домена, поддомен и слова-ловушки.",
      "Если адрес вызывает сомнение, не продолжайте переход.",
      "Сравните с официальным адресом, найденным через поисковик.",
    ];
  }

  return [
    "Сверьте адрес вручную перед вводом данных.",
    "Проверьте, что домен совпадает с ожидаемым сайтом.",
    "Продолжайте только при полном совпадении адреса.",
  ];
}

function findNearOfficialMatch(host: string): string | null {
  const tokens = extractMeaningfulTokens(host);

  for (const token of tokens) {
    for (const officialToken of officialTokens) {
      if (token === officialToken) {
        continue;
      }

      const distance = levenshtein(token, officialToken);
      const threshold = officialToken.length >= 7 ? 2 : 1;

      if (
        Math.abs(token.length - officialToken.length) <= 2 &&
        distance > 0 &&
        distance <= threshold
      ) {
        return officialToken;
      }
    }
  }

  return null;
}

function hasPhishingPrefix(host: string): string | null {
  const parts = host.split(".");
  for (const part of parts) {
    for (const prefix of phishingPrefixes) {
      if (part.startsWith(prefix + "-") || part === prefix) {
        return prefix;
      }
    }
  }
  return null;
}

function matchesKnownPhishingPattern(host: string): boolean {
  // Сначала проверяем, не является ли домен легитимным
  const hostLower = host.toLowerCase();
  const canonicalHost = hostLower.startsWith("www.") ? hostLower.slice(4) : hostLower;
  
  if (legitimateDomains.has(canonicalHost)) {
    return false; // Легитимный домен - не фишинг
  }
  
  return knownPhishingPatterns.some(pattern => pattern.test(host));
}

function containsMaliciousTerm(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const term of maliciousTerms) {
    if (lowerText.includes(term)) {
      return term;
    }
  }
  return null;
}

function hasSuspiciousPath(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, "");
  return suspiciousPaths.has(normalizedPath) || 
         Array.from(suspiciousPaths).some(path => normalizedPath.startsWith(path + "/"));
}

type ProtectedBrandMatch = {
  brand: string;
  officialDomain: string;
  observedToken: string;
  matchedToken: string;
  exact: boolean;
};

function findProtectedBrandMatch(
  host: string,
  canonicalHost: string,
): ProtectedBrandMatch | null {
  const tokens = extractMeaningfulTokens(host);

  for (const brand of protectedBrands) {
    const isOfficialBrandDomain = brand.domains.some(
      (domain) => canonicalHost === domain || canonicalHost.endsWith(`.${domain}`),
    );

    if (isOfficialBrandDomain) {
      continue;
    }

    for (const token of tokens) {
      for (const protectedToken of brand.tokens) {
        if (token === protectedToken) {
          return {
            brand: brand.name,
            officialDomain: brand.domains[0],
            observedToken: token,
            matchedToken: protectedToken,
            exact: true,
          };
        }

        const distance = levenshtein(token, protectedToken);
        const threshold = protectedToken.length >= 6 ? 2 : 1;

        if (
          Math.abs(token.length - protectedToken.length) <= 2 &&
          distance > 0 &&
          distance <= threshold
        ) {
          return {
            brand: brand.name,
            officialDomain: brand.domains[0],
            observedToken: token,
            matchedToken: protectedToken,
            exact: false,
          };
        }
      }
    }
  }

  return null;
}

// ─── Основной анализатор ──────────────────────────────────────────────────────

export function analyzeDomainInput(input: string): AnalysisResult {
  const normalized = normalizeInput(input);

  if ("error" in normalized) {
    const message = normalized.error || "Введите домен или ссылку.";

    return {
      host: "—",
      score: 0,
      verdict: "medium",
      verdictLabel: "Нужен корректный ввод",
      summary: message,
      reasons: [
        {
          title: "Нет распознанного домена",
          detail:
            "Анализатору нужен домен или URL, из которого можно выделить hostname.",
          scoreDelta: 0,
          tone: "warning",
        },
      ],
      actions: [
        "Введите домен вроде `portal.example`.",
        "Или вставьте полный URL вроде `https://cert.by/`.",
      ],
      breakdown: {
        subdomain: "",
        registrableDomain: "—",
        tld: "—",
      },
      analyzedAt: new Date().toISOString(),
    };
  }

  const { url, host } = normalized;
  const canonicalHost = host.startsWith("www.") ? host.slice(4) : host;
  const breakdown = buildBreakdown(host);
  const reasons: AnalyzerReason[] = [];
  let score = 0;
  let foundStructuralRisk = false;

  const pushReason = (
    title: string,
    detail: string,
    scoreDelta: number,
    tone: AnalyzerTone,
  ): void => {
    reasons.push({ title, detail, scoreDelta, tone });
    score += scoreDelta;
    if (tone !== "positive" && scoreDelta > 0) {
      foundStructuralRisk = true;
    }
  };

  // ── 1. Официальный домен ──────────────────────────────────────────────────

  // Проверяем whitelist легитимных доменов
  if (legitimateDomains.has(canonicalHost)) {
    pushReason(
      "Легитимный домен из whitelist",
      `Домен ${canonicalHost} находится в списке проверенных легитимных сервисов.`,
      -30,
      "positive",
    );
  }

  if (officialDomains.has(canonicalHost)) {
    pushReason(
      "Совпадение с официальным доменом",
      "Адрес совпадает со справочным официальным доменом. Это сильный положительный сигнал.",
      -45,
      "positive",
    );
  }

  // Проверяем gov-поддомены
  if (canonicalHost.endsWith(".gov.by") && !officialDomains.has(canonicalHost)) {
    pushReason(
      "Государственный домен .gov.by",
      "Домен находится в государственной зоне .gov.by. Это положительный сигнал, но проверьте точный адрес.",
      -20,
      "positive",
    );
  }

  // ── 2. Учебная зона ──────────────────────────────────────────────────────

  if (host.endsWith(".example") || host.endsWith(".test") || host.endsWith(".localhost")) {
    pushReason(
      "Учебная доменная зона",
      "Используется безопасная зона для демонстрации и тестовых сценариев.",
      0,
      "positive",
    );
  }

  // ── 3. Протокол ──────────────────────────────────────────────────────────

  if (
    url.protocol === "http:" &&
    !host.endsWith(".example") &&
    !host.endsWith(".test")
  ) {
    pushReason(
      "Незащищённый протокол HTTP",
      "Ссылка открывается по http, а не по https. Данные передаются без шифрования.",
      8,
      "warning",
    );
  }

  if (
    url.protocol === "https:" &&
    !host.endsWith(".example") &&
    !host.endsWith(".test")
  ) {
    pushReason(
      "Защищённый протокол HTTPS",
      "Ссылка использует https. Это базовый положительный сигнал, но он не гарантирует легитимность сайта.",
      -4,
      "positive",
    );
  }

  // ── 4. Punycode / IDN ────────────────────────────────────────────────────

  if (host.includes("xn--")) {
    pushReason(
      "Обнаружена Punycode-маскировка (Омоглиф)",
      "Адрес содержит замаскированные символы (шрифт xn--). Это критически опасный метод подделки визуального адреса известных сайтов.",
      85,
      "critical",
    );
  }

  // ── 5. Смешение письменностей ─────────────────────────────────────────────

  if (hasMixedScripts(host)) {
    pushReason(
      "Смешение письменностей",
      "В домене одновременно используются латиница и кириллица. Это частый признак визуальной подмены.",
      34,
      "critical",
    );
  }

  // ── 5b. Кириллическо-латинские гомоглифы ──────────────────────────────────

  if (!hasMixedScripts(host) && hasCyrLatHomoglyphs(host)) {
    pushReason(
      "Кириллическо-латинские гомоглифы",
      "Домен содержит символы, визуально идентичные между кириллицей и латиницей (а↔a, е↔e, о↔o и т.п.). Это техника маскировки.",
      32,
      "critical",
    );
  }

  // ── 6. Гомоглифы ─────────────────────────────────────────────────────────

  if (hasHomoglyphPatterns(host)) {
    pushReason(
      "Подозрительные подмены символов",
      "Обнаружены паттерны, похожие на визуальную подмену символов (0↔o, rn↔m, vv↔w и т.п.).",
      16,
      "warning",
    );
  }

  // ── 7. IP-адрес ──────────────────────────────────────────────────────────

  if (isIpAddress(host)) {
    pushReason(
      "Прямой IP-адрес",
      "Вместо доменного имени используется IP. Легитимные сервисы обычно используют домен.",
      20,
      "critical",
    );
  }

  // ── 8. Typo-squatting ─────────────────────────────────────────────────────

  const protectedBrandMatch = findProtectedBrandMatch(host, canonicalHost);
  if (protectedBrandMatch) {
    pushReason(
      protectedBrandMatch.exact
        ? `Имя бренда вне официального домена`
        : `Похоже на подмену бренда ${protectedBrandMatch.brand}`,
      protectedBrandMatch.exact
        ? `В адресе используется бренд '${protectedBrandMatch.brand}', но официальный домен сервиса — ${protectedBrandMatch.officialDomain}. Это типичный сценарий маскировки.`
        : `Фрагмент '${protectedBrandMatch.observedToken}' слишком похож на бренд '${protectedBrandMatch.matchedToken}', но официальный домен сервиса — ${protectedBrandMatch.officialDomain}. Это сильный признак brand-spoofing.`,
      protectedBrandMatch.exact ? 52 : 56,
      "critical",
    );
  }

  const typoMatch = findNearOfficialMatch(host);
  if (typoMatch && !protectedBrandMatch) {
    pushReason(
      "Похоже на typo-squat",
      `Один из фрагментов адреса слишком похож на '${typoMatch}', но не совпадает точно. Это может быть попытка имитации.`,
      24,
      "critical",
    );
  }

  // ── 8b. Обнаружение URL shortener ──────────────────────────────────────────

  if (urlShorteners.has(canonicalHost)) {
    pushReason(
      "Сокращённая ссылка",
      `Домен ${canonicalHost} — это сервис сокращения ссылок. За короткой ссылкой может скрываться любой адрес, включая фишинговый.`,
      18,
      "warning",
    );
  }

  // ── 8c. Проверка на известные фишинговые паттерны ──────────────────────────

  if (matchesKnownPhishingPattern(host)) {
    pushReason(
      "Известный фишинговый паттерн",
      "Домен соответствует известным паттернам фишинговых сайтов из базы угроз (например, вариации discord, steam с опечатками).",
      45,
      "critical",
    );
  }

  // ── 8d. Проверка на фишинговые префиксы ────────────────────────────────────

  const phishingPrefix = hasPhishingPrefix(host);
  if (phishingPrefix) {
    pushReason(
      "Подозрительный префикс",
      `Обнаружен префикс '${phishingPrefix}', который часто используется в фишинговых доменах (free-, get-, claim-, verify- и т.п.).`,
      22,
      "critical",
    );
  }

  // ── 9. Слова-ловушки в домене ─────────────────────────────────────────────

  const keywordHits = suspiciousKeywords.filter((kw) => host.includes(kw));
  if (keywordHits.length > 0) {
    pushReason(
      "Слова-ловушки в домене",
      `Найдены слова: ${keywordHits.join(", ")}. Они часто используются в фишинговых сценариях.`,
      Math.min(30, 10 * keywordHits.length),
      "warning",
    );
  }

  // ── 10. Слова-ловушки в пути URL ──────────────────────────────────────────

  const pathLower = url.pathname.toLowerCase();
  const pathKeywordHits = suspiciousKeywords.filter((kw) =>
    pathLower.includes(kw),
  );
  if (pathKeywordHits.length > 0) {
    pushReason(
      "Слова-ловушки в пути URL",
      `В пути ссылки есть слова: ${pathKeywordHits.join(", ")}. Даже при спокойном домене это требует проверки.`,
      Math.min(14, 5 * pathKeywordHits.length),
      "warning",
    );
  }

  // ── 11. Имитация официального сервиса ──────────────────────────────────────

  const normalizedHost = normalizeToken(host);
  const mimicsOfficial = officialTokens.some(
    (token) => normalizedHost.includes(token) && !officialDomains.has(canonicalHost),
  );
  if (mimicsOfficial && !typoMatch && !protectedBrandMatch) {
    // Не дублируем с typo-squat
    pushReason(
      "Имитация знакомого сервиса",
      "Адрес напоминает государственный или известный сервис, но не совпадает с официальным доменом.",
      18,
      "critical",
    );
  }

  // ── 12. Поддомены ────────────────────────────────────────────────────────

  if (breakdown.subdomain && breakdown.subdomain !== "www") {
    const depth = breakdown.subdomain.split(".").length;

    if (depth >= 3) {
      pushReason(
        "Очень глубокая цепочка поддоменов",
        `${depth} уровней поддоменов. Это сильно затрудняет проверку и часто используется для маскировки.`,
        18,
        "critical",
      );
    } else if (depth >= 2) {
      pushReason(
        "Глубокая цепочка поддоменов",
        "Несколько уровней поддоменов затрудняют быструю проверку и могут маскировать основное доменное имя.",
        12,
        "warning",
      );
    } else {
      pushReason(
        "Есть отдельный поддомен",
        "Поддомен не опасен сам по себе, но его нужно читать отдельно от ядра домена.",
        6,
        "warning",
      );
    }
  }

  // ── 13. Дефисы ───────────────────────────────────────────────────────────

  const hyphenCount = (host.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    pushReason(
      "Много дефисов",
      `${hyphenCount} дефисов в домене. Это часто используется для имитации знакомых названий.`,
      12,
      "warning",
    );
  } else if (hyphenCount >= 2) {
    pushReason(
      "Несколько дефисов",
      "Лишние дефисы часто используют, чтобы приблизить домен к знакомому названию.",
      8,
      "warning",
    );
  }

  // ── 14. Цифры ────────────────────────────────────────────────────────────

  const digitCount = (host.match(/\d/g) || []).length;
  if (digitCount >= 6) {
    pushReason(
      "Очень много цифр",
      `${digitCount} цифр в домене. Такие адреса выглядят как автоматически сгенерированные.`,
      12,
      "warning",
    );
  } else if (digitCount >= 4) {
    pushReason(
      "Много цифр",
      "Большое количество цифр в адресе делает его менее читаемым и требует проверки.",
      7,
      "warning",
    );
  }

  // ── 15. Длинные фрагменты ────────────────────────────────────────────────

  const longestLabel = Math.max(...host.split(".").map((s) => s.length));
  if (longestLabel >= 25) {
    pushReason(
      "Очень длинный фрагмент домена",
      `Фрагмент длиной ${longestLabel} символов. Такие домены почти невозможно быстро проверить.`,
      12,
      "warning",
    );
  } else if (longestLabel >= 18) {
    pushReason(
      "Слишком длинный фрагмент",
      "Один из фрагментов домена слишком длинный. Его труднее быстро проверить глазами.",
      7,
      "warning",
    );
  }

  // ── 16. Энтропия домена ──────────────────────────────────────────────────

  const domainEntropy = entropyOf(host.replace(/\./g, ""));
  if (domainEntropy > 4.2 && host.length > 12) {
    pushReason(
      "Высокая энтропия домена",
      "Домен выглядит как случайный набор символов, что характерно для автоматически сгенерированных адресов.",
      10,
      "warning",
    );
  }

  // ── 17. TLD-анализ ───────────────────────────────────────────────────────

  const criticalTldScore = criticalTlds.get(breakdown.tld);
  if (criticalTldScore) {
    pushReason(
      `Доменная зона .${breakdown.tld}`,
      `Зона .${breakdown.tld} относится к повышенно рискованным и требует жёсткой перепроверки.`,
      criticalTldScore,
      "critical",
    );
  } else if (elevatedTlds.has(breakdown.tld)) {
    pushReason(
      `Нестандартная зона .${breakdown.tld}`,
      "Некоторые доменные зоны чаще используются в одноразовых или сомнительных сценариях.",
      12,
      "warning",
    );
  }

  if (trustedTlds.has(breakdown.tld)) {
    pushReason(
      `Доверенная зона .${breakdown.tld}`,
      `Для целевого региона доменная зона .${breakdown.tld} выглядит ожидаемо.`,
      -3,
      "positive",
    );
  }

  // ── 18. URL-аномалии ──────────────────────────────────────────────────────

  if (url.username || url.password) {
    pushReason(
      "Скрытые данные перед @",
      "В URL есть служебная часть перед символом @. Это классический приём маскировки реального домена — пользователь видит адрес до @, но браузер откроет домен после @.",
      30,
      "critical",
    );
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    pushReason(
      "Нестандартный порт",
      `Порт ${url.port}. Нестандартный порт повышает требование к ручной проверке.`,
      5,
      "warning",
    );
  }

  // URL-фрагменты с подозрительными данными
  if (url.search && url.search.length > 100) {
    pushReason(
      "Длинная строка параметров",
      "URL содержит большое количество параметров. Это может использоваться для передачи скрытых данных.",
      4,
      "warning",
    );
  }

  // Процентное кодирование подозрительных символов
  const suspiciousEncoding = /%[0-9a-f]{2}/i.test(url.pathname) && url.pathname.length > 20;
  if (suspiciousEncoding) {
    pushReason(
      "Процентное кодирование в пути",
      "Путь URL содержит закодированные символы (%XX). Это может скрывать настоящее содержимое ссылки.",
      6,
      "warning",
    );
  }

  // Двойные расширения в пути (file.pdf.exe)
  const pathParts = url.pathname.split("/").filter(Boolean);
  const doubleExtension = pathParts.some((part) =>
    /\.\w{2,4}\.\w{2,4}$/.test(part),
  );
  if (doubleExtension) {
    pushReason(
      "Двойное расширение файла",
      "В пути URL обнаружено двойное расширение файла. Это часто используется для маскировки вредоносных файлов.",
      14,
      "critical",
    );
  }

  // ── 19. Длина хоста ─────────────────────────────────────────────────────

  if (host.length > 50) {
    pushReason(
      "Очень длинный домен",
      `Длина доменного имени — ${host.length} символов. Такие адреса крайне трудно проверить глазами и часто генерируются автоматически.`,
      14,
      "warning",
    );
  } else if (host.length > 40) {
    pushReason(
      "Длинный домен",
      `Длина доменного имени — ${host.length} символов. Длинные адреса сложнее проверить визуально.`,
      8,
      "warning",
    );
  }

  // ── 20. Слова-ловушки в поддомене ───────────────────────────────────────

  if (breakdown.subdomain && breakdown.subdomain !== "www") {
    const subdomainLower = breakdown.subdomain.toLowerCase();
    const subdomainKeywordHits = suspiciousKeywords.filter((kw) => subdomainLower.includes(kw));
    if (subdomainKeywordHits.length > 0) {
      pushReason(
        "Ловушка в поддомене",
        `Поддомен содержит слова: ${subdomainKeywordHits.join(", ")}. Это попытка создать иллюзию официальности (secure.bank.evil.com использует "secure" для обмана).`,
        Math.min(22, 8 * subdomainKeywordHits.length),
        "critical",
      );
    }
  }

  // ── 21. Читаемость ──────────────────────────────────────────────────────

  const looksReadable =
    (!breakdown.subdomain || breakdown.subdomain === "www") &&
    hyphenCount < 2 &&
    digitCount < 4 &&
    longestLabel < 18 &&
    host.length <= 40 &&
    !host.includes("xn--") &&
    !hasMixedScripts(host) &&
    !typoMatch &&
    !protectedBrandMatch &&
    !mimicsOfficial &&
    keywordHits.length === 0 &&
    pathKeywordHits.length === 0 &&
    domainEntropy <= 4.2;

  if (looksReadable && !foundStructuralRisk) {
    pushReason(
      "Читаемая структура домена",
      "Адрес короткий, понятный и без типичных приёмов маскировки. Его всё равно нужно сверить вручную.",
      -3,
      "positive",
    );
  }

  // ── 22. Пустой случай ───────────────────────────────────────────────────

  if (reasons.length === 0) {
    pushReason(
      "Явных тревожных признаков нет",
      "В домене не найдено сильных структурных паттернов риска. Это спокойный, но не абсолютный сигнал.",
      0,
      "positive",
    );
  }

  // ── Итоги ───────────────────────────────────────────────────────────────

  const sortedReasons = [...reasons].sort((left, right) => {
    const order: Record<AnalyzerTone, number> = {
      critical: 0,
      warning: 1,
      positive: 2,
    };
    const byTone = order[left.tone] - order[right.tone];
    if (byTone !== 0) return byTone;
    return Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta);
  });

  const normalizedScore = Math.max(0, Math.min(100, score));

  // Подсчёт critical-сигналов для guard
  const criticalCount = reasons.filter((r) => r.tone === "critical").length;

  let verdict: AnalyzerVerdict = "low";
  let verdictLabel = "Низкий риск";

  if (normalizedScore >= 42) {
    verdict = "high";
    verdictLabel = "Высокий риск";
  } else if (normalizedScore >= 12 || criticalCount >= 2) {
    verdict = "medium";
    verdictLabel = "Нужна перепроверка";
  }

  // Если два+ critical-сигнала, вердикт не может быть low
  if (criticalCount >= 2 && verdict === "low") {
    verdict = "medium";
    verdictLabel = "Нужна перепроверка";
  }

  // Динамический summary на основе обнаруженных проблем
  const topIssues = sortedReasons
    .filter((r) => r.tone === "critical" || r.tone === "warning")
    .slice(0, 3)
    .map((r) => r.title);

  let summary: string;
  if (verdict === "high") {
    summary = topIssues.length > 0
      ? `Обнаружены серьёзные признаки риска: ${topIssues.join(", ").toLowerCase()}. Переход и ввод данных лучше остановить.`
      : "Есть сильные признаки подмены, маскировки или рискованной структуры. Переход и ввод данных лучше остановить.";
  } else if (verdict === "medium") {
    summary = topIssues.length > 0
      ? `Есть настораживающие признаки: ${topIssues.join(", ").toLowerCase()}. Сначала сравните адрес с официальным доменом вручную.`
      : "Есть настораживающие признаки. Сначала сравните адрес с официальным доменом вручную.";
  } else {
    summary = "Сильных тревожных признаков не найдено. Всё равно сверяйте адрес вручную перед вводом данных.";
  }

  return {
    host,
    score: normalizedScore,
    verdict,
    verdictLabel,
    summary,
    reasons: sortedReasons,
    actions: actionsForVerdict(verdict),
    breakdown,
    analyzedAt: new Date().toISOString(),
  };
}

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
];

const criticalTlds = new Map<string, number>([
  ["scam", 52],
  ["zip", 24],
  ["mov", 18],
  ["cam", 16],
  ["tk", 20],
  ["ml", 18],
  ["ga", 18],
  ["cf", 18],
  ["gq", 18],
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

function hasHomoglyphPatterns(host: string): boolean {
  // Типичные подмены: 0↔o, 1↔l, rn↔m, vv↔w
  const patterns = [
    /0(?=[a-z])|(?<=[a-z])0/i, // 0 среди букв
    /[a-z]1[a-z]/i, // 1 среди букв
    /rn/, // rn вместо m
    /vv/, // vv вместо w
    /cl(?=[a-z])/i, // cl вместо d
  ];
  return patterns.some((p) => p.test(host));
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
  const tokens = host
    .split(".")
    .map((part) => normalizeToken(part))
    .filter((t) => t.length >= 4);

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
      "Punycode / IDN",
      "Адрес содержит xn--. Такие домены могут использоваться для визуальной подмены известных адресов.",
      38,
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

  const typoMatch = findNearOfficialMatch(host);
  if (typoMatch) {
    pushReason(
      "Похоже на typo-squat",
      `Один из фрагментов адреса слишком похож на '${typoMatch}', но не совпадает точно. Это может быть попытка имитации.`,
      24,
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
  if (mimicsOfficial && !typoMatch) {
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
      "В URL есть служебная часть перед символом @. Это классический приём маскировки реального домена.",
      22,
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

  // ── 19. Читаемость ──────────────────────────────────────────────────────

  const looksReadable =
    (!breakdown.subdomain || breakdown.subdomain === "www") &&
    hyphenCount < 2 &&
    digitCount < 4 &&
    longestLabel < 18 &&
    !host.includes("xn--") &&
    !hasMixedScripts(host) &&
    !typoMatch &&
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

  // ── 20. Пустой случай ───────────────────────────────────────────────────

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

  let verdict: AnalyzerVerdict = "low";
  let verdictLabel = "Низкий риск";
  let summary =
    "Сильных тревожных признаков не найдено. Всё равно сверяйте адрес вручную перед вводом данных.";

  if (normalizedScore >= 45) {
    verdict = "high";
    verdictLabel = "Высокий риск";
    summary =
      "Есть сильные признаки подмены, маскировки или рискованной структуры. Переход и ввод данных лучше остановить.";
  } else if (normalizedScore >= 14) {
    verdict = "medium";
    verdictLabel = "Нужна перепроверка";
    summary =
      "Есть настораживающие признаки. Сначала сравните адрес с официальным доменом вручную.";
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

export type Language = "ru" | "be" | "en";

export const languages = {
  ru: { name: "Русский", flag: "🇷🇺" },
  be: { name: "Беларуская", flag: "🇧🇾" },
  en: { name: "English", flag: "🇬🇧" },
} as const;

export type TranslationKey = keyof typeof translations.ru;

export const translations = {
  ru: {
    // Header
    siteName: "Доменный светофор",
    openAnalyzer: "Открыть анализатор",
    toggleTheme: "Переключить тему",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",

    // Navigation
    navHome: "Главная",
    navAnalyzer: "Анализатор",
    navMethod: "Методика",
    navSafety: "Безопасность",

    // Hero Section
    heroSubtitle: "Мгновенный AI Анализатор Доменов",
    heroTitle1: "Проверяй домен",
    heroTitle2: "до ввода данных",
    heroDescription: "Сервис помогает быстро оценить риск ссылки, понять причину сигнала и перейти к безопасному действию до того, как пользователь введёт данные.",
    heroPlaceholder: "Вставьте домен или ссылку...",
    heroButton: "Анализ",
    heroManifest1: "Проверка до ввода данных",
    heroManifest2: "Понятный вердикт риска",
    heroManifest3: "Без хранения личных данных",
    heroLink: "Как работает проверка",

    // AI Features
    aiSectionSubtitle: "Подкапотная магия",
    aiSectionTitle: "Множественный",
    aiSectionTitleSub: "анализ в реальном времени",
    aiFeature1Title: "Фиды фишинга",
    aiFeature1Text: "Моментальная сверка с актуальными базами OpenPhish и URLAbuse. Если домен уже засветился в малвари — вы узнаете об этом первыми.",
    aiFeature2Title: "Локальный Ruleset",
    aiFeature2Text: "Быстрый разбор структуры URL, проверка на опечатки популярных брендов и подозрительные TLD-зоны. Срабатывает мгновенно.",
    aiFeature3Title: "Умный AI-слой",
    aiFeature3Text: "После быстрой проверки языковая модель сводит все сигналы воедино, объясняет причину риска простым языком и даёт чёткую рекомендацию.",

    // Behavior Logic
    behaviorSubtitle: "Логика сервиса",
    behaviorTitle: "Пауза, проверка и действие",
    behaviorTitleSub: "— в одном сценарии",
    behaviorStep1Title: "Пауза",
    behaviorStep1Text: "Сервис останавливает пользователя до ввода кода, пароля или данных карты.",
    behaviorStep2Title: "Проверка",
    behaviorStep2Text: "Алгоритм показывает, что именно насторожило: punycode, поддомены, имитация бренда и слова-ловушки.",
    behaviorStep3Title: "Действие",
    behaviorStep3Text: "После сигнала пользователь получает следующий шаг: ручную сверку или переход к официальному каналу помощи.",

    // Home Proof
    proofSubtitle: "Что даёт сервис",
    proofTitle: "Понятный вход в реальный инструмент",
    proofItem1Title: "Быстрый старт",
    proofItem1Text: "Пользователь может начать проверку прямо с главной страницы, без лишних шагов и отвлекающих экранов.",
    proofItem2Title: "Объяснимый результат",
    proofItem2Text: "Сервис возвращает цвет риска, короткие причины оценки и конкретное следующее действие, а не абстрактное предупреждение.",
    proofItem3Title: "Безопасная публикация",
    proofItem3Text: "Для демонстрации используются учебные примеры и официальные маршруты помощи, поэтому проект можно показывать публично.",

    // Stats Section
    statsSubtitle: "Статистика в реальном времени",
    statsTitle: "Проверено доменов:",
    statsSafe: "Безопасные",
    statsSafeDesc: "Домены с низким риском",
    statsSuspicious: "Подозрительные",
    statsSuspiciousDesc: "Требуют внимания",
    statsDangerous: "Опасные",
    statsDangerousDesc: "Высокий риск фишинга",
    statsDatabase: "База данных",
    statsDatabaseDesc: "Размер кэша",
    statsFirstCheck: "Первая проверка:",
    statsLastCheck: "Последняя:",

    // CTA Section
    ctaTitle: "Готовы проверить ссылку?",
    ctaDescription: "Вставьте любой подозрительный домен и посмотрите, как работает алгоритм в реальном времени.",
    ctaButton: "Начать анализ",
  },
  be: {
    // Header
    siteName: "Даменны святлафор",
    openAnalyzer: "Адкрыць аналізатар",
    toggleTheme: "Пераключыць тэму",
    openMenu: "Адкрыць меню",
    closeMenu: "Закрыць меню",

    // Navigation
    navHome: "Галоўная",
    navAnalyzer: "Аналізатар",
    navMethod: "Методыка",
    navSafety: "Бяспека",

    // Hero Section
    heroSubtitle: "Імгненны AI Аналізатар Даменаў",
    heroTitle1: "Правяраць дамен",
    heroTitle2: "да ўводу даных",
    heroDescription: "Сэрвіс дапамагае хутка ацаніць рызыку спасылкі, зразумець прычыну сігналу і перайсці да бяспечнага дзеяння да таго, як карыстальнік увядзе даныя.",
    heroPlaceholder: "Устаўце дамен або спасылку...",
    heroButton: "Аналіз",
    heroManifest1: "Праверка да ўводу даных",
    heroManifest2: "Зразумелы вердыкт рызыкі",
    heroManifest3: "Без захавання асабістых даных",
    heroLink: "Як працуе праверка",

    // AI Features
    aiSectionSubtitle: "Падкапотная магія",
    aiSectionTitle: "Множны",
    aiSectionTitleSub: "аналіз у рэальным часе",
    aiFeature1Title: "Фіды фішынгу",
    aiFeature1Text: "Імгненная звера з актуальнымі базамі OpenPhish і URLAbuse. Калі дамен ужо засвяціўся ў малвары — вы даведаецеся аб гэтым першымі.",
    aiFeature2Title: "Лакальны Ruleset",
    aiFeature2Text: "Хуткі разбор структуры URL, праверка на памылкі папулярных брэндаў і падазроныя TLD-зоны. Спрацоўвае імгненна.",
    aiFeature3Title: "Разумны AI-слой",
    aiFeature3Text: "Пасля хуткай праверкі моўная мадэль зводзіць усе сігналы ў адно, тлумачыць прычыну рызыкі простай мовай і дае дакладную рэкамендацыю.",

    // Behavior Logic
    behaviorSubtitle: "Логіка сэрвісу",
    behaviorTitle: "Паўза, праверка і дзеянне",
    behaviorTitleSub: "— у адным сцэнары",
    behaviorStep1Title: "Паўза",
    behaviorStep1Text: "Сэрвіс спыняе карыстальніка да ўводу кода, пароля або даных карты.",
    behaviorStep2Title: "Праверка",
    behaviorStep2Text: "Алгарытм паказвае, што менавіта насцярожыла: punycode, паддамены, імітацыя брэнда і словы-пасткі.",
    behaviorStep3Title: "Дзеянне",
    behaviorStep3Text: "Пасля сігналу карыстальнік атрымлівае наступны крок: ручную зверку або пераход да афіцыйнага канала дапамогі.",

    // Home Proof
    proofSubtitle: "Што дае сэрвіс",
    proofTitle: "Зразумелы ўваход у рэальны інструмент",
    proofItem1Title: "Хуткі старт",
    proofItem1Text: "Карыстальнік можа пачаць праверку проста з галоўнай старонкі, без лішніх крокаў і адцягваючых экранаў.",
    proofItem2Title: "Растлумачальны вынік",
    proofItem2Text: "Сэрвіс вяртае колер рызыкі, кароткія прычыны ацэнкі і канкрэтнае наступнае дзеянне, а не абстрактнае папярэджанне.",
    proofItem3Title: "Бяспечная публікацыя",
    proofItem3Text: "Для дэманстрацыі выкарыстоўваюцца навучальныя прыклады і афіцыйныя маршруты дапамогі, таму праект можна паказваць публічна.",

    // Stats Section
    statsSubtitle: "Статыстыка ў рэальным часе",
    statsTitle: "Праверана даменаў:",
    statsSafe: "Бяспечныя",
    statsSafeDesc: "Дамены з нізкай рызыкай",
    statsSuspicious: "Падазроныя",
    statsSuspiciousDesc: "Патрабуюць увагі",
    statsDangerous: "Небяспечныя",
    statsDangerousDesc: "Высокая рызыка фішынгу",
    statsDatabase: "База даных",
    statsDatabaseDesc: "Памер кэша",
    statsFirstCheck: "Першая праверка:",
    statsLastCheck: "Апошняя:",

    // CTA Section
    ctaTitle: "Гатовы праверыць спасылку?",
    ctaDescription: "Устаўце любы падазроны дамен і паглядзіце, як працуе алгарытм у рэальным часе.",
    ctaButton: "Пачаць аналіз",
  },
  en: {
    // Header
    siteName: "Domain Traffic Light",
    openAnalyzer: "Open Analyzer",
    toggleTheme: "Toggle theme",
    openMenu: "Open menu",
    closeMenu: "Close menu",

    // Navigation
    navHome: "Home",
    navAnalyzer: "Analyzer",
    navMethod: "Method",
    navSafety: "Safety",

    // Hero Section
    heroSubtitle: "Instant AI Domain Analyzer",
    heroTitle1: "Check domain",
    heroTitle2: "before entering data",
    heroDescription: "The service helps quickly assess link risk, understand the reason for the signal, and proceed to safe action before the user enters data.",
    heroPlaceholder: "Paste domain or link...",
    heroButton: "Analyze",
    heroManifest1: "Check before data entry",
    heroManifest2: "Clear risk verdict",
    heroManifest3: "No personal data storage",
    heroLink: "How verification works",

    // AI Features
    aiSectionSubtitle: "Under the Hood Magic",
    aiSectionTitle: "Multi-layered",
    aiSectionTitleSub: "real-time analysis",
    aiFeature1Title: "Phishing Feeds",
    aiFeature1Text: "Instant verification with current OpenPhish and URLAbuse databases. If a domain has already appeared in malware — you'll be the first to know.",
    aiFeature2Title: "Local Ruleset",
    aiFeature2Text: "Fast URL structure analysis, checking for popular brand typos and suspicious TLD zones. Works instantly.",
    aiFeature3Title: "Smart AI Layer",
    aiFeature3Text: "After quick verification, the language model brings all signals together, explains the risk reason in simple language, and gives a clear recommendation.",

    // Behavior Logic
    behaviorSubtitle: "Service Logic",
    behaviorTitle: "Pause, check, and action",
    behaviorTitleSub: "— in one scenario",
    behaviorStep1Title: "Pause",
    behaviorStep1Text: "The service stops the user before entering code, password, or card data.",
    behaviorStep2Title: "Check",
    behaviorStep2Text: "The algorithm shows what raised concern: punycode, subdomains, brand imitation, and trap words.",
    behaviorStep3Title: "Action",
    behaviorStep3Text: "After the signal, the user receives the next step: manual verification or transition to an official help channel.",

    // Home Proof
    proofSubtitle: "What the service provides",
    proofTitle: "Clear entry to a real tool",
    proofItem1Title: "Quick Start",
    proofItem1Text: "Users can start verification right from the home page, without extra steps and distracting screens.",
    proofItem2Title: "Explainable Result",
    proofItem2Text: "The service returns a risk color, short assessment reasons, and a specific next action, not an abstract warning.",
    proofItem3Title: "Safe Publication",
    proofItem3Text: "Educational examples and official help routes are used for demonstration, so the project can be shown publicly.",

    // Stats Section
    statsSubtitle: "Real-time Statistics",
    statsTitle: "Domains Checked:",
    statsSafe: "Safe",
    statsSafeDesc: "Low-risk domains",
    statsSuspicious: "Suspicious",
    statsSuspiciousDesc: "Require attention",
    statsDangerous: "Dangerous",
    statsDangerousDesc: "High phishing risk",
    statsDatabase: "Database",
    statsDatabaseDesc: "Cache size",
    statsFirstCheck: "First check:",
    statsLastCheck: "Last:",

    // CTA Section
    ctaTitle: "Ready to check a link?",
    ctaDescription: "Paste any suspicious domain and see how the algorithm works in real time.",
    ctaButton: "Start Analysis",
  },
} as const;

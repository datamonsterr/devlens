import { DEFAULT_LANG } from "./languages";

// Navigation structure (slugs are shared). Labels are per-language.
const NAV_STRUCTURE = [
  {
    key: "gettingStarted",
    items: [
      { key: "introduction", slug: "" },
      { key: "quickStart", slug: "getting-started/quick-start" },
      { key: "installation", slug: "getting-started/installation" }
    ]
  },
  {
    key: "providers",
    items: [
      { key: "subscription", slug: "providers/subscription" },
      { key: "cheap", slug: "providers/cheap" },
      { key: "free", slug: "providers/free" }
    ]
  },
  {
    key: "features",
    items: [
      { key: "smartRouting", slug: "features/smart-routing" },
      { key: "combos", slug: "features/combos" },
      { key: "quotaTracking", slug: "features/quota-tracking" }
    ]
  },
  {
    key: "integration",
    items: [
      { key: "claudeCode", slug: "integration/claude-code" },
      { key: "codex", slug: "integration/codex" },
      { key: "cursor", slug: "integration/cursor" },
      { key: "cline", slug: "integration/cline" },
      { key: "roo", slug: "integration/roo" },
      { key: "continue", slug: "integration/continue" },
      { key: "otherTools", slug: "integration/other-tools" }
    ]
  },
  {
    key: "deployment",
    items: [
      { key: "localhost", slug: "deployment/localhost" },
      { key: "cloud", slug: "deployment/cloud" }
    ]
  },
  {
    key: "help",
    items: [
      { key: "troubleshooting", slug: "troubleshooting" },
      { key: "faq", slug: "faq" }
    ]
  }
];

const TRANSLATIONS = {
  en: {
    gettingStarted: "Getting Started",
    introduction: "Introduction",
    quickStart: "Quick Start",
    installation: "Installation",
    providers: "Providers",
    subscription: "Subscription (Maximize)",
    cheap: "Cheap (Backup)",
    free: "Free (Fallback)",
    features: "Features",
    smartRouting: "Smart Routing",
    combos: "Combos & Fallback",
    quotaTracking: "Quota Tracking",
    integration: "Integration",
    claudeCode: "Claude Code",
    codex: "OpenAI Codex",
    cursor: "Cursor",
    cline: "Cline",
    roo: "Roo",
    continue: "Continue",
    otherTools: "Other Tools",
    deployment: "Deployment",
    localhost: "Localhost",
    cloud: "Cloud (VPS/Docker)",
    help: "Help",
    troubleshooting: "Troubleshooting",
    faq: "FAQ",
    goToApp: "Go to App",
    selectLanguage: "Select Language",
    onThisPage: "On this page"
  },
  vi: {
    gettingStarted: "Bắt đầu",
    introduction: "Giới thiệu",
    quickStart: "Bắt đầu nhanh",
    installation: "Cài đặt",
    providers: "Nhà cung cấp",
    subscription: "Subscription (Tối đa hóa)",
    cheap: "Giá rẻ (Dự phòng)",
    free: "Miễn phí (Phương án cuối)",
    features: "Tính năng",
    smartRouting: "Định tuyến thông minh",
    combos: "Combo & Fallback",
    quotaTracking: "Theo dõi Quota",
    integration: "Tích hợp",
    claudeCode: "Claude Code",
    codex: "OpenAI Codex",
    cursor: "Cursor",
    cline: "Cline",
    roo: "Roo",
    continue: "Continue",
    otherTools: "Công cụ khác",
    deployment: "Triển khai",
    localhost: "Localhost",
    cloud: "Cloud (VPS/Docker)",
    help: "Trợ giúp",
    troubleshooting: "Khắc phục sự cố",
    faq: "Câu hỏi thường gặp",
    goToApp: "Vào ứng dụng",
    selectLanguage: "Chọn ngôn ngữ",
    onThisPage: "Trên trang này"
  }
};

// Translate one key for given language with fallback to default.
export function t(lang, key) {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS[DEFAULT_LANG][key] || key;
}

// Build localized navigation for sidebar.
export function getNavigation(lang) {
  return NAV_STRUCTURE.map(section => ({
    key: section.key,
    title: t(lang, section.key),
    items: section.items.map(item => ({
      key: item.key,
      slug: item.slug,
      title: t(lang, item.key)
    }))
  }));
}

// Static config (logo, urls, default English nav for backward compatibility).
export const DOCS_CONFIG = {
  title: "9Router Documentation",
  description: "Smart AI model router - Maximize subscriptions, minimize costs",
  logo: "9Router",
  appUrl: "https://9router.com",
  githubUrl: "https://github.com/decolua/9router",
  navigation: getNavigation(DEFAULT_LANG)
};

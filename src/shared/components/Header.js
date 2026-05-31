"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import PropTypes from "prop-types";
import ProviderIcon from "@/shared/components/ProviderIcon";
import HeaderMenu from "@/shared/components/HeaderMenu";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS } from "@/shared/constants/providers";
import { useRole } from "@/shared/hooks/useRole";
import { translate } from "@/i18n/runtime";
import { OrganizationSwitcher, UserButton, useClerk } from "@clerk/nextjs";

const PAGE_MAP = [
  ["/dashboard/providers", { title: "Provider Connections", description: "Configure and monitor team provider connections", icon: "dns" }],
  ["/dashboard/combos", { title: "Combos", description: "Configure fallback model sequences for your Team", icon: "layers" }],
  ["/dashboard/usage", { title: "Usage Analytics", description: "Track requests, tokens, RTK savings, and spend", icon: "bar_chart" }],
  ["/dashboard/quota", { title: "RTK Pool", description: "Manage Team-level RTK token savings capacity", icon: "data_usage" }],
  ["/dashboard/cli-tools", { title: "CLI Config Snippets", description: "Quickstart configs for CLI tools and SDKs", icon: "terminal" }],
  ["/dashboard/skills", { title: "Agent Skills", description: "Reusable skills and setup snippets for your Team", icon: "extension" }],
  ["/dashboard/endpoint", { title: "API Quickstart", description: "Base URL, API key usage, and connection options", icon: "rocket_launch" }],
  ["/dashboard/profile", { title: "Account Settings", description: "Manage personal and Team-level dashboard settings", icon: "settings" }],
  ["/dashboard/pricing", { title: "Pricing Overrides", description: "Set and audit model-level pricing behavior", icon: "sell" }],
  ["/dashboard/team", { title: "Team Management", description: "Invite Developers and manage Team membership", icon: "groups" }],
  ["/dashboard/keys", { title: "API Keys", description: "Manage Developer API Keys for /api/v1/* access", icon: "key" }],
  ["/dashboard/models", { title: "Model Browser", description: "Browse available models, providers, and Combos", icon: "hub" }],
  ["/dashboard/console-log", { title: "Console Log", description: "Live application logs for debugging and support", icon: "monitor" }],
  ["/dashboard/translator", { title: "Translator", description: "Debug translation between API payload formats", icon: "translate" }],
];

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "", breadcrumbs: [] };

  // Media provider detail: /dashboard/media-providers/[kind]/[id]
  const mediaDetailMatch = pathname.match(/\/media-providers\/([^/]+)\/([^/]+)$/);
  if (mediaDetailMatch) {
    const kindId = mediaDetailMatch[1];
    const providerId = mediaDetailMatch[2];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    const provider = AI_PROVIDERS[providerId];
    return {
      title: provider?.name || providerId,
      description: "",
      breadcrumbs: [
        { label: "Media Providers", href: `/dashboard/media-providers/${kindId}` },
        { label: kindConfig?.label || kindId, href: `/dashboard/media-providers/${kindId}` },
        { label: provider?.name || providerId, image: `/providers/${providerId}.png` },
      ],
    };
  }

  // Media provider kind: /dashboard/media-providers/[kind]
  const mediaKindMatch = pathname.match(/\/media-providers\/([^/]+)$/);
  if (mediaKindMatch) {
    const kindId = mediaKindMatch[1];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    return {
      title: kindConfig?.label || kindId,
      description: `Manage your ${kindConfig?.label || kindId} providers`,
      icon: kindConfig?.icon || "perm_media",
      breadcrumbs: [],
    };
  }

  // Provider detail page: /dashboard/providers/[id]
  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo =
      OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) {
      return {
        title: providerInfo.name,
        description: "",
        breadcrumbs: [
          { label: "Providers", href: "/dashboard/providers" },
          {
            label: providerInfo.name,
            image: `/providers/${providerInfo.id}.png`,
          },
        ],
      };
    }
  }

  if (pathname === "/dashboard") {
    return {
      title: "Portal Overview",
      description: "Role-aware summary of your Team and developer activity",
      icon: "dashboard",
      breadcrumbs: [],
    };
  }

  for (const [prefix, page] of PAGE_MAP) {
    if (pathname.startsWith(prefix)) {
      return { ...page, breadcrumbs: [] };
    }
  }

  return { title: "", description: "", breadcrumbs: [] };
};

export default function Header({ onMenuClick, showMenuButton = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { isManager, isDeveloper } = useRole();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");

  // Memoize page info to prevent unnecessary recalculations
  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);
  const { title, description, icon, breadcrumbs } = pageInfo;

  useEffect(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDisplayName(data?.displayName || data?.oidcName || data?.oidcEmail || "");
          setLoginMethod(data?.loginMethod || "");
        }
      } catch {
        if (!cancelled) {
          setDisplayName("");
          setLoginMethod("");
        }
      }
    }

    loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header className="z-20 flex shrink-0 items-start gap-3 border-b border-border-subtle/70 bg-surface/60 px-4 pb-3 pt-3 backdrop-blur-xl sm:items-center lg:px-8">
      <div className="flex min-w-0 flex-1 flex-col">
        {breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div
                key={`${crumb.label}-${crumb.href || "current"}`}
                className="flex items-center gap-2"
              >
                {index > 0 && (
                  <span className="material-symbols-outlined text-text-muted text-base">
                    chevron_right
                  </span>
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-text-muted hover:text-brand-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    {crumb.image && (
                      <ProviderIcon
                        src={crumb.image}
                        alt={crumb.label}
                        size={28}
                        className="object-contain rounded max-w-[28px] max-h-[28px]"
                        fallbackText={crumb.label.slice(0, 2).toUpperCase()}
                      />
                    )}
                    <h1 className="truncate text-base font-semibold tracking-tight text-text-main lg:text-2xl">
                      {translate(crumb.label)}
                    </h1>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : title ? (
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="material-symbols-outlined text-brand-600 dark:text-brand-300 text-xl lg:text-2xl">{icon}</span>}
              <h1 className="truncate text-base font-semibold tracking-tight lg:text-2xl">
                {translate(title)}
              </h1>
              <span className="hidden rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-muted sm:inline-flex">
                {isManager ? "Manager Portal" : isDeveloper ? "Developer Portal" : "Portal"}
              </span>
            </div>
            {description && (
              <p className="hidden lg:block text-sm text-text-muted truncate">
                {translate(description)}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {displayName && loginMethod === "OIDC" && (
          <div className="hidden max-w-[220px] items-center truncate rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-text-muted sm:flex">
            <span className="material-symbols-outlined mr-1.5 text-[14px] text-brand-600 dark:text-brand-300">person</span>
            <span className="truncate">{displayName}</span>
            <span className="ml-2 shrink-0 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              OIDC
            </span>
          </div>
        )}
        <HeaderSearch />
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main lg:hidden"
            aria-label="Open sidebar menu"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
        )}
        <ThemeToggle />
        <OrganizationSwitcher 
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterLeaveOrganizationUrl="/onboarding"
          afterSelectOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              organizationSwitcherTrigger: "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-md px-2 py-1 flex items-center text-text-main",
              organizationSwitcherTriggerIcon: "text-text-muted",
              avatarBox: "w-6 h-6"
            }
          }}
        />
        <HeaderMenu onLogout={handleLogout} />
      </div>
    </header>
  );
}

function HeaderSearch() {
  const visible = useHeaderSearchStore((s) => s.visible);
  const query = useHeaderSearchStore((s) => s.query);
  const placeholder = useHeaderSearchStore((s) => s.placeholder);
  const setQuery = useHeaderSearchStore((s) => s.setQuery);

  if (!visible) return null;

  return (
    <div className="relative w-[160px] sm:w-[220px]">
      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-[16px] pointer-events-none">
        search
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-7 pr-7 rounded-lg border border-border bg-surface/60 text-sm focus:outline-none focus:border-primary/50 transition-colors"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 rounded"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  showMenuButton: PropTypes.bool,
};

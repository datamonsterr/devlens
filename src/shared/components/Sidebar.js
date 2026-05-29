"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { useRole } from "@/shared/hooks/useRole";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";

const managerSections = [
  {
    id: "manager-core",
    title: "Manager Portal",
    items: [
      { href: "/dashboard", label: "Overview", icon: "insights" },
      { href: "/dashboard/usage", label: "Usage Analytics", icon: "query_stats" },
      { href: "/dashboard/team", label: "Team Members", icon: "supervisor_account" },
    ],
  },
  {
    id: "manager-config",
    title: "Infrastructure",
    items: [
      { href: "/dashboard/router", label: "Router Config", icon: "settings_input_component" },
      { href: "/dashboard/providers", label: "Provider Connections", icon: "lan" },
      { href: "/dashboard/models", label: "Model Browser", icon: "view_in_ar" },
      { href: "/dashboard/combos", label: "Combos", icon: "account_tree" },
      { href: "/dashboard/pricing", label: "Pricing Overrides", icon: "price_change" },
      { href: "/dashboard/quota", label: "RTK Pool", icon: "savings" },
    ],
  },
  {
    id: "manager-access",
    title: "Access & Docs",
    items: [
      { href: "/dashboard/endpoint", label: "API Quickstart", icon: "play_circle" },
      { href: "/dashboard/cli-tools", label: "CLI Config", icon: "code_blocks" },
      { href: "/dashboard/console-log", label: "Console Log", icon: "receipt_long" },
    ],
  },
];

const developerSections = [
  {
    id: "developer-core",
    title: "Developer Portal",
    items: [
      { href: "/dashboard", label: "Overview", icon: "home_storage" },
      { href: "/dashboard/keys", label: "My API Keys", icon: "key_vertical" },
      { href: "/dashboard/usage", label: "My Usage", icon: "monitoring" },
      { href: "/dashboard/models", label: "Available Models", icon: "dataset" },
      { href: "/dashboard/combos", label: "Combos", icon: "fork_right" },
    ],
  },
  {
    id: "developer-tools",
    title: "API & Tooling",
    items: [
      { href: "/dashboard/endpoint", label: "API Quickstart", icon: "bolt" },
      { href: "/dashboard/cli-tools", label: "CLI Config", icon: "terminal" },
      { href: "/dashboard/console-log", label: "Console Log", icon: "subject" },
    ],
  },
];

function NavLink({ item, active, onClose }) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 transition-all",
        active
          ? "bg-brand-500/12 text-brand-700 dark:text-brand-200"
          : "text-text-muted hover:bg-surface-2/70 hover:text-text-main",
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[18px]",
          active ? "fill-1" : "group-hover:text-brand-600 dark:group-hover:text-brand-300",
        )}
      >
        {item.icon}
      </span>
      <span className="text-[13px] font-medium">{item.label}</span>
    </Link>
  );
}

NavLink.propTypes = {
  item: PropTypes.shape({
    href: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
  }).isRequired,
  active: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
};

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const { isManager, isDeveloper, isLoaded } = useRole();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasUpdate) setUpdateInfo(data);
      })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/endpoint") {
      return pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  const handleCopyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {}

    copy(INSTALL_CMD);
  };

  const handleCloseUpdate = () => {
    setIsUpdating(false);
  };

  const visibleSections = isManager
    ? managerSections.map((section) => ({ ...section, items: section.items.filter((item) => item.label !== "API Keys") }))
    : isDeveloper ? developerSections : [];

  return (
    <>
      <aside className="flex min-h-full w-[286px] flex-col border-r border-border-subtle/80 bg-sidebar/80 backdrop-blur-xl">
        <div className="border-b border-border-subtle/70 px-5 pb-4 pt-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[var(--shadow-warm)]">
              <span className="material-symbols-outlined text-[20px]">deployed_code</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight text-text-main">{APP_CONFIG.name}</p>
              <p className="text-[11px] text-text-muted">v{APP_CONFIG.version}</p>
            </div>
          </Link>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted">
            <span className="material-symbols-outlined text-[12px]">verified_user</span>
            {isManager ? "Manager" : isDeveloper ? "Developer" : "Loading role"}
          </div>

          {updateInfo && (
            <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Update available: v{updateInfo.latestVersion}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Update
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="min-w-0 flex-1 text-left"
                >
                  <code className="block truncate text-[10px] text-emerald-700/80 dark:text-emerald-300/90">
                    {copied ? "Copied install command" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!isLoaded && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-xl bg-surface-2" />
              ))}
            </div>
          )}

          {isLoaded &&
            visibleSections.map((section) => (
              <div key={section.id}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            ))}
        </nav>

      </aside>

      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update Devlens"
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {isUpdating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <ManualUpdatePanel
            latestVersion={updateInfo?.latestVersion}
            installCmd={INSTALL_CMD}
            copied={copied}
            onCopy={handleCopyInstallCommand}
            onClose={handleCloseUpdate}
          />
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function ManualUpdatePanel({
  latestVersion,
  installCmd,
  copied,
  onCopy,
  onClose,
}) {
  return (
    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-900/95 p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            Update Devlens{latestVersion ? ` to v${latestVersion}` : ""}
          </h2>
          <p className="text-xs text-white/60">
            Copy the install command and run it from a terminal when ready.
          </p>
        </div>
      </div>

      <p className="mb-2 text-sm text-white/80">Install command:</p>
      <div className="mb-4 w-full rounded bg-white/5 px-3 py-2">
        <code className="break-all font-mono text-xs text-blue-300">{installCmd}</code>
      </div>

      <ol className="mb-4 list-inside list-decimal space-y-1 text-xs text-white/70">
        <li>Copy the install command below.</li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>
          Run <code className="rounded bg-white/10 px-1 text-green-400">devlens</code> again after install.
        </li>
      </ol>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" fullWidth onClick={onCopy}>
          {copied ? "Copied" : "Copy Command"}
        </Button>
      </div>
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopy: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

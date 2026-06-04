"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/notificationStore";
import Sidebar from "../Sidebar";
import Header from "../Header";

function isDashboardApi(input) {
  const url = typeof input === "string" ? input : input?.url;
  return typeof url === "string" && (url.startsWith("/api/") || url.startsWith("/v1/"));
}

function getRequestMethod(input, init) {
  return (init?.method || (typeof input !== "string" ? input?.method : "") || "GET").toUpperCase();
}

function getToastMessage(data, fallback) {
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return fallback;
}

function installApiFeedback() {
  if (globalThis.__devlensApiFeedbackInstalled) return;
  globalThis.__devlensApiFeedbackInstalled = true;
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const shouldTrack = isDashboardApi(input);
    const method = getRequestMethod(input, init);
    const store = useNotificationStore.getState();

    if (shouldTrack) store.beginApiRequest();

    try {
      const response = await nativeFetch(input, init);
      if (shouldTrack) {
        const notify = useNotificationStore.getState();
        if (!response.ok) {
          let data = null;
          try {
            data = await response.clone().json();
          } catch {}
          notify.error(getToastMessage(data, `API request failed (${response.status})`), "API Error");
        } else if (method !== "GET" && method !== "HEAD") {
          let data = null;
          try {
            data = await response.clone().json();
          } catch {}
          notify.success(getToastMessage(data, "API request completed"), "API Success");
        }
      }
      return response;
    } catch (error) {
      if (shouldTrack) {
        useNotificationStore.getState().error(error.message || "API request failed", "API Error");
      }
      throw error;
    } finally {
      if (shouldTrack) useNotificationStore.getState().endApiRequest();
    }
  };
}

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      icon: "check_circle",
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      icon: "error",
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      icon: "warning",
    };
  }
  return {
    wrapper: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: "info",
  };
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    installApiFeedback();
  }, []);
  const notifications = useNotificationStore((state) => state.notifications);
  const pendingApiCount = useNotificationStore((state) => state.pendingApiCount);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text-main">
      {pendingApiCount > 0 && (
        <div className="fixed right-4 bottom-4 z-[80] inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-surface/90 px-3 py-2 text-xs font-medium text-blue-600 shadow-lg backdrop-blur-xl dark:text-blue-300">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          API loading{pendingApiCount > 1 ? ` (${pendingApiCount})` : ""}
        </div>
      )}
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={`rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${style.wrapper}`}
            >
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] leading-5">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="text-xs font-semibold mb-0.5">{n.title}</p> : null}
                  <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current"
                    aria-label="Dismiss notification"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col relative isolate overflow-hidden">
        <div className="dashboard-chrome-bg absolute inset-0 -z-10 pointer-events-none" aria-hidden="true" />
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            (pathname === "/dashboard/basic-chat" || pathname === "/dashboard/chatbot") ? "" : "px-4 pb-8 pt-5 sm:px-6 lg:px-10"
          } ${(pathname === "/dashboard/basic-chat" || pathname === "/dashboard/chatbot") ? "flex flex-col overflow-hidden" : ""}`}
        >
          <div className={`${(pathname === "/dashboard/basic-chat" || pathname === "/dashboard/chatbot") ? "flex-1 w-full h-full flex flex-col" : "mx-auto w-full max-w-[1240px]"}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

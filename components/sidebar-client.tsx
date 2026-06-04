"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { sidebarGroups } from "@/lib/erp-data";
import { useMemo, useState } from "react";

type SidebarClientProps = {
  allowedGroupHrefs: string[];
};

function normalizeHref(href: string) {
  const [pathname, query = ""] = href.split("?");
  return { pathname, query };
}

function SidebarNav({ allowedGroupHrefs }: SidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const system = searchParams.get("system");
  const visibleGroups = useMemo(
    () => sidebarGroups.filter((group) => allowedGroupHrefs.includes(group.href)),
    [allowedGroupHrefs]
  );
  const activeGroupHref = useMemo(() => {
    const exactSystemMatch = visibleGroups.find((group) =>
      group.systems.some((item) => {
        const href = normalizeHref(item.href);
        return href.pathname === pathname && (!system || href.query.includes(`system=${system}`));
      })
    );

    return exactSystemMatch?.href ?? visibleGroups.find((group) => group.href === pathname)?.href ?? visibleGroups[0]?.href;
  }, [pathname, system, visibleGroups]);
  const [manualOpenHref, setManualOpenHref] = useState<string | null>(null);
  const openHref = manualOpenHref ?? activeGroupHref;

  return (
    <nav className="space-y-2 px-2.5 py-3">
      <p className="sidebar-expanded-only px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/70">
        Main Categories
      </p>
      {visibleGroups.map((item) => {
        const Icon = item.icon;
        const systemTotal = item.systems.reduce((total, systemItem) => total + systemItem.count, 0);
        const isOpen = openHref === item.href;
        return (
          <section key={item.href} className={`sidebar-section overflow-hidden rounded-md ${isOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-item group flex w-full cursor-pointer list-none items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-slate-100 transition-colors"
              onClick={() => setManualOpenHref(isOpen ? "" : item.href)}
              aria-expanded={isOpen}
            >
              <span className="sidebar-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="sidebar-expanded-only min-w-0 flex-1">
                <span className="block truncate text-[14px] leading-5">{item.label}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium leading-4 text-slate-300/74">
                  {item.subtitle}
                </span>
              </span>
              <span className="sidebar-expanded-only flex shrink-0 items-center gap-2">
                <span className="sidebar-count inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-[11px] font-bold">
                  {systemTotal}
                </span>
                <ChevronDown className="h-4 w-4 text-sky-100/58 transition-transform duration-150" aria-hidden="true" />
              </span>
            </button>
            <div className="sidebar-sublist sidebar-expanded-only mx-3 mb-3 ml-[3.8rem] border-l border-sky-100/16 pl-3 pt-1">
              <div className="space-y-1.5">
                {item.systems.map((systemItem) => {
                  const href = normalizeHref(systemItem.href);
                  const isActive = href.pathname === pathname && (!href.query || href.query.includes(`system=${system}`));
                  return (
                    <Link
                      key={`${item.href}-${systemItem.label}`}
                      href={systemItem.href}
                      title={systemItem.examples.join(", ")}
                      className={`sidebar-subitem flex min-h-9 items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px] font-semibold ${isActive ? "is-active" : ""}`}
                    >
                      <span className="min-w-0 truncate">{systemItem.label}</span>
                      <span className="sidebar-subcount shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold">
                        {systemItem.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </nav>
  );
}

export function SidebarClient({ allowedGroupHrefs }: SidebarClientProps) {
  return (
    <>
      <input id="ram-setu-sidebar-toggle" type="checkbox" className="sidebar-toggle sr-only" defaultChecked />
      <aside className="sidebar-shell hidden max-h-screen w-[276px] shrink-0 overflow-y-auto border-r border-slate-950/60 shadow-2xl shadow-slate-950/24 lg:block">
        <div className="sidebar-top px-3 pb-3 pt-3">
          <label
            htmlFor="ram-setu-sidebar-toggle"
            className="sidebar-logo-trigger flex cursor-pointer items-center gap-3 rounded-md border border-white/14 bg-white/[0.08] p-2.5 shadow-xl shadow-slate-950/22 transition-colors hover:border-sky-100/34 hover:bg-white/[0.11]"
            title="Open / hide sidebar"
          >
            <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1.5">
              <Image
                src="/brand/richa-group-logo.jpeg"
                alt="Richa Group"
                width={120}
                height={70}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="sidebar-expanded-only min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-100">
                Ram Setu ERP
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">Richa Global Sales</p>
            </div>
          </label>
          <div className="sidebar-expanded-only mt-3 rounded-md border border-sky-100/16 bg-slate-950/24 px-3 py-2.5 text-white shadow-lg shadow-slate-950/15">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Control Room</p>
              <span className="rounded-sm border border-emerald-300/20 bg-emerald-400/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                Live
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-200/75">Richa Global Sales ERP</p>
          </div>
        </div>
        <SidebarNav allowedGroupHrefs={allowedGroupHrefs} />
        <div className="sidebar-expanded-only mx-3 mb-4 mt-2 rounded-md border border-white/12 bg-white/[0.045] p-3 text-xs text-slate-200/84">
          <p className="font-semibold text-white">Secure Access</p>
          <p className="mt-1 leading-5 text-slate-300/70">Only approved modules are visible for each user.</p>
        </div>
      </aside>
      <input id="ram-setu-mobile-sidebar-toggle" type="checkbox" className="mobile-sidebar-toggle sr-only" />
      <label
        htmlFor="ram-setu-mobile-sidebar-toggle"
        className="mobile-app-logo fixed left-3 top-3 z-40 flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-950/18 lg:hidden"
        title="Open / hide menu"
      >
        <Image
          src="/brand/richa-group-logo.jpeg"
          alt="Ram Setu ERP"
          width={64}
          height={64}
          className="h-full w-full object-contain"
          priority
        />
      </label>
      <label htmlFor="ram-setu-mobile-sidebar-toggle" className="mobile-sidebar-backdrop fixed inset-0 z-30 hidden bg-slate-950/55 backdrop-blur-sm lg:hidden" />
      <aside className="mobile-sidebar-panel sidebar-shell fixed inset-y-0 left-0 z-40 w-[84vw] max-w-[340px] -translate-x-full overflow-y-auto border-r border-slate-950/60 shadow-2xl shadow-slate-950/35 transition-transform duration-150 lg:hidden">
        <div className="sidebar-top px-4 pb-4 pt-4">
          <label
            htmlFor="ram-setu-mobile-sidebar-toggle"
            className="flex cursor-pointer items-center gap-3 rounded-md border border-white/14 bg-white/[0.075] p-3"
            title="Hide menu"
          >
            <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1.5">
              <Image
                src="/brand/richa-group-logo.jpeg"
                alt="Richa Group"
                width={120}
                height={70}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-sky-100">Ram Setu ERP</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">Richa Global Sales</p>
            </div>
          </label>
        </div>
        <SidebarNav allowedGroupHrefs={allowedGroupHrefs} />
      </aside>
    </>
  );
}

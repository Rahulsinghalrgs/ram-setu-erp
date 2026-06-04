import Image from "next/image";
import Link from "next/link";
import { CalendarDays, LogOut, Menu, Search, ShieldCheck, Truck, Users } from "lucide-react";
import { signOut } from "@/app/actions";

export function Topbar() {
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-white/94 px-4 pl-16 shadow-sm backdrop-blur-xl md:px-6 lg:pl-5">
      <label
        htmlFor="ram-setu-sidebar-toggle"
        className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-md border bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:inline-flex"
        title="Open / hide sidebar"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </label>
      <div className="hidden min-w-[190px] md:block">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Operations</p>
        <p className="text-sm font-semibold text-slate-900">Richa Global Sales</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border bg-white px-3 py-2.5 text-sm text-muted-foreground shadow-sm ring-1 ring-slate-900/2 xl:max-w-xl">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search clients, orders, inventory, invoices, follow-ups</span>
      </div>
      <div className="hidden items-center gap-2 xl:flex">
        <Link
          href="/dashboard/sales?system=order-to-delivery"
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
          OTD FMS
        </Link>
        <Link
          href="/dashboard/customers?system=client-database#tally-sync"
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
          Tally
        </Link>
      </div>
      <button className="hidden h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium text-slate-600 shadow-sm xl:inline-flex">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        {todayLabel}
      </button>
      <button className="hidden h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium text-primary shadow-sm md:inline-flex">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Admin
      </button>
      <button className="hidden h-10 items-center gap-2 rounded-md border bg-white px-2 pr-3 text-sm font-semibold shadow-sm md:inline-flex">
        <Image
          src="/brand/richa-group-logo.jpeg"
          alt="Richa Group"
          width={84}
          height={34}
          className="h-7 w-16 rounded-sm object-contain"
        />
        Ram Setu ERP
      </button>
      <form action={signOut} className="ml-auto md:ml-0">
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </header>
  );
}

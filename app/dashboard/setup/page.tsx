import Image from "next/image";
import { createWorkspace } from "@/lib/erp-actions";
import { getRawAppContext } from "@/lib/erp-queries";

export default async function SetupPage() {
  const context = await getRawAppContext();

  if (context?.organization) {
    return (
      <section className="rounded-md border bg-white/95 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Workspace ready</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Richa Global Sales workspace is already active. Open the dashboard from the sidebar.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl rounded-md border bg-white/95 p-6 shadow-xl shadow-blue-950/10">
      <div className="overflow-hidden rounded-md border bg-white p-3">
        <Image
          src="/brand/richa-group-logo.jpeg"
          alt="Richa Group"
          width={720}
          height={300}
          className="h-auto w-full"
          priority
        />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Create Richa Global Sales workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This creates your organization, makes you owner, and seeds starter buyers, suppliers,
        products, opening stock, orders, and invoices.
      </p>
      <form action={createWorkspace} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Company name</span>
          <input
            name="name"
            defaultValue="Richa Global Sales"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">State code</span>
          <input
            name="state_code"
            defaultValue="07"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-medium">GSTIN</span>
          <input
            name="gstin"
            placeholder="Optional"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="md:col-span-2">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Create workspace and seed data
          </button>
        </div>
      </form>
    </section>
  );
}

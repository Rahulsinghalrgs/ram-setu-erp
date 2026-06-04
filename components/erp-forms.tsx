import {
  addBuyer,
  addDepartmentChecklist,
  addTaskDelegation,
  updateTaskDelegation,
  addEmployeeRecord,
  addInventoryMovement,
  addInvoice,
  addProduct,
  addSalesOrder,
  addSupplier,
  addWarehouse,
  bulkImportDepartmentChecklists,
  bulkImportEmployees,
  bulkImportOrders,
  bulkImportClients,
  bulkImportInventory,
  bulkImportProducts,
  bulkImportPurchaseOrders,
  bulkImportTaskDelegations,
  bulkImportTeamLogins,
  createOrderPunch,
  createPurchaseOrderPunch,
  createTeamMemberLogin,
  createTeamLoginLink,
  updateDepartmentChecklist,
  updateOrderDeliveryFlow
} from "@/lib/erp-actions";
import { permissionModules } from "@/lib/access-control";
import { OrderPunchClient } from "@/components/order-punch-client";
import { PurchasePunchClient } from "@/components/purchase-punch-client";
import { productMasterLabel } from "@/lib/product-master";

export type Option = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  sales_price?: number | string | null;
  purchase_price?: number | string | null;
};

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
      {children}
    </button>
  );
}

function Toggle({ name, label, defaultChecked = true }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-blue-700" />
    </label>
  );
}

export function BuyerForm() {
  return (
    <form action={addBuyer} className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 border-b pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Client Master</p>
        <h2 className="text-xl font-semibold">Add client profile</h2>
        <p className="text-sm text-muted-foreground">
          Sales, payment follow-up, dispatch and WhatsApp reminders ke liye single verified client record.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field name="client_code" label="Client code" placeholder="RGS-CL-001" />
        <Field name="name" label="Company / client name" placeholder="ABC Traders Pvt Ltd" required />
        <label className="block text-sm">
          <span className="font-medium">Client type</span>
          <select name="client_type" className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
            <option value="buyer">Buyer</option>
            <option value="dealer">Dealer</option>
            <option value="distributor">Distributor</option>
            <option value="oem">OEM</option>
            <option value="prospect">Prospect</option>
          </select>
        </label>

        <Field name="contact_person" label="Contact person" placeholder="Mr. Rajesh Kumar" />
        <Field name="designation" label="Designation" placeholder="Purchase Manager" />
        <Field name="owner_name" label="Account owner" placeholder="Sales executive" />

        <Field name="phone" label="Phone" placeholder="+91..." />
        <Field name="whatsapp" label="WhatsApp" placeholder="+91..." />
        <Field name="alternate_phone" label="Alternate phone" placeholder="+91..." />
        <Field name="email" label="Email" type="email" placeholder="purchase@company.com" />
        <Field name="website" label="Website" placeholder="https://..." />
        <Field name="source" label="Lead source" placeholder="IndiaMART / Referral / Existing" />

        <Field name="gstin" label="GSTIN" placeholder="07ABCDE1234F1Z5" />
        <Field name="pan" label="PAN" placeholder="ABCDE1234F" />
        <Field name="udyam" label="Udyam / MSME" placeholder="Optional" />
        <Field name="state_code" label="GST state code" placeholder="07" />
        <Field name="city" label="City" placeholder="Delhi" />
        <Field name="state_name" label="State" placeholder="Delhi" />
        <Field name="pincode" label="Pincode" placeholder="110001" />
        <Field name="country" label="Country" placeholder="India" />
        <Field name="industry" label="Industry / segment" placeholder="Mobile accessories" />

        <Field name="credit_limit" label="Credit limit" type="number" placeholder="500000" />
        <Field name="credit_days" label="Credit days" type="number" placeholder="30" />
        <Field name="payment_terms" label="Payment terms" placeholder="Advance / 30 days / PDC" />
        <Field name="opening_outstanding" label="Opening outstanding" type="number" placeholder="100000" />
        <Field name="outstanding_as_of" label="Outstanding as of" type="date" />
        <label className="block text-sm">
          <span className="font-medium">Priority</span>
          <select name="priority" className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Status</span>
          <select name="status" className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="on_hold">On hold</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <Field name="last_contact_date" label="Last contact" type="date" />
        <Field name="next_follow_up_date" label="Next follow-up" type="date" />

        <div className="rounded-md border bg-slate-50/80 p-3 md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tally Mapping
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Field name="tally_ledger_name" label="Tally ledger name" placeholder="ABC Traders Pvt Ltd" />
            <Field name="tally_guid" label="Tally GUID" placeholder="Auto from Tally sync" />
            <Field name="tally_master_id" label="Tally master ID" placeholder="Optional" />
            <Field name="tally_alter_id" label="Tally alter ID" placeholder="Optional" />
          </div>
        </div>

        <div className="rounded-md border bg-slate-50/80 p-3 md:col-span-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Communication Rules
              </p>
              <p className="text-xs text-muted-foreground">
                Ye settings decide karengi ki payment, order aur product requirement reminders kahan jayenge.
              </p>
            </div>
            <label className="block text-sm md:w-56">
              <span className="font-medium">Preferred channel</span>
              <select name="preferred_channel" className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring">
                <option value="whatsapp">WhatsApp first</option>
                <option value="email">Email first</option>
                <option value="call">Call first</option>
                <option value="both">WhatsApp + Email</option>
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Toggle name="whatsapp_opt_in" label="WhatsApp allowed" />
            <Toggle name="email_opt_in" label="Email allowed" />
            <Toggle name="payment_followup_enabled" label="Payment follow-up" />
            <Toggle name="order_received_enabled" label="Order received message" />
            <Toggle name="order_dispatch_enabled" label="Dispatch message" />
            <Toggle name="order_delivered_enabled" label="Delivery message" />
            <Toggle name="product_requirement_enabled" label="Product requirement message" />
          </div>
        </div>

        <div className="rounded-md border bg-slate-50/80 p-3 md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Department Contacts
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field name="billing_contact_name" label="Billing contact" placeholder="Accounts person" />
            <Field name="billing_contact_phone" label="Billing phone" placeholder="+91..." />
            <Field name="billing_contact_email" label="Billing email" type="email" placeholder="accounts@client.com" />
            <Field name="dispatch_contact_name" label="Dispatch contact" placeholder="Store / warehouse person" />
            <Field name="dispatch_contact_phone" label="Dispatch phone" placeholder="+91..." />
            <Field name="dispatch_contact_email" label="Dispatch email" type="email" placeholder="store@client.com" />
            <Field name="escalation_contact_name" label="Escalation contact" placeholder="Owner / senior person" />
            <Field name="escalation_contact_phone" label="Escalation phone" placeholder="+91..." />
            <Field name="escalation_contact_email" label="Escalation email" type="email" placeholder="owner@client.com" />
          </div>
        </div>

        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Billing address</span>
          <textarea
            name="billing_address"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="GST billing address"
          />
        </label>
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Shipping / delivery address</span>
          <textarea
            name="shipping_address"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Dispatch delivery address"
          />
        </label>
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Remarks</span>
          <textarea
            name="remarks"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Meeting notes, product interest, payment behaviour, special instructions"
          />
        </label>
      </div>

      <div className="mt-4">
        <Submit>Add client</Submit>
      </div>
    </form>
  );
}

export function ClientBulkImportForm() {
  const sampleHeaders =
    "client_code,name,tally_ledger_name,tally_guid,contact_person,phone,whatsapp,email,gstin,city,state_name,credit_limit,credit_days,opening_outstanding,preferred_channel,next_follow_up_date,remarks";
  const sampleRow =
    "RGS-CL-001,ABC Traders Pvt Ltd,ABC Traders Pvt Ltd,,Mr. Rajesh Kumar,9876543210,9876543210,accounts@abctraders.in,07ABCDE1234F1Z5,Delhi,Delhi,500000,30,100000,whatsapp,2026-05-10,Priority payment follow-up";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Bulk Update
          </p>
          <h2 className="text-xl font-semibold">Upload client CSV</h2>
          <p className="text-sm text-muted-foreground">
            Existing client match hone par update hoga, warna new client create hoga.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-client-import-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ["Match order", "Tally GUID, Client Code, GSTIN, Company"],
          ["Date support", "YYYY-MM-DD and DD/MM/YYYY"],
          ["Phone cleanup", "10 digit mobile becomes +91 format"],
          ["Tally headers", "Party, Ledger, Outstanding, Mobile supported"]
        ].map(([label, note]) => (
          <div key={label} className="rounded-md border bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{note}</p>
          </div>
        ))}
      </div>
      <form action={bulkImportClients} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="client_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="client_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk add / update clients</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Recommended CSV headers</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-sm font-semibold">Sample row</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleRow}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Tally export me agar headers alag naam se hon, common names jaise Company, Party Name, Ledger Name, Outstanding, Mobile aur WhatsApp Number bhi support hain.
          </p>
        </div>
      </form>
    </section>
  );
}

export function SupplierForm() {
  return (
    <form action={addSupplier} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-2">
      <Field name="name" label="Supplier name" placeholder="Precision pin processing unit" required />
      <Field name="gstin" label="GSTIN" placeholder="Optional" />
      <Field name="state_code" label="State code" placeholder="07" />
      <Field name="phone" label="Phone" placeholder="+91..." />
      <Field name="email" label="Email" type="email" placeholder="vendor@company.com" />
      <label className="block text-sm md:col-span-2">
        <span className="font-medium">Billing address</span>
        <textarea
          name="billing_address"
          className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Supplier billing address"
        />
      </label>
      <div className="md:col-span-2">
        <Submit>Add supplier</Submit>
      </div>
    </form>
  );
}

export function ProductForm() {
  return (
    <form action={addProduct} className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Central Product Master
        </p>
        <h2 className="mt-1 text-xl font-semibold">Add SKU / item once</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Yahi SKU, item name, sales rate aur purchase rate Order FMS, Purchase FMS, Enquiry FMS aur Inventory me reuse hoga.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field name="sku" label="SKU code" placeholder="PIN-TYPEC-001" required />
        <Field name="name" label="Item name" placeholder="Type-C connector pin" required />
        <Field name="hsn_sac" label="HSN/SAC" placeholder="8536" />
        <Field name="unit" label="Unit" placeholder="pcs" />
        <Field name="gst_rate" label="GST %" type="number" placeholder="18" />
        <Field name="sales_price" label="Fixed sales rate" type="number" placeholder="4.8" />
        <Field name="purchase_price" label="Fixed purchase rate" type="number" placeholder="2.9" />
        <Field name="reorder_level" label="Reorder level" type="number" placeholder="5000" />
        <div className="flex items-end">
          <Submit>Add product</Submit>
        </div>
      </div>
    </form>
  );
}

export function ProductBulkImportForm() {
  const sampleHeaders = "sku,item_name,unit,hsn_sac,gst_rate,sales_price,purchase_price,reorder_level";
  const sampleRow = "PIN-TYPEC-001,Type-C connector pin,pcs,8536,18,4.8,2.9,5000";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Product Master Bulk Upload
          </p>
          <h2 className="text-xl font-semibold">Upload SKU price list CSV</h2>
          <p className="text-sm text-muted-foreground">
            SKU same hoga to product update hoga. New SKU hoga to Product Master me add ho jayega.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-product-master-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ["SKU match", "Same SKU par existing item update hoga"],
          ["Price master", "Sales rate aur purchase rate yahin se reuse honge"],
          ["Common headers", "price, selling_rate, uom, gst_percent accepted"],
          ["Required fields", "SKU code aur item name compulsory hain"]
        ].map(([label, note]) => (
          <div key={label} className="rounded-md border bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{note}</p>
          </div>
        ))}
      </div>

      <form action={bulkImportProducts} className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="product_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="product_csv_text"
              rows={7}
              placeholder={`${sampleHeaders}\n${sampleRow}`}
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <Submit>Bulk upload products</Submit>
        </div>
        <div className="rounded-md border bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Supported columns</p>
          <code className="mt-2 block overflow-x-auto rounded border bg-white p-3 text-xs">
            sku, item_name, unit, hsn_sac, gst_rate, sales_price, purchase_price, reorder_level
          </code>
          <p className="mt-3 text-muted-foreground">
            Tally/Excel export me agar headers alag hon to common names jaise item, product, sku_code,
            rate, price, selling_price, sales_rate, purchase_rate, cost_price, hsn, gst_percent, uom
            aur minimum_stock bhi support hain.
          </p>
          <p className="mt-3 font-semibold">Best CSV format</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 font-semibold">Example row</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleRow}</pre>
          </div>
        </div>
      </form>
    </section>
  );
}

export function WarehouseForm() {
  return (
    <form action={addWarehouse} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-3">
      <Field name="name" label="Godown name" placeholder="Wazirpur Godown" required />
      <Field name="state_code" label="State code" placeholder="07" />
      <Field name="address" label="Address" placeholder="Complete godown address" />
      <div className="flex items-end">
        <Submit>Add godown</Submit>
      </div>
    </form>
  );
}

export function InventoryForm({ products, warehouses }: { products: Option[]; warehouses: Option[] }) {
  return (
    <form action={addInventoryMovement} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-3">
      <label className="block text-sm">
        <span className="font-medium">Product</span>
        <select name="product_id" required className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {productMasterLabel(product)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Warehouse</span>
        <select name="warehouse_id" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="">Auto-create Wazirpur Hub</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Movement</span>
        <select name="movement_type" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="purchase_receipt">Purchase receipt</option>
          <option value="sale_issue">Sale issue</option>
          <option value="adjustment">Adjustment</option>
          <option value="transfer">Transfer</option>
        </select>
      </label>
      <Field name="quantity" label="Quantity" type="number" placeholder="1000" required />
      <Field name="reference_type" label="Reference" placeholder="GRN / dispatch / adjustment" />
      <Field name="notes" label="Notes" placeholder="QC passed batch" />
      <div className="md:col-span-3">
        <Submit>Add stock movement</Submit>
      </div>
    </form>
  );
}

export function InventoryBulkImportForm() {
  const sampleHeaders =
    "sku,product_name,warehouse,movement_type,quantity,unit,reference_type,notes,reorder_level";
  const sampleRow =
    "PIN-TYPEC-001,Type-C connector pin,Wazirpur Godown,purchase_receipt,5000,pcs,opening_stock,Initial stock,1000";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Inventory Bulk Upload
          </p>
          <h2 className="text-xl font-semibold">Upload stock CSV</h2>
          <p className="text-sm text-muted-foreground">
            Multiple godown stock ek saath upload karo. New SKU/godown auto-create ho jayega.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-inventory-import-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ["Total stock", "Same SKU ka all godown sum dashboard me"],
          ["Godown split", "Each warehouse ka separate balance"],
          ["Auto master", "New SKU and godown create supported"],
          ["Movement type", "purchase_receipt, sale_issue, adjustment"]
        ].map(([label, note]) => (
          <div key={label} className="rounded-md border bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{note}</p>
          </div>
        ))}
      </div>
      <form action={bulkImportInventory} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="inventory_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="inventory_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk upload stock</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Recommended CSV headers</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-sm font-semibold">Sample row</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleRow}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Tally/Excel headers jaise Item Code, Item Name, Godown, Qty, Type, Reference aur Remarks bhi support hain.
          </p>
        </div>
      </form>
    </section>
  );
}

export function SalesOrderForm({ customers }: { customers: Option[] }) {
  return (
    <form action={addSalesOrder} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-3">
      <Field name="order_number" label="Order number" placeholder="SO-RGS-1010" required />
      <label className="block text-sm">
        <span className="font-medium">Buyer</span>
        <select name="customer_id" required className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <Field name="total" label="Order total" type="number" placeholder="286000" required />
      <div className="md:col-span-3">
        <Submit>Create sales order</Submit>
      </div>
    </form>
  );
}

export function OrderPunchForm({
  customers,
  products,
  isAdmin = false,
  nextOrderNumber
}: {
  customers: Option[];
  products: Option[];
  isAdmin?: boolean;
  nextOrderNumber?: string;
}) {
  return (
    <OrderPunchClient
      action={createOrderPunch}
      customers={customers}
      products={products}
      isAdmin={isAdmin}
      nextOrderNumber={nextOrderNumber}
    />
  );
}

export function OrderBulkImportForm() {
  const sampleHeaders =
    "order_number,customer_name,sku,product_name,quantity,unit,unit_price,total,order_date,delivery_date,sales_executive,priority,payment_check_status,stock_status,dispatch_status,billing_status,delivery_status,feedback_status,po_url,order_proof_url,remarks";
  const sampleRow =
    "ORD-2453,ABC Traders Pvt Ltd,PIN-TYPEC-001,Type-C connector pin,50000,pcs,4.8,,01/05/2026,05/05/2026,Rahul,high,pending,pending,pending,pending,pending,pending,https://drive.google.com/,https://drive.google.com/,Urgent dispatch";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-md border bg-white/95 shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-slate-50/80 px-4 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Order Upload</p>
          <h2 className="text-xl font-semibold">Upload order CSV</h2>
          <p className="text-sm text-muted-foreground">
            Tally, website, ya ERP export CSV se multiple orders ek saath punch ho jayenge. Same order number par update hoga.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-order-to-delivery-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <div className="space-y-4 p-4">
      <form action={bulkImportOrders} className="grid min-w-0 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="orders_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="orders_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk punch orders</Submit>
        </div>
        <div className="min-w-0 rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Supported flow fields</p>
          <div className="mt-2 max-w-full overflow-x-auto rounded-md border bg-white p-3">
            <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            FMS fields jaise Order, Vendor/Customer, Delivery Date, SKU, Qty, Stock, Dispatch, Billing, Feedback, PO aur proof links ko yahi import karega.
          </p>
        </div>
      </form>
      </div>
    </section>
  );
}

export function PurchasePunchForm({
  vendors,
  products,
  isAdmin = false,
  nextPurchaseNumber
}: {
  vendors: Option[];
  products: Option[];
  isAdmin?: boolean;
  nextPurchaseNumber?: string;
}) {
  return (
    <PurchasePunchClient
      action={createPurchaseOrderPunch}
      vendors={vendors}
      products={products}
      isAdmin={isAdmin}
      nextPurchaseNumber={nextPurchaseNumber}
    />
  );
}

export function PurchaseBulkImportForm() {
  const sampleHeaders =
    "po_number,vendor_name,sku,product_name,quantity,unit,unit_price,total,order_date,status,remarks";
  const sampleRow =
    "PO-1001,ABC Supplier,PIN-TYPEC-001,Type-C connector pin,50000,pcs,2.9,,07/05/2026,sent,Urgent purchase";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-md border bg-white/95 shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-slate-50/80 px-4 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Purchase Upload</p>
          <h2 className="text-xl font-semibold">Upload purchase CSV</h2>
          <p className="text-sm text-muted-foreground">
            Supplier, SKU, quantity aur purchase rate CSV se ek saath import honge. Same PO number par update hoga.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-purchase-fms-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <form action={bulkImportPurchaseOrders} className="grid min-w-0 gap-4 p-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="purchase_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="purchase_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk punch PO</Submit>
        </div>
        <div className="min-w-0 rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Supported purchase fields</p>
          <div className="mt-2 max-w-full overflow-x-auto rounded-md border bg-white p-3">
            <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Supplier master aur Product master dono auto-match honge. New supplier/SKU mile to import me create bhi ho jayega.
          </p>
        </div>
      </form>
    </section>
  );
}

function FlowSelect({ name, defaultValue, label }: { name: string; defaultValue?: string; label: string }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select name={name} defaultValue={defaultValue || "pending"} className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-xs font-medium text-foreground">
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
        <option value="blocked">Blocked</option>
        <option value="not_required">N/A</option>
      </select>
    </label>
  );
}

export function OrderFlowUpdateForm({ order }: { order: Record<string, any> }) {
  return (
    <form action={updateOrderDeliveryFlow} className="grid gap-2 rounded-md border bg-slate-50/80 p-3">
      <input type="hidden" name="order_id" value={order.id} />
      <div className="grid gap-2 sm:grid-cols-3">
        <FlowSelect name="payment_check_status" defaultValue={order.payment_check_status} label="Payment" />
        <FlowSelect name="stock_status" defaultValue={order.stock_status} label="Stock" />
        <FlowSelect name="dispatch_status" defaultValue={order.dispatch_status} label="Dispatch" />
        <FlowSelect name="billing_status" defaultValue={order.billing_status} label="Billing" />
        <FlowSelect name="delivery_status" defaultValue={order.delivery_status} label="Delivery" />
        <FlowSelect name="feedback_status" defaultValue={order.feedback_status} label="Feedback" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="dispatch_proof_url"
          defaultValue={order.dispatch_proof_url || ""}
          placeholder="Dispatch proof URL"
          className="h-9 rounded-md border bg-white px-2 text-xs"
        />
        <input
          name="invoice_proof_url"
          defaultValue={order.invoice_proof_url || ""}
          placeholder="Invoice proof URL"
          className="h-9 rounded-md border bg-white px-2 text-xs"
        />
      </div>
      <input
        name="remarks"
        defaultValue={order.remarks || ""}
        placeholder="Flow remark"
        className="h-9 rounded-md border bg-white px-2 text-xs"
      />
      <button className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Update flow
      </button>
    </form>
  );
}

export function InvoiceForm({ customers }: { customers: Option[] }) {
  return (
    <form action={addInvoice} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-3">
      <Field name="invoice_number" label="Invoice number" placeholder="INV-RGS-3002" required />
      <label className="block text-sm">
        <span className="font-medium">Buyer</span>
        <select name="customer_id" required className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <Field name="total" label="Invoice total" type="number" placeholder="286000" required />
      <div className="md:col-span-3">
        <Submit>Create GST invoice</Submit>
      </div>
    </form>
  );
}

export function TeamLoginForm() {
  return (
    <div className="grid gap-4">
      <form action={createTeamMemberLogin} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-4">
        <Field name="full_name" label="Doer name" placeholder="Sales executive" required />
        <Field name="email" label="Work email" type="email" placeholder="team@richagroup.co" required />
        <Field name="password" label="Temporary password" type="password" placeholder="Minimum 8 characters" required />
        <label className="block text-sm">
          <span className="font-medium">Role</span>
          <select name="role" defaultValue="staff" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div className="grid gap-3 rounded-md bg-muted/40 p-3 md:col-span-4 md:grid-cols-2 xl:grid-cols-4">
          {permissionModules.map((module) => (
            <div key={module.key} className="rounded-md border bg-white p-3">
              <p className="text-sm font-semibold">{module.label}</p>
              <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <input name={`permission_${module.key}_view`} type="checkbox" defaultChecked className="h-4 w-4" />
                View
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <input name={`permission_${module.key}_edit`} type="checkbox" className="h-4 w-4" />
                Work / edit
              </label>
            </div>
          ))}
        </div>
        <div className="md:col-span-4">
          <Submit>Create doer login</Submit>
        </div>
      </form>
      <form action={createTeamLoginLink} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-[1fr_auto]">
        <Field name="email" label="Magic link fallback" type="email" placeholder="team@richagroup.co" required />
        <div className="flex items-end">
          <Submit>Send backup link</Submit>
        </div>
      </form>
    </div>
  );
}

export function TeamLoginBulkImportForm() {
  const sampleHeaders = "full_name,email,password,role";
  const sampleRow = "Aman Pareek,aman@richagroup.co,Welcome@123,staff";
  const permissionHeaders = `${sampleHeaders},${permissionModules.map((module) => module.key).join(",")}`;
  const permissionRow = `Riya Sharma,riya@richagroup.co,Welcome@123,manager,${permissionModules
    .map((module) => (module.key === "sales" ? "edit" : ""))
    .join(",")}`;
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    `${permissionHeaders}\n${permissionRow}\n`
  )}`;

  return (
    <section id="bulk" className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Add Users</p>
          <h2 className="text-xl font-semibold">Upload user CSV</h2>
          <p className="text-sm text-muted-foreground">
            Ek saath multiple logins banayein. Email match hua to password reset hoga. Email richagroup.co aur password 8+ characters hona chahiye.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-users-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <form action={bulkImportTeamLogins} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="user_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="user_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk create logins</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Required columns</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-sm font-semibold">Optional module access columns</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Role ke baad har module ke liye column add kar sakte hain (value: <code>view</code> ya <code>edit</code>).
            Staff bina module ke sirf apne Delegation/Checklist tasks dekhega.
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{permissionModules.map((module) => module.key).join(", ")}</pre>
          </div>
        </div>
      </form>
    </section>
  );
}

export function EmployeeRecordForm() {
  return (
    <form action={addEmployeeRecord} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-4">
      <Field name="employee_code" label="Employee code" placeholder="RG0028" required />
      <Field name="full_name" label="Employee name" placeholder="Prince Kumar" required />
      <Field name="login_email" label="Login email" type="email" placeholder="employee@richagroup.co" />
      <Field name="phone" label="Mobile" placeholder="9876543210" />
      <Field name="whatsapp" label="WhatsApp" placeholder="9876543210" />
      <Field name="personal_email" label="Personal email" type="email" placeholder="personal@email.com" />
      <Field name="department" label="Department" placeholder="Sales / Accounts / Operations" required />
      <Field name="designation" label="Designation" placeholder="Sales Executive" />
      <label className="block text-sm">
        <span className="font-medium">ERP role</span>
        <select name="role" defaultValue="staff" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <Field name="reporting_manager" label="Reporting manager" placeholder="Manager name" />
      <label className="block text-sm">
        <span className="font-medium">Employment type</span>
        <select name="employment_type" defaultValue="full_time" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
          <option value="consultant">Consultant</option>
        </select>
      </label>
      <Field name="joining_date" label="Joining date" type="date" />
      <Field name="exit_date" label="Exit date" type="date" />
      <label className="block text-sm">
        <span className="font-medium">Employee status</span>
        <select name="status" defaultValue="active" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="inactive">Inactive</option>
          <option value="left">Left</option>
          <option value="blocked">Blocked</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">App access</span>
        <select name="app_access_status" defaultValue="not_created" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="not_created">Not created</option>
          <option value="invited">Invited</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <Field name="document_folder_url" label="Document folder" placeholder="Google Drive folder URL" />
      <Field name="emergency_contact_name" label="Emergency contact" placeholder="Family contact name" />
      <Field name="emergency_contact_phone" label="Emergency phone" placeholder="9876543210" />
      <label className="block text-sm md:col-span-2">
        <span className="font-medium">Address</span>
        <textarea
          name="address"
          className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Current address"
        />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="font-medium">HR remarks</span>
        <textarea
          name="remarks"
          className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Credential note, document pending, policy acknowledgement"
        />
      </label>
      <div className="md:col-span-4">
        <Submit>Save employee</Submit>
      </div>
    </form>
  );
}

export function EmployeeBulkImportForm() {
  const sampleHeaders =
    "employee_code,full_name,login_email,phone,whatsapp,department,designation,role,reporting_manager,employment_type,joining_date,status,app_access_status,document_folder_url,remarks";
  const sampleRow =
    "RG0028,Prince Kumar,prince@richagroup.co,9876543210,9876543210,Sales,Sales Executive,staff,Sales Manager,full_time,2026-05-01,active,not_created,https://drive.google.com/,Create login after verification";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Update</p>
          <h2 className="text-xl font-semibold">Upload employee CSV</h2>
          <p className="text-sm text-muted-foreground">
            Employee code match hone par update hoga. Password CSV me kabhi store nahi hoga.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-employee-master-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <form action={bulkImportEmployees} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="employee_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="employee_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk add / update employees</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Supported CSV headers</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-sm font-semibold">Credential rule</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            CSV se employee master update hoga. Login password yahan save nahi hota; login create/reset Supabase Auth se secure rahega.
          </p>
        </div>
      </form>
    </section>
  );
}

export const checklistDepartmentOptions = [
  { id: "dashboard", name: "Dashboard" },
  { id: "sales", name: "Sales & CRM" },
  { id: "purchases", name: "Purchase & Imports" },
  { id: "inventory", name: "Inventory & Operations" },
  { id: "accounts", name: "Accounts & Billing" },
  { id: "hr", name: "HR, Admin & Management" }
];

export function DepartmentChecklistForm({ departmentKey = "dashboard" }: { departmentKey?: string }) {
  return (
    <form action={addDepartmentChecklist} className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Manual Checklist</p>
        <h2 className="text-xl font-semibold">Add checklist task</h2>
        <p className="text-sm text-muted-foreground">
          Department-wise SOP, daily task, approval point ya audit checkpoint yahan add karein.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">Department</span>
          <select name="department_key" defaultValue={departmentKey} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            {checklistDepartmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <Field name="checklist_code" label="Checklist code" placeholder="SAL-DAY-001" />
        <Field name="title" label="Task title" placeholder="Daily order confirmation check" required />
        <Field name="owner_name" label="Owner / doer" placeholder="Sales team / Accounts team" />
        <label className="block text-sm">
          <span className="font-medium">Frequency</span>
          <select name="frequency" defaultValue="daily" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="one_time">One time</option>
            <option value="event_based">Event based</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Priority</span>
          <select name="priority" defaultValue="medium" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="low">Low</option>
          </select>
        </label>
        <Field name="due_date" label="Due date" type="date" />
        <label className="block text-sm">
          <span className="font-medium">Status</span>
          <select name="status" defaultValue="pending" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="not_required">Not required</option>
          </select>
        </label>
        <Field name="proof_url" label="Proof / report link" placeholder="Proof document URL" />
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Checklist ka exact process, required proof, approval rule"
          />
        </label>
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Remarks</span>
          <input
            name="remarks"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Internal note"
          />
        </label>
      </div>
      <div className="mt-4">
        <Submit>Add checklist</Submit>
      </div>
    </form>
  );
}

export function DepartmentChecklistBulkImportForm({ departmentKey = "dashboard" }: { departmentKey?: string }) {
  const sampleHeaders =
    "department,checklist_code,title,description,owner_name,frequency,priority,due_date,status,proof_url,remarks";
  const sampleRow =
    "sales,SAL-DAY-001,Daily order confirmation,Confirm pending orders and proof links,Sales executive,daily,high,05/05/2026,pending,https://drive.google.com/,Review before dispatch";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Upload</p>
          <h2 className="text-xl font-semibold">Upload checklist CSV</h2>
          <p className="text-sm text-muted-foreground">
            Same checklist code par row update hogi. Code blank hua to new checklist row create hogi.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-department-checklist-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <form action={bulkImportDepartmentChecklists} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <input type="hidden" name="department_key" value={departmentKey} />
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="checklist_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="checklist_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk upload checklist</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Supported CSV columns</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Department column me dashboard, sales, purchases, inventory, accounts, hr use kar sakte hain.
          </p>
        </div>
      </form>
    </section>
  );
}

export function DepartmentChecklistUpdateForm({ checklist }: { checklist: Record<string, any> }) {
  return (
    <form action={updateDepartmentChecklist} className="grid min-w-[520px] gap-2 rounded-md border bg-slate-50/80 p-3">
      <input type="hidden" name="checklist_id" value={checklist.id} />
      <input type="hidden" name="department_key" value={checklist.department_key} />
      <div className="grid gap-2 sm:grid-cols-3">
        <select name="status" defaultValue={checklist.status || "pending"} className="h-9 rounded-md border bg-white px-2 text-xs font-medium">
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
          <option value="not_required">N/A</option>
        </select>
        <select name="priority" defaultValue={checklist.priority || "medium"} className="h-9 rounded-md border bg-white px-2 text-xs font-medium">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
          <option value="low">Low</option>
        </select>
        <input name="due_date" type="date" defaultValue={checklist.due_date || ""} className="h-9 rounded-md border bg-white px-2 text-xs" />
      </div>
      <input
        name="proof_url"
        defaultValue={checklist.proof_url || ""}
        placeholder="Proof / report URL"
        className="h-9 rounded-md border bg-white px-2 text-xs"
      />
      <input
        name="remarks"
        defaultValue={checklist.remarks || ""}
        placeholder="Latest remark"
        className="h-9 rounded-md border bg-white px-2 text-xs"
      />
      <button className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Update checklist
      </button>
    </form>
  );
}

export function TaskDelegationForm({ departmentKey = "dashboard" }: { departmentKey?: string }) {
  return (
    <form action={addTaskDelegation} className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Task Delegation</p>
        <h2 className="text-xl font-semibold">Assign a task</h2>
        <p className="text-sm text-muted-foreground">
          Kisi person ko one-time task delegate karein - doer, planned date, deadline aur proof ke saath.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">Department</span>
          <select name="department_key" defaultValue={departmentKey} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            {checklistDepartmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <Field name="delegation_code" label="Task code" placeholder="DEL-001" />
        <Field name="title" label="Task title" placeholder="Prepare GST working for April" required />
        <Field name="assigned_to" label="Assigned to (doer)" placeholder="Employee name" />
        <Field name="assigned_by" label="Assigned by" placeholder="Manager name" />
        <label className="block text-sm">
          <span className="font-medium">Priority</span>
          <select name="priority" defaultValue="medium" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="low">Low</option>
          </select>
        </label>
        <Field name="planned_date" label="Planned date" type="date" />
        <Field name="target_date" label="Target / deadline" type="date" />
        <label className="block text-sm">
          <span className="font-medium">Status</span>
          <select name="status" defaultValue="pending" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="not_required">Not required</option>
          </select>
        </label>
        <Field name="proof_url" label="Proof / report link" placeholder="Proof document URL" />
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Task ka exact scope, expected output aur proof"
          />
        </label>
        <label className="block text-sm md:col-span-3">
          <span className="font-medium">Remarks</span>
          <input
            name="remarks"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
            placeholder="Internal note"
          />
        </label>
      </div>
      <div className="mt-4">
        <Submit>Assign task</Submit>
      </div>
    </form>
  );
}

export function TaskDelegationBulkImportForm({ departmentKey = "dashboard" }: { departmentKey?: string }) {
  const sampleHeaders =
    "department,delegation_code,title,description,assigned_to,assigned_by,priority,planned_date,target_date,status,proof_url,remarks";
  const sampleRow =
    "sales,DEL-001,Prepare April GST working,Collect invoices and file working,Aman Pareek,Sales Manager,high,01/05/2026,07/05/2026,pending,https://drive.google.com/,Share before review";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <section className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Upload</p>
          <h2 className="text-xl font-semibold">Upload delegation CSV</h2>
          <p className="text-sm text-muted-foreground">
            Same delegation code par row update hogi. Code blank hua to new task create hoga. Assigned_to me employee ka exact naam/email daalein.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-delegation-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>
      <form action={bulkImportTaskDelegations} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <input type="hidden" name="department_key" value={departmentKey} />
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="delegation_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="delegation_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>
          <Submit>Bulk upload delegations</Submit>
        </div>
        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Supported CSV columns</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Department column me dashboard, sales, purchases, inventory, accounts, hr use kar sakte hain.
          </p>
        </div>
      </form>
    </section>
  );
}

export function TaskDelegationUpdateForm({ delegation }: { delegation: Record<string, any> }) {
  return (
    <form action={updateTaskDelegation} className="grid min-w-[520px] gap-2 rounded-md border bg-slate-50/80 p-3">
      <input type="hidden" name="delegation_id" value={delegation.id} />
      <input type="hidden" name="department_key" value={delegation.department_key} />
      <div className="grid gap-2 sm:grid-cols-3">
        <select name="status" defaultValue={delegation.status || "pending"} className="h-9 rounded-md border bg-white px-2 text-xs font-medium">
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
          <option value="not_required">N/A</option>
        </select>
        <select name="priority" defaultValue={delegation.priority || "medium"} className="h-9 rounded-md border bg-white px-2 text-xs font-medium">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
          <option value="low">Low</option>
        </select>
        <input name="assigned_to" defaultValue={delegation.assigned_to || ""} placeholder="Doer" className="h-9 rounded-md border bg-white px-2 text-xs" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="target_date" type="date" defaultValue={delegation.target_date || ""} className="h-9 rounded-md border bg-white px-2 text-xs" />
        <input name="revised_date" type="date" defaultValue={delegation.revised_date || ""} className="h-9 rounded-md border bg-white px-2 text-xs" />
        <input name="completed_date" type="date" defaultValue={delegation.completed_date || ""} className="h-9 rounded-md border bg-white px-2 text-xs" />
      </div>
      <input
        name="proof_url"
        defaultValue={delegation.proof_url || ""}
        placeholder="Proof / report URL"
        className="h-9 rounded-md border bg-white px-2 text-xs"
      />
      <input
        name="remarks"
        defaultValue={delegation.remarks || ""}
        placeholder="Latest remark"
        className="h-9 rounded-md border bg-white px-2 text-xs"
      />
      <button className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Update delegation
      </button>
    </form>
  );
}

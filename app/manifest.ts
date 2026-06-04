import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ram Setu ERP",
    short_name: "Ram Setu",
    description:
      "Richa Global Sales ERP for order punch, payment follow-up, inventory, dispatch and admin workflows.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06111f",
    theme_color: "#0e3476",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    shortcuts: [
      {
        name: "Order Punch",
        short_name: "Orders",
        description: "Create and track order to delivery flow",
        url: "/dashboard/sales?system=order-to-delivery"
      },
      {
        name: "Payment Follow-up",
        short_name: "Payments",
        description: "Open payment follow-up command center",
        url: "/dashboard/invoices?system=payment-follow-up"
      },
      {
        name: "Inventory",
        short_name: "Stock",
        description: "Open inventory management",
        url: "/dashboard/inventory?system=ims-control"
      }
    ]
  };
}

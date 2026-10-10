export interface NavItem {
  href: string;
  title: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Start here",
    items: [
      { href: "/", title: "Welcome" },
      { href: "/home/", title: "Home" },
      { href: "/setup/onboarding/", title: "First-time setup" },
      { href: "/glossary/", title: "Glossary" },
      { href: "/help/", title: "Help and Winston" },
      { href: "/runbook/", title: "If something breaks" },
    ],
  },
  {
    title: "Daily workflows",
    items: [
      { href: "/workflows/build-order/", title: "Parse & Build" },
      { href: "/workflows/enrich/", title: "Enrich" },
      { href: "/workflows/push-to-shopify/", title: "Push to Shopify" },
      { href: "/workflows/receiving/", title: "Receiving" },
      { href: "/workflows/photography/", title: "Photography" },
      { href: "/workflows/labels/", title: "Print Labels" },
      { href: "/workflows/reorder/", title: "Reorder" },
      { href: "/workflows/supplier-confirmations/", title: "Supplier confirmations" },
      { href: "/workflows/mtm/", title: "Custom orders" },
      { href: "/workflows/transfer-out/", title: "Transfer Out" },
      { href: "/workflows/logistics/", title: "Logistics" },
      { href: "/workflows/shopify-stock-sync/", title: "Shopify stock sync" },
    ],
  },
  {
    title: "Planning + merchandising",
    items: [
      { href: "/planning/buying-seasons/", title: "Buying Plan" },
      { href: "/planning/budget-otb/", title: "Budget & OTB" },
      { href: "/planning/trading/", title: "Merchandising" },
      { href: "/planning/brand-page/", title: "Brand page and letter" },
      { href: "/planning/stock/", title: "Stock" },
      { href: "/planning/money/", title: "Money" },
    ],
  },
  {
    title: "ThreadCloud for reps",
    items: [
      { href: "/reps/", title: "Start here" },
      { href: "/reps/lines-and-seasons/", title: "Lines and seasons" },
      { href: "/reps/doors-and-visits/", title: "Doors and visits" },
      { href: "/reps/orders/", title: "Writing an order" },
      { href: "/reps/earnings/", title: "Earnings" },
      { href: "/reps/help/", title: "Help" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/store-health/", title: "Settings and store health" },
      { href: "/settings/brands-suppliers/", title: "Brand Registry" },
      { href: "/settings/brand-fit/", title: "Brand fit" },
      { href: "/settings/delivery-windows/", title: "Delivery calendar" },
      { href: "/settings/legacy-enrichment/", title: "Catalog setup" },
      { href: "/settings/ai-models/", title: "AI & Pipeline" },
      { href: "/settings/theme/", title: "Storefront" },
      { href: "/settings/users-roles/", title: "Team access" },
    ],
  },
];

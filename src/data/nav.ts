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
      { href: "/glossary/", title: "Glossary" },
      { href: "/runbook/", title: "If something breaks" },
    ],
  },
  {
    title: "Daily workflows",
    items: [
      { href: "/workflows/build-order/", title: "Build Order" },
      { href: "/workflows/enrich/", title: "Enrich" },
      { href: "/workflows/push-to-shopify/", title: "Push to Shopify" },
      { href: "/workflows/receiving/", title: "Receiving" },
      { href: "/workflows/labels/", title: "Print Labels" },
      { href: "/workflows/reorder/", title: "Reorder" },
      { href: "/workflows/mtm/", title: "Custom orders" },
    ],
  },
  {
    title: "Planning + financials",
    items: [
      { href: "/planning/buying-seasons/", title: "Buying Seasons" },
      { href: "/planning/budget-otb/", title: "Budget & OTB" },
      { href: "/planning/trading/", title: "Trading Dashboard" },
      { href: "/planning/financials/", title: "Financials" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/ai-models/", title: "AI & Models" },
      { href: "/settings/brands-suppliers/", title: "Brands & Suppliers" },
      { href: "/settings/delivery-windows/", title: "Delivery Windows" },
      { href: "/settings/legacy-enrichment/", title: "Legacy Enrichment" },
      { href: "/settings/theme/", title: "Theme & Storefront" },
      { href: "/settings/users-roles/", title: "Users & Roles" },
    ],
  },
];

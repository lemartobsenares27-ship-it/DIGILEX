export interface NavItem {
  label: string;
  path: string;
  permission: string;
  implemented: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Mirrors the LHIKE ERP sidebar documented in docs/manual (Module 1,
// Section 1.4). `implemented: false` items are fully specified in the
// documentation set but not yet built in this application -- they still
// appear in navigation (matching the real product's shape) and route to a
// "Coming soon" page that links back to their doc chapter.
export const NAV: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Sales Warehouse Logistics", path: "/dashboard/sales-warehouse-logistics", permission: "dashboard.view", implemented: true },
      { label: "Finance", path: "/dashboard/finance", permission: "finance.dashboard.view", implemented: true },
    ],
  },
  {
    label: "E-commerce",
    items: [
      { label: "Pages & Store", path: "/ecommerce/pages-store", permission: "ecommerce.pages.viewOwn", implemented: false },
      { label: "Page ROAS Tracker", path: "/ecommerce/page-roas-tracker", permission: "ecommerce.ads.view", implemented: false },
      { label: "Adspent ROAS Summary", path: "/ecommerce/adspent-roas-summary", permission: "ecommerce.ads.view", implemented: false },
      { label: "Sales Tracker", path: "/ecommerce/sales-tracker", permission: "ecommerce.salesOrder.viewOwn", implemented: false },
      { label: "Product Testing", path: "/ecommerce/product-testing", permission: "ecommerce.newItemRequest.viewOwn", implemented: false },
      { label: "BM & Ad Account", path: "/ecommerce/bm-ad-account", permission: "ecommerce.bm.viewOwn", implemented: false },
      { label: "Profitability Formula", path: "/ecommerce/profitability-formula", permission: "ecommerce.calculator.view", implemented: false },
    ],
  },
  {
    label: "Board",
    items: [
      { label: "Kanban Board", path: "/board/kanban", permission: "board.kanban.board", implemented: false },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Income Statement", path: "/finance/income-statement", permission: "finance.dashboard.view", implemented: false },
      { label: "Book Keeping", path: "/finance/book-keeping", permission: "finance.bookKeeping.viewAdd", implemented: false },
      { label: "Reimbursement", path: "/finance/reimbursement", permission: "finance.reimbursement.requester", implemented: false },
      { label: "Utility Expense", path: "/finance/utility-expense", permission: "finance.utilityExpense.requester", implemented: false },
    ],
  },
  {
    label: "Logistic & Inventory",
    items: [
      { label: "Purchase Order", path: "/logistics/purchase-order", permission: "logisticInventory.purchaseOrder.viewOwnedAssigned", implemented: false },
      { label: "Supplier", path: "/logistics/supplier", permission: "logisticInventory.supplier.view", implemented: false },
      { label: "Inventory", path: "/logistics/inventory", permission: "logisticInventory.products.viewEdit", implemented: false },
      { label: "Warehouse", path: "/logistics/warehouse", permission: "logisticInventory.fulfillment.manage", implemented: false },
      { label: "RTS Items", path: "/logistics/rts-items", permission: "logisticInventory.rts.view", implemented: false },
    ],
  },
  {
    label: "HR",
    items: [
      { label: "201 File", path: "/hr/201-file", permission: "hr.file201.view", implemented: false },
      { label: "Leave Credits", path: "/hr/leave-credits", permission: "hr.leaveCredits.view", implemented: false },
    ],
  },
  {
    label: "User",
    items: [
      { label: "User Management", path: "/users", permission: "user.userManagement.manage", implemented: true },
    ],
  },
];

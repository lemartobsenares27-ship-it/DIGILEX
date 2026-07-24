// Canonical permission tree for LHIKE ERP, mirroring Module 9 (User
// Management), Section 9.7 "Change Role" checkbox matrix. Each leaf is a
// permission key granted/revoked per user. Modules not yet built (Board,
// HR, Finance, Logistic & Inventory sub-features) still have their
// permission keys defined here so the User Management screen and role
// matrix are complete even before those modules ship.

export interface PermissionNode {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionNode[];
}

export interface PermissionModule {
  key: string;
  label: string;
  groups: PermissionGroup[];
}

export const PERMISSION_TREE: PermissionModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    groups: [
      { key: "dashboard", label: "Dashboard", permissions: [{ key: "dashboard.view", label: "View" }] },
    ],
  },
  {
    key: "ecommerce",
    label: "E-commerce",
    groups: [
      {
        key: "ads",
        label: "Ads",
        permissions: [
          { key: "ecommerce.ads.view", label: "View" },
          { key: "ecommerce.ads.upload", label: "Upload" },
          { key: "ecommerce.ads.edit", label: "Edit" },
        ],
      },
      {
        key: "salesOrder",
        label: "Sales Order",
        permissions: [
          { key: "ecommerce.salesOrder.viewAll", label: "View (All)" },
          { key: "ecommerce.salesOrder.viewOwn", label: "View (Own)" },
          { key: "ecommerce.salesOrder.editAll", label: "Edit Order (All)" },
          { key: "ecommerce.salesOrder.createNew", label: "Create New Order" },
          { key: "ecommerce.salesOrder.verify", label: "Verify Order" },
          { key: "ecommerce.salesOrder.uploadExcel", label: "Upload Sales Order (Excel)" },
          { key: "ecommerce.salesOrder.deleteOrder", label: "Delete Order" },
          { key: "ecommerce.salesOrder.viewReport", label: "View Report" },
          { key: "ecommerce.salesOrder.updateParcelStatus", label: "Update Parcel Status (NCW)" },
        ],
      },
      {
        key: "conversionRate",
        label: "Conversion Rate",
        permissions: [
          { key: "ecommerce.conversionRate.viewAll", label: "View (All)" },
          { key: "ecommerce.conversionRate.viewOwn", label: "View (Own)" },
          { key: "ecommerce.conversionRate.uploadUpdate", label: "Upload Conversion & Update Sales" },
        ],
      },
      {
        key: "newItemRequest",
        label: "New Item Request (Product Testing)",
        permissions: [
          { key: "ecommerce.newItemRequest.viewOwn", label: "View, Create & Edit Request (Own)" },
          { key: "ecommerce.newItemRequest.viewAll", label: "View (All)" },
          { key: "ecommerce.newItemRequest.archiveOwn", label: "Archive (Own)" },
          { key: "ecommerce.newItemRequest.archiveAll", label: "Archive (All)" },
          { key: "ecommerce.newItemRequest.setPage", label: "Set Page" },
          { key: "ecommerce.newItemRequest.updateVendor", label: "Update Vendor" },
          { key: "ecommerce.newItemRequest.approver1", label: "1st Approver" },
          { key: "ecommerce.newItemRequest.updatePlatform", label: "Update Platform" },
          { key: "ecommerce.newItemRequest.approver2", label: "2nd Approver" },
        ],
      },
      {
        key: "pages",
        label: "Pages",
        permissions: [
          { key: "ecommerce.pages.viewOwn", label: "View, Add & Edit (Own)" },
          { key: "ecommerce.pages.viewAll", label: "View, Add & Edit (All)" },
          { key: "ecommerce.pages.deletePlatform", label: "Delete (Platform)" },
        ],
      },
      {
        key: "bm",
        label: "BM & Ad Account",
        permissions: [
          { key: "ecommerce.bm.viewOwn", label: "View, Add & Edit (Own)" },
          { key: "ecommerce.bm.viewAll", label: "View, Edit (All)" },
          { key: "ecommerce.bm.deleteAll", label: "Delete (All)" },
        ],
      },
      {
        key: "accountHealth",
        label: "Account Health",
        permissions: [
          { key: "ecommerce.accountHealth.manage", label: "Manage (View, Update)" },
          { key: "ecommerce.accountHealth.viewOnly", label: "View Only" },
        ],
      },
      { key: "calculator", label: "Calculator (Profitability Formula)", permissions: [{ key: "ecommerce.calculator.view", label: "View" }] },
      { key: "customerSettings", label: "Customer Settings", permissions: [{ key: "ecommerce.customerSettings.manage", label: "Customer Settings" }] },
    ],
  },
  {
    key: "user",
    label: "User",
    groups: [
      { key: "userManagement", label: "User Management", permissions: [{ key: "user.userManagement.manage", label: "Manage role, access, and account status" }] },
    ],
  },
  {
    key: "board",
    label: "Board",
    groups: [
      {
        key: "kanban",
        label: "Kanban",
        permissions: [
          { key: "board.kanban.board", label: "Kanban Board" },
          { key: "board.kanban.settings", label: "Settings" },
          { key: "board.kanban.viewAll", label: "View All" },
        ],
      },
    ],
  },
  {
    key: "hr",
    label: "HR",
    groups: [
      { key: "dashboard", label: "Dashboard", permissions: [{ key: "hr.dashboard.view", label: "View" }] },
      {
        key: "file201",
        label: "201 File",
        permissions: [
          { key: "hr.file201.view", label: "View" },
          { key: "hr.file201.add", label: "Add" },
          { key: "hr.file201.edit", label: "Edit" },
        ],
      },
      {
        key: "leaveCredits",
        label: "Leave Credits",
        permissions: [
          { key: "hr.leaveCredits.view", label: "View" },
          { key: "hr.leaveCredits.add", label: "Add" },
        ],
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    groups: [
      { key: "dashboard", label: "Dashboard", permissions: [{ key: "finance.dashboard.view", label: "View" }] },
      {
        key: "remittance",
        label: "Remittance",
        permissions: [
          { key: "finance.remittance.view", label: "View" },
          { key: "finance.remittance.edit", label: "Edit Remittance" },
          { key: "finance.remittance.saveAutoComputed", label: "Save Auto-computed Remittance" },
        ],
      },
      { key: "payroll", label: "Payroll", permissions: [{ key: "finance.payroll.manage", label: "Manage Payroll" }] },
      {
        key: "bookKeeping",
        label: "Book Keeping",
        permissions: [
          { key: "finance.bookKeeping.viewAdd", label: "View, Add" },
          { key: "finance.bookKeeping.viewApprover", label: "View Approver" },
          { key: "finance.bookKeeping.addTypeOfExpense", label: "Add Type of Expense" },
        ],
      },
      {
        key: "settings",
        label: "Settings",
        permissions: [
          { key: "finance.settings.viewAdd", label: "View, Add" },
          { key: "finance.settings.changeStatus", label: "Change Status" },
        ],
      },
      {
        key: "reimbursement",
        label: "Reimbursement",
        permissions: [
          { key: "finance.reimbursement.requester", label: "Requester" },
          { key: "finance.reimbursement.approver", label: "Approver" },
        ],
      },
      {
        key: "utilityExpense",
        label: "Utility Expense",
        permissions: [
          { key: "finance.utilityExpense.requester", label: "Requester" },
          { key: "finance.utilityExpense.approver", label: "Approver" },
        ],
      },
    ],
  },
  {
    key: "logisticInventory",
    label: "Logistic & Inventory",
    groups: [
      { key: "dashboard", label: "Dashboard", permissions: [{ key: "logisticInventory.dashboard.view", label: "View" }] },
      {
        key: "purchaseOrder",
        label: "Purchase Order",
        permissions: [
          { key: "logisticInventory.purchaseOrder.receivedDelivery", label: "Received Delivery" },
          { key: "logisticInventory.purchaseOrder.editAddAssigned", label: "Edit (Add Assigned)" },
          { key: "logisticInventory.purchaseOrder.viewOwnedAssigned", label: "View (Owned & assigned)" },
          { key: "logisticInventory.purchaseOrder.createEditDeleteCopyOwned", label: "Create, Edit, Delete & Copy (Owned)" },
          { key: "logisticInventory.purchaseOrder.viewAll", label: "View (All)" },
          { key: "logisticInventory.purchaseOrder.deleteAllAssigned", label: "Delete (All assigned)" },
          { key: "logisticInventory.purchaseOrder.bankSettings", label: "Bank Settings" },
        ],
      },
      {
        key: "products",
        label: "Products",
        permissions: [
          { key: "logisticInventory.products.viewEdit", label: "View, Edit" },
          { key: "logisticInventory.products.remainingItemsView", label: "Remaining Items (View)" },
          { key: "logisticInventory.products.delete", label: "Delete" },
          { key: "logisticInventory.products.viewDeletedItem", label: "View Deleted Item" },
          { key: "logisticInventory.products.uploadProducts", label: "Upload Products" },
          { key: "logisticInventory.products.uploadUnitCodes", label: "Upload Unit Codes" },
        ],
      },
      {
        key: "fulfillment",
        label: "Fulfillment",
        permissions: [
          { key: "logisticInventory.fulfillment.placerStatusUpdateExcel", label: "Placer Status Update (via Excel Import)" },
          { key: "logisticInventory.fulfillment.manage", label: "Manage Fulfillment" },
          { key: "logisticInventory.fulfillment.printWaybill", label: "Print Waybill" },
          { key: "logisticInventory.fulfillment.createOrderInPortal", label: "Create Order in Portal" },
          { key: "logisticInventory.fulfillment.apiExport", label: "API Export" },
        ],
      },
      {
        key: "rts",
        label: "RTS",
        permissions: [
          { key: "logisticInventory.rts.view", label: "View" },
          { key: "logisticInventory.rts.updateGoodsDamage", label: "Update Goods & Damage" },
          { key: "logisticInventory.rts.approver", label: "RTS Approver" },
        ],
      },
      {
        key: "supplier",
        label: "Supplier",
        permissions: [
          { key: "logisticInventory.supplier.view", label: "View" },
          { key: "logisticInventory.supplier.edit", label: "Edit" },
        ],
      },
      { key: "fulfillmentSettings", label: "Fulfillment Settings", permissions: [{ key: "logisticInventory.fulfillmentSettings.manage", label: "Fulfillment Settings" }] },
      { key: "inventoryReleaseSummary", label: "Inventory Release Summary", permissions: [{ key: "logisticInventory.inventoryReleaseSummary.remove", label: "Remove" }] },
    ],
  },
  {
    key: "motherAccount",
    label: "Mother Account",
    groups: [
      { key: "motherAccount", label: "Mother Account", permissions: [{ key: "motherAccount.access", label: "Access for Mother Account (grants all-account access)" }] },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_TREE.flatMap((mod) =>
  mod.groups.flatMap((g) => g.permissions.map((p) => p.key)),
);

export function isMotherAccountKey(key: string): boolean {
  return key === "motherAccount.access";
}

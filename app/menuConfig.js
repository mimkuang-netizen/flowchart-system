// 流程圖選單設定檔
// 修改此檔案即可新增、刪除或更名功能按鈕
// icon 請參考 https://lucide.dev 挑選圖標名稱

export const flowSections = [
  {
    id: "customer",
    label: "客戶端",
    color: "orange",
    items: [
      {
        id: "customers",
        label: "客戶資料",
        icon: "Users",
        href: "/customers",
        description: "客戶基本資料管理",
        active: true,
      },
      {
        id: "quotation",
        label: "報價單",
        icon: "FileText",
        href: "/quotation",
        description: "客戶報價作業",
      },
      {
        id: "order",
        label: "訂單",
        icon: "ShoppingCart",
        href: "/order",
        description: "客戶訂單管理",
      },
      {
        id: "sales",
        label: "銷貨",
        icon: "TrendingUp",
        href: "/sales",
        description: "銷貨出貨作業",
      },
      {
        id: "collection",
        label: "收款",
        icon: "Wallet",
        href: "/collection",
        description: "客戶收款管理",
      },
    ],
  },
  {
    id: "vendor",
    label: "廠商端",
    color: "green",
    items: [
      {
        id: "purchase",
        label: "採購",
        icon: "ClipboardList",
        href: "/purchase",
        description: "採購訂單作業",
      },
      {
        id: "receiving",
        label: "進貨",
        icon: "PackageCheck",
        href: "/receiving",
        description: "廠商進貨管理",
      },
      {
        id: "payment",
        label: "付款",
        icon: "CreditCard",
        href: "/payment",
        description: "廠商付款作業",
      },
    ],
  },
  {
    id: "inventory",
    label: "商品與財務端",
    color: "blue",
    items: [
      {
        id: "stock",
        label: "庫存查詢",
        icon: "Warehouse",
        href: "/stock",
        description: "即時庫存查詢",
      },
      {
        id: "inventory-check",
        label: "盤點",
        icon: "ClipboardCheck",
        href: "/inventory-check",
        description: "商品盤點作業",
      },
      {
        id: "finance",
        label: "財務報表",
        icon: "BarChart3",
        href: "/finance",
        description: "進銷存財務報表",
      },
    ],
  },
];

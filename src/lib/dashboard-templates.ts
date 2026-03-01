export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // lucide icon name
  cards: Array<{
    title: string;
    sql: string;
    vizSettings: { chartType: string; xAxis?: string; yAxis?: string };
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
  }>;
}

export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: "ecommerce-overview",
    name: "E-Commerce Overview",
    description:
      "Key metrics for your online store including revenue, orders, top products, and customer distribution.",
    category: "E-Commerce",
    icon: "ShoppingCart",
    cards: [
      {
        title: "Total Revenue",
        sql: "SELECT SUM(total) as total_revenue FROM orders WHERE status = 'completed'",
        vizSettings: { chartType: "number" },
        layoutX: 0,
        layoutY: 0,
        layoutW: 4,
        layoutH: 2,
      },
      {
        title: "Total Orders",
        sql: "SELECT COUNT(*) as total_orders FROM orders",
        vizSettings: { chartType: "number" },
        layoutX: 4,
        layoutY: 0,
        layoutW: 4,
        layoutH: 2,
      },
      {
        title: "Revenue by Month",
        sql: "SELECT month, revenue FROM revenue_monthly ORDER BY month",
        vizSettings: { chartType: "line", xAxis: "month", yAxis: "revenue" },
        layoutX: 0,
        layoutY: 2,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Orders by Status",
        sql: "SELECT status, COUNT(*) as count FROM orders GROUP BY status",
        vizSettings: { chartType: "pie", xAxis: "status", yAxis: "count" },
        layoutX: 6,
        layoutY: 2,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Top Products by Revenue",
        sql: "SELECT p.name, SUM(oi.quantity * oi.unit_price) as revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.name ORDER BY revenue DESC LIMIT 10",
        vizSettings: { chartType: "bar", xAxis: "name", yAxis: "revenue" },
        layoutX: 0,
        layoutY: 5,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Customers by Country",
        sql: "SELECT country, COUNT(*) as customers FROM customers GROUP BY country ORDER BY customers DESC",
        vizSettings: {
          chartType: "bar",
          xAxis: "country",
          yAxis: "customers",
        },
        layoutX: 6,
        layoutY: 5,
        layoutW: 6,
        layoutH: 3,
      },
    ],
  },
  {
    id: "saas-metrics",
    name: "SaaS Metrics",
    description:
      "Essential SaaS dashboard with customer counts, monthly profit, revenue trends, and plan distribution.",
    category: "SaaS",
    icon: "Cloud",
    cards: [
      {
        title: "Total Customers",
        sql: "SELECT COUNT(*) as total FROM customers",
        vizSettings: { chartType: "number" },
        layoutX: 0,
        layoutY: 0,
        layoutW: 4,
        layoutH: 2,
      },
      {
        title: "Average Order Value",
        sql: "SELECT ROUND(AVG(total), 2) as avg_order FROM orders WHERE status = 'completed'",
        vizSettings: { chartType: "number" },
        layoutX: 4,
        layoutY: 0,
        layoutW: 4,
        layoutH: 2,
      },
      {
        title: "Monthly Profit",
        sql: "SELECT month, profit FROM revenue_monthly ORDER BY month",
        vizSettings: { chartType: "line", xAxis: "month", yAxis: "profit" },
        layoutX: 0,
        layoutY: 2,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Revenue vs Expenses",
        sql: "SELECT month, revenue, expenses FROM revenue_monthly ORDER BY month",
        vizSettings: { chartType: "line", xAxis: "month", yAxis: "revenue" },
        layoutX: 6,
        layoutY: 2,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Customers by Plan",
        sql: "SELECT plan, COUNT(*) as count FROM customers GROUP BY plan",
        vizSettings: { chartType: "pie", xAxis: "plan", yAxis: "count" },
        layoutX: 0,
        layoutY: 5,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "New Signups by Month",
        sql: "SELECT substr(signup_date, 1, 7) as month, COUNT(*) as signups FROM customers GROUP BY month ORDER BY month",
        vizSettings: { chartType: "bar", xAxis: "month", yAxis: "signups" },
        layoutX: 6,
        layoutY: 5,
        layoutW: 6,
        layoutH: 3,
      },
    ],
  },
  {
    id: "sales-analytics",
    name: "Sales Analytics",
    description:
      "Deep dive into sales performance with category breakdowns, order trends, top customers, and cancellation rates.",
    category: "Sales",
    icon: "TrendingUp",
    cards: [
      {
        title: "Sales by Category",
        sql: "SELECT p.category, SUM(oi.quantity * oi.unit_price) as sales FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.category ORDER BY sales DESC",
        vizSettings: { chartType: "bar", xAxis: "category", yAxis: "sales" },
        layoutX: 0,
        layoutY: 0,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Order Trends",
        sql: "SELECT substr(order_date, 1, 7) as month, COUNT(*) as orders FROM orders GROUP BY month ORDER BY month",
        vizSettings: { chartType: "line", xAxis: "month", yAxis: "orders" },
        layoutX: 6,
        layoutY: 0,
        layoutW: 6,
        layoutH: 3,
      },
      {
        title: "Top Customers",
        sql: "SELECT c.name, SUM(o.total) as spent FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.name ORDER BY spent DESC LIMIT 10",
        vizSettings: { chartType: "bar", xAxis: "name", yAxis: "spent" },
        layoutX: 0,
        layoutY: 3,
        layoutW: 8,
        layoutH: 3,
      },
      {
        title: "Cancellation Rate",
        sql: "SELECT ROUND(CAST(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as cancel_rate FROM orders",
        vizSettings: { chartType: "number" },
        layoutX: 8,
        layoutY: 3,
        layoutW: 4,
        layoutH: 3,
      },
    ],
  },
];

export function getTemplateById(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): DashboardTemplate[] {
  return dashboardTemplates.filter((t) => t.category === category);
}

export function getTemplateCategories(): string[] {
  return [...new Set(dashboardTemplates.map((t) => t.category))];
}

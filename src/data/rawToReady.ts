import type { RawToReadyConfig } from "./types";

export const rawToReady = {
  title: "From raw to ready",
  subtitle: "The same data, before and after a pipeline.",
  sampleCaption: "Sample data (synthetic)",
  panelLabels: { raw: "Raw", clean: "Clean", ready: "Ready" },
  rowNumberLabel: "#",
  fieldLabels: {
    order_id: "order_id",
    customer_id: "customer_id",
    order_date: "order_date",
    amount: "amount",
    status: "status",
  },
  rawRows: [
    {
      rowNumber: 1,
      raw: { order_id: "1001", customer_id: "C-014", order_date: "2026-03-04", amount: "120.50", status: "shipped" },
      clean: {
        values: { order_id: "1001", customer_id: "C-014", order_date: "2026-03-04", amount: "120.50", status: "shipped" },
      },
    },
    {
      rowNumber: 2,
      raw: { order_id: "1002", customer_id: "C-022", order_date: "03/05/2026", amount: "89.99", status: "SHIPPED" },
      problems: { order_date: "date format", status: "casing" },
      clean: {
        values: { order_id: "1002", customer_id: "C-022", order_date: "2026-03-05", amount: "89.99", status: "shipped" },
        fixes: { order_id: "duplicate removed", order_date: "date standardized", status: "casing normalized" },
      },
    },
    {
      rowNumber: 3,
      raw: { order_id: "1002", customer_id: "C-022", order_date: "03/05/2026", amount: "89.99", status: "SHIPPED" },
      problems: { order_id: "duplicate" },
    },
    {
      rowNumber: 4,
      raw: { order_id: "1003", customer_id: "C-014", order_date: "Mar 6 2026", amount: "$45.2", status: "Shipped" },
      problems: { order_date: "date format", amount: "text amount", status: "casing" },
      clean: {
        values: { order_id: "1003", customer_id: "C-014", order_date: "2026-03-06", amount: "45.20", status: "shipped" },
        fixes: { order_date: "date standardized", amount: "type cast", status: "casing normalized" },
      },
    },
    {
      rowNumber: 5,
      raw: { order_id: "1004", customer_id: "C-031", order_date: "2026-03-07", amount: "NULL", status: "shipped" },
      problems: { amount: "null" },
    },
    {
      rowNumber: 6,
      raw: { order_id: "1005", customer_id: "c-022", order_date: "2026-03-08", amount: "210.00", status: "returned" },
      problems: { customer_id: "casing" },
      clean: {
        values: { order_id: "1005", customer_id: "C-022", order_date: "2026-03-08", amount: "210.00", status: "returned" },
        fixes: { customer_id: "casing normalized" },
      },
    },
    {
      rowNumber: 7,
      raw: { order_id: "1006", customer_id: "C-040", order_date: "2026-03-09", amount: "64.75", status: "shipped" },
      clean: {
        values: { order_id: "1006", customer_id: "C-040", order_date: "2026-03-09", amount: "64.75", status: "shipped" },
      },
    },
    {
      rowNumber: 8,
      raw: { order_id: "1007", customer_id: "C-031", order_date: "2026-03-10", amount: "(empty)", status: "pending" },
      problems: { amount: "null" },
    },
  ],
  showFixesLabel: "Show fixes",
  quarantine: {
    heading: "Quarantined: missing amount",
    orderIds: ["1004", "1007"],
    note: "Flagged, not guessed.",
  },
  chart: {
    title: "Order amount by order date",
    description: "Five clean orders plotted by date. Bar values are available on hover or keyboard focus.",
    dateAxis: "Order date",
    amountAxis: "Amount ($)",
    amountLabel: "Amount",
    currencyUnit: "dollars",
    ticks: [0, 50, 100, 150, 200, 250],
  },
  summary: "8 rows in · 5 loaded · 1 duplicate removed · 2 quarantined",
  tabsLabel: "Raw to ready stages",
} satisfies RawToReadyConfig;

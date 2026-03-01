import { QueryResult } from "@/lib/query-engine/types";

export type AlertOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

export function extractValue(
  result: QueryResult,
  valueSource: string
): number | null {
  if (result.rows.length === 0) return null;

  if (valueSource === "row_count") {
    return result.rowCount;
  }

  if (valueSource === "first_row_first_col") {
    const firstRow = result.rows[0];
    const firstCol = result.columns[0]?.name;
    if (!firstCol) return null;
    const val = firstRow[firstCol];
    return typeof val === "number" ? val : parseFloat(String(val));
  }

  // Treat valueSource as a column name — get value from first row
  const val = result.rows[0][valueSource];
  if (val === undefined || val === null) return null;
  return typeof val === "number" ? val : parseFloat(String(val));
}

export function evaluateCondition(
  value: number,
  operator: AlertOperator,
  threshold: number
): boolean {
  switch (operator) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    case "neq":
      return value !== threshold;
    default:
      return false;
  }
}

export function formatOperator(operator: AlertOperator): string {
  const labels: Record<AlertOperator, string> = {
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    eq: "=",
    neq: "!=",
  };
  return labels[operator] || operator;
}

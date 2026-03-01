const NUMERIC_TYPES = [
  "integer",
  "int",
  "int4",
  "int8",
  "bigint",
  "smallint",
  "float",
  "float4",
  "float8",
  "double",
  "decimal",
  "numeric",
  "real",
  "number",
];

const DATE_TYPES = [
  "date",
  "datetime",
  "timestamp",
  "timestamptz",
  "time",
  "timetz",
];

function isNumeric(type: string): boolean {
  return NUMERIC_TYPES.some((t) => type.toLowerCase().includes(t));
}

function isDate(type: string): boolean {
  return DATE_TYPES.some((t) => type.toLowerCase().includes(t));
}

interface Column {
  name: string;
  type: string;
}

export interface ChartSuggestion {
  chartType: "bar" | "line" | "area" | "pie" | "scatter" | "number" | "table";
  xAxis?: string;
  yAxis?: string;
  confidence: "high" | "medium" | "low";
  label: string;
}

export function suggestChart(
  columns: Column[],
  rowCount: number
): ChartSuggestion {
  const numericCols = columns.filter((c) => isNumeric(c.type));
  const dateCols = columns.filter((c) => isDate(c.type));
  const categoryCols = columns.filter(
    (c) => !isNumeric(c.type) && !isDate(c.type)
  );

  // Single value: number display
  if (rowCount === 1 && numericCols.length === 1 && columns.length <= 2) {
    return {
      chartType: "number",
      yAxis: numericCols[0].name,
      confidence: "high",
      label: "Number",
    };
  }

  // Date + numeric: line chart
  if (dateCols.length >= 1 && numericCols.length >= 1) {
    return {
      chartType: "line",
      xAxis: dateCols[0].name,
      yAxis: numericCols[0].name,
      confidence: "high",
      label: "Line Chart",
    };
  }

  // Category + numeric: bar chart
  if (categoryCols.length >= 1 && numericCols.length >= 1) {
    // If few distinct rows, pie might work too — but bar is safer default
    return {
      chartType: "bar",
      xAxis: categoryCols[0].name,
      yAxis: numericCols[0].name,
      confidence: "high",
      label: "Bar Chart",
    };
  }

  // Two numeric columns: scatter
  if (numericCols.length >= 2 && categoryCols.length === 0) {
    return {
      chartType: "scatter",
      xAxis: numericCols[0].name,
      yAxis: numericCols[1].name,
      confidence: "medium",
      label: "Scatter Plot",
    };
  }

  // Only numeric columns with 1 category-like first column
  if (numericCols.length >= 1 && columns.length >= 2) {
    return {
      chartType: "bar",
      xAxis: columns[0].name,
      yAxis: numericCols[0].name,
      confidence: "low",
      label: "Bar Chart",
    };
  }

  return {
    chartType: "table",
    confidence: "low",
    label: "Table",
  };
}

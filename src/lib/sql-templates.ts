export interface SqlTemplate {
  id: string;
  name: string;
  description: string;
  category: "basic" | "aggregation" | "join" | "advanced";
  sql: string;
}

export const SQL_TEMPLATES: SqlTemplate[] = [
  // Basic
  {
    id: "select-all",
    name: "Select All",
    description: "Select all columns from a table",
    category: "basic",
    sql: `SELECT *
FROM table_name
LIMIT 100;`,
  },
  {
    id: "select-columns",
    name: "Select Columns",
    description: "Select specific columns from a table",
    category: "basic",
    sql: `SELECT column1, column2, column3
FROM table_name
WHERE condition = 'value'
ORDER BY column1
LIMIT 100;`,
  },
  {
    id: "select-distinct",
    name: "Select Distinct",
    description: "Select unique values from a column",
    category: "basic",
    sql: `SELECT DISTINCT column_name
FROM table_name
ORDER BY column_name;`,
  },
  {
    id: "where-clause",
    name: "Where Conditions",
    description: "Filter rows with multiple conditions",
    category: "basic",
    sql: `SELECT *
FROM table_name
WHERE column1 = 'value'
  AND column2 > 100
  AND column3 IS NOT NULL
LIMIT 100;`,
  },
  {
    id: "like-pattern",
    name: "Pattern Matching",
    description: "Search with LIKE patterns",
    category: "basic",
    sql: `SELECT *
FROM table_name
WHERE column_name LIKE '%search_term%'
ORDER BY column_name
LIMIT 100;`,
  },

  // Aggregation
  {
    id: "count-rows",
    name: "Count Rows",
    description: "Count total rows in a table",
    category: "aggregation",
    sql: `SELECT COUNT(*) AS total_rows
FROM table_name;`,
  },
  {
    id: "group-by",
    name: "Group By",
    description: "Group and aggregate data",
    category: "aggregation",
    sql: `SELECT
  category_column,
  COUNT(*) AS count,
  SUM(amount_column) AS total,
  AVG(amount_column) AS average
FROM table_name
GROUP BY category_column
ORDER BY count DESC;`,
  },
  {
    id: "having-clause",
    name: "Having Clause",
    description: "Filter aggregated results",
    category: "aggregation",
    sql: `SELECT
  category_column,
  COUNT(*) AS count,
  SUM(amount_column) AS total
FROM table_name
GROUP BY category_column
HAVING COUNT(*) > 10
ORDER BY total DESC;`,
  },
  {
    id: "date-aggregation",
    name: "Date Aggregation",
    description: "Aggregate data by date",
    category: "aggregation",
    sql: `SELECT
  DATE(created_at) AS date,
  COUNT(*) AS count,
  SUM(amount) AS total
FROM table_name
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;`,
  },

  // Joins
  {
    id: "inner-join",
    name: "Inner Join",
    description: "Join two tables on matching values",
    category: "join",
    sql: `SELECT
  a.column1,
  a.column2,
  b.column3,
  b.column4
FROM table_a a
INNER JOIN table_b b ON a.id = b.a_id
LIMIT 100;`,
  },
  {
    id: "left-join",
    name: "Left Join",
    description: "Include all rows from left table",
    category: "join",
    sql: `SELECT
  a.column1,
  a.column2,
  b.column3,
  b.column4
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id
LIMIT 100;`,
  },
  {
    id: "multi-join",
    name: "Multiple Joins",
    description: "Join three or more tables",
    category: "join",
    sql: `SELECT
  a.column1,
  b.column2,
  c.column3
FROM table_a a
INNER JOIN table_b b ON a.id = b.a_id
INNER JOIN table_c c ON b.id = c.b_id
WHERE a.status = 'active'
LIMIT 100;`,
  },

  // Advanced
  {
    id: "cte",
    name: "Common Table Expression (CTE)",
    description: "Use WITH clause for complex queries",
    category: "advanced",
    sql: `WITH filtered_data AS (
  SELECT *
  FROM table_name
  WHERE status = 'active'
),
aggregated AS (
  SELECT
    category,
    COUNT(*) AS count,
    SUM(amount) AS total
  FROM filtered_data
  GROUP BY category
)
SELECT *
FROM aggregated
WHERE count > 5
ORDER BY total DESC;`,
  },
  {
    id: "subquery",
    name: "Subquery",
    description: "Use nested SELECT statements",
    category: "advanced",
    sql: `SELECT *
FROM table_name
WHERE id IN (
  SELECT foreign_id
  FROM other_table
  WHERE condition = 'value'
)
LIMIT 100;`,
  },
  {
    id: "case-when",
    name: "Case When",
    description: "Conditional logic in SELECT",
    category: "advanced",
    sql: `SELECT
  column1,
  column2,
  CASE
    WHEN amount > 1000 THEN 'High'
    WHEN amount > 100 THEN 'Medium'
    ELSE 'Low'
  END AS category
FROM table_name
LIMIT 100;`,
  },
  {
    id: "window-function",
    name: "Window Function",
    description: "Calculate running totals and rankings",
    category: "advanced",
    sql: `SELECT
  column1,
  column2,
  amount,
  SUM(amount) OVER (ORDER BY created_at) AS running_total,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY amount DESC) AS rank
FROM table_name
ORDER BY created_at
LIMIT 100;`,
  },
  {
    id: "union",
    name: "Union",
    description: "Combine results from multiple queries",
    category: "advanced",
    sql: `SELECT column1, column2, 'source_a' AS source
FROM table_a
WHERE condition = 'value'

UNION ALL

SELECT column1, column2, 'source_b' AS source
FROM table_b
WHERE condition = 'value'

ORDER BY column1
LIMIT 100;`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "basic", name: "Basic Queries" },
  { id: "aggregation", name: "Aggregations" },
  { id: "join", name: "Joins" },
  { id: "advanced", name: "Advanced" },
] as const;

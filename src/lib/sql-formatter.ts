/**
 * Simple SQL formatter that adds proper indentation and line breaks
 * For a production app, consider using the 'sql-formatter' package
 */

export function formatSQL(sql: string): string {
  if (!sql.trim()) return sql;

  // Keywords that should start on a new line
  const newLineKeywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "ORDER BY",
    "GROUP BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "OUTER JOIN",
    "JOIN",
    "ON",
    "UNION",
    "UNION ALL",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "WITH",
  ];

  // Normalize whitespace
  let formatted = sql.replace(/\s+/g, " ").trim();

  // Add newlines before major keywords
  newLineKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\s+${keyword}\\s+`, "gi");
    formatted = formatted.replace(regex, `\n${keyword} `);
  });

  // Handle SELECT columns - add newline after SELECT and before FROM
  formatted = formatted.replace(/^SELECT\s+/i, "SELECT\n  ");
  formatted = formatted.replace(/,\s*/g, ",\n  ");

  // Fix double newlines
  formatted = formatted.replace(/\n\s*\n/g, "\n");

  // Indent continuation lines
  const lines = formatted.split("\n");
  const indentedLines: string[] = [];
  let indentLevel = 0;

  const increaseIndentKeywords = ["SELECT", "WITH", "("];
  const decreaseIndentKeywords = [")"];
  const zeroIndentKeywords = ["FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET", "UNION"];

  for (let line of lines) {
    const trimmed = line.trim();
    const upperTrimmed = trimmed.toUpperCase();

    // Check for indent decrease
    if (decreaseIndentKeywords.some((k) => upperTrimmed.startsWith(k))) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Check for zero indent (main clauses)
    const isMainClause = zeroIndentKeywords.some((k) => upperTrimmed.startsWith(k));

    // Apply indentation
    const indent = isMainClause ? "" : "  ".repeat(indentLevel);
    indentedLines.push(indent + trimmed);

    // Check for indent increase
    if (increaseIndentKeywords.some((k) => upperTrimmed.startsWith(k))) {
      indentLevel++;
    }

    // Count parentheses for sub-query indentation
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    indentLevel += openParens - closeParens;
    indentLevel = Math.max(0, indentLevel);
  }

  return indentedLines.join("\n");
}

/**
 * Minify SQL by removing extra whitespace and newlines
 */
export function minifySQL(sql: string): string {
  return sql
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Extract table names from SQL query
 */
export function extractTableNames(sql: string): string[] {
  const tables: string[] = [];

  // Match FROM and JOIN clauses
  const fromRegex = /(?:FROM|JOIN)\s+(["`]?[\w.]+["`]?)/gi;
  let match;

  while ((match = fromRegex.exec(sql)) !== null) {
    const tableName = match[1].replace(/["`]/g, "");
    if (!tables.includes(tableName)) {
      tables.push(tableName);
    }
  }

  return tables;
}

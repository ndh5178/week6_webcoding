function normalizeOutput(rawOutput) {
  return rawOutput
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "db >" && line !== "Bye.");
}

function stripPromptPrefix(line) {
  if (line.startsWith("db > ")) {
    return line.slice(5);
  }
  return line;
}

function inferQueryType(query) {
  const upper = query.trim().toUpperCase();
  if (upper.startsWith("INSERT")) {
    return "INSERT";
  }
  if (upper.startsWith("SELECT")) {
    return "SELECT";
  }
  return "UNKNOWN";
}

function buildParseTree(query) {
  const type = inferQueryType(query);
  const trimmed = query.trim();

  if (type === "INSERT") {
    const match = trimmed.match(/^INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s+VALUES\s*\((.*)\)\s*;?$/i);
    if (!match) {
      return { type: "INSERT", children: [] };
    }

    const table = match[1];
    const values = splitValues(match[2]);

    return {
      type: "INSERT",
      children: [
        { type: "INTO", value: table },
        {
          type: "VALUES",
          children: values.map((value) => ({ type: "VALUE", value }))
        }
      ]
    };
  }

  if (type === "SELECT") {
    const match = trimmed.match(/^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+WHERE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?))?\s*;?$/i);
    if (!match) {
      return { type: "SELECT", children: [] };
    }

    const columns = match[1].trim();
    const table = match[2].trim();
    const whereColumn = match[3] ? match[3].trim() : "";
    const whereValue = match[4] ? cleanupValue(match[4].trim()) : "";

    const children = [
      { type: "COLUMNS", value: columns },
      { type: "FROM", value: table }
    ];

    if (whereColumn) {
      children.push({
        type: "WHERE",
        children: [
          { type: "COLUMN", value: whereColumn },
          { type: "VALUE", value: whereValue }
        ]
      });
    }

    return {
      type: "SELECT",
      children
    };
  }

  return null;
}

function splitValues(valueList) {
  return valueList
    .split(",")
    .map((value) => cleanupValue(value.trim()))
    .filter(Boolean);
}

function cleanupValue(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function parseRowLine(line) {
  const cleaned = stripPromptPrefix(line);
  const match = cleaned.match(/^\((.*)\)$/);

  if (!match) {
    return null;
  }

  const values = match[1].split(",").map((value) => value.trim());
  return values;
}

function inferRowObject(query, values) {
  const type = inferQueryType(query);

  if (type === "SELECT") {
    const match = query.trim().match(/^SELECT\s+(.+?)\s+FROM/i);
    if (!match) {
      return values;
    }

    const columnsToken = match[1].trim();
    const columns = columnsToken === "*"
      ? ["id", "author", "content"]
      : columnsToken.split(",").map((column) => column.trim());

    const row = {};
    columns.forEach((column, index) => {
      row[column] = values[index] ?? "";
    });
    return row;
  }

  return values;
}

function buildResponsePayload(query, rawOutput) {
  const lines = normalizeOutput(rawOutput).map(stripPromptPrefix);
  const rowLines = lines.filter((line) => line.startsWith("(") && line.endsWith(")"));
  const errorLine = lines.find((line) => line.startsWith("Error:"));
  const messageLine = [...lines].reverse().find((line) => !line.startsWith("(")) || "";

  if (errorLine) {
    return {
      success: false,
      queryType: inferQueryType(query),
      message: errorLine,
      parseTree: buildParseTree(query),
      rows: [],
      rawOutput
    };
  }

  const rows = rowLines
    .map(parseRowLine)
    .filter(Boolean)
    .map((values) => inferRowObject(query, values));

  return {
    success: true,
    queryType: inferQueryType(query),
    message: messageLine || "Executed.",
    parseTree: buildParseTree(query),
    rows,
    rawOutput
  };
}

module.exports = {
  buildResponsePayload
};

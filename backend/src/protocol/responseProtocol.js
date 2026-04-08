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

function skipSpaces(text, startIndex) {
  let index = startIndex;

  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }

  return index;
}

function readIdentifier(text, startIndex) {
  let index = skipSpaces(text, startIndex);

  if (!/[A-Za-z_]/.test(text[index] ?? "")) {
    return null;
  }

  const begin = index;
  index += 1;

  while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) {
    index += 1;
  }

  return {
    value: text.slice(begin, index),
    nextIndex: index,
  };
}

function readValueToken(text, startIndex) {
  let index = skipSpaces(text, startIndex);

  if (index >= text.length) {
    return null;
  }

  if (text[index] === "'" || text[index] === "\"") {
    const quote = text[index];
    const begin = index;

    index += 1;

    while (index < text.length && text[index] !== quote) {
      index += 1;
    }

    if (index >= text.length) {
      return null;
    }

    index += 1;

    return {
      value: cleanupValue(text.slice(begin, index)),
      nextIndex: index,
    };
  }

  const begin = index;

  while (index < text.length && !/\s/.test(text[index])) {
    index += 1;
  }

  if (begin === index) {
    return null;
  }

  return {
    value: cleanupValue(text.slice(begin, index)),
    nextIndex: index,
  };
}

function readWhereJoin(text, startIndex) {
  const index = skipSpaces(text, startIndex);
  const rest = text.slice(index);
  const match = rest.match(/^(AND|OR)\b/i);

  if (!match) {
    return null;
  }

  return {
    value: match[1].toUpperCase(),
    nextIndex: index + match[0].length,
  };
}

function parseWhereCondition(text, startIndex) {
  const columnToken = readIdentifier(text, startIndex);
  if (!columnToken) {
    return null;
  }

  let index = skipSpaces(text, columnToken.nextIndex);
  if (text[index] !== "=") {
    return null;
  }

  index += 1;

  const valueToken = readValueToken(text, index);
  if (!valueToken) {
    return null;
  }

  return {
    condition: {
      column: columnToken.value,
      value: valueToken.value,
    },
    nextIndex: valueToken.nextIndex,
  };
}

function parseWhereExpression(whereClause) {
  const conditions = [];
  const joins = [];
  let index = 0;

  const firstCondition = parseWhereCondition(whereClause, index);
  if (!firstCondition) {
    return null;
  }

  conditions.push(firstCondition.condition);
  index = firstCondition.nextIndex;

  while (true) {
    const joinToken = readWhereJoin(whereClause, index);
    if (!joinToken) {
      break;
    }

    joins.push(joinToken.value);
    index = joinToken.nextIndex;

    const nextCondition = parseWhereCondition(whereClause, index);
    if (!nextCondition) {
      return null;
    }

    conditions.push(nextCondition.condition);
    index = nextCondition.nextIndex;
  }

  index = skipSpaces(whereClause, index);

  if (index !== whereClause.length) {
    return null;
  }

  return { conditions, joins };
}

function buildWhereConditionNode(condition) {
  return {
    type: "CONDITION",
    children: [
      { type: "COLUMN", value: condition.column },
      { type: "VALUE", value: condition.value },
    ],
  };
}

function buildWhereTree(whereClause) {
  const expression = parseWhereExpression(whereClause);

  if (!expression || expression.conditions.length === 0) {
    return {
      type: "WHERE",
      value: whereClause,
    };
  }

  if (expression.conditions.length === 1) {
    return {
      type: "WHERE",
      children: [
        { type: "COLUMN", value: expression.conditions[0].column },
        { type: "VALUE", value: expression.conditions[0].value },
      ],
    };
  }

  let currentNode = buildWhereConditionNode(expression.conditions[0]);
  const orGroups = [];

  expression.joins.forEach((join, index) => {
    const nextNode = buildWhereConditionNode(expression.conditions[index + 1]);

    if (join === "AND") {
      currentNode = {
        type: "AND",
        children: [currentNode, nextNode],
      };
      return;
    }

    orGroups.push(currentNode);
    currentNode = nextNode;
  });

  orGroups.push(currentNode);

  return {
    type: "WHERE",
    children: [
      orGroups.reduce((accumulator, node) => {
        if (accumulator === null) {
          return node;
        }

        return {
          type: "OR",
          children: [accumulator, node],
        };
      }, null),
    ],
  };
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
    const match = trimmed.match(/^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+WHERE\s+(.+?))?\s*;?$/i);
    if (!match) {
      return { type: "SELECT", children: [] };
    }

    const columns = match[1].trim();
    const table = match[2].trim();
    const whereClause = match[3] ? match[3].trim() : "";

    const children = [
      { type: "COLUMNS", value: columns },
      { type: "FROM", value: table }
    ];

    if (whereClause) {
      children.push(buildWhereTree(whereClause));
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
    const match = query
      .trim()
      .match(/^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i);
    if (!match) {
      return values;
    }

    const columnsToken = match[1].trim();
    const tableName = match[2].trim().toLowerCase();
    const defaultColumnsByTable = {
      profiles: ["name", "mbti", "hobby"],
    };
    const columns = columnsToken === "*"
      ? (defaultColumnsByTable[tableName] ?? values.map((_, index) => `column${index + 1}`))
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

#include "parser.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    const char *cursor;
} Parser;

static void set_error(char *error, int error_size, const char *message) {
    if (error != NULL && error_size > 0) {
        snprintf(error, (size_t)error_size, "%s", message);
    }
}

static void skip_spaces(Parser *parser) {
    while (*parser->cursor != '\0' && isspace((unsigned char)*parser->cursor)) {
        parser->cursor++;
    }
}

static int is_ident_char(char ch) {
    return isalnum((unsigned char)ch) || ch == '_';
}

static int match_keyword(Parser *parser, const char *keyword) {
    const char *start = parser->cursor;

    while (*keyword != '\0') {
        if (toupper((unsigned char)*start) != toupper((unsigned char)*keyword)) {
            return 0;
        }
        start++;
        keyword++;
    }

    if (is_ident_char(*start)) {
        return 0;
    }

    parser->cursor = start;
    return 1;
}

static int expect_keyword(Parser *parser, const char *keyword, char *error, int error_size) {
    skip_spaces(parser);
    if (!match_keyword(parser, keyword)) {
        set_error(error, error_size, "Expected SQL keyword");
        return 0;
    }
    return 1;
}

static int expect_char(Parser *parser, char expected, char *error, int error_size) {
    skip_spaces(parser);
    if (*parser->cursor != expected) {
        set_error(error, error_size, "Expected punctuation");
        return 0;
    }
    parser->cursor++;
    return 1;
}

static int parse_identifier(Parser *parser, char *buffer, int buffer_size, char *error, int error_size) {
    int index = 0;

    skip_spaces(parser);
    if (!isalpha((unsigned char)*parser->cursor) && *parser->cursor != '_') {
        set_error(error, error_size, "Expected identifier");
        return 0;
    }

    while (is_ident_char(*parser->cursor)) {
        if (index >= buffer_size - 1) {
            set_error(error, error_size, "Identifier too long");
            return 0;
        }
        buffer[index++] = *parser->cursor;
        parser->cursor++;
    }

    buffer[index] = '\0';
    return 1;
}

static int parse_value(Parser *parser, char *buffer, int buffer_size, char *error, int error_size) {
    int index = 0;

    skip_spaces(parser);

    if (*parser->cursor == '\'' || *parser->cursor == '"') {
        char quote = *parser->cursor++;
        while (*parser->cursor != '\0' && *parser->cursor != quote) {
            if (index >= buffer_size - 1) {
                set_error(error, error_size, "Value too long");
                return 0;
            }
            buffer[index++] = *parser->cursor;
            parser->cursor++;
        }

        if (*parser->cursor != quote) {
            set_error(error, error_size, "Missing closing quote");
            return 0;
        }

        parser->cursor++;
    } else {
        while (*parser->cursor != '\0' &&
               *parser->cursor != ',' &&
               *parser->cursor != ')' &&
               *parser->cursor != ';' &&
               !isspace((unsigned char)*parser->cursor)) {
            if (index >= buffer_size - 1) {
                set_error(error, error_size, "Value too long");
                return 0;
            }
            buffer[index++] = *parser->cursor;
            parser->cursor++;
        }
    }

    if (index == 0) {
        set_error(error, error_size, "Expected value");
        return 0;
    }

    buffer[index] = '\0';
    return 1;
}

static int parse_value_list(Parser *parser, Statement *statement, char *error, int error_size) {
    statement->value_count = 0;

    while (1) {
        if (statement->value_count >= MAX_COLUMNS) {
            set_error(error, error_size, "Too many values");
            return 0;
        }

        if (!parse_value(parser, statement->values[statement->value_count], MAX_VALUE_LEN, error, error_size)) {
            return 0;
        }

        statement->value_count++;
        skip_spaces(parser);

        if (*parser->cursor != ',') {
            break;
        }

        parser->cursor++;
    }

    return 1;
}

static int parse_identifier_list(Parser *parser, Statement *statement, char *error, int error_size) {
    statement->selected_column_count = 0;

    while (1) {
        if (statement->selected_column_count >= MAX_COLUMNS) {
            set_error(error, error_size, "Too many columns");
            return 0;
        }

        if (!parse_identifier(parser,
                              statement->selected_columns[statement->selected_column_count],
                              MAX_COLUMN_NAME,
                              error,
                              error_size)) {
            return 0;
        }

        statement->selected_column_count++;
        skip_spaces(parser);

        if (*parser->cursor != ',') {
            break;
        }

        parser->cursor++;
    }

    return 1;
}

static int parse_insert(Parser *parser, Statement *statement, char *error, int error_size) {
    statement->type = STMT_INSERT;

    if (!expect_keyword(parser, "INTO", error, error_size)) {
        return 0;
    }

    if (!parse_identifier(parser, statement->table_name, MAX_TABLE_NAME, error, error_size)) {
        return 0;
    }

    if (!expect_keyword(parser, "VALUES", error, error_size)) {
        return 0;
    }

    if (!expect_char(parser, '(', error, error_size)) {
        return 0;
    }

    if (!parse_value_list(parser, statement, error, error_size)) {
        return 0;
    }

    if (!expect_char(parser, ')', error, error_size)) {
        return 0;
    }

    return 1;
}

static int parse_where_clause(Parser *parser, Statement *statement, char *error, int error_size) {
    statement->where.has_where = 0;
    skip_spaces(parser);

    if (!match_keyword(parser, "WHERE")) {
        return 1;
    }

    statement->where.has_where = 1;

    if (!parse_identifier(parser, statement->where.column, MAX_COLUMN_NAME, error, error_size)) {
        return 0;
    }

    if (!expect_char(parser, '=', error, error_size)) {
        return 0;
    }

    if (!parse_value(parser, statement->where.value, MAX_VALUE_LEN, error, error_size)) {
        return 0;
    }

    return 1;
}

static int parse_select(Parser *parser, Statement *statement, char *error, int error_size) {
    statement->type = STMT_SELECT;
    statement->select_all = 0;

    skip_spaces(parser);

    if (*parser->cursor == '*') {
        statement->select_all = 1;
        parser->cursor++;
    } else {
        if (!parse_identifier_list(parser, statement, error, error_size)) {
            return 0;
        }
    }

    if (!expect_keyword(parser, "FROM", error, error_size)) {
        return 0;
    }

    if (!parse_identifier(parser, statement->table_name, MAX_TABLE_NAME, error, error_size)) {
        return 0;
    }

    if (!parse_where_clause(parser, statement, error, error_size)) {
        return 0;
    }

    return 1;
}

static int parse_end(Parser *parser, char *error, int error_size) {
    skip_spaces(parser);

    if (*parser->cursor == ';') {
        parser->cursor++;
    }

    skip_spaces(parser);
    if (*parser->cursor != '\0') {
        set_error(error, error_size, "Unexpected trailing characters");
        return 0;
    }

    return 1;
}

int parse_sql(const char *input, Statement *statement, char *error, int error_size) {
    Parser parser;

    memset(statement, 0, sizeof(*statement));
    parser.cursor = input;

    skip_spaces(&parser);

    if (match_keyword(&parser, "INSERT")) {
        if (!parse_insert(&parser, statement, error, error_size)) {
            return 0;
        }
    } else if (match_keyword(&parser, "SELECT")) {
        if (!parse_select(&parser, statement, error, error_size)) {
            return 0;
        }
    } else {
        set_error(error, error_size, "Only INSERT and SELECT are supported");
        return 0;
    }

    return parse_end(&parser, error, error_size);
}

const char *statement_type_name(StatementType type) {
    switch (type) {
        case STMT_INSERT:
            return "INSERT";
        case STMT_SELECT:
            return "SELECT";
        default:
            return "UNKNOWN";
    }
}

#ifndef PARSER_H
#define PARSER_H

#include "schema.h"

#define MAX_VALUE_LEN 256
#define MAX_ERROR_LEN 256

typedef enum {
    STMT_INSERT,
    STMT_SELECT
} StatementType;

typedef struct {
    int has_where;
    char column[MAX_COLUMN_NAME];
    char value[MAX_VALUE_LEN];
} WhereClause;

typedef struct {
    StatementType type;
    char table_name[MAX_TABLE_NAME];
    int value_count;
    char values[MAX_COLUMNS][MAX_VALUE_LEN];
    int selected_column_count;
    char selected_columns[MAX_COLUMNS][MAX_COLUMN_NAME];
    int select_all;
    WhereClause where;
} Statement;

int parse_sql(const char *input, Statement *statement, char *error, int error_size);
const char *statement_type_name(StatementType type);

#endif

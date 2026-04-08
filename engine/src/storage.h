#ifndef STORAGE_H
#define STORAGE_H

#include "parser.h"
#include <stddef.h>

#define DATA_DIR "engine/data"
#define MAX_ROWS 1024

typedef struct {
    char values[MAX_COLUMNS][MAX_VALUE_LEN];
} DataRow;

typedef struct {
    DataRow rows[MAX_ROWS];
    int count;
} QueryResult;

int storage_insert_row(const TableSchema *schema, const Statement *statement, char *error, int error_size);
int storage_select_rows(const TableSchema *schema, const Statement *statement, QueryResult *result, char *error, int error_size);
int storage_ensure_table(const TableSchema *schema, char *error, int error_size);
int schema_column_index(const TableSchema *schema, const char *column_name);

#endif

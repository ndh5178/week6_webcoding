#include "storage.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#ifdef _WIN32
#include <direct.h>
#define mkdir(path) _mkdir(path)
#endif

static void set_error(char *error, int error_size, const char *message) {
    if (error != NULL && error_size > 0) {
        snprintf(error, (size_t)error_size, "%s", message);
    }
}

static void get_table_path(const TableSchema *schema, char *buffer, size_t buffer_size) {
    snprintf(buffer, buffer_size, "%s/%s.csv", DATA_DIR, schema->name);
}

static int ensure_data_dir(char *error, int error_size) {
    struct stat info;

    if (stat(DATA_DIR, &info) == 0) {
        return 1;
    }

    if (mkdir(DATA_DIR, 0755) != 0) {
        set_error(error, error_size, strerror(errno));
        return 0;
    }

    return 1;
}

int schema_column_index(const TableSchema *schema, const char *column_name) {
    int index;

    for (index = 0; index < schema->column_count; index++) {
        if (strcmp(schema->columns[index], column_name) == 0) {
            return index;
        }
    }

    return -1;
}

int storage_ensure_table(const TableSchema *schema, char *error, int error_size) {
    char path[512];
    FILE *file;
    int index;

    if (!ensure_data_dir(error, error_size)) {
        return 0;
    }

    get_table_path(schema, path, sizeof(path));
    file = fopen(path, "r");

    if (file != NULL) {
        fclose(file);
        return 1;
    }

    file = fopen(path, "w");
    if (file == NULL) {
        set_error(error, error_size, "Failed to create table file");
        return 0;
    }

    for (index = 0; index < schema->column_count; index++) {
        fprintf(file, "%s", schema->columns[index]);
        if (index + 1 < schema->column_count) {
            fputc(',', file);
        }
    }
    fputc('\n', file);

    fclose(file);
    return 1;
}

static int parse_csv_line(const char *line, DataRow *row, int expected_count) {
    char buffer[1024];
    char *token;
    int index = 0;

    strncpy(buffer, line, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';

    token = strtok(buffer, ",\r\n");
    while (token != NULL && index < expected_count) {
        strncpy(row->values[index], token, MAX_VALUE_LEN - 1);
        row->values[index][MAX_VALUE_LEN - 1] = '\0';
        index++;
        token = strtok(NULL, ",\r\n");
    }

    return index == expected_count;
}

static int row_matches_where(const TableSchema *schema, const Statement *statement, const DataRow *row) {
    int index;

    if (!statement->where.has_where) {
        return 1;
    }

    index = schema_column_index(schema, statement->where.column);
    if (index < 0) {
        return 0;
    }

    return strcmp(row->values[index], statement->where.value) == 0;
}

int storage_insert_row(const TableSchema *schema, const Statement *statement, char *error, int error_size) {
    char path[512];
    FILE *file;
    int index;

    if (statement->value_count != schema->column_count) {
        set_error(error, error_size, "Value count does not match schema");
        return 0;
    }

    if (!storage_ensure_table(schema, error, error_size)) {
        return 0;
    }

    get_table_path(schema, path, sizeof(path));
    file = fopen(path, "a");

    if (file == NULL) {
        set_error(error, error_size, "Failed to open table file");
        return 0;
    }

    for (index = 0; index < statement->value_count; index++) {
        fprintf(file, "%s", statement->values[index]);
        if (index + 1 < statement->value_count) {
            fputc(',', file);
        }
    }
    fputc('\n', file);

    fclose(file);
    return 1;
}

int storage_select_rows(const TableSchema *schema, const Statement *statement, QueryResult *result, char *error, int error_size) {
    char path[512];
    FILE *file;
    char line[1024];

    result->count = 0;

    if (!storage_ensure_table(schema, error, error_size)) {
        return 0;
    }

    if (statement->where.has_where && schema_column_index(schema, statement->where.column) < 0) {
        set_error(error, error_size, "WHERE column not found in schema");
        return 0;
    }

    get_table_path(schema, path, sizeof(path));
    file = fopen(path, "r");

    if (file == NULL) {
        set_error(error, error_size, "Failed to open table file");
        return 0;
    }

    if (fgets(line, sizeof(line), file) == NULL) {
        fclose(file);
        return 1;
    }

    while (fgets(line, sizeof(line), file) != NULL && result->count < MAX_ROWS) {
        DataRow row;

        if (!parse_csv_line(line, &row, schema->column_count)) {
            continue;
        }

        if (row_matches_where(schema, statement, &row)) {
            result->rows[result->count++] = row;
        }
    }

    fclose(file);
    return 1;
}

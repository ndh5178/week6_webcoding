#ifndef SCHEMA_H
#define SCHEMA_H

#define MAX_TABLE_NAME 64
#define MAX_COLUMNS 8
#define MAX_COLUMN_NAME 64

typedef struct {
    const char *name;
    int column_count;
    const char *columns[MAX_COLUMNS];
} TableSchema;

const TableSchema *find_schema(const char *table_name);

#endif

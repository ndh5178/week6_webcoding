#ifndef EXECUTOR_H
#define EXECUTOR_H

#include "storage.h"

typedef struct {
    int success;
    char message[MAX_ERROR_LEN];
    QueryResult result;
    const TableSchema *schema;
} ExecutionOutput;

int execute_statement(const Statement *statement, ExecutionOutput *output);

#endif

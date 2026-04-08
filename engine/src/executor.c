#include "executor.h"

#include <stdio.h>
#include <string.h>

static void set_message(ExecutionOutput *output, const char *message) {
    snprintf(output->message, sizeof(output->message), "%s", message);
}

int execute_statement(const Statement *statement, ExecutionOutput *output) {
    const TableSchema *schema;
    int index;

    memset(output, 0, sizeof(*output));

    schema = find_schema(statement->table_name);
    if (schema == NULL) {
        set_message(output, "Table schema not found");
        return 0;
    }

    output->schema = schema;

    if (statement->type == STMT_INSERT) {
        if (!storage_insert_row(schema, statement, output->message, (int)sizeof(output->message))) {
            return 0;
        }
        output->success = 1;
        set_message(output, "Executed.");
        return 1;
    }

    if (statement->type == STMT_SELECT) {
        if (!statement->select_all) {
            for (index = 0; index < statement->selected_column_count; index++) {
                if (schema_column_index(schema, statement->selected_columns[index]) < 0) {
                    set_message(output, "Selected column not found in schema");
                    return 0;
                }
            }
        }

        if (!storage_select_rows(schema, statement, &output->result, output->message, (int)sizeof(output->message))) {
            return 0;
        }
        output->success = 1;
        set_message(output, "Executed.");
        return 1;
    }

    set_message(output, "Unsupported statement type");
    return 0;
}

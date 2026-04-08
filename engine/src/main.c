#include "executor.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_INPUT_LEN 2048

static void print_banner(void) {
    puts(" ██████╗██╗   ██╗██████╗ ██╗██████╗     ███████╗ ██████╗ ██╗     ");
    puts("██╔════╝██║   ██║██╔══██╗██║██╔══██╗    ██╔════╝██╔═══██╗██║     ");
    puts("██║     ██║   ██║██████╔╝██║██║  ██║    ███████╗██║   ██║██║     ");
    puts("██║     ██║   ██║██╔═══╝ ██║██║  ██║    ╚════██║██║▄▄ ██║██║     ");
    puts("╚██████╗╚██████╔╝██║     ██║██████╔╝    ███████║╚██████╔╝███████╗");
    puts(" ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝     ╚══════╝ ╚══▀▀═╝ ╚══════╝");
    puts("");
}

static void trim_newline(char *text) {
    size_t length = strlen(text);
    while (length > 0 && (text[length - 1] == '\n' || text[length - 1] == '\r')) {
        text[length - 1] = '\0';
        length--;
    }
}

static void print_select_result(const Statement *statement, const ExecutionOutput *output) {
    int row_index;
    int column_index;

    for (row_index = 0; row_index < output->result.count; row_index++) {
        printf("(");

        if (statement->select_all) {
            for (column_index = 0; column_index < output->schema->column_count; column_index++) {
                printf("%s", output->result.rows[row_index].values[column_index]);
                if (column_index + 1 < output->schema->column_count) {
                    printf(", ");
                }
            }
        } else {
            for (column_index = 0; column_index < statement->selected_column_count; column_index++) {
                int schema_index = schema_column_index(output->schema, statement->selected_columns[column_index]);
                if (schema_index >= 0) {
                    printf("%s", output->result.rows[row_index].values[schema_index]);
                } else {
                    printf("NULL");
                }

                if (column_index + 1 < statement->selected_column_count) {
                    printf(", ");
                }
            }
        }

        printf(")\n");
    }
}

static void run_query(const char *query) {
    Statement statement;
    ExecutionOutput *output;
    char error[MAX_ERROR_LEN];

    output = (ExecutionOutput *)malloc(sizeof(*output));
    if (output == NULL) {
        printf("Error: out of memory\n");
        return;
    }

    if (!parse_sql(query, &statement, error, (int)sizeof(error))) {
        printf("Error: %s\n", error);
        free(output);
        return;
    }

    if (!execute_statement(&statement, output)) {
        printf("Error: %s\n", output->message);
        free(output);
        return;
    }

    if (statement.type == STMT_SELECT) {
        print_select_result(&statement, output);
    }

    printf("%s\n", output->message);
    free(output);
}

static void run_repl(void) {
    char input[MAX_INPUT_LEN];

    print_banner();

    while (1) {
        printf("db > ");
        fflush(stdout);

        if (fgets(input, sizeof(input), stdin) == NULL) {
            break;
        }

        trim_newline(input);

        if (strcmp(input, ".exit") == 0 || strcmp(input, "quit") == 0) {
            printf("Bye.\n");
            break;
        }

        if (input[0] == '\0') {
            continue;
        }

        run_query(input);
    }
}

static void run_file(const char *path) {
    FILE *file = fopen(path, "r");
    char line[MAX_INPUT_LEN];

    if (file == NULL) {
        fprintf(stderr, "Error: failed to open %s\n", path);
        exit(1);
    }

    while (fgets(line, sizeof(line), file) != NULL) {
        trim_newline(line);
        if (line[0] == '\0') {
            continue;
        }

        printf("db > %s\n", line);
        run_query(line);
    }

    fclose(file);
}

int main(int argc, char *argv[]) {
    if (argc >= 2) {
        run_file(argv[1]);
        return 0;
    }

    run_repl();
    return 0;
}

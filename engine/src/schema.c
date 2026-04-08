#include "schema.h"

#include <string.h>

/*
 * Change this registry first when the service domain changes.
 * Example:
 *   profiles -> people
 *   mbti     -> personality
 *   hobby    -> interest
 */
static const TableSchema SCHEMAS[] = {
    { "profiles", 3, { "name", "mbti", "hobby" } },
    { NULL, 0, { NULL } }
};

const TableSchema *find_schema(const char *table_name) {
    int index = 0;

    while (SCHEMAS[index].name != NULL) {
        if (strcmp(SCHEMAS[index].name, table_name) == 0) {
            return &SCHEMAS[index];
        }
        index++;
    }

    return NULL;
}

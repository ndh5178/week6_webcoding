#include "schema.h"

#include <string.h>

/*
 * Change this registry first when the service domain changes.
 * Example:
 *   comments -> posts
 *   author   -> nickname
 *   content  -> message
 */
static const TableSchema SCHEMAS[] = {
    { "comments", 3, { "id", "author", "content" } },
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

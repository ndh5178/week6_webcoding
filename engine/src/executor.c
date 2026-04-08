/**
 * ============================================
 *  SQL Executor - 구현
 * ============================================
 *
 * Statement를 받아 storage 함수를 호출하여 실행
 *
 * INSERT → storage_insert()
 * SELECT → storage_select_all() 또는 storage_select_where()
 */

#include <stdio.h>
#include <string.h>
#include "executor.h"
#include "storage.h"

/**
 * Row를 화면에 출력
 * 형식: (id, username, email)
 */
static void print_row(const Row *row) {
    printf("(%d, %s, %s)\n", row->id, row->username, row->email);
}

/* ─── INSERT 실행 ─── */
static ExecuteResult execute_insert(const Statement *stmt) {
    int result = storage_insert(stmt->table_name, &stmt->row);

    switch (result) {
        case 0:  return EXECUTE_SUCCESS;
        case 1:  return EXECUTE_DUPLICATE_KEY;
        default: return EXECUTE_FILE_ERROR;
    }
}

/* ─── SELECT 실행 ─── */
static ExecuteResult execute_select(const Statement *stmt) {
    RowSet results;

    int rc;
    if (stmt->where.has_where) {
        rc = storage_select_where(stmt->table_name, stmt->where.column,
                                  stmt->where.value, &results);
    } else {
        rc = storage_select_all(stmt->table_name, &results);
    }

    if (rc != 0) return EXECUTE_FILE_ERROR;

    /* 결과 출력 */
    for (int i = 0; i < results.count; i++) {
        print_row(&results.rows[i]);
    }

    return EXECUTE_SUCCESS;
}

/* ─── 공개 함수 ─── */

ExecuteResult execute_statement(const Statement *stmt) {
    switch (stmt->type) {
        case STMT_INSERT:
            return execute_insert(stmt);
        case STMT_SELECT:
            return execute_select(stmt);
        default:
            return EXECUTE_TABLE_NOT_FOUND;
    }
}

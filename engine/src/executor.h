/**
 * ============================================
 *  SQL Executor - 헤더
 * ============================================
 *
 * 파싱된 Statement를 실행합니다.
 *   INSERT → storage에 행(Row) 추가
 *   SELECT → storage에서 행 읽어서 출력
 */

#ifndef EXECUTOR_H
#define EXECUTOR_H

#include "parser.h"

/* ─── 실행 결과 코드 ─── */
typedef enum {
    EXECUTE_SUCCESS,
    EXECUTE_TABLE_NOT_FOUND,
    EXECUTE_DUPLICATE_KEY,
    EXECUTE_FILE_ERROR,
    EXECUTE_NO_RESULTS
} ExecuteResult;

/**
 * Statement를 실행
 *
 * @param stmt  파싱된 Statement
 * @return      실행 결과 코드
 */
ExecuteResult execute_statement(const Statement *stmt);

#endif /* EXECUTOR_H */

/**
 * ============================================
 *  File-based Storage - 헤더
 * ============================================
 *
 * 파일 기반 DB 저장소
 * 각 테이블 = 하나의 CSV 파일 (data/<table_name>.csv)
 *
 * 파일 포맷:
 *   첫 줄: 헤더 (id,username,email)
 *   나머지: 데이터 행
 *
 * 예시 (data/users.csv):
 *   id,username,email
 *   1,user1,user1@email.com
 *   2,user2,user2@email.com
 */

#ifndef STORAGE_H
#define STORAGE_H

#include "parser.h"

#define MAX_ROWS     1000
#define DATA_DIR     "data"

/* ─── 조회 결과 ─── */
typedef struct {
    Row rows[MAX_ROWS];
    int count;
} RowSet;

/**
 * 테이블 파일이 존재하는지 확인, 없으면 생성
 *
 * @param table_name  테이블 이름
 * @return            0 성공, -1 실패
 */
int storage_ensure_table(const char *table_name);

/**
 * 행(Row)을 테이블에 추가 (INSERT)
 *
 * @param table_name  테이블 이름
 * @param row         추가할 행
 * @return            0 성공, 1 중복키, -1 파일 에러
 */
int storage_insert(const char *table_name, const Row *row);

/**
 * 테이블의 모든 행 조회 (SELECT)
 *
 * @param table_name  테이블 이름
 * @param result      조회 결과를 저장할 RowSet
 * @return            0 성공, -1 파일 에러
 */
int storage_select_all(const char *table_name, RowSet *result);

/**
 * 조건에 맞는 행 조회 (SELECT ... WHERE)
 *
 * @param table_name  테이블 이름
 * @param column      조건 컬럼명 (id, username, email)
 * @param value       조건 값
 * @param result      조회 결과를 저장할 RowSet
 * @return            0 성공, -1 파일 에러
 */
int storage_select_where(const char *table_name, const char *column,
                         const char *value, RowSet *result);

/**
 * 특정 ID가 이미 존재하는지 확인
 *
 * @param table_name  테이블 이름
 * @param id          확인할 ID
 * @return            1 존재, 0 없음, -1 에러
 */
int storage_id_exists(const char *table_name, int32_t id);

#endif /* STORAGE_H */

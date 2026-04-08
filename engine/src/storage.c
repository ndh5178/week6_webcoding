/**
 * ============================================
 *  File-based Storage - 구현
 * ============================================
 *
 * CSV 파일 기반 DB 저장소
 *
 * 파일 경로: data/<table_name>.csv
 * 포맷: id,username,email (첫 줄 헤더)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <errno.h>
#include "storage.h"

/* ─── 유틸리티 ─── */

/**
 * 테이블 파일 경로 생성
 * 예: "users" → "data/users.csv"
 */
static void get_filepath(const char *table_name, char *path, size_t path_size) {
    snprintf(path, path_size, "%s/%s.csv", DATA_DIR, table_name);
}

/**
 * CSV 한 줄에서 Row 파싱
 * "1,user1,user1@email.com" → Row { id=1, username="user1", email="user1@email.com" }
 */
static int parse_csv_line(const char *line, Row *row) {
    /* 줄 복사 (strtok이 원본을 수정하므로) */
    char buf[1024];
    strncpy(buf, line, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';

    /* 줄바꿈 제거 */
    size_t len = strlen(buf);
    if (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) buf[--len] = '\0';
    if (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) buf[--len] = '\0';

    /* 필드 분리 */
    char *id_str = strtok(buf, ",");
    char *username = strtok(NULL, ",");
    char *email = strtok(NULL, ",\n\r");

    if (!id_str || !username || !email) return -1;

    row->id = atoi(id_str);
    strncpy(row->username, username, MAX_USERNAME);
    row->username[MAX_USERNAME] = '\0';
    strncpy(row->email, email, MAX_EMAIL);
    row->email[MAX_EMAIL] = '\0';

    return 0;
}

/* ─── 공개 함수 ─── */

int storage_ensure_table(const char *table_name) {
    /* data 디렉토리 생성 */
    struct stat st = {0};
    if (stat(DATA_DIR, &st) == -1) {
        if (mkdir(DATA_DIR, 0755) != 0) {
            fprintf(stderr, "Error: Cannot create directory '%s': %s\n",
                    DATA_DIR, strerror(errno));
            return -1;
        }
    }

    /* 파일이 없으면 헤더만 있는 파일 생성 */
    char path[512];
    get_filepath(table_name, path, sizeof(path));

    FILE *fp = fopen(path, "r");
    if (fp) {
        fclose(fp);
        return 0;  /* 이미 존재 */
    }

    fp = fopen(path, "w");
    if (!fp) {
        fprintf(stderr, "Error: Cannot create file '%s': %s\n",
                path, strerror(errno));
        return -1;
    }

    fprintf(fp, "id,username,email\n");
    fclose(fp);
    return 0;
}

int storage_insert(const char *table_name, const Row *row) {
    /* 테이블 파일 확보 */
    if (storage_ensure_table(table_name) != 0) return -1;

    /* 중복키 확인 */
    if (storage_id_exists(table_name, row->id) == 1) return 1;

    /* 파일 끝에 추가 */
    char path[512];
    get_filepath(table_name, path, sizeof(path));

    FILE *fp = fopen(path, "a");
    if (!fp) return -1;

    fprintf(fp, "%d,%s,%s\n", row->id, row->username, row->email);
    fclose(fp);

    return 0;
}

int storage_select_all(const char *table_name, RowSet *result) {
    result->count = 0;

    if (storage_ensure_table(table_name) != 0) return -1;

    char path[512];
    get_filepath(table_name, path, sizeof(path));

    FILE *fp = fopen(path, "r");
    if (!fp) return -1;

    char line[1024];

    /* 헤더 건너뛰기 */
    if (!fgets(line, sizeof(line), fp)) {
        fclose(fp);
        return 0;
    }

    /* 데이터 행 읽기 */
    while (fgets(line, sizeof(line), fp) && result->count < MAX_ROWS) {
        if (line[0] == '\n' || line[0] == '\r' || line[0] == '\0') continue;

        if (parse_csv_line(line, &result->rows[result->count]) == 0) {
            result->count++;
        }
    }

    fclose(fp);
    return 0;
}

int storage_select_where(const char *table_name, const char *column,
                         const char *value, RowSet *result) {
    /* 먼저 전체 조회 */
    RowSet all;
    if (storage_select_all(table_name, &all) != 0) return -1;

    result->count = 0;

    for (int i = 0; i < all.count && result->count < MAX_ROWS; i++) {
        int match = 0;
        Row *r = &all.rows[i];

        if (strcasecmp(column, "id") == 0) {
            match = (r->id == atoi(value));
        } else if (strcasecmp(column, "username") == 0) {
            match = (strcmp(r->username, value) == 0);
        } else if (strcasecmp(column, "email") == 0) {
            match = (strcmp(r->email, value) == 0);
        }

        if (match) {
            result->rows[result->count++] = *r;
        }
    }

    return 0;
}

int storage_id_exists(const char *table_name, int32_t id) {
    char path[512];
    get_filepath(table_name, path, sizeof(path));

    FILE *fp = fopen(path, "r");
    if (!fp) return -1;

    char line[1024];

    /* 헤더 건너뛰기 */
    if (!fgets(line, sizeof(line), fp)) {
        fclose(fp);
        return 0;
    }

    while (fgets(line, sizeof(line), fp)) {
        Row row;
        if (parse_csv_line(line, &row) == 0 && row.id == id) {
            fclose(fp);
            return 1;  /* 존재 */
        }
    }

    fclose(fp);
    return 0;  /* 없음 */
}

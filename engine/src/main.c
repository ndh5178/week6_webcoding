/**
 * ============================================
 *  Cupid SQL Processor - 메인 진입점
 * ============================================
 *
 * 크래프톤 정글 WEEK6 - SQL 처리기
 *
 * 사용법:
 *   ./db                    → 대화형 CLI 모드
 *   ./db input.sql          → SQL 파일 실행 모드
 *
 * 지원 SQL:
 *   INSERT INTO <table> VALUES (<v1>, <v2>, ...);
 *   SELECT FROM <table>;
 *   SELECT FROM <table> WHERE <col> = <val>;
 *
 * 아키텍처:
 *   main.c      → CLI 루프 + 파일 입력
 *   parser.c    → SQL 토크나이징 + 파싱
 *   executor.c  → INSERT/SELECT 실행
 *   storage.c   → 파일 기반 DB 읽기/쓰기
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "executor.h"

#define MAX_INPUT 4096

/* ─── 대화형 CLI 모드 ─── */
static void run_repl(void) {
    char input[MAX_INPUT];

    printf("db > ");
    fflush(stdout);

    while (fgets(input, sizeof(input), stdin)) {
        /* 줄바꿈 제거 */
        size_t len = strlen(input);
        if (len > 0 && input[len - 1] == '\n') {
            input[len - 1] = '\0';
        }

        /* 빈 입력 무시 */
        if (input[0] == '\0') {
            printf("db > ");
            fflush(stdout);
            continue;
        }

        /* 종료 명령 */
        if (strcmp(input, ".exit") == 0 || strcmp(input, "quit") == 0) {
            printf("Bye.\n");
            break;
        }

        /* SQL 파싱 */
        Statement stmt;
        ParseResult result = parse_sql(input, &stmt);

        if (result != PARSE_OK) {
            print_parse_error(result, input);
            printf("db > ");
            fflush(stdout);
            continue;
        }

        /* SQL 실행 */
        ExecuteResult exec_result = execute_statement(&stmt);

        switch (exec_result) {
            case EXECUTE_SUCCESS:
                printf("Executed.\n");
                break;
            case EXECUTE_TABLE_NOT_FOUND:
                printf("Error: Table '%s' not found.\n", stmt.table_name);
                break;
            case EXECUTE_DUPLICATE_KEY:
                printf("Error: Duplicate key '%d'.\n", stmt.row.id);
                break;
            case EXECUTE_FILE_ERROR:
                printf("Error: File I/O error.\n");
                break;
            case EXECUTE_NO_RESULTS:
                printf("No results found.\n");
                break;
            default:
                printf("Error: Unknown execution error.\n");
                break;
        }

        printf("db > ");
        fflush(stdout);
    }
}

/* ─── SQL 파일 실행 모드 ─── */
static void run_file(const char *filename) {
    FILE *fp = fopen(filename, "r");
    if (!fp) {
        fprintf(stderr, "Error: Cannot open file '%s'\n", filename);
        exit(1);
    }

    char line[MAX_INPUT];
    int line_no = 0;

    while (fgets(line, sizeof(line), fp)) {
        line_no++;

        /* 줄바꿈 제거 */
        size_t len = strlen(line);
        if (len > 0 && line[len - 1] == '\n') {
            line[len - 1] = '\0';
        }

        /* 빈 줄, 주석 무시 */
        if (line[0] == '\0' || line[0] == '#' || (line[0] == '-' && line[1] == '-')) {
            continue;
        }

        printf("db > %s\n", line);

        Statement stmt;
        ParseResult result = parse_sql(line, &stmt);

        if (result != PARSE_OK) {
            fprintf(stderr, "[line %d] ", line_no);
            print_parse_error(result, line);
            continue;
        }

        ExecuteResult exec_result = execute_statement(&stmt);

        switch (exec_result) {
            case EXECUTE_SUCCESS:
                printf("Executed.\n");
                break;
            case EXECUTE_TABLE_NOT_FOUND:
                printf("Error: Table '%s' not found.\n", stmt.table_name);
                break;
            case EXECUTE_DUPLICATE_KEY:
                printf("Error: Duplicate key '%d'.\n", stmt.row.id);
                break;
            case EXECUTE_FILE_ERROR:
                printf("Error: File I/O error.\n");
                break;
            case EXECUTE_NO_RESULTS:
                printf("No results found.\n");
                break;
            default:
                printf("Error: Unknown execution error.\n");
                break;
        }
    }

    fclose(fp);
}

/* ─── main ─── */
int main(int argc, char *argv[]) {
    if (argc >= 2) {
        /* 파일 모드: ./db input.sql */
        run_file(argv[1]);
    } else {
        /* 대화형 CLI 모드: ./db */
        run_repl();
    }

    return 0;
}

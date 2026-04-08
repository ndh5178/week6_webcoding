/**
 * ============================================
 *  SQL Parser - 구현
 * ============================================
 *
 * 2단계 파싱:
 *   1단계: 토크나이저 (문자열 → 토큰 배열)
 *   2단계: 파서 (토큰 배열 → Statement 구조체)
 *
 * 지원 문법:
 *   insert into <table> values (<id>, <name>, <email>);
 *   insert <id> <name> <email>         ← 간편 문법
 *   select from <table>;
 *   select from <table> where <col> = <val>;
 *   select                              ← 간편 문법 (기본 테이블)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "parser.h"

/* 기본 테이블 이름 (간편 문법용) */
#define DEFAULT_TABLE "users"

/* ─── 키워드 목록 ─── */
static const char *KEYWORDS[] = {
    "INSERT", "INTO", "VALUES", "SELECT", "FROM", "WHERE", NULL
};

static int is_keyword(const char *word) {
    char upper[MAX_VAL_STR + 1];
    size_t i;
    for (i = 0; word[i] && i < MAX_VAL_STR; i++) {
        upper[i] = toupper((unsigned char)word[i]);
    }
    upper[i] = '\0';

    for (int k = 0; KEYWORDS[k]; k++) {
        if (strcmp(upper, KEYWORDS[k]) == 0) return 1;
    }
    return 0;
}

/* ─── 1단계: 토크나이저 ─── */

/**
 * SQL 문자열을 토큰 배열로 분리
 * 반환: 토큰 개수
 */
static int tokenize(const char *input, Token tokens[], int max_tokens) {
    int count = 0;
    const char *p = input;

    while (*p && count < max_tokens - 1) {
        /* 공백 건너뛰기 */
        while (*p && isspace((unsigned char)*p)) p++;
        if (!*p) break;

        Token *t = &tokens[count];

        /* 특수 문자 */
        if (*p == '(') { t->type = TOKEN_LPAREN;    strcpy(t->value, "("); p++; count++; continue; }
        if (*p == ')') { t->type = TOKEN_RPAREN;    strcpy(t->value, ")"); p++; count++; continue; }
        if (*p == ',') { t->type = TOKEN_COMMA;     strcpy(t->value, ","); p++; count++; continue; }
        if (*p == '=') { t->type = TOKEN_EQUALS;    strcpy(t->value, "="); p++; count++; continue; }
        if (*p == ';') { t->type = TOKEN_SEMICOLON; strcpy(t->value, ";"); p++; count++; continue; }
        if (*p == '*') { t->type = TOKEN_STAR;      strcpy(t->value, "*"); p++; count++; continue; }

        /* 숫자 (음수 포함) */
        if (isdigit((unsigned char)*p) || (*p == '-' && isdigit((unsigned char)*(p + 1)))) {
            int len = 0;
            if (*p == '-') t->value[len++] = *p++;
            while (*p && isdigit((unsigned char)*p) && len < MAX_VAL_STR) {
                t->value[len++] = *p++;
            }
            t->value[len] = '\0';
            t->type = TOKEN_NUMBER;
            count++;
            continue;
        }

        /* 따옴표 문자열 ('...' 또는 "...") */
        if (*p == '\'' || *p == '"') {
            char quote = *p++;
            int len = 0;
            while (*p && *p != quote && len < MAX_VAL_STR) {
                t->value[len++] = *p++;
            }
            t->value[len] = '\0';
            if (*p == quote) p++;   /* 닫는 따옴표 건너뛰기 */
            t->type = TOKEN_STRING;
            count++;
            continue;
        }

        /* 일반 단어 (키워드 또는 식별자) */
        if (isalpha((unsigned char)*p) || *p == '_') {
            int len = 0;
            while (*p && (isalnum((unsigned char)*p) || *p == '_' || *p == '.' || *p == '@') && len < MAX_VAL_STR) {
                t->value[len++] = *p++;
            }
            t->value[len] = '\0';

            if (is_keyword(t->value)) {
                /* 키워드는 대문자로 정규화 */
                for (int i = 0; t->value[i]; i++) {
                    t->value[i] = toupper((unsigned char)t->value[i]);
                }
                t->type = TOKEN_KEYWORD;
            } else {
                t->type = TOKEN_IDENT;
            }
            count++;
            continue;
        }

        /* 알 수 없는 문자 → 건너뛰기 */
        p++;
    }

    /* EOF 토큰 */
    tokens[count].type = TOKEN_EOF;
    tokens[count].value[0] = '\0';

    return count;
}

/* ─── 2단계: 파서 ─── */

/**
 * 토큰이 특정 키워드인지 확인
 */
static int is_token_keyword(const Token *t, const char *kw) {
    return t->type == TOKEN_KEYWORD && strcmp(t->value, kw) == 0;
}

/**
 * INSERT 문 파싱
 *
 * 정식 문법:
 *   INSERT INTO <table> VALUES (<id>, <name>, <email>);
 *
 * 간편 문법 (예시처럼):
 *   insert <id> <name> <email>
 */
static ParseResult parse_insert(Token tokens[], int count, Statement *stmt) {
    stmt->type = STMT_INSERT;
    int pos = 1;  /* INSERT 다음부터 */

    /* INTO 키워드 확인 */
    if (pos < count && is_token_keyword(&tokens[pos], "INTO")) {
        pos++;

        /* 테이블 이름 */
        if (pos >= count || (tokens[pos].type != TOKEN_IDENT && tokens[pos].type != TOKEN_STRING)) {
            return PARSE_MISSING_TABLE;
        }
        strncpy(stmt->table_name, tokens[pos].value, MAX_TABLE_NAME);
        pos++;

        /* VALUES 키워드 */
        if (pos >= count || !is_token_keyword(&tokens[pos], "VALUES")) {
            return PARSE_MISSING_VALUES;
        }
        pos++;

        /* 여는 괄호 */
        if (pos >= count || tokens[pos].type != TOKEN_LPAREN) {
            return PARSE_MISSING_PAREN;
        }
        pos++;

        /* 값 1: id (숫자) */
        if (pos >= count || tokens[pos].type != TOKEN_NUMBER) {
            return PARSE_INVALID_ID;
        }
        stmt->row.id = atoi(tokens[pos].value);
        pos++;

        /* 콤마 */
        if (pos < count && tokens[pos].type == TOKEN_COMMA) pos++;

        /* 값 2: username */
        if (pos >= count) return PARSE_TOO_FEW_VALUES;
        if (tokens[pos].type == TOKEN_STRING || tokens[pos].type == TOKEN_IDENT || tokens[pos].type == TOKEN_NUMBER) {
            strncpy(stmt->row.username, tokens[pos].value, MAX_USERNAME);
        } else {
            return PARSE_TOO_FEW_VALUES;
        }
        pos++;

        /* 콤마 */
        if (pos < count && tokens[pos].type == TOKEN_COMMA) pos++;

        /* 값 3: email */
        if (pos >= count) return PARSE_TOO_FEW_VALUES;
        if (tokens[pos].type == TOKEN_STRING || tokens[pos].type == TOKEN_IDENT || tokens[pos].type == TOKEN_NUMBER) {
            strncpy(stmt->row.email, tokens[pos].value, MAX_EMAIL);
        } else {
            return PARSE_TOO_FEW_VALUES;
        }
        pos++;

        /* 닫는 괄호 (있으면 OK, 없어도 OK) */
        /* 세미콜론도 선택적 */

    } else {
        /* ─── 간편 문법: insert <id> <name> <email> ─── */
        strcpy(stmt->table_name, DEFAULT_TABLE);

        /* id */
        if (pos >= count || tokens[pos].type != TOKEN_NUMBER) {
            return PARSE_INVALID_ID;
        }
        stmt->row.id = atoi(tokens[pos].value);
        pos++;

        /* username */
        if (pos >= count) return PARSE_TOO_FEW_VALUES;
        strncpy(stmt->row.username, tokens[pos].value, MAX_USERNAME);
        pos++;

        /* email */
        if (pos >= count) return PARSE_TOO_FEW_VALUES;
        strncpy(stmt->row.email, tokens[pos].value, MAX_EMAIL);
    }

    return PARSE_OK;
}

/**
 * SELECT 문 파싱
 *
 * 정식 문법:
 *   SELECT FROM <table>;
 *   SELECT * FROM <table>;
 *   SELECT FROM <table> WHERE <col> = <val>;
 *
 * 간편 문법:
 *   select
 */
static ParseResult parse_select(Token tokens[], int count, Statement *stmt) {
    stmt->type = STMT_SELECT;
    stmt->where.has_where = 0;
    int pos = 1;  /* SELECT 다음부터 */

    /* 간편 문법: "select" 만 입력 */
    if (pos >= count || tokens[pos].type == TOKEN_SEMICOLON || tokens[pos].type == TOKEN_EOF) {
        strcpy(stmt->table_name, DEFAULT_TABLE);
        return PARSE_OK;
    }

    /* * (선택적) */
    if (tokens[pos].type == TOKEN_STAR) {
        pos++;
    }

    /* FROM 키워드 */
    if (pos < count && is_token_keyword(&tokens[pos], "FROM")) {
        pos++;

        /* 테이블 이름 */
        if (pos >= count || (tokens[pos].type != TOKEN_IDENT && tokens[pos].type != TOKEN_STRING)) {
            return PARSE_MISSING_TABLE;
        }
        strncpy(stmt->table_name, tokens[pos].value, MAX_TABLE_NAME);
        pos++;
    } else {
        /* FROM 없으면 기본 테이블 */
        strcpy(stmt->table_name, DEFAULT_TABLE);
    }

    /* WHERE 절 (선택적) */
    if (pos < count && is_token_keyword(&tokens[pos], "WHERE")) {
        pos++;
        stmt->where.has_where = 1;

        /* 컬럼명 */
        if (pos >= count || (tokens[pos].type != TOKEN_IDENT && tokens[pos].type != TOKEN_KEYWORD)) {
            return PARSE_WHERE_SYNTAX;
        }
        strncpy(stmt->where.column, tokens[pos].value, MAX_COL_NAME);
        pos++;

        /* = */
        if (pos >= count || tokens[pos].type != TOKEN_EQUALS) {
            return PARSE_WHERE_SYNTAX;
        }
        pos++;

        /* 값 */
        if (pos >= count) {
            return PARSE_WHERE_SYNTAX;
        }
        strncpy(stmt->where.value, tokens[pos].value, MAX_VAL_STR);
    }

    return PARSE_OK;
}

/* ─── 공개 함수 ─── */

ParseResult parse_sql(const char *input, Statement *stmt) {
    /* 초기화 */
    memset(stmt, 0, sizeof(Statement));

    /* 토크나이징 */
    Token tokens[MAX_TOKENS];
    int count = tokenize(input, tokens, MAX_TOKENS);

    if (count == 0) {
        return PARSE_UNRECOGNIZED;
    }

    /* 첫 번째 토큰으로 문장 타입 결정 */
    if (is_token_keyword(&tokens[0], "INSERT")) {
        return parse_insert(tokens, count, stmt);
    }
    if (is_token_keyword(&tokens[0], "SELECT")) {
        return parse_select(tokens, count, stmt);
    }

    return PARSE_UNRECOGNIZED;
}

void print_parse_error(ParseResult result, const char *input) {
    switch (result) {
        case PARSE_UNRECOGNIZED:
            printf("Error: Unrecognized command '%s'.\n", input);
            printf("  Supported: INSERT, SELECT\n");
            break;
        case PARSE_SYNTAX_ERROR:
            printf("Syntax error near '%s'.\n", input);
            break;
        case PARSE_MISSING_TABLE:
            printf("Error: Missing table name.\n");
            break;
        case PARSE_MISSING_VALUES:
            printf("Error: Missing VALUES keyword.\n");
            printf("  Usage: INSERT INTO <table> VALUES (<id>, <name>, <email>);\n");
            break;
        case PARSE_INVALID_ID:
            printf("Error: Invalid ID (must be a number).\n");
            break;
        case PARSE_STRING_TOO_LONG:
            printf("Error: String too long.\n");
            break;
        case PARSE_MISSING_PAREN:
            printf("Error: Missing parenthesis.\n");
            printf("  Usage: INSERT INTO <table> VALUES (<id>, <name>, <email>);\n");
            break;
        case PARSE_TOO_FEW_VALUES:
            printf("Error: Too few values. Expected: id, username, email.\n");
            break;
        case PARSE_WHERE_SYNTAX:
            printf("Error: Invalid WHERE clause.\n");
            printf("  Usage: SELECT FROM <table> WHERE <column> = <value>;\n");
            break;
        default:
            printf("Error: Unknown parse error.\n");
            break;
    }
}

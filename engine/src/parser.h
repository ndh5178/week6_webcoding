/**
 * ============================================
 *  SQL Parser - 헤더
 * ============================================
 *
 * SQL 문장을 토크나이징하고 파싱하여
 * Statement 구조체로 변환합니다.
 *
 * 지원 문법:
 *   INSERT INTO <table> VALUES (<id>, <username>, <email>);
 *   SELECT FROM <table>;
 *   SELECT FROM <table> WHERE <col> = <val>;
 *
 * 핵심 흐름:
 *   입력 문자열 → 토크나이저 → 토큰 배열 → 파서 → Statement 구조체
 */

#ifndef PARSER_H
#define PARSER_H

#include <stdint.h>

/* ─── 상수 ─── */
#define MAX_TABLE_NAME  64
#define MAX_USERNAME    255
#define MAX_EMAIL       255
#define MAX_COL_NAME    64
#define MAX_VAL_STR     255
#define MAX_TOKENS      64

/* ─── SQL 문장 타입 ─── */
typedef enum {
    STMT_INSERT,
    STMT_SELECT
} StatementType;

/* ─── 행(Row) 데이터 ─── */
typedef struct {
    int32_t id;
    char    username[MAX_USERNAME + 1];
    char    email[MAX_EMAIL + 1];
} Row;

/* ─── WHERE 절 ─── */
typedef struct {
    int  has_where;         /* WHERE 절 존재 여부 */
    char column[MAX_COL_NAME + 1];
    char value[MAX_VAL_STR + 1];
} WhereClause;

/* ─── 파싱된 SQL 문장 ─── */
typedef struct {
    StatementType type;
    char          table_name[MAX_TABLE_NAME + 1];
    Row           row;          /* INSERT용 */
    WhereClause   where;        /* SELECT WHERE용 */
} Statement;

/* ─── 파싱 결과 코드 ─── */
typedef enum {
    PARSE_OK,
    PARSE_UNRECOGNIZED,       /* 알 수 없는 명령어 */
    PARSE_SYNTAX_ERROR,       /* 문법 오류 */
    PARSE_MISSING_TABLE,      /* 테이블 이름 누락 */
    PARSE_MISSING_VALUES,     /* VALUES 키워드 누락 */
    PARSE_INVALID_ID,         /* ID가 숫자가 아님 */
    PARSE_STRING_TOO_LONG,    /* 문자열 길이 초과 */
    PARSE_MISSING_PAREN,      /* 괄호 누락 */
    PARSE_TOO_FEW_VALUES,     /* 값 개수 부족 */
    PARSE_WHERE_SYNTAX        /* WHERE 절 문법 오류 */
} ParseResult;

/* ─── 토큰 타입 ─── */
typedef enum {
    TOKEN_KEYWORD,    /* INSERT, INTO, VALUES, SELECT, FROM, WHERE */
    TOKEN_IDENT,      /* 테이블명, 컬럼명 */
    TOKEN_NUMBER,     /* 숫자 */
    TOKEN_STRING,     /* 문자열 (따옴표 없이) */
    TOKEN_LPAREN,     /* ( */
    TOKEN_RPAREN,     /* ) */
    TOKEN_COMMA,      /* , */
    TOKEN_EQUALS,     /* = */
    TOKEN_SEMICOLON,  /* ; */
    TOKEN_STAR,       /* * */
    TOKEN_EOF
} TokenType;

typedef struct {
    TokenType type;
    char      value[MAX_VAL_STR + 1];
} Token;

/* ─── 공개 함수 ─── */

/**
 * SQL 문자열을 파싱하여 Statement 구조체에 저장
 *
 * @param input  SQL 입력 문자열
 * @param stmt   파싱 결과를 저장할 Statement 포인터
 * @return       파싱 결과 코드
 */
ParseResult parse_sql(const char *input, Statement *stmt);

/**
 * 파싱 에러 메시지 출력
 */
void print_parse_error(ParseResult result, const char *input);

#endif /* PARSER_H */

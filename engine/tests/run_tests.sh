#!/bin/bash
# ============================================
#  Cupid SQL Processor - 자동 테스트
# ============================================
#
# 사용법: cd engine && bash tests/run_tests.sh

set -e

DB="./db"
PASS=0
FAIL=0
TOTAL=0

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 테스트용 고유 ID (충돌 방지)
BASE_ID=9000

# 테스트 실행 함수
run_test() {
    local test_name="$1"
    local input="$2"
    local expected="$3"
    TOTAL=$((TOTAL + 1))

    actual=$(echo "$input" | $DB 2>&1 | sed 's/db > //g' | tr -s '\n' | sed '/^$/d')

    if echo "$actual" | grep -q "$expected"; then
        echo -e "  ${GREEN}✅ PASS${NC}: $test_name"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $test_name"
        echo -e "    Expected to contain: ${YELLOW}$expected${NC}"
        echo -e "    Actual: $actual"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "============================================"
echo " Cupid SQL Processor - Test Suite"
echo "============================================"
echo ""

# ─── 테스트 1: 기본 INSERT + SELECT ───
echo "▸ Test Group 1: Basic INSERT & SELECT"

ID1=$((BASE_ID + 1))
ID2=$((BASE_ID + 2))

run_test "INSERT 간편 문법" \
    "insert $ID1 testuser1 test1@email.com
.exit" \
    "Executed."

run_test "SELECT에 삽입된 데이터 포함" \
    "select
.exit" \
    "($ID1, testuser1, test1@email.com)"

run_test "INSERT 두 번째 행" \
    "insert $ID2 testuser2 test2@email.com
.exit" \
    "Executed."

run_test "SELECT 다중 행 확인" \
    "select
.exit" \
    "($ID2, testuser2, test2@email.com)"

echo ""

# ─── 테스트 2: 정식 SQL 문법 ───
echo "▸ Test Group 2: Standard SQL Syntax"

ID3=$((BASE_ID + 3))

run_test "INSERT INTO ... VALUES ..." \
    "INSERT INTO users VALUES ($ID3, 'stduser', 'std@email.com');
.exit" \
    "Executed."

run_test "SELECT * FROM users" \
    "SELECT * FROM users;
.exit" \
    "($ID3, stduser, std@email.com)"

run_test "SELECT FROM users" \
    "SELECT FROM users;
.exit" \
    "($ID1, testuser1, test1@email.com)"

echo ""

# ─── 테스트 3: WHERE 절 ───
echo "▸ Test Group 3: WHERE Clause"

run_test "SELECT WHERE username = ..." \
    "SELECT FROM users WHERE username = testuser1;
.exit" \
    "($ID1, testuser1, test1@email.com)"

run_test "SELECT WHERE id = ..." \
    "SELECT FROM users WHERE id = $ID2;
.exit" \
    "($ID2, testuser2, test2@email.com)"

run_test "SELECT WHERE email = ..." \
    "SELECT FROM users WHERE email = std@email.com;
.exit" \
    "($ID3, stduser, std@email.com)"

echo ""

# ─── 테스트 4: 에러 처리 ───
echo "▸ Test Group 4: Error Handling"

run_test "중복 키 에러" \
    "insert $ID1 duplicate dup@email.com
.exit" \
    "Duplicate key"

run_test "알 수 없는 명령어" \
    "DELETE FROM users;
.exit" \
    "Unrecognized command"

run_test "INSERT 값 부족" \
    "insert 99999
.exit" \
    "Too few values"

echo ""

# ─── 테스트 5: .sql 파일 실행 ───
echo "▸ Test Group 5: SQL File Execution"

ID5=$((BASE_ID + 50))
cat > tests/sample.sql << SQLEOF
-- 테스트 SQL 파일
INSERT INTO users VALUES ($ID5, 'fileuser', 'file@test.com');
SELECT FROM users WHERE id = $ID5;
SQLEOF

actual=$(./db tests/sample.sql 2>&1)
TOTAL=$((TOTAL + 1))
if echo "$actual" | grep -q "($ID5, fileuser, file@test.com)"; then
    echo -e "  ${GREEN}✅ PASS${NC}: SQL 파일 실행"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}❌ FAIL${NC}: SQL 파일 실행"
    echo -e "    Actual: $actual"
    FAIL=$((FAIL + 1))
fi

echo ""

# ─── 테스트 6: 과제 예시 재현 ───
echo "▸ Test Group 6: Assignment Example (과제 예시 재현)"

ID6A=$((BASE_ID + 100))
ID6B=$((BASE_ID + 101))
ID6C=$((BASE_ID + 102))

actual=$(printf "insert $ID6A auser1 a1@email.com\ninsert $ID6B auser2 a2@email.com\nselect\ninsert $ID6C auser3 a3@email.com\nselect\n.exit\n" | ./db 2>&1)

TOTAL=$((TOTAL + 1))
if echo "$actual" | grep -q "($ID6C, auser3, a3@email.com)"; then
    echo -e "  ${GREEN}✅ PASS${NC}: 과제 시나리오 (insert→select→insert→select)"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}❌ FAIL${NC}: 과제 시나리오"
    echo -e "    Actual: $actual"
    FAIL=$((FAIL + 1))
fi

echo ""

# ─── 결과 요약 ───
echo "============================================"
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${TOTAL} total"
echo "============================================"
echo ""

if [ $FAIL -gt 0 ]; then
    exit 1
fi

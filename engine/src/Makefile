# ============================================
#  Cupid SQL Processor - Makefile
# ============================================
#
# 사용법:
#   make          → 컴파일 (./db 생성)
#   make test     → 자동 테스트 실행
#   make clean    → 빌드 파일 정리
#   make run      → 대화형 CLI 실행

CC = gcc
CFLAGS = -Wall -Wextra -O2
TARGET = ../db

SRCS = main.c parser.c executor.c storage.c
OBJS = $(SRCS:.c=.o)

# ─── 빌드 ───
all: $(TARGET)
	@echo ""
	@echo "✅ 빌드 완료: $(TARGET)"
	@echo "   실행: $(TARGET) 또는 make run"
	@echo "   테스트: make test"

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# ─── 의존성 ───
main.o: main.c parser.h executor.h
parser.o: parser.c parser.h
executor.o: executor.c executor.h storage.h parser.h
storage.o: storage.c storage.h parser.h

# ─── 실행 ───
run: $(TARGET)
	cd .. && ./db

# ─── 테스트 ───
test: $(TARGET)
	@cd .. && bash tests/run_tests.sh

# ─── 정리 ───
clean:
	rm -f $(OBJS) $(TARGET)
	rm -rf ../data

.PHONY: all run test clean

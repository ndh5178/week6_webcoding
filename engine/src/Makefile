CC = gcc
CFLAGS = -Wall -Wextra -std=c11
TARGET = ../build/sql-engine

SRCS = main.c parser.c executor.c storage.c schema.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	del /Q *.o 2>NUL || exit 0

.PHONY: all clean

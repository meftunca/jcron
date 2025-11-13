# JCRON C Port - Makefile
# Zero Dependencies, Zero Allocations, C99 Standard

CC = gcc
CFLAGS = -std=c99 -Wall -Wextra -Wpedantic -O2 -Iinclude
LDFLAGS = 
AR = ar
ARFLAGS = rcs

# Directories
SRC_DIR = src
INC_DIR = include
OBJ_DIR = build/obj
LIB_DIR = build/lib
BIN_DIR = build/bin
TEST_DIR = tests
EXAMPLE_DIR = examples

# Source files
SRCS = $(wildcard $(SRC_DIR)/*.c)
# Exclude SIMD source if not supported (will be conditionally compiled)
SRCS := $(filter-out $(SRC_DIR)/jcron_simd.c, $(SRCS))
OBJS = $(SRCS:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)

# Library
LIB_NAME = libjcron.a
LIB = $(LIB_DIR)/$(LIB_NAME)

# Daemon binary
DAEMON_SRC = $(EXAMPLE_DIR)/jcrond.c
DAEMON_BIN = $(BIN_DIR)/jcrond

# Test files
TEST_SRCS = $(wildcard $(TEST_DIR)/*.c)
TEST_BINS = $(TEST_SRCS:$(TEST_DIR)/%.c=$(BIN_DIR)/%)

# Example files
EXAMPLE_SRCS = $(wildcard $(EXAMPLE_DIR)/*.c)
EXAMPLE_BINS = $(EXAMPLE_SRCS:$(EXAMPLE_DIR)/%.c=$(BIN_DIR)/%)

# SIMD detection
SIMD_SUPPORTED := $(shell $(CC) -dM -E -mavx2 - < /dev/null 2>/dev/null | grep -q AVX2 && echo "AVX2" || echo "NONE")
NEON_SUPPORTED := $(shell $(CC) -dM -E -march=armv8-a+simd - < /dev/null 2>/dev/null | grep -q __ARM_NEON && echo "NEON" || echo "NONE")

# Add SIMD source if supported
ifeq ($(SIMD_SUPPORTED),AVX2)
SRCS += $(SRC_DIR)/jcron_simd.c
CFLAGS += -mavx2
else ifeq ($(NEON_SUPPORTED),NEON)
SRCS += $(SRC_DIR)/jcron_simd.c
CFLAGS += -march=armv8-a+simd
endif

# Targets
.PHONY: all clean test bench install help daemon

all: $(LIB)
	@echo "✓ Built $(LIB_NAME)"

# Create directories
$(OBJ_DIR) $(LIB_DIR) $(BIN_DIR):
	@mkdir -p $@

# Compile object files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c | $(OBJ_DIR)
	@echo "CC $<"
	@$(CC) $(CFLAGS) -c $< -o $@

# Create static library
$(LIB): $(OBJS) | $(LIB_DIR)
	@echo "AR $@"
	@$(AR) $(ARFLAGS) $@ $^

# Build tests
test: $(LIB) $(TEST_BINS)
	@echo "Running tests..."
	@for test in $(TEST_BINS); do \
		echo "  $$test"; \
		$$test || exit 1; \
	done
	@echo "✓ All tests passed"

# Benchmarks
$(BIN_DIR)/benchmark: benchmark/benchmark.c $(LIB) | $(BIN_DIR)
	@echo "CC benchmark/benchmark.c"
	@$(CC) $(CFLAGS) benchmark/benchmark.c -L$(LIB_DIR) -ljcron -o $@

bench: $(LIB) $(BIN_DIR)/benchmark
	@echo "Running benchmarks..."
	@$(BIN_DIR)/benchmark

# Install
install: $(LIB)
	@echo "Installing to /usr/local..."
	@install -d /usr/local/lib
	@install -d /usr/local/include
	@install -m 644 $(LIB) /usr/local/lib/
	@install -m 644 $(INC_DIR)/jcron.h /usr/local/include/
	@echo "✓ Installed"

# Clean
clean:
	@rm -rf build
	@echo "✓ Cleaned"

# Help
help:
	@echo "JCRON C Port - Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  all       - Build library (default)"
	@echo "  test      - Build and run tests"
	@echo "  examples  - Build examples"
	@echo "  bench     - Run benchmarks"
	@echo "  install   - Install to /usr/local"
	@echo "  clean     - Remove build artifacts"
	@echo "  help      - Show this message"
	@echo ""
	@echo "Build flags:"
	@echo "  CC=$(CC)"
	@echo "  CFLAGS=$(CFLAGS)"

# Build daemon
daemon: $(LIB) $(DAEMON_BIN)

$(DAEMON_BIN): $(DAEMON_SRC) $(LIB) | $(BIN_DIR)
	@echo "CC $< -> $@"
	@$(CC) $(CFLAGS) $< $(LIB) -o $@

# JCRON PostgreSQL Extension Makefile

MODULE_big = jcron
OBJS = jcron.o jcron_job_executor.o

# JCRON library path (adjust as needed)
JCRON_LIB_PATH = ../build/lib
JCRON_INCLUDE_PATH = ../include

# PostgreSQL
PG_CPPFLAGS = -I$(JCRON_INCLUDE_PATH) -I.
SHLIB_LINK = -L$(JCRON_LIB_PATH) -ljcron

# Extension files
EXTENSION = jcron
DATA = jcron--1.0.sql
DOCS = README.md

ifdef USE_PGXS
PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
else
subdir = contrib/jcron
top_builddir = ../..
include $(top_builddir)/src/Makefile.global
include $(top_srcdir)/contrib/contrib-global.mk
endif

# Custom targets
.PHONY: install-jcron-lib
install-jcron-lib:
	@echo "Building JCRON library..."
	@cd .. && make clean && make
	@echo "JCRON library built successfully"

# Build extension with JCRON dependency
all: install-jcron-lib $(MODULE_big).so

# Test target
.PHONY: test
test: install
	@echo "Testing JCRON PostgreSQL extension..."
	@psql -c "CREATE EXTENSION IF NOT EXISTS jcron;"
	@psql -c "SELECT jcron.schedule('*/5 * * * *', 'SELECT 1', 'postgres', 'postgres');"
	@psql -c "SELECT * FROM jcron.list_jobs();"
	@echo "Tests completed"
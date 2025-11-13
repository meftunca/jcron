/**
 * JCRON Job Executor - PostgreSQL Background Worker
 *
 * Executes scheduled cron jobs in separate database connections
 */

#include "postgres.h"
#include "fmgr.h"
#include "miscadmin.h"
#include "lib/stringinfo.h"
#include "executor/spi.h"
#include "utils/builtins.h"
#include "storage/ipc.h"
#include "storage/latch.h"
#include "pgstat.h"

#include "jcron.h"

PG_MODULE_MAGIC;

/*
 * Job executor background worker main function
 */
PG_FUNCTION_INFO_V1(jcron_job_executor);

Datum
jcron_job_executor(PG_FUNCTION_ARGS)
{
    int64 job_id = PG_GETARG_INT64(0);

    /* Get job details from database */
    SPI_connect();

    StringInfoData query;
    initStringInfo(&query);
    appendStringInfo(&query,
        "SELECT command, database, username FROM jcron.jobs WHERE job_id = %ld",
        job_id);

    if (SPI_execute(query.data, true, 1) != SPI_OK_SELECT) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Failed to get job details for job %ld", job_id)));
    }

    if (SPI_processed == 0) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_NO_DATA_FOUND),
                 errmsg("Job %ld not found", job_id)));
    }

    HeapTuple tuple = SPI_tuptable->vals[0];
    char* command = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 1);
    char* database = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 2);
    char* username = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 3);

    SPI_finish();

    /* Execute the job command */
    elog(LOG, "JCRON executing job %ld: %s", job_id, command);

    /* Use SPI to execute the command */
    SPI_connect();

    /* Set the search path to avoid issues */
    SPI_execute("SET search_path TO public", false, 0);

    /* Execute the job command */
    int spi_result = SPI_execute(command, false, 0);

    if (spi_result < 0) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Job %ld failed: %s", job_id, command)));
    }

    SPI_finish();

    /* Update job statistics */
    SPI_connect();
    StringInfoData update_query;
    initStringInfo(&update_query);
    appendStringInfo(&update_query,
        "UPDATE jcron.jobs SET last_run = now() WHERE job_id = %ld",
        job_id);

    SPI_execute(update_query.data, false, 0);
    SPI_finish();

    elog(LOG, "JCRON job %ld completed successfully", job_id);

    PG_RETURN_VOID();
}
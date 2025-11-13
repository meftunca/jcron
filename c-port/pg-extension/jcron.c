/**
 * JCRON PostgreSQL Extension
 *
 * pg_cron benzeri cron işlevselliği sağlayan PostgreSQL C extension'ı
 * JCRON C kütüphanesini kullanarak yüksek performanslı cron scheduling
 */

#include "postgres.h"
#include "fmgr.h"
#include "miscadmin.h"
#include "postmaster/bgworker.h"
#include "storage/ipc.h"
#include "storage/latch.h"
#include "storage/proc.h"
#include "utils/builtins.h"
#include "utils/guc.h"
#include "utils/timestamp.h"
#include "access/xact.h"
#include "executor/spi.h"
#include "lib/stringinfo.h"
#include "pgstat.h"
#include "utils/memutils.h"

#include "jcron.h"

PG_MODULE_MAGIC;

/* GUC variables */
static int jcron_max_jobs = 1000;
static int jcron_check_interval = 60; /* seconds */

/* Background worker */
static volatile sig_atomic_t got_sigterm = false;

/* SQL Functions */
PG_FUNCTION_INFO_V1(jcron_schedule);
PG_FUNCTION_INFO_V1(jcron_unschedule);
PG_FUNCTION_INFO_V1(jcron_next_time);
PG_FUNCTION_INFO_V1(jcron_list_jobs);
PG_FUNCTION_INFO_V1(jcron_parse_eod);
PG_FUNCTION_INFO_V1(jcron_parse_sod);
PG_FUNCTION_INFO_V1(jcron_get_nth_weekday);

/* Internal functions */
static void jcron_sigterm(SIGNAL_ARGS);
static void jcron_main(Datum main_arg);
static void execute_pending_jobs(void);
static void load_jobs_from_database(void);

/* Job structure */
typedef struct JcronJob {
    int64 job_id;
    char* schedule;
    char* command;
    char* database;
    char* username;
    jcron_pattern_t pattern;
    TimestampTz last_run;
    bool active;
    struct JcronJob* next;
} JcronJob;

static JcronJob* job_list = NULL;
static int job_count = 0;

/*
 * SQL Function: jcron_schedule(schedule, command, database, username)
 * Cron job'u zamanlar
 */
Datum
jcron_schedule(PG_FUNCTION_ARGS)
{
    text* schedule_text = PG_GETARG_TEXT_PP(0);
    text* command_text = PG_GETARG_TEXT_PP(1);
    text* database_text = PG_GETARG_TEXT_PP(2);
    text* username_text = PG_GETARG_TEXT_PP(3);

    char* schedule = text_to_cstring(schedule_text);
    char* command = text_to_cstring(command_text);
    char* database = text_to_cstring(database_text);
    char* username = text_to_cstring(username_text);

    /* Parse cron schedule */
    jcron_pattern_t pattern;
    int result = jcron_parse(schedule, &pattern);
    if (result != JCRON_OK) {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("Invalid cron schedule: %s", schedule)));
    }

    /* Insert into database */
    SPI_connect();
    StringInfoData query;
    initStringInfo(&query);

    appendStringInfo(&query,
        "INSERT INTO jcron.jobs (schedule, command, database, username, active) "
        "VALUES (%s, %s, %s, %s, true) RETURNING job_id",
        quote_literal_cstr(schedule),
        quote_literal_cstr(command),
        quote_literal_cstr(database),
        quote_literal_cstr(username));

    if (SPI_execute(query.data, true, 1) != SPI_OK_INSERT_RETURNING) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Failed to schedule job")));
    }

    if (SPI_processed > 0) {
        HeapTuple tuple = SPI_tuptable->vals[0];
        int64 job_id = DatumGetInt64(SPI_getbinval(tuple, SPI_tuptable->tupdesc, 1, &isnull));
        SPI_finish();

        /* Reload jobs */
        load_jobs_from_database();

        PG_RETURN_INT64(job_id);
    }

    SPI_finish();
    PG_RETURN_NULL();
}

/*
 * SQL Function: jcron_unschedule(job_id)
 * Cron job'unu iptal eder
 */
Datum
jcron_unschedule(PG_FUNCTION_ARGS)
{
    int64 job_id = PG_GETARG_INT64(0);

    SPI_connect();
    StringInfoData query;
    initStringInfo(&query);

    appendStringInfo(&query,
        "UPDATE jcron.jobs SET active = false WHERE job_id = %ld",
        job_id);

    if (SPI_execute(query.data, false, 0) != SPI_OK_UPDATE) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Failed to unschedule job")));
    }

    SPI_finish();

    /* Reload jobs */
    load_jobs_from_database();

    PG_RETURN_BOOL(true);
}

/*
 * SQL Function: jcron_next_time(schedule)
 * Verilen schedule için bir sonraki çalışma zamanını döndürür
 */
Datum
jcron_next_time(PG_FUNCTION_ARGS)
{
    text* schedule_text = PG_GETARG_TEXT_PP(0);
    char* schedule = text_to_cstring(schedule_text);

    /* Parse cron schedule */
    jcron_pattern_t pattern;
    int result = jcron_parse(schedule, &pattern);
    if (result != JCRON_OK) {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("Invalid cron schedule: %s", schedule)));
    }

    /* Calculate next time */
    jcron_result_t next_result;
    time_t now = time(NULL);
    result = jcron_next(&pattern, now, &next_result);
    if (result != JCRON_OK) {
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Failed to calculate next time")));
    }

    /* Convert to PostgreSQL timestamp */
    TimestampTz next_time = (TimestampTz)next_result.timestamp * USECS_PER_SEC;

    PG_RETURN_TIMESTAMPTZ(next_time);
}

/*
 * SQL Function: jcron_list_jobs()
 * Aktif job'ları listeler
 */
Datum
jcron_list_jobs(PG_FUNCTION_ARGS)
{
    ReturnSetInfo *rsinfo = (ReturnSetInfo *) fcinfo->resultinfo;
    Tuplestorestate *tupstore;
    TupleDesc tupdesc;
    MemoryContext per_query_ctx;
    MemoryContext oldcontext;

    /* Build tuple descriptor */
    tupdesc = CreateTemplateTupleDesc(6);
    TupleDescInitEntry(tupdesc, (AttrNumber) 1, "job_id", INT8OID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 2, "schedule", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 3, "command", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 4, "database", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 5, "username", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 6, "next_run", TIMESTAMPTZOID, -1, 0);

    per_query_ctx = rsinfo->econtext->ecxt_per_query_memory;
    oldcontext = MemoryContextSwitchTo(per_query_ctx);

    tupstore = tuplestore_begin_heap(true, false, work_mem);
    rsinfo->returnMode = SFRM_Materialize;
    rsinfo->setResult = tupstore;
    rsinfo->setDesc = tupdesc;

    MemoryContextSwitchTo(oldcontext);

    /* Query jobs */
    SPI_connect();
    if (SPI_execute("SELECT job_id, schedule, command, database, username FROM jcron.jobs WHERE active = true",
                    true, 0) != SPI_OK_SELECT) {
        SPI_finish();
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("Failed to list jobs")));
    }

    /* Process results */
    for (int i = 0; i < SPI_processed; i++) {
        HeapTuple tuple = SPI_tuptable->vals[i];
        bool isnull;

        int64 job_id = DatumGetInt64(SPI_getbinval(tuple, SPI_tuptable->tupdesc, 1, &isnull));
        char* schedule = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 2);
        char* command = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 3);
        char* database = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 4);
        char* username = SPI_getvalue(tuple, SPI_tuptable->tupdesc, 5);

        /* Calculate next run time */
        jcron_pattern_t pattern;
        if (jcron_parse(schedule, &pattern) == JCRON_OK) {
            jcron_result_t next_result;
            time_t now = time(NULL);
            if (jcron_next(&pattern, now, &next_result) == JCRON_OK) {
                TimestampTz next_time = (TimestampTz)next_result.timestamp * USECS_PER_SEC;

                Datum values[6];
                bool nulls[6] = {false, false, false, false, false, false};

                values[0] = Int64GetDatum(job_id);
                values[1] = CStringGetTextDatum(schedule);
                values[2] = CStringGetTextDatum(command);
                values[3] = CStringGetTextDatum(database);
                values[4] = CStringGetTextDatum(username);
                values[5] = TimestampTzGetDatum(next_time);

                tuplestore_putvalues(tupstore, tupdesc, values, nulls);
            }
        }
    }

    SPI_finish();
    tuplestore_donestoring(tupstore);

    return (Datum) 0;
}

/*
 * SQL Function: jcron.parse_eod(pattern)
 * Parse EOD pattern and return type/modifier
 */
Datum
jcron_parse_eod(PG_FUNCTION_ARGS)
{
    text* pattern_text = PG_GETARG_TEXT_PP(0);

    char* pattern = text_to_cstring(pattern_text);
    int8_t type, modifier;

    // Use JCRON library to parse EOD
    if (jcron_parse_eod(pattern, &type, &modifier) != JCRON_OK) {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("Invalid EOD pattern: %s", pattern)));
    }

    // Return as tuple: (type, modifier)
    TupleDesc tupdesc;
    Datum values[2];
    bool nulls[2] = {false, false};

    // Type mapping
    const char* type_str;
    switch (type) {
        case 0: type_str = "EOD"; break;
        case 1: type_str = "EOM"; break;
        case 2: type_str = "EOW"; break;
        case 3: type_str = "EOY"; break;
        default: type_str = "UNKNOWN"; break;
    }

    tupdesc = CreateTemplateTupleDesc(2);
    TupleDescInitEntry(tupdesc, (AttrNumber) 1, "type", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 2, "modifier", INT4OID, -1, 0);

    values[0] = CStringGetTextDatum(type_str);
    values[1] = Int32GetDatum(modifier);

    PG_RETURN_DATUM(HeapTupleGetDatum(heap_form_tuple(tupdesc, values, nulls)));
}

/*
 * SQL Function: jcron.parse_sod(pattern)
 * Parse SOD pattern and return type/modifier
 */
Datum
jcron_parse_sod(PG_FUNCTION_ARGS)
{
    text* pattern_text = PG_GETARG_TEXT_PP(0);

    char* pattern = text_to_cstring(pattern_text);
    int8_t type, modifier;

    // Use JCRON library to parse SOD
    if (jcron_parse_sod(pattern, &type, &modifier) != JCRON_OK) {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("Invalid SOD pattern: %s", pattern)));
    }

    // Return as tuple: (type, modifier)
    TupleDesc tupdesc;
    Datum values[2];
    bool nulls[2] = {false, false};

    // Type mapping
    const char* type_str;
    switch (type) {
        case 0: type_str = "SOD"; break;
        case 1: type_str = "SOM"; break;
        case 2: type_str = "SOW"; break;
        case 3: type_str = "SOY"; break;
        default: type_str = "UNKNOWN"; break;
    }

    tupdesc = CreateTemplateTupleDesc(2);
    TupleDescInitEntry(tupdesc, (AttrNumber) 1, "type", TEXTOID, -1, 0);
    TupleDescInitEntry(tupdesc, (AttrNumber) 2, "modifier", INT4OID, -1, 0);

    values[0] = CStringGetTextDatum(type_str);
    values[1] = Int32GetDatum(modifier);

    PG_RETURN_DATUM(HeapTupleGetDatum(heap_form_tuple(tupdesc, values, nulls)));
}

/*
 * SQL Function: jcron.get_nth_weekday(year, month, weekday, n)
 * Get nth weekday of month
 */
Datum
jcron_get_nth_weekday(PG_FUNCTION_ARGS)
{
    int32 year = PG_GETARG_INT32(0);
    int32 month = PG_GETARG_INT32(1);
    int32 weekday = PG_GETARG_INT32(2);
    int32 n = PG_GETARG_INT32(3);

    // Use JCRON library
    int day = jcron_get_nth_weekday(year, month, weekday, n);

    if (day == 0) {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("Invalid nth weekday calculation: year=%d, month=%d, weekday=%d, n=%d",
                        year, month, weekday, n)));
    }

    PG_RETURN_INT32(day);
}

/*
 * Load jobs from database
 */
static void
load_jobs_from_database(void)
{
    /* Free existing jobs */
    JcronJob* job = job_list;
    while (job) {
        JcronJob* next = job->next;
        if (job->schedule) pfree(job->schedule);
        if (job->command) pfree(job->command);
        if (job->database) pfree(job->database);
        if (job->username) pfree(job->username);
        pfree(job);
        job = next;
    }
    job_list = NULL;
    job_count = 0;

    /* Load from database */
    SPI_connect();
    if (SPI_execute("SELECT job_id, schedule, command, database, username, last_run FROM jcron.jobs WHERE active = true",
                    true, 0) != SPI_OK_SELECT) {
        SPI_finish();
        return;
    }

    for (int i = 0; i < SPI_processed; i++) {
        HeapTuple tuple = SPI_tuptable->vals[i];
        bool isnull;

        JcronJob* job = (JcronJob*) palloc(sizeof(JcronJob));
        memset(job, 0, sizeof(JcronJob));

        job->job_id = DatumGetInt64(SPI_getbinval(tuple, SPI_tuptable->tupdesc, 1, &isnull));
        job->schedule = pstrdup(SPI_getvalue(tuple, SPI_tuptable->tupdesc, 2));
        job->command = pstrdup(SPI_getvalue(tuple, SPI_tuptable->tupdesc, 3));
        job->database = pstrdup(SPI_getvalue(tuple, SPI_tuptable->tupdesc, 4));
        job->username = pstrdup(SPI_getvalue(tuple, SPI_tuptable->tupdesc, 5));

        /* Parse schedule */
        if (jcron_parse(job->schedule, &job->pattern) != JCRON_OK) {
            pfree(job->schedule);
            pfree(job->command);
            pfree(job->database);
            pfree(job->username);
            pfree(job);
            continue;
        }

        job->active = true;
        job->next = job_list;
        job_list = job;
        job_count++;
    }

    SPI_finish();

    elog(LOG, "JCRON loaded %d jobs from database", job_count);
}

/*
 * Execute pending jobs
 */
static void
execute_pending_jobs(void)
{
    TimestampTz now = GetCurrentTimestamp();
    time_t current_time = (time_t)(now / USECS_PER_SEC);

    JcronJob* job = job_list;
    while (job) {
        /* Check if job should run */
        if (jcron_matches(current_time, &job->pattern)) {
            /* Avoid running the same job multiple times in the same minute */
            if (job->last_run == 0 ||
                (now - job->last_run) >= (60 * USECS_PER_SEC)) {

                /* Execute job in separate process/database connection */
                BackgroundWorker worker;
                memset(&worker, 0, sizeof(BackgroundWorker));

                snprintf(worker.bgw_name, BGW_MAXLEN, "jcron job %ld", job->job_id);
                snprintf(worker.bgw_function_name, BGW_MAXLEN, "jcron_job_executor");
                worker.bgw_flags = BGWORKER_SHMEM_ACCESS | BGWORKER_BACKEND_DATABASE_CONNECTION;
                worker.bgw_start_time = BgWorkerStart_RecoveryFinished;
                worker.bgw_restart_time = BGW_NEVER_RESTART;
                worker.bgw_main_arg = Int64GetDatum(job->job_id);
                strcpy(worker.bgw_library_name, "jcron");
                strcpy(worker.bgw_extra, job->database);

                RegisterDynamicBackgroundWorker(&worker, NULL);

                job->last_run = now;

                /* Update last_run in database */
                SPI_connect();
                StringInfoData query;
                initStringInfo(&query);
                appendStringInfo(&query,
                    "UPDATE jcron.jobs SET last_run = now() WHERE job_id = %ld",
                    job->job_id);
                SPI_execute(query.data, false, 0);
                SPI_finish();

                elog(LOG, "JCRON scheduled job %ld for execution", job->job_id);
            }
        }

        job = job->next;
    }
}

/*
 * Background worker main function
 */
static void
jcron_main(Datum main_arg)
{
    /* Establish signal handlers */
    pqsignal(SIGTERM, jcron_sigterm);
    BackgroundWorkerUnblockSignals();

    /* Connect to database */
    BackgroundWorkerInitializeConnection("postgres", NULL, 0);

    /* Load initial jobs */
    load_jobs_from_database();

    elog(LOG, "JCRON background worker started");

    /* Main loop */
    while (!got_sigterm) {
        int rc = WaitLatch(&MyProc->procLatch,
                          WL_LATCH_SET | WL_TIMEOUT | WL_POSTMASTER_DEATH,
                          jcron_check_interval * 1000L,
                          PG_WAIT_EXTENSION);

        ResetLatch(&MyProc->procLatch);

        if (rc & WL_POSTMASTER_DEATH) {
            break;
        }

        if (rc & WL_LATCH_SET) {
            /* Reload configuration if requested */
            load_jobs_from_database();
        }

        /* Check and execute jobs */
        execute_pending_jobs();
    }

    elog(LOG, "JCRON background worker shutting down");
}

/*
 * Signal handler
 */
static void
jcron_sigterm(SIGNAL_ARGS)
{
    got_sigterm = true;
    SetLatch(&MyProc->procLatch);
}

/*
 * Module initialization
 */
void
_PG_init(void)
{
    /* Register GUC variables */
    DefineCustomIntVariable("jcron.max_jobs",
                           "Maximum number of cron jobs",
                           NULL,
                           &jcron_max_jobs,
                           1000,
                           1,
                           10000,
                           PGC_SIGHUP,
                           GUC_UNIT,
                           NULL,
                           NULL,
                           NULL);

    DefineCustomIntVariable("jcron.check_interval",
                           "Job check interval in seconds",
                           NULL,
                           &jcron_check_interval,
                           60,
                           1,
                           3600,
                           PGC_SIGHUP,
                           GUC_UNIT,
                           NULL,
                           NULL,
                           NULL);

    /* Register background worker */
    BackgroundWorker worker;
    memset(&worker, 0, sizeof(BackgroundWorker));

    strcpy(worker.bgw_name, "jcron scheduler");
    strcpy(worker.bgw_function_name, "jcron_main");
    worker.bgw_flags = BGWORKER_SHMEM_ACCESS | BGWORKER_BACKEND_DATABASE_CONNECTION;
    worker.bgw_start_time = BgWorkerStart_RecoveryFinished;
    worker.bgw_restart_time = BGW_NEVER_RESTART;
    worker.bgw_main_arg = (Datum) 0;
    strcpy(worker.bgw_library_name, "jcron");

    RegisterBackgroundWorker(&worker);
}

/*
 * Module cleanup
 */
void
_PG_fini(void)
{
    /* Cleanup if needed */
}
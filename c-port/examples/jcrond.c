/**
 * JCRON Daemon - Linux Cron Daemon Implementation
 *
 * A complete cron daemon using JCRON C library that can replace traditional crond
 * Features:
 * - Reads /etc/crontab and /etc/cron.d/*
 * - Supports user crontabs in /var/spool/cron/crontabs/
 * - Runs as daemon with proper signal handling
 * - Security: drops privileges when executing user jobs
 * - Logging via syslog
 * - Systemd integration
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <syslog.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <dirent.h>
#include <pwd.h>
#include <grp.h>
#include <time.h>
#include <errno.h>
#include <stdarg.h>
#include <limits.h>

#include "jcron.h"

// Configuration
#define CRONTAB_FILE "/etc/crontab"
#define CRON_D_DIR "/etc/cron.d"
#define USER_CRONTABS_DIR "/var/spool/cron/crontabs"
#define PID_FILE "/var/run/jcrond.pid"

// Job structure
typedef struct cron_job {
    char* schedule;      // Original cron schedule string
    char* command;       // Command to execute
    char* user;          // User to run as (NULL for root)
    jcron_pattern_t pattern; // Parsed pattern
    time_t last_run;     // Last execution time
    struct cron_job* next;
} cron_job_t;

// Global variables
static cron_job_t* job_list = NULL;
static volatile int running = 1;
static volatile int reload_config = 0;

// Signal handlers
void signal_handler(int sig) {
    switch (sig) {
        case SIGTERM:
        case SIGINT:
            running = 0;
            break;
        case SIGHUP:
            reload_config = 1;
            break;
    }
}

// Logging
void log_message(int priority, const char* format, ...) {
    va_list args;
    va_start(args, format);
    vsyslog(priority, format, args);
    va_end(args);
}

// Parse a crontab line
int parse_crontab_line(const char* line, cron_job_t* job) {
    char* line_copy = strdup(line);
    if (!line_copy) return -1;

    char* saveptr;
    char* token;

    // Skip comments and empty lines
    if (line[0] == '#' || line[0] == '\0' || line[0] == '\n') {
        free(line_copy);
        return 0;
    }

    // Parse schedule (5 fields: min hour day month weekday)
    char schedule[256] = {0};
    char command[1024] = {0};
    char user[64] = {0};

    // For system crontab: min hour day month weekday user command
    // For user crontab: min hour day month weekday command

    token = strtok_r(line_copy, " \t", &saveptr);
    if (!token) goto error;

    strcpy(schedule, token); // minute

    token = strtok_r(NULL, " \t", &saveptr);
    if (!token) goto error;
    strcat(schedule, " ");
    strcat(schedule, token); // hour

    token = strtok_r(NULL, " \t", &saveptr);
    if (!token) goto error;
    strcat(schedule, " ");
    strcat(schedule, token); // day

    token = strtok_r(NULL, " \t", &saveptr);
    if (!token) goto error;
    strcat(schedule, " ");
    strcat(schedule, token); // month

    token = strtok_r(NULL, " \t", &saveptr);
    if (!token) goto error;
    strcat(schedule, " ");
    strcat(schedule, token); // weekday

    // Check if next token is a username (system crontab) or command (user crontab)
    token = strtok_r(NULL, " \t", &saveptr);
    if (!token) goto error;

    // If token contains only letters (potential username), check next token
    char* remaining = strtok_r(NULL, "", &saveptr);
    if (remaining && remaining[0] != '\0') {
        // System crontab format: user command
        strcpy(user, token);
        strcpy(command, remaining);
    } else {
        // User crontab format: command only
        strcpy(command, token);
        // user remains empty (current user)
    }

    // Parse the schedule
    if (jcron_parse(schedule, &job->pattern) != JCRON_OK) {
        log_message(LOG_ERR, "Failed to parse cron schedule: %s", schedule);
        goto error;
    }

    job->schedule = strdup(schedule);
    job->command = strdup(command);
    job->user = user[0] ? strdup(user) : NULL;
    job->last_run = 0;

    free(line_copy);
    return 1;

error:
    free(line_copy);
    return -1;
}

// Load crontab file
int load_crontab_file(const char* filename, const char* default_user) {
    FILE* file = fopen(filename, "r");
    if (!file) {
        log_message(LOG_WARNING, "Cannot open crontab file: %s", filename);
        return -1;
    }

    char line[2048];
    int job_count = 0;

    while (fgets(line, sizeof(line), file)) {
        // Remove trailing newline
        size_t len = strlen(line);
        if (len > 0 && line[len-1] == '\n') line[len-1] = '\0';

        cron_job_t* job = calloc(1, sizeof(cron_job_t));
        if (!job) continue;

        int result = parse_crontab_line(line, job);
        if (result == 1) {
            // Set default user if not specified
            if (!job->user && default_user) {
                job->user = strdup(default_user);
            }

            job->next = job_list;
            job_list = job;
            job_count++;
        } else if (result == -1) {
            free(job);
        }
    }

    fclose(file);
    return job_count;
}

// Load all crontabs
void load_all_crontabs(void) {
    // Free existing jobs
    cron_job_t* job = job_list;
    while (job) {
        cron_job_t* next = job->next;
        free(job->schedule);
        free(job->command);
        free(job->user);
        free(job);
        job = next;
    }
    job_list = NULL;

    int total_jobs = 0;

    // Load system crontab
    total_jobs += load_crontab_file(CRONTAB_FILE, "root");

    // Load /etc/cron.d/* files
    DIR* dir = opendir(CRON_D_DIR);
    if (dir) {
        struct dirent* entry;
        while ((entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;

            char filepath[PATH_MAX];
            snprintf(filepath, sizeof(filepath), "%s/%s", CRON_D_DIR, entry->d_name);
            total_jobs += load_crontab_file(filepath, "root");
        }
        closedir(dir);
    }

    // Load user crontabs
    dir = opendir(USER_CRONTABS_DIR);
    if (dir) {
        struct dirent* entry;
        while ((entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;

            char filepath[PATH_MAX];
            snprintf(filepath, sizeof(filepath), "%s/%s", USER_CRONTABS_DIR, entry->d_name);
            total_jobs += load_crontab_file(filepath, entry->d_name);
        }
        closedir(dir);
    }

    log_message(LOG_INFO, "Loaded %d cron jobs", total_jobs);
}

// Execute a cron job
void execute_job(cron_job_t* job) {
    pid_t pid = fork();
    if (pid < 0) {
        log_message(LOG_ERR, "Failed to fork for job execution");
        return;
    }

    if (pid == 0) {
        // Child process
        log_message(LOG_INFO, "Executing job: %s (user: %s)",
                   job->command, job->user ? job->user : "root");

        // Set environment variables
        setenv("PATH", "/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin", 1);

        // Change to user's home directory if specified
        if (job->user) {
            struct passwd* pwd = getpwnam(job->user);
            if (pwd) {
                if (chdir(pwd->pw_dir) != 0) {
                    chdir("/tmp");
                }
                // Drop privileges
                if (setgid(pwd->pw_gid) != 0 || setuid(pwd->pw_uid) != 0) {
                    log_message(LOG_ERR, "Failed to drop privileges to user %s", job->user);
                    exit(1);
                }
            }
        }

        // Execute command
        execl("/bin/sh", "sh", "-c", job->command, NULL);
        log_message(LOG_ERR, "Failed to execute command: %s", strerror(errno));
        exit(1);
    } else {
        // Parent process - wait for child to avoid zombies
        int status;
        waitpid(pid, &status, 0);

        if (WIFEXITED(status)) {
            log_message(LOG_INFO, "Job completed with exit code %d", WEXITSTATUS(status));
        } else if (WIFSIGNALED(status)) {
            log_message(LOG_WARNING, "Job terminated by signal %d", WTERMSIG(status));
        }
    }
}

// Check and execute due jobs
void check_jobs(void) {
    time_t now = time(NULL);
    struct tm tm_now;
    localtime_r(&now, &tm_now);

    cron_job_t* job = job_list;
    while (job) {
        // Check if job should run now
        if (jcron_matches(now, &job->pattern)) {
            // Avoid running the same job multiple times in the same minute
            if (job->last_run == 0 || difftime(now, job->last_run) >= 60) {
                execute_job(job);
                job->last_run = now;
            }
        }
        job = job->next;
    }
}

// Daemonize the process
void daemonize(void) {
    pid_t pid = fork();
    if (pid < 0) exit(1);
    if (pid > 0) exit(0); // Parent exits

    // Child continues
    if (setsid() < 0) exit(1);

    // Close standard file descriptors
    close(STDIN_FILENO);
    close(STDOUT_FILENO);
    close(STDERR_FILENO);

    // Redirect to /dev/null
    open("/dev/null", O_RDONLY); // stdin
    open("/dev/null", O_WRONLY); // stdout
    open("/dev/null", O_WRONLY); // stderr

    // Write PID file
    FILE* pid_file = fopen(PID_FILE, "w");
    if (pid_file) {
        fprintf(pid_file, "%d\n", getpid());
        fclose(pid_file);
    }
}

// Main function
int main(int argc, char* argv[]) {
    // Parse command line arguments
    int daemon_mode = 1;
    if (argc > 1 && strcmp(argv[1], "-f") == 0) {
        daemon_mode = 0; // Foreground mode for debugging
    }

    // Initialize syslog
    openlog("jcrond", LOG_PID | LOG_CONS, LOG_CRON);

    // Setup signal handlers
    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    signal(SIGHUP, signal_handler);

    // Load initial configuration
    load_all_crontabs();

    if (daemon_mode) {
        log_message(LOG_INFO, "Starting JCRON daemon");
        daemonize();
    } else {
        printf("JCRON daemon starting in foreground mode\n");
    }

    // Main loop
    while (running) {
        // Check for configuration reload
        if (reload_config) {
            log_message(LOG_INFO, "Reloading configuration");
            load_all_crontabs();
            reload_config = 0;
        }

        // Check and execute jobs
        check_jobs();

        // Sleep for 30 seconds (cron traditionally checks every minute)
        sleep(30);
    }

    // Cleanup
    log_message(LOG_INFO, "JCRON daemon shutting down");

    // Remove PID file
    unlink(PID_FILE);

    closelog();
    return 0;
}
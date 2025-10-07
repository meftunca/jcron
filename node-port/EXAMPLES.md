# Examples & Recipes

Real-world examples and common use cases for `@devloops/jcron`.

## Table of Contents

- [Basic Patterns](#basic-patterns)
- [Advanced Scheduling](#advanced-scheduling)
- [Timezone Handling](#timezone-handling)
- [Error Handling & Retry](#error-handling--retry)
- [React Native](#react-native)
- [Node.js Services](#nodejs-services)
- [Database Maintenance](#database-maintenance)
- [API Integration](#api-integration)

---

## Basic Patterns

### Daily Tasks

\`\`\`typescript
import { Runner } from '@devloops/jcron';

const runner = new Runner();

// Every day at 9 AM
runner.addFuncCron('0 9 * * *', () => {
  console.log('Daily morning task');
});

// Every day at midnight
runner.addFuncCron('0 0 * * *', () => {
  console.log('Daily midnight task');
});

runner.start();
\`\`\`

### Hourly Tasks

\`\`\`typescript
// Every hour
runner.addFuncCron('0 * * * *', () => {
  console.log('Hourly task');
});

// Every 6 hours
runner.addFuncCron('0 */6 * * *', () => {
  console.log('Six-hourly task');
});

// Business hours only (9 AM - 5 PM)
runner.addFuncCron('0 9-17 * * *', () => {
  console.log('Business hours task');
});
\`\`\`

### Weekly Tasks

\`\`\`typescript
// Every Monday at 9 AM
runner.addFuncCron('0 9 * * 1', () => {
  console.log('Monday morning task');
});

// Every Friday at 5 PM
runner.addFuncCron('0 17 * * 5', () => {
  console.log('Friday evening task');
});

// Weekdays at noon
runner.addFuncCron('0 12 * * 1-5', () => {
  console.log('Weekday lunch task');
});
\`\`\`

### Monthly Tasks

\`\`\`typescript
// First day of month at midnight
runner.addFuncCron('0 0 1 * *', () => {
  console.log('Monthly start task');
});

// Last day of month at 11:59 PM
runner.addFuncCron('59 23 L * *', () => {
  console.log('Monthly end task');
});

// 15th of every month at 3 PM
runner.addFuncCron('0 15 15 * *', () => {
  console.log('Mid-month task');
});
\`\`\`

---

## Advanced Scheduling

### nth Weekday Patterns

\`\`\`typescript
// First Monday of every month
runner.addFuncCron('0 9 * * 1#1', () => {
  console.log('First Monday task');
});

// Second Tuesday and fourth Thursday
runner.addFuncCron('0 9 * * 2#2,4#4', () => {
  console.log('Specific weekdays task');
});

// Last Friday of the month
runner.addFuncCron('0 17 * * 5L', () => {
  console.log('Last Friday task');
});
\`\`\`

### Complex Intervals

\`\`\`typescript
// Every 15 minutes during business hours on weekdays
runner.addFuncCron('*/15 9-17 * * 1-5', () => {
  console.log('Frequent business hours task');
});

// Every 30 minutes except lunch hour (12-1 PM)
runner.addFuncCron('*/30 0-11,13-23 * * *', () => {
  console.log('Task with lunch break');
});
\`\`\`

---

## Timezone Handling

### Multi-Timezone Tasks

\`\`\`typescript
import { Schedule, Runner } from '@devloops/jcron';

const runner = new Runner();

// New York time
const nySchedule = new Schedule({
  h: "9",
  m: "0",
  tz: "America/New_York"
});

runner.addScheduleCron(nySchedule, () => {
  console.log('9 AM in New York');
});

// London time
const londonSchedule = new Schedule({
  h: "9",
  m: "0",
  tz: "Europe/London"
});

runner.addScheduleCron(londonSchedule, () => {
  console.log('9 AM in London');
});

// Tokyo time
const tokyoSchedule = new Schedule({
  h: "9",
  m: "0",
  tz: "Asia/Tokyo"
});

runner.addScheduleCron(tokyoSchedule, () => {
  console.log('9 AM in Tokyo');
});

runner.start();
\`\`\`

---

## Error Handling & Retry

### Robust Task Execution

\`\`\`typescript
const runner = new Runner();

runner.addFuncCron('*/5 * * * *', async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      await riskyOperation();
      break; // Success
    } catch (error) {
      retries--;
      console.error(\`Attempt failed, \${retries} retries left\`, error);
      
      if (retries === 0) {
        // Final failure - alert/log
        await sendAlert('Task failed after 3 retries');
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
});

runner.start();
\`\`\`

---

## React Native

### Background Sync

\`\`\`typescript
import { Runner } from '@devloops/jcron';
import { useEffect } from 'react';
import { AppState } from 'react-native';

function App() {
  useEffect(() => {
    const runner = new Runner();

    // Sync every 15 minutes when app is active
    runner.addFuncCron('*/15 * * * *', async () => {
      if (AppState.currentState === 'active') {
        await syncWithServer();
      }
    });

    // Daily cleanup at midnight
    runner.addFuncCron('0 0 * * *', async () => {
      await cleanupOldData();
    });

    runner.start();

    return () => {
      runner.stop();
    };
  }, []);

  return <YourApp />;
}
\`\`\`

---

## Node.js Services

### API Server with Scheduled Tasks

\`\`\`typescript
import express from 'express';
import { Runner } from '@devloops/jcron';

const app = express();
const runner = new Runner();

// Report generation - every Monday at 8 AM
runner.addFuncCron('0 8 * * 1', async () => {
  await generateWeeklyReport();
});

// Database backup - every day at 2 AM
runner.addFuncCron('0 2 * * *', async () => {
  await backupDatabase();
});

// Cache cleanup - every hour
runner.addFuncCron('0 * * * *', async () => {
  await cleanupCache();
});

runner.start();

app.listen(3000, () => {
  console.log('Server running with scheduled tasks');
});
\`\`\`

---

## Database Maintenance

### Automated DB Operations

\`\`\`typescript
import { Runner } from '@devloops/jcron';
import { db } from './database';

const runner = new Runner();

// Vacuum database weekly (Sunday 3 AM)
runner.addFuncCron('0 3 * * 0', async () => {
  await db.query('VACUUM');
  console.log('Database vacuumed');
});

// Archive old records monthly (1st at 1 AM)
runner.addFuncCron('0 1 1 * *', async () => {
  const result = await db.query(\`
    INSERT INTO archive_table 
    SELECT * FROM main_table 
    WHERE created_at < NOW() - INTERVAL '90 days'
  \`);
  
  await db.query(\`
    DELETE FROM main_table 
    WHERE created_at < NOW() - INTERVAL '90 days'
  \`);
  
  console.log(\`Archived \${result.rowCount} records\`);
});

runner.start();
\`\`\`

---

## API Integration

### External API Sync

\`\`\`typescript
import { Runner } from '@devloops/jcron';
import axios from 'axios';

const runner = new Runner();

// Fetch data from external API every 30 minutes
runner.addFuncCron('*/30 * * * *', async () => {
  try {
    const response = await axios.get('https://api.example.com/data');
    await processData(response.data);
  } catch (error) {
    console.error('API sync failed:', error);
  }
});

// Publish metrics every 5 minutes
runner.addFuncCron('*/5 * * * *', async () => {
  const metrics = await collectMetrics();
  
  await axios.post('https://metrics.example.com/publish', {
    timestamp: new Date(),
    metrics
  });
});

runner.start();
\`\`\`

---

See also: [API Reference](./API_REFERENCE.md) | [README](./README.md)

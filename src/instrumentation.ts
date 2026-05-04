/**
 * Next.js instrumentation hook — starts the JobRunner on server startup.
 * This file is automatically loaded by Next.js when the server starts.
 */
export async function register() {
  // Only run on the server side, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { JobRunner } = await import('./services/job-runner');
    const { TaskCenterRepository } = await import('./db/repositories/task-center.repository');
    const { createDramaExecutors } = await import('./services/executors');
    const { logger } = await import('./lib/logger');

    const taskCenter = new TaskCenterRepository();
    const executors = createDramaExecutors();

    const runner = new JobRunner(taskCenter, executors, {
      pollIntervalMs: 5000,
      maxConcurrentJobs: 1,
    });

    // Store reference for graceful shutdown
    (globalThis as any).__jobRunner = runner;

    // Resume stale tasks from previous server instance
    await runner.resumePendingTasks();

    runner.start();
    logger.info('JobRunner started via instrumentation.register()');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, stopping JobRunner');
      runner.stop();
    });
    process.on('SIGINT', () => {
      logger.info('SIGINT received, stopping JobRunner');
      runner.stop();
    });
  }
}

import { NextResponse } from 'next/server';
import { JobsRepository } from '@/db/repositories/jobs.repository';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';

/**
 * GET /api/v1/dashboard/stats
 * Returns aggregate stats for the dashboard.
 */
export async function GET() {
  try {
    const jobsRepo = new JobsRepository();
    const projectsRepo = new ProjectsRepository();
    const episodesRepo = new EpisodesRepository();

    // Get counts in parallel
    const [allProjects, runningJobs, recentJobs] = await Promise.all([
      projectsRepo.list({ limit: 1000 }),
      jobsRepo.listByFilter({ status: 'running', limit: 100 }),
      jobsRepo.listByFilter({ limit: 10 }),
    ]);

    const waitingReviewJobs = await jobsRepo.listByFilter({ limit: 100 });
    const pendingReviews = waitingReviewJobs.filter(j => j.currentStep?.includes('review'));

    return NextResponse.json({
      success: true,
      data: {
        totalProjects: allProjects.length,
        activeJobs: runningJobs.length,
        pendingReviews: pendingReviews.length,
        recentJobs,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

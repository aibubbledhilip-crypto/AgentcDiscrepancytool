import { PrismaClient, Schedule, ScheduleFrequency } from '@prisma/client';
import cron from 'node-cron';
import { ruleService } from './rule.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface CreateScheduleInput {
  name: string;
  description?: string;
  cronExpression: string;
  frequency: ScheduleFrequency;
  timezone?: string;
  ruleId: string;
  createdById: string;
}

interface UpdateScheduleInput {
  name?: string;
  description?: string;
  cronExpression?: string;
  frequency?: ScheduleFrequency;
  timezone?: string;
  isActive?: boolean;
}

class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize scheduler - load all active schedules from DB
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduler service...');

    const activeSchedules = await prisma.schedule.findMany({
      where: { isActive: true },
      include: { rule: true },
    });

    for (const schedule of activeSchedules) {
      this.scheduleJob(schedule);
    }

    logger.info(`Scheduler initialized with ${activeSchedules.length} active schedules`);
  }

  /**
   * Create a new schedule
   */
  async create(input: CreateScheduleInput): Promise<Schedule> {
    // Validate cron expression
    if (!cron.validate(input.cronExpression)) {
      throw new AppError('Invalid cron expression', 400);
    }

    // Verify rule exists
    const rule = await prisma.rule.findUnique({
      where: { id: input.ruleId },
    });

    if (!rule) {
      throw new AppError('Rule not found', 404);
    }

    const nextRunAt = this.getNextRunTime(input.cronExpression);

    const schedule = await prisma.schedule.create({
      data: {
        name: input.name,
        description: input.description,
        cronExpression: input.cronExpression,
        frequency: input.frequency,
        timezone: input.timezone || 'UTC',
        nextRunAt,
        ruleId: input.ruleId,
        createdById: input.createdById,
      },
      include: {
        rule: {
          select: { id: true, name: true },
        },
      },
    });

    // Start the job if active
    if (schedule.isActive) {
      this.scheduleJob(schedule);
    }

    logger.info(`Schedule created: ${schedule.name}`);
    return schedule;
  }

  /**
   * Get all schedules
   */
  async findAll(userId: string, isAdmin: boolean): Promise<Schedule[]> {
    const schedules = await prisma.schedule.findMany({
      where: isAdmin ? {} : { createdById: userId },
      include: {
        rule: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schedules;
  }

  /**
   * Get schedule by ID
   */
  async findById(id: string): Promise<Schedule> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        rule: {
          select: { id: true, name: true, status: true },
        },
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    return schedule;
  }

  /**
   * Update schedule
   */
  async update(id: string, input: UpdateScheduleInput): Promise<Schedule> {
    const existing = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    // Validate cron expression if provided
    if (input.cronExpression && !cron.validate(input.cronExpression)) {
      throw new AppError('Invalid cron expression', 400);
    }

    const updateData: any = { ...input };

    if (input.cronExpression) {
      updateData.nextRunAt = this.getNextRunTime(input.cronExpression);
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        rule: {
          select: { id: true, name: true },
        },
      },
    });

    // Update running job
    this.stopJob(id);
    if (schedule.isActive) {
      this.scheduleJob(schedule);
    }

    logger.info(`Schedule updated: ${schedule.name}`);
    return schedule;
  }

  /**
   * Delete schedule
   */
  async delete(id: string): Promise<void> {
    const existing = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    this.stopJob(id);

    await prisma.schedule.delete({
      where: { id },
    });

    logger.info(`Schedule deleted: ${existing.name}`);
  }

  /**
   * Toggle schedule active status
   */
  async toggleActive(id: string): Promise<Schedule> {
    const existing = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    if (schedule.isActive) {
      this.scheduleJob(schedule);
    } else {
      this.stopJob(id);
    }

    logger.info(`Schedule ${schedule.isActive ? 'activated' : 'deactivated'}: ${schedule.name}`);
    return schedule;
  }

  /**
   * Run schedule immediately
   */
  async runNow(id: string, triggeredById: string): Promise<void> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { rule: true },
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    await this.executeScheduledJob(schedule, triggeredById);
  }

  /**
   * Schedule a cron job
   */
  private scheduleJob(schedule: Schedule): void {
    if (this.jobs.has(schedule.id)) {
      this.stopJob(schedule.id);
    }

    const job = cron.schedule(
      schedule.cronExpression,
      async () => {
        await this.executeScheduledJob(schedule, schedule.createdById);
      },
      {
        timezone: schedule.timezone,
      }
    );

    this.jobs.set(schedule.id, job);
    logger.info(`Job scheduled: ${schedule.name} (${schedule.cronExpression})`);
  }

  /**
   * Stop a scheduled job
   */
  private stopJob(scheduleId: string): void {
    const job = this.jobs.get(scheduleId);
    if (job) {
      job.stop();
      this.jobs.delete(scheduleId);
      logger.info(`Job stopped: ${scheduleId}`);
    }
  }

  /**
   * Execute a scheduled job
   */
  private async executeScheduledJob(
    schedule: Schedule,
    triggeredById: string
  ): Promise<void> {
    logger.info(`Executing scheduled job: ${schedule.name}`);

    try {
      await ruleService.executeRule(schedule.ruleId, triggeredById, schedule.id);

      // Update last run time and next run time
      const nextRunAt = this.getNextRunTime(schedule.cronExpression);
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });
    } catch (error: any) {
      logger.error(`Scheduled job failed: ${schedule.name}`, error);
    }
  }

  /**
   * Calculate next run time from cron expression
   */
  private getNextRunTime(cronExpression: string): Date {
    const interval = cron.validate(cronExpression);
    if (!interval) {
      return new Date();
    }

    // Simple calculation - for more accurate results, use a cron parser library
    const now = new Date();
    return new Date(now.getTime() + 60000); // Default to 1 minute from now
  }

  /**
   * Get cron expression from frequency
   */
  static getCronExpression(frequency: ScheduleFrequency, time?: string): string {
    const [hour, minute] = (time || '00:00').split(':').map(Number);

    switch (frequency) {
      case 'HOURLY':
        return `${minute} * * * *`;
      case 'DAILY':
        return `${minute} ${hour} * * *`;
      case 'WEEKLY':
        return `${minute} ${hour} * * 0`;
      case 'MONTHLY':
        return `${minute} ${hour} 1 * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  }
}

export const schedulerService = new SchedulerService();

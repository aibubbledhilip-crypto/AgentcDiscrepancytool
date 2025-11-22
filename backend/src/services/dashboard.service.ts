import { PrismaClient, ExecutionStatus } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface DashboardStats {
  totalDataSources: number;
  activeDataSources: number;
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalSchedules: number;
  activeSchedules: number;
}

interface RecentExecution {
  id: string;
  ruleName: string;
  status: ExecutionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
  rowCount: number | null;
}

interface ExecutionTrend {
  date: string;
  success: number;
  failed: number;
  total: number;
}

interface DiscrepancySummary {
  ruleId: string;
  ruleName: string;
  discrepancyCount: number;
  lastDetected: Date | null;
}

export class DashboardService {
  /**
   * Get overall dashboard statistics
   */
  async getStats(userId: string, isAdmin: boolean): Promise<DashboardStats> {
    const whereClause = isAdmin ? {} : { createdById: userId };

    const [
      totalDataSources,
      activeDataSources,
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      totalSchedules,
      activeSchedules,
    ] = await Promise.all([
      prisma.dataSource.count({ where: whereClause }),
      prisma.dataSource.count({ where: { ...whereClause, isActive: true } }),
      prisma.rule.count({ where: whereClause }),
      prisma.rule.count({ where: { ...whereClause, status: 'ACTIVE' } }),
      prisma.execution.count({ where: isAdmin ? {} : { triggeredById: userId } }),
      prisma.execution.count({
        where: { ...(isAdmin ? {} : { triggeredById: userId }), status: 'SUCCESS' },
      }),
      prisma.execution.count({
        where: { ...(isAdmin ? {} : { triggeredById: userId }), status: 'FAILED' },
      }),
      prisma.schedule.count({ where: whereClause }),
      prisma.schedule.count({ where: { ...whereClause, isActive: true } }),
    ]);

    return {
      totalDataSources,
      activeDataSources,
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      totalSchedules,
      activeSchedules,
    };
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(
    userId: string,
    isAdmin: boolean,
    limit: number = 10
  ): Promise<RecentExecution[]> {
    const executions = await prisma.execution.findMany({
      where: isAdmin ? {} : { triggeredById: userId },
      include: {
        rule: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return executions.map((e) => ({
      id: e.id,
      ruleName: e.rule.name,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      duration: e.duration,
      rowCount: e.rowCount,
    }));
  }

  /**
   * Get execution trends for the last N days
   */
  async getExecutionTrends(
    userId: string,
    isAdmin: boolean,
    days: number = 7
  ): Promise<ExecutionTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const executions = await prisma.execution.findMany({
      where: {
        ...(isAdmin ? {} : { triggeredById: userId }),
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Group by date
    const trendMap = new Map<string, ExecutionTrend>();

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, {
        date: dateStr,
        success: 0,
        failed: 0,
        total: 0,
      });
    }

    for (const execution of executions) {
      const dateStr = execution.createdAt.toISOString().split('T')[0];
      const trend = trendMap.get(dateStr);
      if (trend) {
        trend.total++;
        if (execution.status === 'SUCCESS') {
          trend.success++;
        } else if (execution.status === 'FAILED') {
          trend.failed++;
        }
      }
    }

    return Array.from(trendMap.values());
  }

  /**
   * Get rules with most discrepancies
   */
  async getDiscrepancySummary(
    userId: string,
    isAdmin: boolean,
    limit: number = 5
  ): Promise<DiscrepancySummary[]> {
    const rules = await prisma.rule.findMany({
      where: isAdmin ? {} : { createdById: userId },
      include: {
        executions: {
          where: {
            status: 'SUCCESS',
            rowCount: { gt: 0 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const summary: DiscrepancySummary[] = rules
      .map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        discrepancyCount: rule.executions.filter((e) => (e.rowCount || 0) > 0).length,
        lastDetected:
          rule.executions.find((e) => (e.rowCount || 0) > 0)?.createdAt || null,
      }))
      .filter((s) => s.discrepancyCount > 0)
      .sort((a, b) => b.discrepancyCount - a.discrepancyCount)
      .slice(0, limit);

    return summary;
  }

  /**
   * Get upcoming scheduled runs
   */
  async getUpcomingSchedules(
    userId: string,
    isAdmin: boolean,
    limit: number = 5
  ) {
    const schedules = await prisma.schedule.findMany({
      where: {
        ...(isAdmin ? {} : { createdById: userId }),
        isActive: true,
        nextRunAt: { gte: new Date() },
      },
      include: {
        rule: {
          select: { id: true, name: true },
        },
      },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });

    return schedules.map((s) => ({
      id: s.id,
      name: s.name,
      ruleName: s.rule.name,
      nextRunAt: s.nextRunAt,
      frequency: s.frequency,
    }));
  }
}

export const dashboardService = new DashboardService();

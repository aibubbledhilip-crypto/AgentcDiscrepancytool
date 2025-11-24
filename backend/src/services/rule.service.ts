import { PrismaClient, Rule, RuleStatus, ExecutionStatus } from '@prisma/client';
import { queryExecutorService, QueryResult } from './queryExecutor.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface CreateRuleInput {
  name: string;
  description?: string;
  sqlQuery: string;
  expectedResult?: string;
  threshold?: number;
  status?: RuleStatus;
  category?: string;
  tags?: string[];
  dataSourceId: string;
  createdById: string;
}

interface UpdateRuleInput {
  name?: string;
  description?: string;
  sqlQuery?: string;
  expectedResult?: string;
  threshold?: number;
  status?: RuleStatus;
  category?: string;
  tags?: string[];
}

interface ExecutionResult {
  success: boolean;
  data?: QueryResult;
  error?: string;
  breachDetected?: boolean;
  breachDetails?: string;
}

export class RuleService {
  /**
   * Generate the next Gatekeeper ID
   */
  private async generateRuleId(): Promise<string> {
    // Find the highest existing ruleId to determine the next number
    // Check both GK- (new) and DQ- (legacy) prefixes
    const [lastGKRule, lastDQRule] = await Promise.all([
      prisma.rule.findFirst({
        where: { ruleId: { startsWith: 'GK-' } },
        orderBy: { ruleId: 'desc' },
        select: { ruleId: true },
      }),
      prisma.rule.findFirst({
        where: { ruleId: { startsWith: 'DQ-' } },
        orderBy: { ruleId: 'desc' },
        select: { ruleId: true },
      }),
    ]);

    let nextNumber = 1;

    // Get the highest number from both prefixes
    if (lastGKRule?.ruleId) {
      const lastNumber = parseInt(lastGKRule.ruleId.replace('GK-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = Math.max(nextNumber, lastNumber + 1);
      }
    }
    if (lastDQRule?.ruleId) {
      const lastNumber = parseInt(lastDQRule.ruleId.replace('DQ-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = Math.max(nextNumber, lastNumber + 1);
      }
    }

    // Format: GK-0000001 (7 digits)
    const paddedNumber = String(nextNumber).padStart(7, '0');
    return `GK-${paddedNumber}`;
  }

  /**
   * Create a new rule
   */
  async create(input: CreateRuleInput): Promise<Rule> {
    // Verify data source exists
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: input.dataSourceId },
    });

    if (!dataSource) {
      throw new AppError('Data source not found', 404);
    }

    // Generate auto-incremented Rule ID
    const ruleId = await this.generateRuleId();

    const rule = await prisma.rule.create({
      data: {
        ruleId,
        name: input.name,
        description: input.description,
        sqlQuery: input.sqlQuery,
        expectedResult: input.expectedResult,
        threshold: input.threshold,
        status: input.status || 'DRAFT',
        category: input.category,
        tags: input.tags || [],
        dataSourceId: input.dataSourceId,
        createdById: input.createdById,
      },
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    logger.info(`Rule created: ${rule.ruleId} - ${rule.name}`);
    return rule;
  }

  /**
   * Get all rules
   */
  async findAll(userId: string, isAdmin: boolean): Promise<Rule[]> {
    const rules = await prisma.rule.findMany({
      where: isAdmin ? {} : { createdById: userId },
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { executions: true, schedules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rules;
  }

  /**
   * Get rule by ID
   */
  async findById(id: string, userId: string, isAdmin: boolean): Promise<Rule> {
    const rule = await prisma.rule.findUnique({
      where: { id },
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        schedules: true,
      },
    });

    if (!rule) {
      throw new AppError('Rule not found', 404);
    }

    if (!isAdmin && rule.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    return rule;
  }

  /**
   * Update rule
   */
  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    input: UpdateRuleInput
  ): Promise<Rule> {
    const existing = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Rule not found', 404);
    }

    if (!isAdmin && existing.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    const rule = await prisma.rule.update({
      where: { id },
      data: input,
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    logger.info(`Rule updated: ${rule.name}`);
    return rule;
  }

  /**
   * Delete rule
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const existing = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Rule not found', 404);
    }

    if (!isAdmin && existing.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Use transaction to delete related records first (cascade delete)
    await prisma.$transaction(async (tx) => {
      // Delete related executions
      await tx.execution.deleteMany({
        where: { ruleId: id },
      });

      // Delete related schedules (and their executions first)
      const schedules = await tx.schedule.findMany({
        where: { ruleId: id },
        select: { id: true },
      });

      for (const schedule of schedules) {
        await tx.execution.deleteMany({
          where: { scheduleId: schedule.id },
        });
      }

      await tx.schedule.deleteMany({
        where: { ruleId: id },
      });

      // Delete related reports
      await tx.report.deleteMany({
        where: { ruleId: id },
      });

      // Finally delete the rule
      await tx.rule.delete({
        where: { id },
      });
    });

    logger.info(`Rule deleted: ${existing.name}`);
  }

  /**
   * Execute a rule and check for discrepancies
   */
  async executeRule(
    ruleId: string,
    triggeredById: string,
    scheduleId?: string
  ): Promise<ExecutionResult> {
    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
      include: { dataSource: true },
    });

    if (!rule) {
      throw new AppError('Rule not found', 404);
    }

    if (rule.status !== 'ACTIVE') {
      throw new AppError('Rule is not active', 400);
    }

    // Create execution record
    const execution = await prisma.execution.create({
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        ruleId,
        triggeredById,
        scheduleId,
      },
    });

    try {
      // Execute the query
      const queryResult = await queryExecutorService.executeQuery(
        rule.dataSourceId,
        rule.sqlQuery
      );

      // Check for breaches
      const breachCheck = this.checkBreach(rule, queryResult);

      // Update execution with results
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          duration: queryResult.executionTime,
          resultData: queryResult as any,
          rowCount: queryResult.rowCount,
        },
      });

      logger.info(`Rule executed successfully: ${rule.name}`);

      return {
        success: true,
        data: queryResult,
        ...breachCheck,
      };
    } catch (error: any) {
      // Update execution with error
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
          errorDetails: { stack: error.stack },
        },
      });

      logger.error(`Rule execution failed: ${rule.name}`, error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check for breaches in query results
   */
  private checkBreach(
    rule: Rule,
    result: QueryResult
  ): { breachDetected: boolean; breachDetails?: string } {
    // If expected result is defined, compare
    if (rule.expectedResult) {
      try {
        const expected = JSON.parse(rule.expectedResult);

        // Simple comparison - can be extended for more complex scenarios
        if (Array.isArray(expected)) {
          if (result.rowCount !== expected.length) {
            return {
              breachDetected: true,
              breachDetails: `Expected ${expected.length} rows, got ${result.rowCount}`,
            };
          }
        }
      } catch {
        // If not JSON, treat as expected row count
        const expectedCount = parseInt(rule.expectedResult, 10);
        if (!isNaN(expectedCount) && result.rowCount !== expectedCount) {
          return {
            breachDetected: true,
            breachDetails: `Expected ${expectedCount} rows, got ${result.rowCount}`,
          };
        }
      }
    }

    // If threshold is defined, check if result exceeds it
    if (rule.threshold !== null && rule.threshold !== undefined) {
      // Assume first numeric column is the value to check
      if (result.rows.length > 0) {
        const firstRow = result.rows[0];
        const numericValue = Object.values(firstRow).find(
          (v) => typeof v === 'number' || !isNaN(parseFloat(v as string))
        );

        if (numericValue !== undefined) {
          const value = typeof numericValue === 'number'
            ? numericValue
            : parseFloat(numericValue as string);

          if (value > rule.threshold) {
            return {
              breachDetected: true,
              breachDetails: `Value ${value} exceeds threshold ${rule.threshold}`,
            };
          }
        }
      }
    }

    // If rows returned and no expected result, flag as potential breach
    if (result.rowCount > 0 && !rule.expectedResult && rule.threshold === null) {
      return {
        breachDetected: true,
        breachDetails: `Query returned ${result.rowCount} rows indicating potential breach`,
      };
    }

    return { breachDetected: false };
  }

  /**
   * Get execution history for a rule
   */
  async getExecutionHistory(
    ruleId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where: { ruleId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          triggeredBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.execution.count({ where: { ruleId } }),
    ]);

    return { executions, total, page, limit };
  }
}

export const ruleService = new RuleService();

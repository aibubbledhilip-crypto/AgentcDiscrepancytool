import { PrismaClient, Report } from '@prisma/client';
import { queryExecutorService, QueryResult } from './queryExecutor.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface CreateReportInput {
  name: string;
  description?: string;
  sqlQuery: string;
  dataSourceId: string;
  ruleId?: string;
  createdById: string;
}

interface ReportWithResults extends Report {
  results?: QueryResult;
}

export class ReportService {
  /**
   * Create and generate a report
   */
  async create(input: CreateReportInput): Promise<ReportWithResults> {
    // Execute the query to get results
    let queryResult: QueryResult | undefined;
    try {
      queryResult = await queryExecutorService.executeQuery(
        input.dataSourceId,
        input.sqlQuery
      );
    } catch (error: any) {
      logger.error('Report query execution failed:', error);
      throw new AppError(`Failed to generate report: ${error.message}`, 400);
    }

    const report = await prisma.report.create({
      data: {
        name: input.name,
        description: input.description,
        sqlQuery: input.sqlQuery,
        resultData: queryResult as any,
        rowCount: queryResult.rowCount,
        ruleId: input.ruleId,
        createdById: input.createdById,
      },
    });

    logger.info(`Report created: ${report.name}`);
    return { ...report, results: queryResult };
  }

  /**
   * Get all reports
   */
  async findAll(
    userId: string,
    isAdmin: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reports: Report[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: isAdmin ? {} : { createdById: userId },
        include: {
          rule: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({
        where: isAdmin ? {} : { createdById: userId },
      }),
    ]);

    return { reports, total };
  }

  /**
   * Get report by ID
   */
  async findById(id: string, userId: string, isAdmin: boolean): Promise<Report> {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        rule: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    if (!isAdmin && report.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    return report;
  }

  /**
   * Delete report
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const existing = await prisma.report.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Report not found', 404);
    }

    if (!isAdmin && existing.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.report.delete({
      where: { id },
    });

    logger.info(`Report deleted: ${existing.name}`);
  }

  /**
   * Re-run a report with the same query
   */
  async rerun(id: string, userId: string, dataSourceId: string): Promise<ReportWithResults> {
    const existing = await prisma.report.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Report not found', 404);
    }

    return this.create({
      name: `${existing.name} (Re-run)`,
      description: existing.description || undefined,
      sqlQuery: existing.sqlQuery,
      dataSourceId,
      ruleId: existing.ruleId || undefined,
      createdById: userId,
    });
  }

  /**
   * Export report to CSV format
   */
  exportToCsv(report: Report): string {
    const resultData = report.resultData as QueryResult | null;
    if (!resultData || !resultData.rows || resultData.rows.length === 0) {
      return '';
    }

    const { columns, rows } = resultData;

    // Header row
    const csvRows = [columns.join(',')];

    // Data rows
    for (const row of rows) {
      const values = columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes if contains comma
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Export report to JSON format
   */
  exportToJson(report: Report): string {
    const resultData = report.resultData as QueryResult | null;
    if (!resultData) {
      return '[]';
    }
    return JSON.stringify(resultData.rows, null, 2);
  }
}

export const reportService = new ReportService();

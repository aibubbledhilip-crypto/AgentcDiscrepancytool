import { DataSource, DataSourceType } from '@prisma/client';
import { dataSourceService } from './datasource.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;
}

export class QueryExecutorService {
  /**
   * Execute a SQL query against a data source
   */
  async executeQuery(dataSourceId: string, sql: string): Promise<QueryResult> {
    const dataSource = await dataSourceService.getWithCredentials(dataSourceId);

    if (!dataSource.isActive) {
      throw new AppError('Data source is inactive', 400);
    }

    const startTime = Date.now();

    try {
      let result: QueryResult;

      switch (dataSource.type) {
        case 'POSTGRESQL':
          result = await this.executePostgresQuery(dataSource, sql);
          break;
        case 'MYSQL':
          result = await this.executeMySQLQuery(dataSource, sql);
          break;
        case 'ATHENA':
          result = await this.executeAthenaQuery(dataSource, sql);
          break;
        default:
          throw new AppError(`Unsupported data source type: ${dataSource.type}`, 400);
      }

      result.executionTime = Date.now() - startTime;
      logger.info(`Query executed successfully on ${dataSource.name} in ${result.executionTime}ms`);

      return result;
    } catch (error: any) {
      logger.error(`Query execution failed on ${dataSource.name}:`, error);
      throw new AppError(`Query execution failed: ${error.message}`, 400);
    }
  }

  /**
   * Execute PostgreSQL query
   */
  private async executePostgresQuery(
    dataSource: DataSource,
    sql: string
  ): Promise<QueryResult> {
    const { Client } = await import('pg');

    const client = new Client({
      host: dataSource.host!,
      port: dataSource.port!,
      database: dataSource.database!,
      user: dataSource.username!,
      password: dataSource.password!,
    });

    try {
      await client.connect();
      const result = await client.query(sql);
      await client.end();

      const columns = result.fields?.map((f) => f.name) || [];
      const rows = result.rows || [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime: 0,
      };
    } catch (error) {
      await client.end().catch(() => {});
      throw error;
    }
  }

  /**
   * Execute MySQL query
   */
  private async executeMySQLQuery(
    dataSource: DataSource,
    sql: string
  ): Promise<QueryResult> {
    const mysql = await import('mysql2/promise');

    const connection = await mysql.createConnection({
      host: dataSource.host!,
      port: dataSource.port!,
      database: dataSource.database!,
      user: dataSource.username!,
      password: dataSource.password!,
    });

    try {
      const [results, fields] = await connection.query(sql);
      await connection.end();

      const rows = Array.isArray(results) ? results : [results];
      const columns = fields ? (fields as any[]).map((f) => f.name) : [];

      return {
        columns,
        rows: rows as Record<string, any>[],
        rowCount: rows.length,
        executionTime: 0,
      };
    } catch (error) {
      await connection.end().catch(() => {});
      throw error;
    }
  }

  /**
   * Execute AWS Athena query
   */
  private async executeAthenaQuery(
    dataSource: DataSource,
    sql: string
  ): Promise<QueryResult> {
    const {
      AthenaClient,
      StartQueryExecutionCommand,
      GetQueryExecutionCommand,
      GetQueryResultsCommand,
    } = await import('@aws-sdk/client-athena');

    const client = new AthenaClient({
      region: dataSource.awsRegion!,
      credentials: {
        accessKeyId: dataSource.awsAccessKeyId!,
        secretAccessKey: dataSource.awsSecretKey!,
      },
    });

    // Start query execution
    const startCommand = new StartQueryExecutionCommand({
      QueryString: sql,
      WorkGroup: dataSource.athenaWorkgroup || 'primary',
      ResultConfiguration: {
        OutputLocation: dataSource.athenaOutputLocation!,
      },
      QueryExecutionContext: {
        Catalog: dataSource.athenaCatalog || 'AwsDataCatalog',
        Database: dataSource.database || undefined,
      },
    });

    const startResult = await client.send(startCommand);
    const queryExecutionId = startResult.QueryExecutionId!;

    // Wait for query to complete
    let queryStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
      if (attempts >= maxAttempts) {
        throw new Error('Query execution timed out');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusCommand = new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId,
      });
      const statusResult = await client.send(statusCommand);
      queryStatus = statusResult.QueryExecution?.Status?.State || 'FAILED';

      if (queryStatus === 'FAILED') {
        const reason = statusResult.QueryExecution?.Status?.StateChangeReason;
        throw new Error(`Athena query failed: ${reason}`);
      }

      if (queryStatus === 'CANCELLED') {
        throw new Error('Athena query was cancelled');
      }

      attempts++;
    }

    // Get results
    const resultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId,
    });
    const resultsResponse = await client.send(resultsCommand);

    const resultSet = resultsResponse.ResultSet;
    const columnInfo = resultSet?.ResultSetMetadata?.ColumnInfo || [];
    const columns = columnInfo.map((c) => c.Name || '');

    const rawRows = resultSet?.Rows || [];
    // Skip header row (first row contains column names)
    const dataRows = rawRows.slice(1);

    const rows = dataRows.map((row) => {
      const obj: Record<string, any> = {};
      row.Data?.forEach((cell, index) => {
        obj[columns[index]] = cell.VarCharValue || null;
      });
      return obj;
    });

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTime: 0,
    };
  }
}

export const queryExecutorService = new QueryExecutorService();

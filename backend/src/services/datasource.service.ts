import { PrismaClient, DataSource, DataSourceType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { encrypt, decrypt } from '../utils/encryption';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface CreateDataSourceInput {
  name: string;
  description?: string;
  type: DataSourceType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretKey?: string;
  athenaWorkgroup?: string;
  athenaOutputLocation?: string;
  athenaCatalog?: string;
  connectionOptions?: Record<string, any>;
  createdById: string;
}

interface UpdateDataSourceInput {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretKey?: string;
  athenaWorkgroup?: string;
  athenaOutputLocation?: string;
  athenaCatalog?: string;
  connectionOptions?: Record<string, any>;
  isActive?: boolean;
}

export class DataSourceService {
  /**
   * Create a new data source
   */
  async create(input: CreateDataSourceInput): Promise<DataSource> {
    // Encrypt sensitive fields
    const encryptedData: Partial<CreateDataSourceInput> = { ...input };

    if (input.password) {
      encryptedData.password = encrypt(input.password);
    }
    if (input.awsAccessKeyId) {
      encryptedData.awsAccessKeyId = encrypt(input.awsAccessKeyId);
    }
    if (input.awsSecretKey) {
      encryptedData.awsSecretKey = encrypt(input.awsSecretKey);
    }

    const dataSource = await prisma.dataSource.create({
      data: encryptedData as any,
    });

    logger.info(`Data source created: ${dataSource.name}`);
    return this.sanitizeDataSource(dataSource);
  }

  /**
   * Get all data sources
   */
  async findAll(userId: string, isAdmin: boolean): Promise<DataSource[]> {
    const dataSources = await prisma.dataSource.findMany({
      where: isAdmin ? {} : { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });

    return dataSources.map((ds) => this.sanitizeDataSource(ds));
  }

  /**
   * Get data source by ID
   */
  async findById(id: string, userId: string, isAdmin: boolean): Promise<DataSource> {
    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
    });

    if (!dataSource) {
      throw new AppError('Data source not found', 404);
    }

    if (!isAdmin && dataSource.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    return this.sanitizeDataSource(dataSource);
  }

  /**
   * Get data source with decrypted credentials (internal use only)
   */
  async getWithCredentials(id: string): Promise<DataSource> {
    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
    });

    if (!dataSource) {
      throw new AppError('Data source not found', 404);
    }

    // Decrypt sensitive fields
    if (dataSource.password) {
      dataSource.password = decrypt(dataSource.password);
    }
    if (dataSource.awsAccessKeyId) {
      dataSource.awsAccessKeyId = decrypt(dataSource.awsAccessKeyId);
    }
    if (dataSource.awsSecretKey) {
      dataSource.awsSecretKey = decrypt(dataSource.awsSecretKey);
    }

    return dataSource;
  }

  /**
   * Update data source
   */
  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    input: UpdateDataSourceInput
  ): Promise<DataSource> {
    const existing = await prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Data source not found', 404);
    }

    if (!isAdmin && existing.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Encrypt sensitive fields if provided
    const updateData: Partial<UpdateDataSourceInput> = { ...input };

    if (input.password) {
      updateData.password = encrypt(input.password);
    }
    if (input.awsAccessKeyId) {
      updateData.awsAccessKeyId = encrypt(input.awsAccessKeyId);
    }
    if (input.awsSecretKey) {
      updateData.awsSecretKey = encrypt(input.awsSecretKey);
    }

    const dataSource = await prisma.dataSource.update({
      where: { id },
      data: updateData as any,
    });

    logger.info(`Data source updated: ${dataSource.name}`);
    return this.sanitizeDataSource(dataSource);
  }

  /**
   * Delete data source
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const existing = await prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Data source not found', 404);
    }

    if (!isAdmin && existing.createdById !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.dataSource.delete({
      where: { id },
    });

    logger.info(`Data source deleted: ${existing.name}`);
  }

  /**
   * Test data source connection
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const dataSource = await this.getWithCredentials(id);

    try {
      switch (dataSource.type) {
        case 'POSTGRESQL':
          return await this.testPostgresConnection(dataSource);
        case 'MYSQL':
          return await this.testMySQLConnection(dataSource);
        case 'ATHENA':
          return await this.testAthenaConnection(dataSource);
        default:
          throw new AppError(`Unsupported data source type: ${dataSource.type}`, 400);
      }
    } catch (error: any) {
      logger.error(`Connection test failed for ${dataSource.name}:`, error);
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Test PostgreSQL connection
   */
  private async testPostgresConnection(
    dataSource: DataSource
  ): Promise<{ success: boolean; message: string }> {
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
      await client.query('SELECT 1');
      await client.end();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Test MySQL connection
   */
  private async testMySQLConnection(
    dataSource: DataSource
  ): Promise<{ success: boolean; message: string }> {
    const mysql = await import('mysql2/promise');

    const connection = await mysql.createConnection({
      host: dataSource.host!,
      port: dataSource.port!,
      database: dataSource.database!,
      user: dataSource.username!,
      password: dataSource.password!,
    });

    try {
      await connection.query('SELECT 1');
      await connection.end();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  /**
   * Test AWS Athena connection
   */
  private async testAthenaConnection(
    dataSource: DataSource
  ): Promise<{ success: boolean; message: string }> {
    const { AthenaClient, GetWorkGroupCommand } = await import('@aws-sdk/client-athena');

    const client = new AthenaClient({
      region: dataSource.awsRegion!,
      credentials: {
        accessKeyId: dataSource.awsAccessKeyId!,
        secretAccessKey: dataSource.awsSecretKey!,
      },
    });

    try {
      await client.send(
        new GetWorkGroupCommand({
          WorkGroup: dataSource.athenaWorkgroup || 'primary',
        })
      );
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      throw new Error(`Athena connection failed: ${error.message}`);
    }
  }

  /**
   * Remove sensitive fields from data source
   */
  private sanitizeDataSource(dataSource: DataSource): DataSource {
    return {
      ...dataSource,
      password: dataSource.password ? '********' : null,
      awsAccessKeyId: dataSource.awsAccessKeyId ? '********' : null,
      awsSecretKey: dataSource.awsSecretKey ? '********' : null,
    };
  }
}

export const dataSourceService = new DataSourceService();

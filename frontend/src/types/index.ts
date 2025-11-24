export type Role = 'ADMIN' | 'USER' | 'VIEWER';
export type DataSourceType = 'POSTGRESQL' | 'MYSQL' | 'ATHENA' | 'SQLSERVER' | 'ORACLE';
export type RuleStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type ScheduleFrequency = 'ONCE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  type: DataSourceType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  awsRegion?: string;
  athenaWorkgroup?: string;
  athenaOutputLocation?: string;
  athenaCatalog?: string;
  isActive: boolean;
  createdAt: string;
  createdById: string;
}

export interface Rule {
  id: string;
  ruleId: string;  // Auto-generated GK-XXXXXXX format (Gatekeeper ID)
  name: string;
  description?: string;
  sqlQuery: string;
  expectedResult?: string;
  threshold?: number;
  status: RuleStatus;
  category?: string;
  tags: string[];
  dataSourceId: string;
  dataSource?: {
    id: string;
    name: string;
    type: DataSourceType;
  };
  createdAt: string;
  updatedAt?: string;
  createdById: string;
  _count?: {
    executions: number;
    schedules: number;
  };
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  frequency: ScheduleFrequency;
  isActive: boolean;
  timezone: string;
  nextRunAt?: string;
  lastRunAt?: string;
  ruleId: string;
  rule?: {
    id: string;
    name: string;
    status: RuleStatus;
  };
  createdAt: string;
  createdById: string;
}

export interface Execution {
  id: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  resultData?: QueryResult;
  rowCount?: number;
  errorMessage?: string;
  ruleId: string;
  scheduleId?: string;
  triggeredById: string;
  triggeredBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  sqlQuery: string;
  resultData?: QueryResult;
  rowCount?: number;
  generatedAt: string;
  ruleId?: string;
  rule?: {
    id: string;
    name: string;
  };
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;
}

export interface DashboardStats {
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

export interface ExecutionTrend {
  date: string;
  success: number;
  failed: number;
  total: number;
}

export interface BreachSummary {
  ruleId: string;
  ruleName: string;
  breachCount: number;
  lastDetected?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

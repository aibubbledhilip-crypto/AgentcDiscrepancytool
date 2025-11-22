import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { dashboardApi } from '../services/api';
import { DashboardStats, ExecutionTrend, DiscrepancySummary } from '../types';
import toast from 'react-hot-toast';

interface RecentExecution {
  id: string;
  ruleName: string;
  status: string;
  startedAt: string | null;
  duration: number | null;
  rowCount: number | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<ExecutionTrend[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, trendsRes, executionsRes, discrepanciesRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getExecutionTrends(7),
        dashboardApi.getRecentExecutions(5),
        dashboardApi.getDiscrepancySummary(5),
      ]);

      setStats(statsRes.data.data);
      setTrends(trendsRes.data.data);
      setRecentExecutions(executionsRes.data.data);
      setDiscrepancies(discrepanciesRes.data.data);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Data Sources',
      value: stats?.totalDataSources || 0,
      active: stats?.activeDataSources || 0,
      icon: CircleStackIcon,
      color: 'bg-blue-500',
      href: '/datasources',
    },
    {
      name: 'Rules',
      value: stats?.totalRules || 0,
      active: stats?.activeRules || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-green-500',
      href: '/rules',
    },
    {
      name: 'Schedules',
      value: stats?.totalSchedules || 0,
      active: stats?.activeSchedules || 0,
      icon: ClockIcon,
      color: 'bg-purple-500',
      href: '/schedules',
    },
    {
      name: 'Executions',
      value: stats?.totalExecutions || 0,
      success: stats?.successfulExecutions || 0,
      failed: stats?.failedExecutions || 0,
      icon: CheckCircleIcon,
      color: 'bg-orange-500',
      href: '/reports',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.name} to={stat.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                {stat.active !== undefined && (
                  <p className="text-xs text-gray-500">{stat.active} active</p>
                )}
                {stat.success !== undefined && (
                  <p className="text-xs text-gray-500">
                    {stat.success} success / {stat.failed} failed
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Trends */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Execution Trends (7 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Success"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discrepancy Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Discrepancies</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discrepancies} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="ruleName" type="category" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="discrepancyCount" fill="#f59e0b" name="Discrepancies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Executions</h2>
          <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-500">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rule</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rows</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentExecutions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No executions yet
                  </td>
                </tr>
              ) : (
                recentExecutions.map((execution) => (
                  <tr key={execution.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{execution.ruleName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          execution.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-700'
                            : execution.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {execution.status === 'SUCCESS' ? (
                          <CheckCircleIcon className="w-3 h-3" />
                        ) : execution.status === 'FAILED' ? (
                          <XCircleIcon className="w-3 h-3" />
                        ) : (
                          <ExclamationTriangleIcon className="w-3 h-3" />
                        )}
                        {execution.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {execution.duration ? `${execution.duration}ms` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {execution.rowCount ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {execution.startedAt
                        ? new Date(execution.startedAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

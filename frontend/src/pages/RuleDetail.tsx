import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlayIcon,
  PencilIcon,
  DocumentTextIcon,
  ClockIcon,
  ChartBarIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { rulesApi } from '../services/api';
import { Rule, Execution } from '../types';

// Export utility functions
const exportToCSV = (columns: string[], rows: any[], filename: string) => {
  const csvContent = [
    columns.join(','),
    ...rows.map(row =>
      columns.map(col => {
        const value = row[col] ?? '';
        // Escape quotes and wrap in quotes if contains comma or quote
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const exportToExcel = (columns: string[], rows: any[], filename: string) => {
  // Create a simple XML-based Excel file (xlsx compatible)
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Data">
    <Table>
      <Row>
        ${columns.map(col => `<Cell><Data ss:Type="String">${escapeXml(col)}</Data></Cell>`).join('')}
      </Row>
      ${rows.map(row => `
      <Row>
        ${columns.map(col => {
          const value = row[col] ?? '';
          const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== '');
          return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(String(value))}</Data></Cell>`;
        }).join('')}
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Simple line chart component
const LineChart = ({ data }: { data: { date: string; value: number }[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No history data available</div>;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-64 relative">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.2" />
        ))}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * 100;
          const y = 100 - ((d.value - minValue) / range) * 80 - 10;
          return (
            <circle key={i} cx={x} cy={y} r="1" fill="#3b82f6" />
          );
        })}
      </svg>
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
          <span key={i}>{d.date}</span>
        ))}
      </div>
      {/* Y-axis labels */}
      <div className="absolute top-0 left-0 bottom-8 flex flex-col justify-between text-xs text-gray-500">
        <span>{maxValue.toLocaleString()}</span>
        <span>{Math.round((maxValue + minValue) / 2).toLocaleString()}</span>
        <span>{minValue.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default function RuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rule, setRule] = useState<Rule | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'dataQuality'>('overview');
  const [activeBottomTab, setActiveBottomTab] = useState<'data' | 'history' | 'definition'>('data');

  useEffect(() => {
    if (id) {
      fetchRule();
      fetchExecutions();
    }
  }, [id]);

  const fetchRule = async () => {
    try {
      const response = await rulesApi.getById(id!);
      setRule(response.data.data);
    } catch (error) {
      toast.error('Failed to load rule');
      navigate('/rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await rulesApi.getExecutions(id!, 1, 100);
      setExecutions(response.data.data || []);
    } catch (error) {
      // Silently fail
    }
  };

  const handleExecute = async () => {
    if (!rule) return;
    setExecuting(true);
    try {
      const response = await rulesApi.execute(rule.id);
      const result = response.data.data;
      if (result.success) {
        if (result.discrepancyDetected) {
          toast.error(`Discrepancy detected: ${result.discrepancyDetails}`);
        } else {
          toast.success(`Executed successfully. ${result.data?.rowCount || 0} rows returned`);
        }
      }
      fetchRule();
      fetchExecutions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Rule not found</p>
      </div>
    );
  }

  // Calculate stats from executions
  const lastExecution = executions[0];
  const totalExceptions = executions.reduce((sum, e) => sum + (e.rowCount || 0), 0);
  const successCount = executions.filter(e => e.status === 'SUCCESS').length;
  const dqScore = executions.length > 0 ? ((successCount / executions.length) * 100).toFixed(2) : '0.00';

  // Prepare history data for chart
  const historyData = executions
    .slice()
    .reverse()
    .map(e => ({
      date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: e.rowCount || 0,
    }));

  // Get latest result data
  const latestResultData = lastExecution?.resultData as any;
  const resultColumns = latestResultData?.columns || [];
  const resultRows = latestResultData?.rows || [];

  const isAlerting = lastExecution && (lastExecution.rowCount || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/rules')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-blue-600">
                <DocumentTextIcon className="w-6 h-6" />
                <span className="text-xl font-semibold">{rule.ruleId}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  isAlerting
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-green-100 text-green-700 border border-green-300'
                }`}
              >
                {isAlerting ? 'Alerting' : 'Healthy'}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">
                {rule.description || rule.name}
              </span>
              <span className="ml-2 text-gray-500">Custom Query</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={executing || rule.status !== 'ACTIVE'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {executing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            Run Rule
          </button>
          <button
            onClick={() => navigate(`/rules/${rule.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveMainTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeMainTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveMainTab('dataQuality')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeMainTab === 'dataQuality'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Quality
          </button>
        </nav>
      </div>

      {/* Overview Section */}
      {activeMainTab === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-blue-600 font-medium mb-4 flex items-center gap-2">
            <span className="text-gray-400">▼</span> Overview
          </h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Definition Panel */}
            <div>
              <h4 className="text-blue-600 font-medium mb-4">Definition</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500 w-1/3">Rule Type</td>
                    <td className="py-2">Custom Query</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Applied To</td>
                    <td className="py-2">
                      <span className="text-blue-600">{rule.dataSource?.name || 'Unknown'}</span>
                      <span className="mx-1">›</span>
                      <span className="text-blue-600">{rule.dataSource?.type}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Attributes</td>
                    <td className="py-2">
                      {rule.tags && rule.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Category</td>
                    <td className="py-2">{rule.category || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Scope</td>
                    <td className="py-2">All Data</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Thresholds</td>
                    <td className="py-2">
                      {rule.threshold !== null && rule.threshold !== undefined
                        ? `Constant threshold: ${rule.threshold}`
                        : 'Not set'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-500">Status</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rule.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        rule.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Status Panel */}
            <div>
              <h4 className="text-blue-600 font-medium mb-4">Status</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500 w-1/3">Run Result</td>
                    <td className="py-2">
                      {lastExecution ? (
                        <span className="flex items-center gap-2">
                          {(lastExecution.rowCount || 0) > 0 ? (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          )}
                          {(lastExecution.rowCount || 0).toLocaleString()} Exception(s)
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Last Refreshed</td>
                    <td className="py-2">
                      {lastExecution
                        ? new Date(lastExecution.createdAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">DQ Score</td>
                    <td className="py-2">{dqScore}%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Total Executions</td>
                    <td className="py-2">{executions.length}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-500">Activity</td>
                    <td className="py-2">
                      <div className="text-sm">
                        <div>Exception records: {totalExceptions.toLocaleString()}</div>
                        <div>Total runs: {executions.length}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveBottomTab('data')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeBottomTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TableCellsIcon className="w-4 h-4" />
              Data
            </button>
            <button
              onClick={() => setActiveBottomTab('history')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeBottomTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ChartBarIcon className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setActiveBottomTab('definition')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeBottomTab === 'definition'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CodeBracketIcon className="w-4 h-4" />
              Definition
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Data Tab */}
          {activeBottomTab === 'data' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium">Run Results</h4>
                {resultRows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportToCSV(resultColumns, resultRows, `${rule.ruleId}-data`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportToExcel(resultColumns, resultRows, `${rule.ruleId}-data`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Excel
                    </button>
                  </div>
                )}
              </div>
              {resultRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {resultColumns.map((col: string, i: number) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {resultRows.slice(0, 50).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {resultColumns.map((col: string, j: number) => (
                            <td key={j} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultRows.length > 50 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing 50 of {resultRows.length} rows
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TableCellsIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No data available. Run the rule to see results.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeBottomTab === 'history' && (
            <div>
              <h4 className="text-lg font-medium mb-4">Execution History</h4>
              <div className="mb-6">
                <LineChart data={historyData} />
              </div>
              <h5 className="font-medium mb-3">Execution Log</h5>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row Count</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {executions.length > 0 ? (
                      executions.map((exec, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(exec.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              exec.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                              exec.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {(exec.rowCount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {exec.duration ? `${exec.duration}ms` : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No execution history
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Definition Tab */}
          {activeBottomTab === 'definition' && (
            <div>
              <h4 className="text-lg font-medium mb-4">Rule Definition</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Rule Type</label>
                  <p className="text-gray-900">Custom Query</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Rule Description</label>
                  <p className="text-gray-900">{rule.description || rule.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Data Source</label>
                  <p className="text-gray-900">{rule.dataSource?.name} ({rule.dataSource?.type})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">SQL Query</label>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    {rule.sqlQuery}
                  </pre>
                </div>
                {rule.expectedResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Expected Result</label>
                    <p className="text-gray-900">{rule.expectedResult}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

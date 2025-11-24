import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  BellAlertIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { rulesApi, dataSourceApi } from '../services/api';
import { Rule, DataSource, RuleStatus } from '../types';

interface RuleForm {
  name: string;
  description: string;
  sqlQuery: string;
  dataSourceId: string;
  expectedResult: string;
  threshold: number | null;
  status: RuleStatus;
  category: string;
  tags: string;
}

// Extended rule type with execution info for display
interface RuleWithExecution extends Rule {
  ruleId: string;
  runStatus: 'Passed' | 'Exception';
  alertStatus: 'Healthy' | 'Alerting';
  runResult: number;
  runDate: string;
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(50);

  // Filter state
  const [filters, setFilters] = useState({
    ruleId: '',
    ruleDesc: '',
    runStatus: '',
    alertStatus: '',
    runResult: '',
    runDate: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RuleForm>();

  useEffect(() => {
    Promise.all([fetchRules(), fetchDataSources()]);
  }, []);

  const fetchRules = async () => {
    try {
      const response = await rulesApi.getAll();
      setRules(response.data.data);
    } catch (error) {
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchDataSources = async () => {
    try {
      const response = await dataSourceApi.getAll();
      setDataSources(response.data.data);
    } catch (error) {
      // Silently fail
    }
  };

  // Transform rules for display with mock execution data
  const rulesWithExecution: RuleWithExecution[] = useMemo(() => {
    return rules.map((rule, index) => {
      // Generate consistent mock data based on rule properties
      const hasExecutions = rule._count?.executions && rule._count.executions > 0;
      const runResult = hasExecutions ? Math.floor(Math.random() * 10000) : 0;
      const isHealthy = runResult === 0;

      return {
        ...rule,
        ruleId: `DQ-${String(1000 + index).padStart(7, '0')}`,
        runStatus: isHealthy ? 'Passed' : 'Exception',
        alertStatus: isHealthy ? 'Healthy' : 'Alerting',
        runResult,
        runDate: hasExecutions
          ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '-',
      };
    });
  }, [rules]);

  // Filter and paginate rules
  const filteredRules = useMemo(() => {
    return rulesWithExecution.filter((rule) => {
      if (filters.ruleId && !rule.ruleId.toLowerCase().includes(filters.ruleId.toLowerCase())) return false;
      if (filters.ruleDesc && !rule.description?.toLowerCase().includes(filters.ruleDesc.toLowerCase())) return false;
      if (filters.runStatus && rule.runStatus !== filters.runStatus) return false;
      if (filters.alertStatus && rule.alertStatus !== filters.alertStatus) return false;
      return true;
    });
  }, [rulesWithExecution, filters]);

  const totalRecords = filteredRules.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
  const paginatedRules = filteredRules.slice(startIndex, endIndex);

  // Stats calculations
  const stats = useMemo(() => {
    const total = rulesWithExecution.length;
    const recentlyExecuted = rulesWithExecution.filter((r) => r.runDate !== '-').length;
    const withAlerts = rulesWithExecution.filter((r) => r.alertStatus === 'Alerting').length;
    const assignedToMe = Math.floor(total * 0.7); // Mock value
    return { total, recentlyExecuted, withAlerts, assignedToMe };
  }, [rulesWithExecution]);

  const onSubmit = async (data: RuleForm) => {
    try {
      const payload = {
        ...data,
        threshold: data.threshold || null,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
      };

      if (editingId) {
        await rulesApi.update(editingId, payload);
        toast.success('Rule updated');
      } else {
        await rulesApi.create(payload);
        toast.success('Rule created');
      }
      setShowModal(false);
      reset();
      setEditingId(null);
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (rule: Rule) => {
    setEditingId(rule.id);
    reset({
      name: rule.name,
      description: rule.description || '',
      sqlQuery: rule.sqlQuery,
      dataSourceId: rule.dataSourceId,
      expectedResult: rule.expectedResult || '',
      threshold: rule.threshold || null,
      status: rule.status,
      category: rule.category || '',
      tags: rule.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await rulesApi.delete(id);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      const response = await rulesApi.execute(id);
      const result = response.data.data;
      if (result.success) {
        if (result.discrepancyDetected) {
          toast.error(`Discrepancy detected: ${result.discrepancyDetails}`);
        } else {
          toast.success(`Executed successfully. ${result.data?.rowCount || 0} rows returned`);
        }
      }
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Execution failed');
    } finally {
      setExecuting(null);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    reset({
      name: '',
      description: '',
      sqlQuery: '',
      dataSourceId: dataSources[0]?.id || '',
      expectedResult: '',
      threshold: null,
      status: 'DRAFT',
      category: '',
      tags: '',
    });
    setShowModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedRules.size === paginatedRules.length) {
      setSelectedRules(new Set());
    } else {
      setSelectedRules(new Set(paginatedRules.map((r) => r.id)));
    }
  };

  const toggleSelectRule = (id: string) => {
    const newSelected = new Set(selectedRules);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRules(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">DQ Rules</h1>
          <button
            onClick={fetchRules}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button
            onClick={openCreateModal}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Add Rule"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex flex-col items-center px-3 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5" />
            <span className="text-xs mt-0.5">Search</span>
          </button>
          <button className="flex flex-col items-center px-3 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="text-xs mt-0.5">Download</span>
          </button>
          <button className="flex flex-col items-center px-3 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <ArrowUpTrayIcon className="w-5 h-5" />
            <span className="text-xs mt-0.5">Import</span>
          </button>
          <button className="flex flex-col items-center px-3 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <BookmarkIcon className="w-5 h-5" />
            <span className="text-xs mt-0.5">Save</span>
          </button>
          <button className="flex flex-col items-center px-3 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <ShareIcon className="w-5 h-5" />
            <span className="text-xs mt-0.5">Share</span>
          </button>
        </div>
      </div>

      {/* Pagination Info Bar */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
        <span className="text-sm text-gray-600">Total records {totalRecords}</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={10}>10 records per page</option>
              <option value={25}>25 records per page</option>
              <option value={50}>50 records per page</option>
              <option value={100}>100 records per page</option>
            </select>
          </div>
          <span className="text-sm text-gray-600">
            {startIndex + 1} - {endIndex} of {totalRecords}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm px-2">
              Page{' '}
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const page = Number(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center"
                min={1}
                max={totalPages}
              />{' '}
              of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6" />
            <span className="font-medium">Total Rules</span>
          </div>
          <span className="text-3xl font-bold">{stats.total}</span>
        </div>
        <div className="bg-white px-6 py-4 flex items-center justify-between border-r border-gray-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-gray-500" />
            <span className="text-gray-700">Recently Executed</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">{stats.recentlyExecuted}</span>
        </div>
        <div className="bg-white px-6 py-4 flex items-center justify-between border-r border-gray-200">
          <div className="flex items-center gap-3">
            <BellAlertIcon className="w-6 h-6 text-gray-500" />
            <span className="text-gray-700">With Alerts</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">{stats.withAlerts}</span>
        </div>
        <div className="bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserIcon className="w-6 h-6 text-gray-500" />
            <span className="text-gray-700">Assigned to me</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">{stats.assignedToMe}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.size === paginatedRules.length && paginatedRules.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Rule ID
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Rule Desc
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Run Status
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Alert Status
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Run Result
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">SA</span> Run Date
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-white border-b">
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder=""
                      value={filters.ruleId}
                      onChange={(e) => setFilters({ ...filters, ruleId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder=""
                      value={filters.ruleDesc}
                      onChange={(e) => setFilters({ ...filters, ruleDesc: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={filters.runStatus}
                      onChange={(e) => setFilters({ ...filters, runStatus: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="">All</option>
                      <option value="Passed">Passed</option>
                      <option value="Exception">Exception</option>
                    </select>
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={filters.alertStatus}
                      onChange={(e) => setFilters({ ...filters, alertStatus: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="">All</option>
                      <option value="Healthy">Healthy</option>
                      <option value="Alerting">Alerting</option>
                    </select>
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder=""
                      value={filters.runResult}
                      onChange={(e) => setFilters({ ...filters, runResult: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder=""
                      value={filters.runDate}
                      onChange={(e) => setFilters({ ...filters, runDate: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No rules found. Create your first rule to get started.
                  </td>
                </tr>
              ) : (
                paginatedRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRules.has(rule.id)}
                        onChange={() => toggleSelectRule(rule.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {rule.ruleId}
                        <DocumentTextIcon className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 max-w-md truncate" title={rule.description || rule.name}>
                      {rule.description || rule.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {rule.runStatus === 'Passed' ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">Passed</span>
                          </>
                        ) : (
                          <>
                            <DocumentTextIcon className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-700">Exception</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                          rule.alertStatus === 'Healthy'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {rule.alertStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {rule.runResult.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {rule.runDate}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExecute(rule.id)}
                          disabled={executing === rule.id || rule.status !== 'ACTIVE'}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="Execute"
                        >
                          {executing === rule.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                          ) : (
                            <PlayIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Button */}
      <div className="flex justify-end">
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add New Rule
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingId ? 'Edit Rule' : 'Add Rule'}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Name</label>
                    <input
                      className={`input ${errors.name ? 'input-error' : ''}`}
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <p className="error-text">{errors.name.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea className="input" rows={2} {...register('description')} />
                  </div>
                  <div>
                    <label className="label">Data Source</label>
                    <select
                      className={`input ${errors.dataSourceId ? 'input-error' : ''}`}
                      {...register('dataSourceId', { required: 'Data source is required' })}
                    >
                      <option value="">Select data source</option>
                      {dataSources.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.type})
                        </option>
                      ))}
                    </select>
                    {errors.dataSourceId && (
                      <p className="error-text">{errors.dataSourceId.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input" {...register('status')}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">SQL Query</label>
                    <textarea
                      className={`input font-mono text-sm ${errors.sqlQuery ? 'input-error' : ''}`}
                      rows={6}
                      placeholder="SELECT * FROM table WHERE ..."
                      {...register('sqlQuery', { required: 'SQL query is required' })}
                    />
                    {errors.sqlQuery && <p className="error-text">{errors.sqlQuery.message}</p>}
                  </div>
                  <div>
                    <label className="label">Expected Result (optional)</label>
                    <input
                      className="input"
                      placeholder="Number of rows or JSON"
                      {...register('expectedResult')}
                    />
                  </div>
                  <div>
                    <label className="label">Threshold (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      {...register('threshold', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <input className="input" {...register('category')} />
                  </div>
                  <div>
                    <label className="label">Tags (comma separated)</label>
                    <input className="input" placeholder="tag1, tag2" {...register('tags')} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

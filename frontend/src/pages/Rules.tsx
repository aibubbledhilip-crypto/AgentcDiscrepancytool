import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
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

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

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

  const getStatusColor = (status: RuleStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-700';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Data Quality Rules</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No rules configured yet.</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              Create your first rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-500 mb-2">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Data Source: {rule.dataSource?.name || 'Unknown'}</span>
                    {rule.category && <span>Category: {rule.category}</span>}
                    {rule._count && (
                      <>
                        <span>{rule._count.executions} executions</span>
                        <span>{rule._count.schedules} schedules</span>
                      </>
                    )}
                  </div>
                  {rule.tags && rule.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecute(rule.id)}
                    disabled={executing === rule.id || rule.status !== 'ACTIVE'}
                    className="btn-primary flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    {executing === rule.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <PlayIcon className="w-4 h-4" />
                    )}
                    Run
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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

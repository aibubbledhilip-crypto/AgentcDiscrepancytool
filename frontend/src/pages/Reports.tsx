import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { reportsApi, dataSourceApi } from '../services/api';
import { Report, DataSource, QueryResult } from '../types';

interface ReportForm {
  name: string;
  description: string;
  sqlQuery: string;
  dataSourceId: string;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportForm>();

  useEffect(() => {
    Promise.all([fetchReports(), fetchDataSources()]);
  }, []);

  const fetchReports = async () => {
    try {
      const response = await reportsApi.getAll();
      setReports(response.data.data);
    } catch (error) {
      toast.error('Failed to load reports');
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

  const onSubmit = async (data: ReportForm) => {
    setGenerating(true);
    try {
      await reportsApi.create(data);
      toast.success('Report generated');
      setShowModal(false);
      reset();
      fetchReports();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await reportsApi.delete(id);
      toast.success('Report deleted');
      fetchReports();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleExport = async (id: string, format: 'csv' | 'json') => {
    try {
      const response =
        format === 'csv' ? await reportsApi.exportCsv(id) : await reportsApi.exportJson(id);

      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Export failed');
    }
  };

  const handleView = async (id: string) => {
    try {
      const response = await reportsApi.getById(id);
      setViewingReport(response.data.data);
    } catch (error) {
      toast.error('Failed to load report');
    }
  };

  const openCreateModal = () => {
    reset({
      name: '',
      description: '',
      sqlQuery: '',
      dataSourceId: dataSources[0]?.id || '',
    });
    setShowModal(true);
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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Generate Report
        </button>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rows</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Generated</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{report.name}</p>
                        {report.description && (
                          <p className="text-sm text-gray-500">{report.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{report.rowCount ?? 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(report.generatedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(report.id)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="View"
                        >
                          <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleExport(report.id, 'csv')}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="Export CSV"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="p-2 text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Generate Report</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Report Name</label>
                  <input
                    className={`input ${errors.name ? 'input-error' : ''}`}
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && <p className="error-text">{errors.name.message}</p>}
                </div>
                <div>
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
                  <label className="label">SQL Query</label>
                  <textarea
                    className={`input font-mono text-sm ${errors.sqlQuery ? 'input-error' : ''}`}
                    rows={6}
                    placeholder="SELECT * FROM table WHERE ..."
                    {...register('sqlQuery', { required: 'SQL query is required' })}
                  />
                  {errors.sqlQuery && <p className="error-text">{errors.sqlQuery.message}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={generating} className="btn-primary">
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{viewingReport.name}</h2>
                <button
                  onClick={() => setViewingReport(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              {viewingReport.description && (
                <p className="text-sm text-gray-500 mt-1">{viewingReport.description}</p>
              )}
            </div>
            <div className="flex-1 overflow-auto p-6">
              {viewingReport.resultData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {(viewingReport.resultData as QueryResult).columns.map((col, i) => (
                          <th
                            key={i}
                            className="text-left py-2 px-3 font-medium text-gray-700 bg-gray-50"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingReport.resultData as QueryResult).rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          {(viewingReport.resultData as QueryResult).columns.map((col, j) => (
                            <td key={j} className="py-2 px-3 text-gray-600">
                              {row[col]?.toString() ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

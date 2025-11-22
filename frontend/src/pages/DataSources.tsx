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
} from '@heroicons/react/24/outline';
import { dataSourceApi } from '../services/api';
import { DataSource, DataSourceType } from '../types';
import { useAuthStore } from '../store/authStore';

interface DataSourceForm {
  name: string;
  description: string;
  type: DataSourceType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretKey: string;
  athenaWorkgroup: string;
  athenaOutputLocation: string;
  athenaCatalog: string;
}

export default function DataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DataSourceForm>();

  const selectedType = watch('type');

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await dataSourceApi.getAll();
      setDataSources(response.data.data);
    } catch (error) {
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: DataSourceForm) => {
    try {
      if (editingId) {
        await dataSourceApi.update(editingId, data);
        toast.success('Data source updated');
      } else {
        await dataSourceApi.create(data);
        toast.success('Data source created');
      }
      setShowModal(false);
      reset();
      setEditingId(null);
      fetchDataSources();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (ds: DataSource) => {
    setEditingId(ds.id);
    reset({
      name: ds.name,
      description: ds.description || '',
      type: ds.type,
      host: ds.host || '',
      port: ds.port || 5432,
      database: ds.database || '',
      username: ds.username || '',
      password: '',
      awsRegion: ds.awsRegion || '',
      awsAccessKeyId: '',
      awsSecretKey: '',
      athenaWorkgroup: ds.athenaWorkgroup || '',
      athenaOutputLocation: ds.athenaOutputLocation || '',
      athenaCatalog: ds.athenaCatalog || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data source?')) return;
    try {
      await dataSourceApi.delete(id);
      toast.success('Data source deleted');
      fetchDataSources();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const response = await dataSourceApi.testConnection(id);
      if (response.data.success) {
        toast.success('Connection successful!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Connection failed');
    } finally {
      setTesting(null);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    reset({
      name: '',
      description: '',
      type: 'POSTGRESQL',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      awsRegion: 'us-east-1',
      awsAccessKeyId: '',
      awsSecretKey: '',
      athenaWorkgroup: 'primary',
      athenaOutputLocation: '',
      athenaCatalog: 'AwsDataCatalog',
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
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Data Source
          </button>
        )}
      </div>

      {/* Data Sources List */}
      <div className="grid gap-4">
        {dataSources.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No data sources configured yet.</p>
            {isAdmin && (
              <button onClick={openCreateModal} className="btn-primary mt-4">
                Add your first data source
              </button>
            )}
          </div>
        ) : (
          dataSources.map((ds) => (
            <div key={ds.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ds.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{ds.name}</h3>
                    <p className="text-sm text-gray-500">
                      {ds.type} {ds.host && `- ${ds.host}:${ds.port}`}
                      {ds.type === 'ATHENA' && ds.awsRegion && `- ${ds.awsRegion}`}
                    </p>
                    {ds.description && (
                      <p className="text-sm text-gray-400 mt-1">{ds.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleTest(ds.id)}
                        disabled={testing === ds.id}
                        className="btn-secondary flex items-center gap-1 text-sm"
                      >
                        {testing === ds.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                        ) : (
                          <PlayIcon className="w-4 h-4" />
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => handleEdit(ds)}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ds.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingId ? 'Edit Data Source' : 'Add Data Source'}
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
                  <div className="col-span-2">
                    <label className="label">Type</label>
                    <select className="input" {...register('type', { required: true })}>
                      <option value="POSTGRESQL">PostgreSQL</option>
                      <option value="MYSQL">MySQL</option>
                      <option value="ATHENA">AWS Athena</option>
                      <option value="SQLSERVER">SQL Server</option>
                      <option value="ORACLE">Oracle</option>
                    </select>
                  </div>

                  {/* Database connection fields */}
                  {selectedType !== 'ATHENA' && (
                    <>
                      <div>
                        <label className="label">Host</label>
                        <input className="input" {...register('host')} />
                      </div>
                      <div>
                        <label className="label">Port</label>
                        <input
                          type="number"
                          className="input"
                          {...register('port', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <label className="label">Database</label>
                        <input className="input" {...register('database')} />
                      </div>
                      <div>
                        <label className="label">Username</label>
                        <input className="input" {...register('username')} />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Password</label>
                        <input type="password" className="input" {...register('password')} />
                      </div>
                    </>
                  )}

                  {/* Athena fields */}
                  {selectedType === 'ATHENA' && (
                    <>
                      <div>
                        <label className="label">AWS Region</label>
                        <input className="input" {...register('awsRegion')} />
                      </div>
                      <div>
                        <label className="label">Database/Catalog</label>
                        <input className="input" {...register('database')} />
                      </div>
                      <div>
                        <label className="label">AWS Access Key ID</label>
                        <input className="input" {...register('awsAccessKeyId')} />
                      </div>
                      <div>
                        <label className="label">AWS Secret Key</label>
                        <input type="password" className="input" {...register('awsSecretKey')} />
                      </div>
                      <div>
                        <label className="label">Workgroup</label>
                        <input className="input" {...register('athenaWorkgroup')} />
                      </div>
                      <div>
                        <label className="label">Output Location (S3)</label>
                        <input
                          className="input"
                          placeholder="s3://bucket/path/"
                          {...register('athenaOutputLocation')}
                        />
                      </div>
                    </>
                  )}
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

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { scheduleApi, rulesApi } from '../services/api';
import { Schedule, Rule, ScheduleFrequency } from '../types';

interface ScheduleForm {
  name: string;
  description: string;
  cronExpression: string;
  frequency: ScheduleFrequency;
  timezone: string;
  ruleId: string;
}

const frequencyOptions: { value: ScheduleFrequency; label: string; cron: string }[] = [
  { value: 'HOURLY', label: 'Every Hour', cron: '0 * * * *' },
  { value: 'DAILY', label: 'Daily at midnight', cron: '0 0 * * *' },
  { value: 'WEEKLY', label: 'Weekly on Sunday', cron: '0 0 * * 0' },
  { value: 'MONTHLY', label: 'Monthly on 1st', cron: '0 0 1 * *' },
  { value: 'CUSTOM', label: 'Custom', cron: '' },
];

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ScheduleForm>();

  const selectedFrequency = watch('frequency');

  useEffect(() => {
    Promise.all([fetchSchedules(), fetchRules()]);
  }, []);

  useEffect(() => {
    if (selectedFrequency && selectedFrequency !== 'CUSTOM') {
      const option = frequencyOptions.find((f) => f.value === selectedFrequency);
      if (option) {
        setValue('cronExpression', option.cron);
      }
    }
  }, [selectedFrequency, setValue]);

  const fetchSchedules = async () => {
    try {
      const response = await scheduleApi.getAll();
      setSchedules(response.data.data);
    } catch (error) {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await rulesApi.getAll();
      setRules(response.data.data.filter((r: Rule) => r.status === 'ACTIVE'));
    } catch (error) {
      // Silently fail
    }
  };

  const onSubmit = async (data: ScheduleForm) => {
    try {
      if (editingId) {
        await scheduleApi.update(editingId, data);
        toast.success('Schedule updated');
      } else {
        await scheduleApi.create(data);
        toast.success('Schedule created');
      }
      setShowModal(false);
      reset();
      setEditingId(null);
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    reset({
      name: schedule.name,
      description: schedule.description || '',
      cronExpression: schedule.cronExpression,
      frequency: schedule.frequency,
      timezone: schedule.timezone,
      ruleId: schedule.ruleId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await scheduleApi.delete(id);
      toast.success('Schedule deleted');
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await scheduleApi.toggle(id);
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Toggle failed');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await scheduleApi.runNow(id);
      toast.success('Schedule executed');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Execution failed');
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    reset({
      name: '',
      description: '',
      cronExpression: '0 0 * * *',
      frequency: 'DAILY',
      timezone: 'UTC',
      ruleId: rules[0]?.id || '',
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
        <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Schedule
        </button>
      </div>

      {/* Schedules List */}
      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No schedules configured yet.</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              Create your first schedule
            </button>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        schedule.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-gray-500 mb-2">{schedule.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Rule: {schedule.rule?.name || 'Unknown'}</span>
                    <span>Cron: {schedule.cronExpression}</span>
                    <span>Timezone: {schedule.timezone}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    {schedule.nextRunAt && (
                      <span>Next run: {new Date(schedule.nextRunAt).toLocaleString()}</span>
                    )}
                    {schedule.lastRunAt && (
                      <span>Last run: {new Date(schedule.lastRunAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    className="btn-primary flex items-center gap-1 text-sm"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Run Now
                  </button>
                  <button
                    onClick={() => handleToggle(schedule.id)}
                    className={`p-2 rounded-lg ${
                      schedule.isActive
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={schedule.isActive ? 'Pause' : 'Activate'}
                  >
                    {schedule.isActive ? (
                      <PauseIcon className="w-5 h-5" />
                    ) : (
                      <PlayIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingId ? 'Edit Schedule' : 'Add Schedule'}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Name</label>
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
                  <label className="label">Rule</label>
                  <select
                    className={`input ${errors.ruleId ? 'input-error' : ''}`}
                    {...register('ruleId', { required: 'Rule is required' })}
                  >
                    <option value="">Select a rule</option>
                    {rules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                  {errors.ruleId && <p className="error-text">{errors.ruleId.message}</p>}
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" {...register('frequency')}>
                    {frequencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Cron Expression</label>
                  <input
                    className={`input font-mono ${errors.cronExpression ? 'input-error' : ''}`}
                    placeholder="0 0 * * *"
                    {...register('cronExpression', { required: 'Cron expression is required' })}
                  />
                  {errors.cronExpression && (
                    <p className="error-text">{errors.cronExpression.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Format: minute hour day-of-month month day-of-week
                  </p>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <input className="input" {...register('timezone')} />
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

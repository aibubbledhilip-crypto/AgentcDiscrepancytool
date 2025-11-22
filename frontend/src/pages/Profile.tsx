import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { user, updateUser } = useAuthStore();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>();

  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data: ProfileForm) => {
    setLoading(true);
    try {
      const response = await authApi.updateProfile(data);
      updateUser(response.data.data);
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPasswordLoading(true);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed');
      resetPassword();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Password change failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

      {/* Profile Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                className={`input ${profileErrors.firstName ? 'input-error' : ''}`}
                {...registerProfile('firstName', { required: 'First name is required' })}
              />
              {profileErrors.firstName && (
                <p className="error-text">{profileErrors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                className={`input ${profileErrors.lastName ? 'input-error' : ''}`}
                {...registerProfile('lastName', { required: 'Last name is required' })}
              />
              {profileErrors.lastName && (
                <p className="error-text">{profileErrors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className={`input ${profileErrors.email ? 'input-error' : ''}`}
              {...registerProfile('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {profileErrors.email && <p className="error-text">{profileErrors.email.message}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <input
              className="input bg-gray-100"
              value={user?.role || ''}
              disabled
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className={`input ${passwordErrors.currentPassword ? 'input-error' : ''}`}
              {...registerPassword('currentPassword', {
                required: 'Current password is required',
              })}
            />
            {passwordErrors.currentPassword && (
              <p className="error-text">{passwordErrors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className={`input ${passwordErrors.newPassword ? 'input-error' : ''}`}
              {...registerPassword('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain uppercase, lowercase, and number',
                },
              })}
            />
            {passwordErrors.newPassword && (
              <p className="error-text">{passwordErrors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className={`input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
              {...registerPassword('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === newPassword || 'Passwords do not match',
              })}
            />
            {passwordErrors.confirmPassword && (
              <p className="error-text">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>
          <button type="submit" disabled={passwordLoading} className="btn-primary">
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

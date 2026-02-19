/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { changePassword, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);

        try {
            await changePassword(currentPassword, newPassword);
            toast.success('Password changed successfully! Please login again.');

            // Logout and redirect to login
            await logout();
            navigate('/login');
        } catch (err) {
            setError(err.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    // Gold color palette matching Login.jsx
    const goldColors = {
        50: '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#F59E0B',
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
    };

    return (
        <div
            className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
            style={{
                background: `linear-gradient(135deg, ${goldColors[50]} 0%, #FFFFFF 50%, ${goldColors[50]} 100%)`
            }}
        >
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div
                        className="p-3 rounded-full shadow-lg mb-4"
                        style={{
                            background: `linear-gradient(135deg, ${goldColors[500]}, ${goldColors[700]})`
                        }}
                    >
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 font-serif">
                    Change Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    For security, please set a new password for your account.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div
                    className="bg-white py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-sm"
                    style={{ border: `1px solid ${goldColors[200]}50` }}
                >
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Current Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-gold focus:border-gold sm:text-sm"
                                    style={{
                                        '--tw-focus-ring': goldColors[500],
                                        focus: `ring-2 ring-[${goldColors[500]}] border-transparent`
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-gold focus:border-gold sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-gold focus:border-gold sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="font-medium text-gold hover:text-yellow-600 focus:outline-none"
                                    style={{ color: goldColors[700] }}
                                >
                                    {showPassword ? 'Hide passwords' : 'Show passwords'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold disabled:opacity-50 transition-all duration-200"
                                style={{
                                    background: `linear-gradient(135deg, ${goldColors[600]}, ${goldColors[700]})`,
                                }}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></div>
                                        Updating...
                                    </div>
                                ) : (
                                    'Change Password'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;

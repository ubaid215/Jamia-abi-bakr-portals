import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';

const QUERY_KEYS = {
    users: 'users',
    admins: 'admins',
};

/**
 * Fetch all users with optional filters.
 * Replaces AdminContext.fetchUsers
 */
export function useUsers(filters = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.users, filters],
        queryFn: () => adminService.getUsers(filters),
        staleTime: 5 * 60 * 1000,
        select: (data) => {
            if (Array.isArray(data)) return data;
            if (data?.users) return data.users;
            if (data?.data) return data.data;
            return [];
        },
    });
}

/**
 * Fetch admin users.
 * Replaces AdminContext.fetchAdmins
 */
export function useAdmins() {
    return useQuery({
        queryKey: [QUERY_KEYS.admins],
        queryFn: () => adminService.getUsers({ role: 'ADMIN' }),
        staleTime: 5 * 60 * 1000,
        select: (data) => {
            if (Array.isArray(data)) return data;
            if (data?.users) return data.users;
            if (data?.admins) return data.admins;
            if (data?.data) return data.data;
            return [];
        },
    });
}

/**
 * Create admin mutation.
 * Replaces AdminContext.createAdmin
 */
export function useCreateAdmin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (adminData) => adminService.createAdmin(adminData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.admins] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.users] });
        },
    });
}

/**
 * Update user status mutation.
 * Replaces AdminContext.updateUserStatus
 */
export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, status }) => adminService.updateUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.users] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.admins] });
        },
    });
}

/**
 * Delete user mutation.
 * Replaces AdminContext.deleteUser
 */
export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId) => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.users] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.admins] });
        },
    });
}

/**
 * Reset user password mutation.
 * Replaces AdminContext.resetUserPassword
 */
export function useResetUserPassword() {
    return useMutation({
        mutationFn: (userId) => adminService.resetUserPassword(userId),
    });
}

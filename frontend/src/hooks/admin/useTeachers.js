import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';

const QUERY_KEYS = {
    teachers: 'teachers',
    teacherDetail: 'teacher',
    teacherDocuments: 'teacherDocuments',
};

/**
 * Fetch all teachers with optional filters.
 * Replaces AdminContext.fetchTeachers
 */
export function useTeachers(filters = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.teachers, filters],
        queryFn: () => adminService.getAllTeachers(filters),
        staleTime: 5 * 60 * 1000, // 5 min cache
        select: (data) => ({
            teachers: data.teachers || [],
            pagination: data.pagination || null,
        }),
    });
}

/**
 * Fetch single teacher details.
 * Replaces AdminContext.getTeacherDetails
 */
export function useTeacherDetails(id) {
    return useQuery({
        queryKey: [QUERY_KEYS.teacherDetail, id],
        queryFn: () => adminService.getTeacherDetails(id),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Fetch teacher with documents.
 * Replaces AdminContext.getTeacherWithDocuments
 */
export function useTeacherDocuments(id) {
    return useQuery({
        queryKey: [QUERY_KEYS.teacherDocuments, id],
        queryFn: () => adminService.getTeacherWithDocuments(id),
        enabled: !!id,
    });
}

/**
 * Update teacher mutation.
 * Replaces AdminContext.updateTeacher
 */
export function useUpdateTeacher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => adminService.updateTeacher(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teachers] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teacherDetail, id] });
        },
    });
}

/**
 * Delete teacher mutation.
 * Replaces AdminContext.deleteTeacher
 */
export function useDeleteTeacher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => adminService.deleteTeacher(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teachers] });
        },
    });
}

/**
 * Register teacher mutation.
 * Replaces AdminContext.registerTeacher
 */
export function useRegisterTeacher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (teacherData) => adminService.registerTeacher(teacherData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teachers] });
        },
    });
}

/**
 * Upload teacher document mutation.
 * Replaces AdminContext.uploadTeacherDocument
 */
export function useUploadTeacherDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ teacherId, formData }) => adminService.uploadTeacherDocument(teacherId, formData),
        onSuccess: (_, { teacherId }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teacherDocuments, teacherId] });
        },
    });
}

/**
 * Delete teacher document mutation.
 * Replaces AdminContext.deleteTeacherDocument
 */
export function useDeleteTeacherDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ teacherId, documentType }) => adminService.deleteTeacherDocument(teacherId, documentType),
        onSuccess: (_, { teacherId }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teacherDocuments, teacherId] });
        },
    });
}

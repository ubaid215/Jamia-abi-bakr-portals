import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';

const QUERY_KEYS = {
    students: 'students',
    studentDetail: 'student',
    studentDocuments: 'studentDocuments',
    enrollmentHistory: 'enrollmentHistory',
};

/**
 * Fetch all students with optional filters.
 * Replaces AdminContext.fetchStudents
 */
export function useStudents(filters = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.students, filters],
        queryFn: () => adminService.getAllStudents(filters),
        staleTime: 5 * 60 * 1000,
        select: (data) => ({
            students: data.students || [],
            pagination: data.pagination || null,
        }),
    });
}

/**
 * Fetch single student details.
 * Replaces AdminContext.getStudentDetails
 */
export function useStudentDetails(id) {
    return useQuery({
        queryKey: [QUERY_KEYS.studentDetail, id],
        queryFn: () => adminService.getStudentDetails(id),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Fetch student with documents.
 * Replaces AdminContext.getStudentWithDocuments
 */
export function useStudentDocuments(id) {
    return useQuery({
        queryKey: [QUERY_KEYS.studentDocuments, id],
        queryFn: () => adminService.getStudentWithDocuments(id),
        enabled: !!id,
    });
}

/**
 * Fetch student enrollment history.
 * Replaces AdminContext.fetchStudentEnrollmentHistory
 */
export function useStudentEnrollmentHistory(studentId, filters = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.enrollmentHistory, studentId, filters],
        queryFn: () => adminService.getStudentEnrollmentHistory(studentId, filters),
        enabled: !!studentId,
    });
}

/**
 * Update student mutation.
 * Replaces AdminContext.updateStudent
 */
export function useUpdateStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => adminService.updateStudent(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentDetail, id] });
        },
    });
}

/**
 * Delete student mutation.
 * Replaces AdminContext.deleteStudent
 */
export function useDeleteStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => adminService.deleteStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
        },
    });
}

/**
 * Register student mutation.
 * Replaces AdminContext.registerStudent
 */
export function useRegisterStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (studentData) => adminService.registerStudent(studentData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
        },
    });
}

/**
 * Update student profile image mutation.
 */
export function useUpdateStudentProfileImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, formData }) => adminService.updateStudentProfileImage(studentId, formData),
        onSuccess: (_, { studentId }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentDetail, studentId] });
        },
    });
}

/**
 * Promote students mutation.
 * Replaces AdminContext.promoteStudents
 */
export function usePromoteStudents() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (promotionData) => adminService.promoteStudents(promotionData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
        },
    });
}

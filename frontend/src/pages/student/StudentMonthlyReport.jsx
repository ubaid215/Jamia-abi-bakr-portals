// Wrapper page for student self-view of their monthly Hifz report
// Reuses the existing teacher-facing component from components/hifz
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HifzProvider } from '../../contexts/HifzContext';
import StudentMonthlyReportComponent from '../../components/hifz/StudentMonthlyReport';
import { BookOpen } from 'lucide-react';

const StudentMonthlyReport = () => {
    const { user } = useAuth();
    const studentId = user?.studentProfile?.id;
    const studentName = user?.name || user?.studentProfile?.user?.name;

    if (!studentId) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-600">Student profile not found</h2>
                    <p className="text-sm text-gray-400 mt-1">Could not load your student profile</p>
                </div>
            </div>
        );
    }

    return (
        <HifzProvider>
            <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4">
                <StudentMonthlyReportComponent
                    studentId={studentId}
                    studentName={studentName}
                />
            </div>
        </HifzProvider>
    );
};

export default StudentMonthlyReport;

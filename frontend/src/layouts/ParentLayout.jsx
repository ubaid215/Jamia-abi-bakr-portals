// FILE: src/layouts/ParentLayout.jsx
// PATTERN FROM: src/layouts/StudentLayout.jsx (minimal layout pattern)
// PURPOSE: Wraps all /parent/* routes with appropriate providers and header
// PROVIDERS: WeeklyReportProvider, SocketProvider, NotificationProvider

import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { WeeklyReportProvider } from '../contexts/WeeklyReportContext';
import NotificationDropdown from '../components/shared/NotificationDropdown';
import {
    LogOut, User, Menu, X,
    LayoutDashboard, MessageSquare, ClipboardList
} from 'lucide-react';

/* ── Minimal parent sidebar nav links ── */
const NAV_LINKS = [
    { to: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/parent/communications', label: 'Communications', icon: MessageSquare },
    { to: '/parent/weekly-reports', label: 'Weekly Reports', icon: ClipboardList },
];

/* ── Sidebar ── */
const ParentSidebar = ({ isOpen, onClose }) => (
    <>
        {/* Mobile overlay */}
        {isOpen && (
            <div
                className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                onClick={onClose}
            />
        )}
        <aside
            className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-amber-700 to-amber-900 flex flex-col shadow-xl
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto`}
        >
            {/* Brand */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-amber-600/40">
                <span className="text-white font-bold text-lg tracking-tight">Parent Portal</span>
                <button onClick={onClose} className="lg:hidden text-amber-200 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-white/20 text-white'
                                : 'text-amber-100 hover:bg-white/10 hover:text-white'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    </>
);

/* ═══════════════════════════════════════════════ */
const ParentLayoutInner = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-[#FDE68A] sticky top-0 z-30">
                    <div className="flex justify-between items-center px-4 sm:px-6 py-3">
                        {/* Left */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-md bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] transition-colors"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-black truncate max-w-[160px] sm:max-w-xs">
                                    Welcome, {user?.name?.split(' ')[0] || 'Parent'}
                                </h1>
                                <p className="text-xs text-[#B45309]">Parent Portal</p>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Notification Bell */}
                            <NotificationDropdown />

                            <div className="hidden sm:flex items-center gap-2 text-gray-700">
                                <User className="h-5 w-5" />
                                <span className="text-sm max-w-[100px] truncate">{user?.name}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 bg-[#FFFBEB] text-[#92400E] rounded-md hover:bg-[#FEF3C7] transition-colors font-semibold text-sm"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                    <WeeklyReportProvider>
                        <Outlet />
                    </WeeklyReportProvider>
                </main>
            </div>
        </div>
    );
};

// Wrap with socket/notification providers
const ParentLayout = () => (
    <SocketProvider>
        <NotificationProvider>
            <ParentLayoutInner />
        </NotificationProvider>
    </SocketProvider>
);

export default ParentLayout;

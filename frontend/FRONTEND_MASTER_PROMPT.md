# Frontend Master Prompt
## Khanqah Saifia Madrisa Management System — React Frontend

---

## SYSTEM CONTEXT

You are building the frontend for a **Madrisa (Islamic school) Management System** called "Khanqah Saifia". The backend is Express.js + Prisma + PostgreSQL + Socket.io. The frontend must match the backend's API contracts exactly.

**Tech Stack:**
- React 18 + Vite
- Tailwind CSS (utility-first, no component libraries except lucide-react)
- Lucide React (icons only)
- React Router v6 (client-side routing)
- React Query v5 (@tanstack/react-query) for server state
- Socket.io-client for real-time
- Axios for HTTP
- React Hook Form + Zod for forms
- Context API for auth + socket state

---

## FOLDER STRUCTURE TO BUILD

```
src/
├── api/                         ← All API call functions
│   ├── axios.config.js          ← Base axios instance + interceptors
│   ├── auth.api.js
│   ├── activities.api.js        ← Daily activity endpoints
│   ├── weeklyProgress.api.js
│   ├── snapshot.api.js          ← Progress dashboard
│   ├── notifications.api.js
│   ├── goals.api.js
│   ├── parentComm.api.js
│   └── index.js                 ← Re-exports all
│
├── context/
│   ├── AuthContext.jsx           ← JWT, user, role state
│   ├── SocketContext.jsx         ← Socket.io connection, event listeners
│   └── NotificationContext.jsx  ← Unread count, notification list
│
├── hooks/
│   ├── useAuth.js
│   ├── useSocket.js
│   ├── useNotifications.js
│   ├── useActivities.js
│   ├── useWeeklyProgress.js
│   ├── useSnapshot.js
│   └── useGoals.js
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx         ← Sidebar + topbar shell
│   │   ├── Sidebar.jsx           ← Role-aware navigation links
│   │   ├── Topbar.jsx            ← Search, notification bell, avatar
│   │   └── ProtectedRoute.jsx    ← Auth + role guard
│   │
│   ├── ui/                       ← Reusable primitive components
│   │   ├── Badge.jsx             ← Status/risk/grade badges
│   │   ├── Card.jsx
│   │   ├── StatCard.jsx          ← Metric card with icon + value
│   │   ├── Table.jsx             ← Reusable data table
│   │   ├── Modal.jsx
│   │   ├── Drawer.jsx
│   │   ├── Pagination.jsx
│   │   ├── Spinner.jsx
│   │   ├── EmptyState.jsx
│   │   ├── RiskBadge.jsx         ← LOW/MEDIUM/HIGH/CRITICAL
│   │   ├── AttendanceBadge.jsx   ← PRESENT/ABSENT/LATE etc.
│   │   ├── GradeBadge.jsx        ← A+/A/B+ etc.
│   │   ├── ProgressBar.jsx       ← Animated progress bar
│   │   ├── SkillMeter.jsx        ← 1–5 star or bar skill rating
│   │   └── NotificationPanel.jsx ← Dropdown notification list
│   │
│   ├── forms/
│   │   ├── DailyActivityForm.jsx  ← Main teacher input form
│   │   ├── GoalForm.jsx
│   │   ├── WeeklyCommentForm.jsx  ← Teacher adds weekly commentary
│   │   └── ParentCommForm.jsx
│   │
│   └── charts/
│       ├── AttendanceTrend.jsx    ← Line chart (recharts)
│       ├── SubjectRadar.jsx       ← Radar chart for subject performance
│       ├── SkillsChart.jsx        ← Bar chart for skills
│       └── WeeklyBar.jsx          ← Week-over-week comparison bars
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── ChangePasswordPage.jsx
│   │
│   ├── admin/
│   │   ├── AdminDashboard.jsx     ← Overview: at-risk students, stats
│   │   ├── AtRiskStudents.jsx     ← Table of at-risk students
│   │   ├── ClassroomProgress.jsx  ← Per-classroom weekly progress grid
│   │   └── AuditLogs.jsx
│   │
│   ├── teacher/
│   │   ├── TeacherDashboard.jsx   ← My class, today's activity status
│   │   ├── RecordActivity.jsx     ← DailyActivityForm for a student
│   │   ├── ClassActivities.jsx    ← List all activities for my class
│   │   ├── WeeklyReview.jsx       ← Weekly progress + add comments
│   │   ├── StudentDetail.jsx      ← Full snapshot for one student
│   │   ├── ManageGoals.jsx        ← Create/update goals for students
│   │   └── ParentMessages.jsx     ← Send messages to parents
│   │
│   └── student/
│       ├── StudentDashboard.jsx   ← My snapshot, recent activities
│       ├── MyActivities.jsx       ← List my own activities
│       ├── MyProgress.jsx         ← Weekly progress history
│       └── MyGoals.jsx            ← My goals with progress bars
│
└── utils/
    ├── formatters.js              ← Date, percentage, grade formatters
    ├── roleGuards.js              ← canDo(role, action) helpers
    └── socketEvents.js            ← Mirror of backend SOCKET_EVENTS constants
```

---

## API CONTRACTS

### Base Configuration

```javascript
// src/services/api
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401/403 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Daily Activities API

```javascript
// src/services/activities.api.js
// All responses follow: { success, message, data, pagination? }

export const activitiesApi = {
  // Teacher records activity
  create: (data) => api.post('/activities', data),

  // List with filters (role-scoped on backend)
  list: (params) => api.get('/activities', { params }),
  // params: { studentId?, classRoomId?, startDate?, endDate?, page?, limit? }

  // Get single
  getById: (id) => api.get(`/activities/${id}`),

  // Get by student + date
  getByStudentDate: (studentId, date) =>
    api.get(`/activities/student/${studentId}/date/${date}`),
  // date format: YYYY-MM-DD

  // Teacher updates
  update: (id, data) => api.patch(`/activities/${id}`, data),

  // Admin deletes
  delete: (id) => api.delete(`/activities/${id}`),
};
```

### Weekly Progress API

```javascript
// src/services/weeklyProgress.api.js

export const weeklyProgressApi = {
  // Teacher triggers generation for a student
  generate: (data) => api.post('/weekly-progress/generate', data),
  // body: { studentId, classRoomId, weekNumber?, year? }

  // List (role-scoped)
  list: (params) => api.get('/weekly-progress', { params }),
  // params: { studentId?, classRoomId?, year?, weekNumber?, followUpRequired? }

  // Current week for a student
  getCurrent: (studentId) => api.get(`/weekly-progress/student/${studentId}/current`),

  // Specific week
  getByWeek: (studentId, weekNumber, year) =>
    api.get(`/weekly-progress/student/${studentId}/week/${weekNumber}/year/${year}`),

  // Teacher adds comments
  update: (id, data) => api.patch(`/weekly-progress/${id}`, data),
  // body: { teacherComments, weeklyHighlights, achievements, followUpRequired }
};
```

### Progress Snapshot (Dashboard) API

```javascript
// src/services/snapshot.api.js

export const snapshotApi = {
  // Get student's snapshot
  get: (studentId) => api.get(`/dashboard/student/${studentId}`),

  // Trigger manual refresh (teacher/admin)
  refresh: (studentId) => api.post(`/dashboard/student/${studentId}/refresh`),

  // Bulk refresh for classroom
  refreshClassroom: (classRoomId) => api.post(`/dashboard/classroom/${classRoomId}/refresh`),

  // Get at-risk students
  getAtRisk: (classRoomId) =>
    api.get('/dashboard/at-risk', { params: classRoomId ? { classRoomId } : {} }),
};
```

### Notifications API

```javascript
// src/services/notifications.api.js

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  // params: { isRead?, priority?, notificationType?, page?, limit? }

  getUnreadCount: () => api.get('/notifications/unread-count'),

  markRead: (id) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),
};
```

### Goals API

```javascript
// src/services/goals.api.js

export const goalsApi = {
  create: (data) => api.post('/goals', data),
  // body: { studentId, goalType, title, metric, targetValue, unit, startDate, targetDate }

  list: (params) => api.get('/goals', { params }),
  // params: { studentId?, status?, goalType?, page?, limit? }

  getById: (id) => api.get(`/goals/${id}`),

  update: (id, data) => api.patch(`/goals/${id}`, data),
  // body: { currentValue?, status?, targetDate?, ... }

  delete: (id) => api.delete(`/goals/${id}`),
};
```

---

## CONTEXT IMPLEMENTATIONS

### AuthContext

```jsx
// src/context/AuthContext.jsx
// Stores: { user, token, role, isAuthenticated, login(), logout() }
// user shape: { id, name, email, role, profileImage, status }
// Roles: SUPER_ADMIN | ADMIN | TEACHER | STUDENT | PARENT
// After login, store JWT in localStorage and set in axios interceptor
```

### SocketContext

```jsx
// src/context/SocketContext.jsx
// Connect with: io(WS_URL, { auth: { token } })
// Expose: { socket, connected, joinRoom(), leaveRoom() }
// On connect: socket auto-joins user:{userId} + role:{ROLE} rooms (server-side)
// Listen for all SOCKET_EVENTS from utils/socketEvents.js
```

### NotificationContext

```jsx
// src/context/NotificationContext.jsx
// Expose: { notifications, unreadCount, markRead(), markAllRead(), refresh() }
// Initialize: fetch /notifications on mount
// Real-time: listen to socket 'notification:new' → prepend to list + increment count
// Listen to 'notification:count' → update unreadCount
```

---

## SOCKET EVENTS (mirror backend exactly)

```javascript
// src/utils/socketEvents.js
export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read_all',
  NOTIFICATION_COUNT: 'notification:count',
  ACTIVITY_CREATED: 'activity:created',
  ACTIVITY_UPDATED: 'activity:updated',
  WEEKLY_PROGRESS_GENERATED: 'weekly_progress:generated',
  SNAPSHOT_UPDATED: 'snapshot:updated',
  SNAPSHOT_RISK_ALERT: 'snapshot:risk_alert',
  GOAL_CREATED: 'goal:created',
  GOAL_UPDATED: 'goal:updated',
  GOAL_ACHIEVED: 'goal:achieved',
  GOAL_AT_RISK: 'goal:at_risk',
  PING: 'ping',
  PONG: 'pong',
};
```

---

## PAGE SPECIFICATIONS

### Admin Dashboard

**Layout:** 4 stat cards on top → at-risk students table → classroom progress grid

**Stat Cards (use StatCard component):**
- Total Active Students (Users icon, blue)
- At-Risk Students (AlertTriangle icon, red, clickable → /admin/at-risk)
- Activities Recorded Today (Activity icon, green)
- Goals Achieved This Week (Target icon, purple)

**At-Risk Students Table columns:**
- Student Name + Admission No
- Class
- Risk Level (RiskBadge: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red)
- Attendance %
- Attention Reasons (comma list)
- Last Activity Date
- Action: "View Student" button

**Classroom Progress Grid:**
- Card per classroom with: name, total students, avg attendance %, pending follow-ups badge
- Click → `/admin/classroom/:id`

**Data sources:**
- `snapshotApi.getAtRisk()` for at-risk table
- React Query with 5-minute stale time

---

### Teacher Dashboard

**Layout:** Today's class status → pending activities → quick-record button

**Today's Activity Status:**
- Show which students have/haven't had activity recorded today
- Students missing activity: amber warning card with list
- "Record Activity" quick-action button per student

**My Class Card:**
- Class name, grade, section
- Student count
- This week's avg attendance badge
- Link to WeeklyReview page

**Notifications panel** (right sidebar on desktop):
- Shows 5 most recent unread notifications
- Badge count from NotificationContext

**Key Actions (floating or top):**
- "+ Record Today's Activity" → opens DailyActivityForm modal
- "Generate Weekly Report" → calls weeklyProgressApi.generate()

---

### DailyActivityForm (Most Complex Form)

**Multi-step form with tabs or sections:**

**Section 1 — Attendance & Overview**
- Student selector (searchable dropdown from class enrollment)
- Date picker (default: today)
- Attendance status (radio: Present/Late/Absent/Excused/Half Day)
- Total hours spent (number input, 0–8)
- Punctuality toggle
- Uniform compliance toggle

**Section 2 — Subjects Studied**
- Dynamic list: + Add Subject button
- Per subject: Subject selector, Topics covered (tag input), Understanding level (1–5 star selector), Notes

**Section 3 — Homework**
- Assigned homework: + Add entry (subject, title, due date, description)
- Completed homework: + Add entry (subject, title, completion status dropdown, quality 1–5, notes)

**Section 4 — Classwork & Participation**
- Classwork entries: (subject, activity description, completion status, quality)
- Participation level: 1–5 slider with labels (Poor → Excellent)

**Section 5 — Assessments (Optional)**
- + Add Assessment: (subject, type QUIZ/TEST/ORAL, topic, marks obtained / total marks)

**Section 6 — Behavior & Observations**
- Behavior rating: 1–5 emoji or star selector
- Discipline score: 1–5
- Skills snapshot: reading/writing/listening/speaking/critical-thinking (5 sliders)
- Strengths textarea
- Areas for improvement textarea
- Concerns textarea
- Teacher remarks textarea
- Parent notes textarea

**Validation:** React Hook Form + Zod (mirror backend schema)
**On Submit:** `activitiesApi.create()` → success toast → invalidate React Query cache

---

### Teacher WeeklyReview Page

**Layout:** Week selector (prev/next arrows) → Progress summary → Comment form

**Progress Summary Cards:**
- Attendance % (progress bar, color-coded)
- Homework completion %
- Avg behavior score
- Subject understanding averages (mini radar chart)

**Follow-Up Flag:**
- Toggle `followUpRequired` with visual indicator

**Comment Form (WeeklyCommentForm):**
- Weekly highlights (textarea)
- Areas of improvement (textarea)
- Teacher comments (textarea)
- Achievements (+ Add: title, description, category)
- Action items (+ Add: item, priority dropdown)

**On Save:** `weeklyProgressApi.update(id, data)` → optimistic update

---

### Student Dashboard

**Layout:** Welcome banner → snapshot summary → recent activities → goals

**Snapshot Summary (3 cards):**
- Attendance streak (flame icon + count)
- Overall attendance % (circular progress indicator)
- Homework completion % (progress bar)

**Subject Performance Grid:**
- Card per subject: subject name, avg understanding (stars), trend arrow (↑↓→)
- Color-coded: green=good, yellow=average, red=needs work

**Recent Activities (last 7 days):**
- Timeline view: date → attendance badge → subjects studied → teacher remarks
- "View All" link → /student/activities

**My Goals Section:**
- Goal cards with: title, progress bar, target date, status badge
- Achieved goals show celebration emoji

---

### Student MyGoals Page

**Goal Card Component:**
- Title + description
- Progress bar (animated, color: blue=in-progress, green=achieved, red=failed, amber=at-risk)
- Current value / Target value with unit
- Target date + days remaining
- Milestone list (if any)
- Status badge

**Filter tabs:** All | In Progress | Achieved | At Risk

---

## UI COMPONENT SPECIFICATIONS

### RiskBadge
```jsx
// props: { level: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' }
// LOW → green badge
// MEDIUM → yellow badge
// HIGH → orange badge
// CRITICAL → red badge with pulse animation
const colors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800 animate-pulse',
};
```

### AttendanceBadge
```jsx
// props: { status: 'PRESENT'|'ABSENT'|'LATE'|'EXCUSED'|'HALF_DAY' }
const colors = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  LATE: 'bg-yellow-100 text-yellow-800',
  EXCUSED: 'bg-blue-100 text-blue-800',
  HALF_DAY: 'bg-purple-100 text-purple-800',
};
```

### StatCard
```jsx
// props: { title, value, icon: LucideIcon, color, trend?, trendValue?, onClick? }
// color variants: blue, green, red, purple, orange, yellow
// Show trend arrow + percentage if provided
```

### NotificationPanel (Dropdown)
```jsx
// Triggered by bell icon in Topbar
// Shows: unreadCount badge on bell
// Dropdown: list of recent 10 notifications
// Each item: type icon, title, message (truncated), time ago, read/unread dot
// Footer: "Mark all as read" | "View all notifications"
// On item click: markRead() + navigate to relevant page (actionUrl)
```

---

## TAILWIND CSS CONVENTIONS

```
Color Palette (use consistently):
  Primary: indigo-600 / indigo-700
  Success: green-500 / green-600
  Warning: amber-500 / amber-600
  Danger: red-500 / red-600
  Info: blue-500 / blue-600
  Text primary: gray-900
  Text secondary: gray-500
  Border: gray-200
  Background: gray-50 (page), white (cards)

Card pattern:
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

Section header:
  <h2 className="text-lg font-semibold text-gray-900 mb-4">

Table:
  thead: bg-gray-50, th: text-xs font-medium text-gray-500 uppercase tracking-wider
  tbody: divide-y divide-gray-200
  tr hover: hover:bg-gray-50

Button primary:
  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"

Button secondary:
  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"

Input:
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
```

---

## LUCIDE REACT ICONS MAP

```javascript
// Use these icon assignments consistently:
import {
  Home,           // Dashboard
  Users,          // Students list
  BookOpen,       // Activities / subjects
  BarChart2,      // Progress / analytics
  Target,         // Goals
  Bell,           // Notifications
  MessageSquare,  // Parent communication
  Calendar,       // Weekly progress / schedule
  Clock,          // Attendance / timing
  AlertTriangle,  // At-risk / warnings
  CheckCircle,    // Achieved / present
  XCircle,        // Absent / failed
  TrendingUp,     // Improving
  TrendingDown,   // Declining
  Minus,          // Stable / neutral
  Star,           // Rating / quality
  Award,          // Achievement
  Flag,           // Follow-up required
  RefreshCw,      // Refresh snapshot
  Plus,           // Add new
  Edit2,          // Edit
  Trash2,         // Delete
  Eye,            // View details
  ChevronLeft,    // Previous week
  ChevronRight,   // Next week
  LogOut,         // Logout
  Settings,       // Settings
  Menu,           // Mobile menu toggle
  X,              // Close modal
  Search,         // Search input
  Filter,         // Filter button
  Download,       // Export
  Activity,       // Activity icon
  Flame,          // Streak
  Zap,            // Quick action
} from 'lucide-react';
```

---

## REACT QUERY PATTERNS

```javascript
// Standard query hook pattern (copy for each resource)
// src/hooks/useActivities.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '../api/activities.api';
import toast from 'react-hot-toast';

export const QUERY_KEYS = {
  activities: 'activities',
  activity: (id) => ['activity', id],
  studentActivities: (studentId) => ['activities', 'student', studentId],
};

export const useActivities = (params) =>
  useQuery({
    queryKey: [QUERY_KEYS.activities, params],
    queryFn: () => activitiesApi.list(params).then(r => r.data.data),
    staleTime: 2 * 60 * 1000, // 2 min
  });

export const useCreateActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.activities] });
      toast.success('Activity recorded successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to record activity'),
  });
};
```

---

## REAL-TIME SOCKET INTEGRATION PATTERN

```jsx
// Pattern for any component that needs real-time updates

import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '../utils/socketEvents';

const TeacherDashboard = () => {
  const { socket } = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // Refresh activities list when a new one is created
    socket.on(SOCKET_EVENTS.ACTIVITY_CREATED, ({ classRoomId }) => {
      qc.invalidateQueries({ queryKey: ['activities'] });
    });

    // Refresh snapshot when updated
    socket.on(SOCKET_EVENTS.SNAPSHOT_UPDATED, ({ studentId }) => {
      qc.invalidateQueries({ queryKey: ['snapshot', studentId] });
    });

    // Show risk alert toast
    socket.on(SOCKET_EVENTS.SNAPSHOT_RISK_ALERT, ({ studentName, riskLevel }) => {
      toast.error(`⚠️ ${studentName} is ${riskLevel} risk — needs attention`);
      qc.invalidateQueries({ queryKey: ['at-risk'] });
    });

    return () => {
      socket.off(SOCKET_EVENTS.ACTIVITY_CREATED);
      socket.off(SOCKET_EVENTS.SNAPSHOT_UPDATED);
      socket.off(SOCKET_EVENTS.SNAPSHOT_RISK_ALERT);
    };
  }, [socket, qc]);
};
```

---

## PROTECTED ROUTE PATTERN

```jsx
// src/components/layout/ProtectedRoute.jsx
// props: { allowedRoles: string[] }
// Reads from AuthContext
// Redirects to /login if not authenticated
// Redirects to /unauthorized if wrong role
// Shows role-appropriate layout (Admin/Teacher/Student sidebar)
```

---

## RESPONSIVE DESIGN REQUIREMENTS

- **Desktop (lg+):** Sidebar always visible, content area beside it
- **Tablet (md):** Collapsible sidebar with overlay
- **Mobile (sm):** Bottom navigation bar with key icons, no sidebar

```
Bottom nav items (mobile):
  - Home icon → /dashboard
  - BookOpen → /activities
  - BarChart2 → /progress
  - Target → /goals
  - Bell (with badge) → /notifications
```

---

## ENVIRONMENT VARIABLES

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_APP_NAME=Khanqah Saifia
```

---

## PRIORITY BUILD ORDER

1. `api/axios.config.js` + all api files
2. `context/AuthContext.jsx` + login page
3. `context/SocketContext.jsx` + `context/NotificationContext.jsx`
4. `components/layout/` (AppLayout, Sidebar, Topbar, ProtectedRoute)
5. `components/ui/` (Badge, Card, StatCard, Table, RiskBadge, ProgressBar)
6. Admin Dashboard + AtRiskStudents
7. Teacher Dashboard + DailyActivityForm (most complex)
8. Teacher WeeklyReview
9. Student Dashboard + MyGoals
10. Notification system (panel + real-time)
# Madrisa Management System — Backend Workflow

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Request Lifecycle](#request-lifecycle)
3. [Daily Activity Flow](#daily-activity-flow)
4. [Weekly Progress Flow](#weekly-progress-flow)
5. [Progress Snapshot Flow](#progress-snapshot-flow)
6. [Goal Tracking Flow](#goal-tracking-flow)
7. [Notification Flow](#notification-flow)
8. [WebSocket Flow](#websocket-flow)
9. [Cron Job Schedule](#cron-job-schedule)
10. [Role Access Matrix](#role-access-matrix)
11. [Cache Strategy](#cache-strategy)
12. [Error Handling Chain](#error-handling-chain)

---

## Architecture Overview

```
Client (React)
     │
     ├── HTTP REST  ──►  Express Router  ──►  Auth Middleware
     │                         │                    │
     │                         ▼                    ▼
     │                   Route Handler         Role Check
     │                         │
     │                         ▼
     │                    Controller  (thin — delegates only)
     │                         │
     │                         ▼
     │                     Service     (business logic, orchestration)
     │                         │
     │                    ┌────┴────┐
     │                    ▼         ▼
     │               Repository   Utils
     │               (Prisma)    (date, calc)
     │                    │
     │                    ▼
     │              PostgreSQL (via Prisma)
     │
     └── WebSocket  ──►  Socket.io  ──►  socket.auth.js (JWT verify)
                               │
                               ▼
                         socket.rooms.js (auto-join rooms)
                               │
                         notifications.gateway.js
                               │
                         Emit events to rooms
```

---

## Request Lifecycle

```
1. Request arrives  →  app.js middleware stack
   └── helmet() → cors() → compression() → morgan() → body-parser → rate-limiter

2. Route matched  →  routes/index.js  →  module routes file

3. Middleware chain:
   authenticateToken  →  Redis cache check  →  DB fallback  →  req.user attached
        │
        ▼
   requireRole(...)  →  role check passes/fails (403)
        │
        ▼
   validate(schema)  →  Zod parse req.body / req.query / req.params
        │
        ▼
   ensureStudentIsRegular (if applicable)  →  studentType check
        │
        ▼
   auditLog middleware  →  wraps res.json to capture response

4. Controller  →  calls service method
5. Service     →  business logic, calls repository
6. Repository  →  Prisma query  →  PostgreSQL
7. Response    →  sendSuccess / sendPaginated / sendCreated
8. auditLog    →  fire-and-forget write to AuditLog table (setImmediate)
```

---

## Daily Activity Flow

### Teacher Records a Daily Activity

```
Teacher  →  POST /api/activities
              │
              ├── Auth: authenticateToken
              ├── Role: requireTeacherOrAdmin
              ├── Validate: createActivitySchema (Zod)
              ├── Guard: ensureStudentIsRegular (checks studentType)
              │
              ▼
         dailyActivity.controller.js::createActivity
              │
              ▼
         dailyActivity.service.js::createActivity
              │
              ├── resolveTeacherId(user.id) → teacher.id
              ├── validateStudentAndClass(studentId, classRoomId)
              ├── Normalize date → start of day (UTC)
              ├── Check duplicate → findByStudentAndDate (throws 409 if exists)
              │
              ▼
         dailyActivity.repository.js::create
              │
              ▼
         DailyActivity record saved in PostgreSQL
              │
              ├── Invalidate Redis cache: activity:student:{studentId}:*
              ├── logCreate → AuditLog (fire-and-forget)
              │
              ▼
         Socket.io emit → ACTIVITY_CREATED
              ├── → classroom:{classRoomId} room
              └── → student:{studentId} room

Response: 201 { success, data: activity }
```

### Student/Parent Views Activities

```
GET /api/activities?page=1&limit=20
     │
     ├── Auth + Role check
     │
     ▼
service.listActivities(query, user)
     │
     ├── role === 'STUDENT'  → where.studentId = student.id (own only)
     ├── role === 'PARENT'   → where.studentId IN [childIds]
     └── role === 'TEACHER'  → where.classRoomId / teacherId filter
          │
          ▼
     Prisma findMany with pagination
          │
          ▼
     sendPaginated(res, items, { page, limit, total })
```

---

## Weekly Progress Flow

### Automatic Generation (Cron — Every Friday 8 PM)

```
scheduler.registry.js  →  CRON: '0 20 * * 5'
     │
     ▼
weeklyProgress.service.js::generateForClassRoom(classRoomId, weekNumber, year)
     │
     ├── Get all REGULAR student enrollments for classroom
     │
     └── For each student:
              │
              ▼
         generateWeeklyProgress({ studentId, weekNumber, year, classRoomId })
              │
              ├── getWeekDateRange(weekNumber, year)  → startDate, endDate
              ├── activityRepo.findByStudentInRange(studentId, start, end)
              ├── countAcademicWorkingDays(start, end)  → holiday-aware
              │
              ▼
         weeklyProgress.calculator.js::calculateWeeklyProgress(activities, workingDays)
              │
              ├── countAttendance() → present/absent/late counts
              ├── calculateSubjectProgress() → per-subject understanding avg
              ├── calculateHomeworkMetrics() → completion rate, quality
              ├── calculateAssessmentSummary() → avg scores
              ├── calculateBehavioralMetrics() → behavior/discipline avg
              └── calculateSkillsMetrics() → reading/writing/etc avg
              │
              ▼
         weeklyProgress.repository.js::upsert(studentId, weekNumber, year, data)
              │  (creates or updates — idempotent)
              ▼
         WeeklyProgress saved → Redis cache invalidated
              │
              ▼
         Socket emit → WEEKLY_PROGRESS_GENERATED → student:{studentId}
```

### Teacher Adds Comments

```
PATCH /api/weekly-progress/:id
     │  body: { teacherComments, weeklyHighlights, achievements, followUpRequired }
     │
     ▼
service.updateWeeklyProgress → only commentary fields updated
     │  (calculated metrics are NEVER overwritten manually)
     │
     ▼
Socket emit → WEEKLY_PROGRESS_UPDATED → student:{studentId}
```

---

## Progress Snapshot Flow

### What is a Snapshot?

A `StudentProgressSnapshot` is a **denormalized, cached summary** of a student's overall performance. It is recalculated automatically from:
- Last 8 weeks of `WeeklyProgress`
- Last 30 days of `DailyActivity`

### Calculation Trigger Points

```
Trigger 1: Daily cron at 2 AM
     └── snapshot.scheduler.js::runDailySnapshotRefresh()
              └── finds all snapshots where nextCalculationDue < now
              └── refreshSnapshot(studentId) for each

Trigger 2: Teacher manually refreshes
     └── POST /api/dashboard/student/:studentId/refresh

Trigger 3: After weekly progress generation
     └── weeklyProgress.service.js calls refreshForClassRoom()

Trigger 4: After daily activity creation (optional, triggers goals evaluation)
     └── goals.tracker.js::evaluateStudentGoals()
```

### Snapshot Calculation

```
snapshot.service.js::refreshSnapshot(studentId)
     │
     ├── Fetch last 8 WeeklyProgress records
     ├── Fetch last 30 DailyActivity records
     │
     ▼
snapshot.calculator.js::calculateSnapshot(weeklyHistory, recentActivities, existing)
     │
     ├── Attendance totals + rate
     ├── Streak calculation (attendance + homework)
     ├── Subject performance aggregation + trend detection
     ├── Skill levels (reading, writing, etc.)
     │
     └── assessRisk()
              ├── attendance < 60%  → CRITICAL risk
              ├── attendance < 75%  → HIGH risk
              ├── homework < 50%    → reason added
              ├── behavior < 2      → reason added
              └── weak subjects     → flaggedSubjects added
              │
              ▼
         riskLevel: LOW | MEDIUM | HIGH | CRITICAL
         interventionRequired: true/false
     │
     ▼
StudentProgressSnapshot upserted in DB
     │
     ├── If interventionRequired AND no alert in last 24h:
     │        └── emitRiskAlert() → Notification + Socket event to teacher + admins
     │
     └── Socket emit → SNAPSHOT_UPDATED → student:{studentId}
```

---

## Goal Tracking Flow

### Create Goal (Teacher)

```
POST /api/goals
     body: { studentId, goalType, title, metric, targetValue, unit, startDate, targetDate }
     │
     ▼
goals.service.js::createGoal
     ├── Resolve teacherId from user
     ├── Calculate initial progress (currentValue / targetValue * 100)
     └── goals.repository.js::create → StudentGoal saved
```

### Auto-Evaluation (goals.tracker.js)

```
Cron: daily 8 AM OR after activity creation
     │
     ▼
goals.tracker.js::runBatchEvaluation()
     │
     └── For each IN_PROGRESS goal:
              │
              ▼
         evaluateGoal(goal)
              │
              ├── GOAL_EVALUATORS[goal.goalType](studentId, goal)
              │        ├── ATTENDANCE_RATE  → count attendance records
              │        ├── HOMEWORK_COMPLETION → read from snapshot
              │        ├── BEHAVIOR_SCORE  → read from snapshot
              │        ├── SUBJECT_UNDERSTANDING → read from daily activities
              │        └── MANUAL → skip (returns null)
              │
              ├── Recalculate progress %
              ├── Check AT_RISK conditions (< 30% progress, > 70% time used)
              │
              └── Status transitions:
                       IN_PROGRESS → ACHIEVED (progress >= 100%)
                       IN_PROGRESS → AT_RISK  (progress stalled)
                       IN_PROGRESS → FAILED   (past targetDate)
                            │
                            ▼
                       Emit notification (GOAL_ACHIEVED / GOAL_AT_RISK / GOAL_FAILED)
                       Socket emit → GOAL_ACHIEVED / GOAL_AT_RISK → student room
```

---

## Notification Flow

### Creating a Notification

```
Any service  →  notifications.emitter.js::emit({ studentId, recipientIds, title, ... })
     │
     ├── repo.create() for each recipient → ProgressNotification saved in DB
     │
     └── setImmediate(() => {
              getIO().to(SOCKET_ROOMS.user(userId)).emit(NOTIFICATION_NEW, record)
         })
         (fire-and-forget — never blocks the calling service)
```

### Client Receives Notification

```
Socket event: NOTIFICATION_NEW
     │
     ├── Client updates unread badge count
     └── Shows toast/alert notification

Client marks as read:
     POST /api/notifications/:id/read
     OR
     Socket event: notification:read { notificationId }
          │
          └── markRead → DB update → Redis unread count cache invalidated
                                   → emit NOTIFICATION_COUNT to same user
```

---

## WebSocket Flow

### Connection Lifecycle

```
Client connects with JWT:
socket.io({ auth: { token: 'Bearer ...' } })
     │
     ▼
socket.auth.js::socketAuth (middleware)
     ├── Verify JWT
     ├── Fetch user from Redis (or DB fallback)
     └── Attach socket.user = { id, role, name }
     │
     ▼
socket.rooms.js::joinUserRooms(socket)
     ├── ALWAYS: join user:{userId}
     ├── ALWAYS: join role:{ROLE}
     ├── TEACHER: join classroom:{id} for each managed class
     ├── STUDENT: join student:{studentId} + classroom:{enrolled}
     └── PARENT: join student:{childId} for each child
     │
     ▼
notifications.gateway.js::registerNotificationHandlers(socket)
     ├── On 'notification:request_count' → emit unread count
     ├── On 'notification:read' → mark read + emit new count
     └── On 'notification:read_all' → mark all read
```

### Room Naming Convention

| Room Name | Who is in it |
|-----------|--------------|
| `user:{userId}` | Single user — personal notifications |
| `role:TEACHER` | All connected teachers |
| `role:ADMIN` | All connected admins |
| `role:SUPER_ADMIN` | All super admins |
| `classroom:{classRoomId}` | Teacher + all enrolled students |
| `student:{studentId}` | Student + their parents + teacher |

---

## Cron Job Schedule

| Job | Expression | When | What |
|-----|-----------|------|------|
| `weekly-progress-generator` | `0 20 * * 5` | Friday 8 PM | Generate WeeklyProgress for all REGULAR classrooms |
| `snapshot-daily-refresh` | `0 2 * * *` | Daily 2 AM | Recalculate stale StudentProgressSnapshots |
| `streak-update` | `0 6 * * *` | Daily 6 AM | Update attendance/homework streaks |
| `goals-risk-check` | `0 8 * * *` | Daily 8 AM | Auto-evaluate all IN_PROGRESS goals |
| `notification-cleanup` | `0 3 * * *` | Daily 3 AM | Delete expired ProgressNotification records |

All times are **PKT (Asia/Karachi, UTC+5)**.

---

## Role Access Matrix

| Endpoint | SUPER_ADMIN | ADMIN | TEACHER | STUDENT | PARENT |
|----------|:-----------:|:-----:|:-------:|:-------:|:------:|
| POST /activities | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /activities | ✅ | ✅ | ✅ | Own | Children |
| PATCH /activities/:id | ✅ | ✅ | Own records | ❌ | ❌ |
| DELETE /activities/:id | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /weekly-progress/generate | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /weekly-progress | ✅ | ✅ | ✅ | Own | Children |
| PATCH /weekly-progress/:id | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /dashboard/student/:id | ✅ | ✅ | ✅ | Own | Children |
| POST /dashboard/student/:id/refresh | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /dashboard/at-risk | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /notifications | ✅ | ✅ | ✅ | Own | Own |
| PATCH /notifications/:id/read | ✅ | ✅ | ✅ | Own | Own |
| POST /goals | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /goals | ✅ | ✅ | ✅ | Own (if visible) | Children (if visible) |
| PATCH /goals/:id | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE /goals/:id | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /parent-communication | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /parent-communication/:id/acknowledge | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## Cache Strategy

| Data | Cache Key | TTL | Invalidated When |
|------|-----------|-----|-----------------|
| User auth | `user:{userId}` | 5 min | Password change / logout |
| Daily activity | `activity:{id}` | 5 min | Activity updated/deleted |
| Student day activity | `activity:student:{id}:{date}` | 5 min | Activity created/updated |
| Progress snapshot | `snapshot:{studentId}` | 5 min | Snapshot refreshed |
| Weekly progress | `weekly:{studentId}:{year}:{week}` | 10 min | Progress regenerated |
| Goal | `goal:{id}` | 5 min | Goal updated |
| Unread count | `notif:unread:{userId}` | 1 min | Notification read/created |
| Student type | `student:type:{studentId}` | 5 min | Student type changed |
| Academic config | `academic:config:active` | 1 hour | Config/holiday updated |

---

## Error Handling Chain

```
Controller  →  try/catch  →  next(err)
                                  │
                                  ▼
                         middlewares/errorHandler.js
                                  │
                     ┌────────────┴────────────────┐
                     ▼                             ▼
               ZodError (400)            PrismaError
               AppError (custom)         ├── P2002 → 409 Duplicate
               JWT errors (401/403)      ├── P2025 → 404 Not found
               Multer errors             └── P2003 → 400 FK violation
                     │
                     ▼
              Structured JSON response:
              { error: string, details?: [...], stack?: (dev only) }
```

---

## Data Flow Diagram

```
Teacher submits daily activity
         │
         ▼
   DailyActivity record
         │
         ├──► Friday cron → WeeklyProgress (aggregated)
         │                        │
         │                        ▼
         │               Snapshot recalculated
         │                        │
         │            ┌───────────┴──────────────┐
         │            ▼                          ▼
         │      Risk detected?             Goals auto-evaluated
         │            │                          │
         │     emitRiskAlert()           Status: ACHIEVED/AT_RISK/FAILED
         │            │                          │
         │            ▼                          ▼
         └──► ProgressNotification → Socket.io → Client
```
// controllers/admin/studentController.js
const prisma = require('../../db/prismaClient');
const fs = require('fs');
const logger = require('../../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips undefined values so we never accidentally write undefined to Prisma.
 * Empty strings are kept as-is here; callers decide whether to allow them.
 */
const omitUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Converts an empty string to null, otherwise returns the value unchanged.
 * Use for optional text columns that should store NULL instead of "".
 */
const emptyToNull = (v) => (v === '' ? null : v);

/**
 * Build the user-level update payload from request body.
 * Returns an object with only the fields that were explicitly provided
 * and are safe to write.
 */
const buildUserPayload = (body, existingUser) => {
  const { name, email, phone, status } = body;
  const data = {};

  if (name?.trim())  data.name  = name.trim();
  if (phone?.trim()) data.phone = phone.trim();

  if (status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
    data.status = status;
  }

  // Email: only include if provided AND different from current
  if (email?.trim() && email.trim() !== existingUser?.email) {
    data.email = email.trim().toLowerCase();
  }

  return data;
};

/**
 * Build the student-record update payload from request body.
 * Optional fields use emptyToNull so clearing a value stores NULL, not "".
 */
const buildStudentPayload = (body) => {
  const {
    dateOfBirth, gender, placeOfBirth, nationality, religion, bloodGroup,
    guardianName, guardianPhone, guardianRelation, guardianEmail,
    guardianOccupation, guardianCNIC,
    address, city, province, postalCode,
    medicalConditions, allergies, medication,
  } = body;

  const data = {};

  // ── Personal ──────────────────────────────────────────────────────────────
  if (dateOfBirth !== undefined) {
    const parsed = new Date(dateOfBirth);
    if (!isNaN(parsed)) data.dob = parsed;
  }
  if (gender !== undefined && ['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
    data.gender = gender;
  }
  if (placeOfBirth  !== undefined) data.placeOfBirth  = emptyToNull(placeOfBirth);
  if (nationality   !== undefined) data.nationality   = emptyToNull(nationality);
  if (religion      !== undefined) data.religion      = emptyToNull(religion);
  if (bloodGroup    !== undefined) data.bloodGroup    = emptyToNull(bloodGroup);

  // ── Guardian ──────────────────────────────────────────────────────────────
  // guardianName and guardianPhone: only update if explicitly provided and non-empty
  if (guardianName?.trim())  data.guardianName  = guardianName.trim();
  if (guardianPhone?.trim()) data.guardianPhone = guardianPhone.trim();

  // Optional guardian fields: store NULL when cleared
  if (guardianRelation  !== undefined) data.guardianRelation  = emptyToNull(guardianRelation?.trim?.() ?? guardianRelation);
  if (guardianEmail     !== undefined) data.guardianEmail     = emptyToNull(guardianEmail?.trim?.()    ?? guardianEmail);
  if (guardianOccupation !== undefined) data.guardianOccupation = emptyToNull(guardianOccupation?.trim?.() ?? guardianOccupation);
  if (guardianCNIC      !== undefined) data.guardianCNIC      = emptyToNull(guardianCNIC?.trim?.()     ?? guardianCNIC);

  // ── Contact ───────────────────────────────────────────────────────────────
  if (address    !== undefined) data.address    = emptyToNull(address?.trim?.()    ?? address);
  if (city       !== undefined) data.city       = emptyToNull(city?.trim?.()       ?? city);
  if (province   !== undefined) data.province   = emptyToNull(province?.trim?.()   ?? province);
  if (postalCode !== undefined) data.postalCode = emptyToNull(postalCode?.trim?.() ?? postalCode);

  // ── Medical ───────────────────────────────────────────────────────────────
  if (medicalConditions !== undefined) data.medicalConditions = emptyToNull(medicalConditions);
  if (allergies         !== undefined) data.allergies         = emptyToNull(allergies);
  if (medication        !== undefined) data.medication        = emptyToNull(medication);

  return data;
};

/**
 * Lookup a student by either userId or student.id.
 * Returns null if not found.
 */
const findStudent = async (id, includeOptions = {}) => {
  let student = await prisma.student.findFirst({
    where: { userId: id },
    ...includeOptions,
  });
  if (!student) {
    student = await prisma.student.findUnique({
      where: { id },
      ...includeOptions,
    });
  }
  return student;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /admin/students
 * Server-side filtered + paginated student list.
 */
async function getAllStudents(req, res) {
  try {
    const {
      page = 1, limit = 50,
      search, status, classRoomId, gender,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build user-level filter
    const userFilter = { role: 'STUDENT' };
    if (status) userFilter.status = status;
    if (search) {
      userFilter.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build student-level filter
    const where = { user: userFilter };
    if (gender) where.gender = gender;

    // Search on student-level fields too (admission, guardian)
    if (search) {
      where.OR = [
        { admissionNo:   { contains: search, mode: 'insensitive' } },
        { guardianName:  { contains: search, mode: 'insensitive' } },
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (classRoomId) {
      where.currentEnrollment = { classRoomId };
    }

    const orderBy =
      sortBy === 'name'        ? { user: { name: sortOrder } } :
      sortBy === 'admissionNo' ? { admissionNo: sortOrder }    :
                                 { user: { createdAt: sortOrder } };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, profileImage: true, status: true, createdAt: true },
          },
          currentEnrollment: {
            include: {
              classRoom: { select: { id: true, name: true, grade: true, type: true } },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getAllStudents error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /admin/students/:id
 * Update user-level and student-level fields. Accepts userId or studentId.
 */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;

    const student = await findStudent(id, { include: { user: true } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Check email uniqueness if a new email is being set
    const { email } = req.body;
    if (email?.trim() && email.trim().toLowerCase() !== student.user?.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id: student.userId } },
      });
      if (conflict) return res.status(400).json({ error: 'Email already in use by another account' });
    }

    const userPayload    = buildUserPayload(req.body, student.user);
    const studentPayload = buildStudentPayload(req.body);

    if (!Object.keys(userPayload).length && !Object.keys(studentPayload).length) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = Object.keys(userPayload).length
        ? await tx.user.update({ where: { id: student.userId }, data: userPayload })
        : student.user;

      const updatedStudent = Object.keys(studentPayload).length
        ? await tx.student.update({ where: { id: student.id }, data: studentPayload })
        : student;

      return { user: updatedUser, student: updatedStudent };
    });

    const { passwordHash, ...safeUser } = result.user || {};

    logger.info({ studentId: student.id }, 'Student updated');
    res.json({
      message: 'Student updated successfully',
      student: {
        ...safeUser,
        profile: buildProfileResponse(result.student),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'updateStudent error');
    res.status(500).json({ error: 'Failed to update student', details: error.message });
  }
}

/**
 * PUT /admin/students/:id/academic
 * Update enrollment details (class, roll number, start date).
 */
async function updateStudentAcademicInfo(req, res) {
  try {
    const { id } = req.params;
    const { classRoomId, rollNumber, startDate } = req.body;

    const student = await findStudent(id, { include: { currentEnrollment: true } });
    if (!student)                   return res.status(404).json({ error: 'Student not found' });
    if (!student.currentEnrollment) return res.status(404).json({ error: 'Student has no current enrollment' });

    const updateData = omitUndefined({
      ...(classRoomId !== undefined && { classRoomId }),
      ...(rollNumber  !== undefined && { rollNumber: parseInt(rollNumber) || rollNumber }),
      ...(startDate   !== undefined && !isNaN(new Date(startDate)) && { startDate: new Date(startDate) }),
    });

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: student.currentEnrollment.id },
      data: updateData,
      include: {
        classRoom: { select: { id: true, name: true, grade: true, type: true } },
      },
    });

    logger.info({ studentId: student.id, enrollmentId: updatedEnrollment.id }, 'Academic info updated');
    res.json({
      message: 'Academic information updated successfully',
      student: { id: student.id, userId: student.userId, currentEnrollment: updatedEnrollment },
    });
  } catch (error) {
    logger.error({ err: error }, 'updateStudentAcademicInfo error');
    res.status(500).json({ error: 'Failed to update academic info', details: error.message });
  }
}

/**
 * GET /admin/students/:id/details
 * Full student details including progress, attendance, documents.
 */
async function getStudentDetails(req, res) {
  try {
    const { id } = req.params;

    const includeOptions = {
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, profileImage: true, status: true, createdAt: true },
        },
        currentEnrollment: {
          include: {
            classRoom: {
              include: {
                teacher: { include: { user: { select: { name: true, email: true } } } },
                subjects: { include: { teacher: { include: { user: { select: { name: true } } } } } },
              },
            },
          },
        },
        enrollments: {
          include: {
            classRoom: { select: { id: true, name: true, grade: true, type: true } },
          },
          orderBy: { startDate: 'desc' },
        },
        parents: {
          include: { user: { select: { name: true, email: true, phone: true } } },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 20,
          include: {
            subject:  { select: { name: true } },
            classRoom: { select: { name: true } },
            teacher:  { include: { user: { select: { name: true } } } },
          },
        },
      },
    };

    const student = await findStudent(id, includeOptions);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // ── Progress ────────────────────────────────────────────────────────────
    const progressData = await resolveProgress(student);

    // ── Attendance stats ────────────────────────────────────────────────────
    const total   = student.attendances.length;
    const present = student.attendances.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
    const attendancePct = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

    // ── Documents ───────────────────────────────────────────────────────────
    const otherDocs = safeParseJson(student.otherDocuments, []);

    const documents = {
      profileImage:               student.profileImage,
      birthCertificate:           student.birthCertificate,
      cnicOrBForm:                student.cnicOrBForm,
      previousSchoolCertificate:  student.previousSchoolCertificate,
      otherDocuments:             otherDocs,
    };

    const makeDocUrl = (type, sid, idx = null) =>
      `/api/admin/students/${sid}/documents/${type}${idx !== null ? `?index=${idx}` : ''}`;

    const urls = {
      profileImageUrl:              `/api/admin/files/profile-image/${student.userId}`,
      birthCertificateUrl:          student.birthCertificate          ? makeDocUrl('birth-certificate', student.id) : null,
      cnicBformUrl:                 student.cnicOrBForm               ? makeDocUrl('cnic-bform',        student.id) : null,
      previousSchoolCertificateUrl: student.previousSchoolCertificate ? makeDocUrl('previous-school',  student.id) : null,
      otherDocumentsUrls:           otherDocs.map((_, i) => makeDocUrl('other', student.id, i)),
    };

    res.json({
      student:  student.user,
      profile:  buildProfileResponse(student),
      academic: {
        currentEnrollment: student.currentEnrollment,
        classHistory:      student.enrollments,
        attendance: {
          total,
          present,
          percentage: attendancePct,
          recent: student.attendances,
        },
      },
      progress: progressData,
      parents:  student.parents,
      documents,
      urls,
    });
  } catch (error) {
    logger.error({ err: error }, 'getStudentDetails error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /admin/students/:id/status
 * Update only the user status.
 */
async function updateStudentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ACTIVE, INACTIVE, or TERMINATED.' });
    }

    const student = await findStudent(id, { include: { user: true } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const updated = await prisma.user.update({
      where: { id: student.userId },
      data: { status },
    });

    logger.info({ studentId: student.id, status }, 'Student status updated');
    res.json({ message: 'Student status updated successfully', status: updated.status });
  } catch (error) {
    logger.error({ err: error }, 'updateStudentStatus error');
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
}

/**
 * DELETE /admin/students/:id
 * Hard-delete student + user + related data + files.
 */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    const student = await findStudent(id, {
      include: {
        user: { select: { id: true, name: true, email: true } },
        currentEnrollment: { include: { classRoom: { select: { id: true, name: true } } } },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const info = {
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      email: student.user.email,
      admissionNo: student.admissionNo,
    };

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.deleteMany({ where: { studentId: student.id } });
      await tx.student.update({ where: { id: student.id }, data: { parents: { set: [] } } });
      await tx.attendance.deleteMany({ where: { studentId: student.id } });
      await Promise.all([
        tx.hifzProgress.deleteMany({ where: { studentId: student.id } }),
        tx.nazraProgress.deleteMany({ where: { studentId: student.id } }),
        tx.subjectProgress.deleteMany({ where: { studentId: student.id } }),
      ]);
      await tx.studentHifzStatus.deleteMany({ where: { studentId: student.id } });
      await tx.student.delete({ where: { id: student.id } });
      await tx.user.delete({ where: { id: student.userId } });
    });

    // Best-effort file cleanup — never block the response
    cleanupStudentFiles(student);

    logger.info({ studentId: info.id, name: info.name }, 'Student deleted');
    res.json({ message: 'Student deleted successfully', deletedStudent: info });
  } catch (error) {
    logger.error({ err: error }, 'deleteStudent error');
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildProfileResponse(student) {
  return {
    id:                   student.id,
    admissionNo:          student.admissionNo,
    dob:                  student.dob,
    gender:               student.gender,
    placeOfBirth:         student.placeOfBirth,
    nationality:          student.nationality,
    religion:             student.religion,
    bloodGroup:           student.bloodGroup,
    guardianName:         student.guardianName,
    guardianPhone:        student.guardianPhone,
    guardianRelation:     student.guardianRelation,
    guardianEmail:        student.guardianEmail,
    guardianOccupation:   student.guardianOccupation,
    guardianCNIC:         student.guardianCNIC,
    address:              student.address,
    city:                 student.city,
    province:             student.province,
    postalCode:           student.postalCode,
    medicalConditions:    student.medicalConditions,
    allergies:            student.allergies,
    medication:           student.medication,
  };
}

async function resolveProgress(student) {
  if (!student.currentEnrollment) return {};

  const type = student.currentEnrollment.classRoom?.type;

  if (type === 'HIFZ') {
    const [progress, completionStats] = await Promise.all([
      prisma.hifzProgress.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 10,
        include: { teacher: { include: { user: { select: { name: true } } } } },
      }),
      calculateHifzCompletion(student.id),
    ]);
    return { type: 'HIFZ', progress, completionStats };
  }

  if (type === 'NAZRA') {
    const [progress, completionStats] = await Promise.all([
      prisma.nazraProgress.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 10,
        include: { teacher: { include: { user: { select: { name: true } } } } },
      }),
      calculateNazraCompletion(student.id),
    ]);
    return { type: 'NAZRA', progress, completionStats };
  }

  if (type === 'REGULAR') {
    const [assessments, avg] = await Promise.all([
      prisma.subjectProgress.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          subject: { select: { name: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.subjectProgress.aggregate({
        where: { studentId: student.id },
        _avg: { percentage: true },
      }),
    ]);
    return {
      type: 'REGULAR',
      assessments,
      averagePercentage: Math.round((avg._avg.percentage || 0) * 10000) / 100,
    };
  }

  return {};
}

async function calculateHifzCompletion(studentId) {
  const TOTAL_LINES = 540;

  const records = await prisma.hifzProgress.findMany({
    where: { studentId },
    orderBy: { date: 'asc' },
  });

  if (!records.length) {
    return { totalLinesCompleted: 0, parasCompleted: 0, completionPercentage: 0, averageDailyLines: 0, estimatedDaysRemaining: null };
  }

  const totalLines = records.reduce((s, r) => s + (r.sabaqLines || 0), 0);
  const latest     = records[records.length - 1];
  const parasCompleted = latest.completedParas?.length ?? 0;

  const daysElapsed = Math.ceil((latest.date - records[0].date) / 86400000) || 1;
  const avgDaily    = totalLines / daysElapsed;
  const remaining   = TOTAL_LINES - totalLines;

  return {
    totalLinesCompleted:    totalLines,
    parasCompleted,
    completionPercentage:   Math.min(Math.round((totalLines / TOTAL_LINES) * 10000) / 100, 100),
    averageDailyLines:      Math.round(avgDaily * 100) / 100,
    estimatedDaysRemaining: avgDaily > 0 ? Math.ceil(remaining / avgDaily) : null,
    currentPara:            latest.currentPara || 1,
    currentParaProgress:    latest.paraProgress || 0,
  };
}

async function calculateNazraCompletion(studentId) {
  const TOTAL_LINES = 540;

  const records = await prisma.nazraProgress.findMany({
    where: { studentId },
    orderBy: { date: 'asc' },
  });

  if (!records.length) {
    return { totalLinesRecited: 0, completionPercentage: 0, averageDailyLines: 0, estimatedDaysRemaining: null, isCompleted: false };
  }

  const totalLines = records.reduce((s, r) => s + (r.recitedLines || 0), 0);
  const daysElapsed = Math.ceil((records[records.length - 1].date - records[0].date) / 86400000) || 1;
  const avgDaily    = totalLines / daysElapsed;
  const pct         = Math.min(Math.round((totalLines / TOTAL_LINES) * 10000) / 100, 100);
  const remaining   = TOTAL_LINES - Math.min(totalLines, TOTAL_LINES);

  return {
    totalLinesRecited:      totalLines,
    completionPercentage:   pct,
    averageDailyLines:      Math.round(avgDaily * 100) / 100,
    estimatedDaysRemaining: avgDaily > 0 ? Math.ceil(remaining / avgDaily) : null,
    isCompleted:            pct >= 100,
  };
}

function safeParseJson(str, fallback = []) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function cleanupStudentFiles(student) {
  try {
    const paths = [
      student.profileImage,
      student.birthCertificate,
      student.cnicOrBForm,
      student.previousSchoolCertificate,
      ...safeParseJson(student.otherDocuments, []),
    ].filter(Boolean);

    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {
        logger.warn({ filePath: p, err: e }, 'Could not delete student file');
      }
    }
  } catch (e) {
    logger.warn({ err: e }, 'cleanupStudentFiles failed');
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getAllStudents,
  updateStudent,
  updateStudentStatus,
  updateStudentAcademicInfo,
  getStudentDetails,
  deleteStudent,
};
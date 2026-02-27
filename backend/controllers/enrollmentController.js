const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const { generateStrongPassword, generateEmail, generateStudentEmail, generateAdmissionNumber, generateRollNumber } = require('../utils/passwordGenerator');
const { deleteFile, deleteFiles } = require('../middlewares/upload');

const saltRounds = 12;

class EnrollmentController {
  // Register teacher with auto-generated email/password and file uploads
  async registerTeacher(req, res) {
    try {
      const {
        name,
        phone,
        profileData
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Profile image is now required and comes from req.profileImagePath
      if (!req.profileImagePath) {
        return res.status(400).json({ error: 'Profile image is required' });
      }

      // Parse profileData if it's a JSON string
      let parsedProfileData = profileData;
      if (typeof profileData === 'string') {
        try {
          parsedProfileData = JSON.parse(profileData);
        } catch (e) {
          parsedProfileData = {};
        }
      }

      // Generate email and strong password
      const email = generateEmail(name, 'teacher');
      const password = generateStrongPassword();

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        // Delete uploaded files if email exists
        await deleteFile(req.profileImagePath);
        if (req.cnicFrontPath) await deleteFile(req.cnicFrontPath);
        if (req.cnicBackPath) await deleteFile(req.cnicBackPath);
        if (req.degreeDocumentsPath) {
          const degreePaths = JSON.parse(req.degreeDocumentsPath);
          await deleteFiles(degreePaths);
        }
        if (req.otherDocumentsPath) {
          const otherPaths = JSON.parse(req.otherDocumentsPath);
          await deleteFiles(otherPaths);
        }

        // Regenerate with different email
        return this.registerTeacher(req, res);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user and teacher profile in transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            phone: phone || null,
            role: 'TEACHER',
            profileImage: req.profileImagePath
          }
        });

        // Create teacher profile
        const teacherProfile = await prisma.teacher.create({
          data: {
            userId: user.id,
            bio: parsedProfileData?.bio || null,
            dateOfBirth: parsedProfileData?.dateOfBirth ? new Date(parsedProfileData.dateOfBirth) : null,
            gender: parsedProfileData?.gender || null,
            cnic: parsedProfileData?.cnic || null,
            qualification: parsedProfileData?.qualification || null,
            specialization: parsedProfileData?.specialization || null,
            experience: parsedProfileData?.experience ? String(parsedProfileData.experience) : null,
            address: parsedProfileData?.address || null,
            emergencyContactName: parsedProfileData?.emergencyContactName || null,
            emergencyContactPhone: parsedProfileData?.emergencyContactPhone || null,
            emergencyContactRelation: parsedProfileData?.emergencyContactRelation || null,
            phoneSecondary: parsedProfileData?.phoneSecondary || null,
            phoneEmergency: parsedProfileData?.phoneEmergency || null,
            profileImage: req.profileImagePath,
            cnicFront: req.cnicFrontPath || null,
            cnicBack: req.cnicBackPath || null,
            degreeDocuments: req.degreeDocumentsPath || null,
            otherDocuments: req.otherDocumentsPath || null,
            joiningDate: parsedProfileData?.joiningDate ? new Date(parsedProfileData.joiningDate) : null,
            salary: parsedProfileData?.salary || null,
            employmentType: parsedProfileData?.employmentType || null
          }
        });

        return { user, teacherProfile, password };
      });

      // Prepare response
      const userData = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        phone: result.user.phone,
        profileImage: result.user.profileImage,
        status: result.user.status,
        isOnline: result.user.isOnline,
        createdAt: result.user.createdAt,
        teacherProfile: result.teacherProfile
      };

      res.status(201).json({
        message: 'Teacher created successfully',
        credentials: {
          email: result.user.email,
          password: result.password
        },
        user: userData
      });

    } catch (error) {
      console.error('Register teacher error:', error);

      // Clean up uploaded files on error
      if (req.profileImagePath) await deleteFile(req.profileImagePath);
      if (req.cnicFrontPath) await deleteFile(req.cnicFrontPath);
      if (req.cnicBackPath) await deleteFile(req.cnicBackPath);
      if (req.degreeDocumentsPath) {
        try {
          const degreePaths = JSON.parse(req.degreeDocumentsPath);
          await deleteFiles(degreePaths);
        } catch (e) { }
      }
      if (req.otherDocumentsPath) {
        try {
          const otherPaths = JSON.parse(req.otherDocumentsPath);
          await deleteFiles(otherPaths);
        } catch (e) { }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async registerStudent(req, res) {
    try {
      const {
        name,
        phone,
        profileData,
        classRoomId
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Profile image is required
      if (!req.profileImagePath) {
        return res.status(400).json({ error: 'Profile image is required' });
      }

      // Parse profileData if it's a JSON string
      let parsedProfileData = profileData;
      if (typeof profileData === 'string') {
        try {
          parsedProfileData = JSON.parse(profileData);
        } catch (e) {
          parsedProfileData = {};
        }
      }

      // Generate sequential admission number
      const admissionNo = await generateAdmissionNumber();

      // Generate email and strong password
      const email = generateStudentEmail(admissionNo);
      const password = generateStrongPassword();

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user and student profile in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            phone: phone || null,
            role: 'STUDENT',
            profileImage: req.profileImagePath
          }
        });

        // Create student profile
        const studentProfile = await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            dob: parsedProfileData?.dob ? new Date(parsedProfileData.dob) : null,
            gender: parsedProfileData?.gender || null,
            placeOfBirth: parsedProfileData?.placeOfBirth || null,
            nationality: parsedProfileData?.nationality || 'Pakistani',
            religion: parsedProfileData?.religion || 'Islam',
            bloodGroup: parsedProfileData?.bloodGroup || null,
            profileImage: req.profileImagePath,
            birthCertificate: req.birthCertificatePath || null,
            cnicOrBForm: req.cnicOrBFormPath || null,
            previousSchoolCertificate: req.previousSchoolCertificatePath || null,
            otherDocuments: req.otherDocumentsPath || null,
            medicalConditions: parsedProfileData?.medicalConditions || null,
            allergies: parsedProfileData?.allergies || null,
            medication: parsedProfileData?.medication || null,
            guardianName: parsedProfileData?.guardianName || null,
            guardianRelation: parsedProfileData?.guardianRelation || null,
            guardianPhone: parsedProfileData?.guardianPhone || null,
            guardianEmail: parsedProfileData?.guardianEmail || null,
            guardianOccupation: parsedProfileData?.guardianOccupation || null,
            guardianCNIC: parsedProfileData?.guardianCNIC || null,
            guardian2Name: parsedProfileData?.guardian2Name || null,
            guardian2Relation: parsedProfileData?.guardian2Relation || null,
            guardian2Phone: parsedProfileData?.guardian2Phone || null,
            guardian2Email: parsedProfileData?.guardian2Email || null,
            address: parsedProfileData?.address || null,
            city: parsedProfileData?.city || null,
            province: parsedProfileData?.province || null,
            postalCode: parsedProfileData?.postalCode || null,
            emergencyContactName: parsedProfileData?.emergencyContactName || null,
            emergencyContactPhone: parsedProfileData?.emergencyContactPhone || null,
            emergencyContactRelation: parsedProfileData?.emergencyContactRelation || null
          }
        });

        let enrollment = null;

        // If classRoomId provided, create enrollment with roll number
        if (classRoomId) {
          const classRoom = await tx.classRoom.findUnique({
            where: { id: classRoomId }
          });

          if (!classRoom) {
            throw new Error('Class room not found');
          }

          const rollNumber = await generateRollNumber(classRoomId, tx);

          enrollment = await tx.enrollment.create({
            data: {
              studentId: studentProfile.id,
              classRoomId,
              rollNumber,
              isCurrent: true
            },
            include: {
              classRoom: true
            }
          });

          await tx.student.update({
            where: { id: studentProfile.id },
            data: { currentEnrollmentId: enrollment.id }
          });
        }

        return { user, studentProfile, password, admissionNo, enrollment };
      });

      // Prepare response
      const userData = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        phone: result.user.phone,
        profileImage: result.user.profileImage,
        status: result.user.status,
        isOnline: result.user.isOnline,
        createdAt: result.user.createdAt,
        studentProfile: {
          ...result.studentProfile,
          currentEnrollment: result.enrollment
        }
      };

      res.status(201).json({
        message: 'Student created successfully',
        credentials: {
          email: result.user.email,
          password: result.password,
          admissionNo: result.admissionNo,
          rollNumber: result.enrollment?.rollNumber || null
        },
        user: userData
      });

    } catch (error) {
      console.error('Register student error:', error);

      // Clean up uploaded files on error
      if (req.profileImagePath) await deleteFile(req.profileImagePath);
      if (req.birthCertificatePath) await deleteFile(req.birthCertificatePath);
      if (req.cnicOrBFormPath) await deleteFile(req.cnicOrBFormPath);
      if (req.previousSchoolCertificatePath) await deleteFile(req.previousSchoolCertificatePath);
      if (req.otherDocumentsPath) {
        try {
          const otherPaths = JSON.parse(req.otherDocumentsPath);
          await deleteFiles(otherPaths);
        } catch (e) { }
      }

      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'Duplicate roll number detected. Please try again.'
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update teacher profile image
  async updateTeacherProfileImage(req, res) {
    try {
      const { teacherId } = req.params;

      if (!req.profileImagePath) {
        return res.status(400).json({ error: 'Profile image is required' });
      }

      // Get current teacher data
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: { user: true }
      });

      if (!teacher) {
        await deleteFile(req.profileImagePath);
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Delete old profile image
      if (teacher.profileImage) {
        await deleteFile(teacher.profileImage);
      }
      if (teacher.user.profileImage) {
        await deleteFile(teacher.user.profileImage);
      }

      // Update with new image
      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          profileImage: req.profileImagePath,
          user: {
            update: {
              profileImage: req.profileImagePath
            }
          }
        },
        include: { user: true }
      });

      res.json({
        message: 'Profile image updated successfully',
        teacher: updatedTeacher
      });

    } catch (error) {
      console.error('Update teacher profile image error:', error);
      if (req.profileImagePath) await deleteFile(req.profileImagePath);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update student profile image
  async updateStudentProfileImage(req, res) {
    try {
      const { studentId } = req.params;

      if (!req.profileImagePath) {
        return res.status(400).json({ error: 'Profile image is required' });
      }

      // Get current student data
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: true }
      });

      if (!student) {
        await deleteFile(req.profileImagePath);
        return res.status(404).json({ error: 'Student not found' });
      }

      // Delete old profile image
      if (student.profileImage) {
        await deleteFile(student.profileImage);
      }
      if (student.user.profileImage) {
        await deleteFile(student.user.profileImage);
      }

      // Update with new image
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: {
          profileImage: req.profileImagePath,
          user: {
            update: {
              profileImage: req.profileImagePath
            }
          }
        },
        include: { user: true }
      });

      res.json({
        message: 'Profile image updated successfully',
        student: updatedStudent
      });

    } catch (error) {
      console.error('Update student profile image error:', error);
      if (req.profileImagePath) await deleteFile(req.profileImagePath);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Register parent with auto-generated email/password
  async registerParent(req, res) {
    try {
      const {
        name,
        phone
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const email = generateEmail(name, 'parent');
      const password = generateStrongPassword();

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return this.registerParent(req, res);
      }

      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            phone: phone || null,
            role: 'PARENT'
          }
        });

        const parentProfile = await prisma.parent.create({
          data: {
            userId: user.id
          }
        });

        return { user, parentProfile, password };
      });

      const userData = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        phone: result.user.phone,
        status: result.user.status,
        isOnline: result.user.isOnline,
        createdAt: result.user.createdAt,
        parentProfile: result.parentProfile
      };

      res.status(201).json({
        message: 'Parent created successfully',
        credentials: {
          email: result.user.email,
          password: result.password
        },
        user: userData
      });

    } catch (error) {
      console.error('Register parent error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Enroll existing student in a class
  async enrollStudentInClass(req, res) {
    try {
      const { studentId, classRoomId } = req.body;

      if (!studentId || !classRoomId) {
        return res.status(400).json({ error: 'Student ID and Class Room ID are required' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            currentEnrollment: {
              select: {
                id: true
              }
            }
          }
        });

        if (!student) {
          throw new Error('Student not found');
        }

        const classRoom = await tx.classRoom.findUnique({
          where: { id: classRoomId }
        });

        if (!classRoom) {
          throw new Error('Class room not found');
        }

        if (student.currentEnrollment) {
          await tx.enrollment.update({
            where: { id: student.currentEnrollment.id },
            data: { isCurrent: false, endDate: new Date() }
          });
        }

        const rollNumber = await generateRollNumber(classRoomId, tx);

        const enrollment = await tx.enrollment.create({
          data: {
            studentId,
            classRoomId,
            rollNumber,
            isCurrent: true,
            startDate: new Date()
          },
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                type: true
              }
            },
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        await tx.student.update({
          where: { id: studentId },
          data: { currentEnrollmentId: enrollment.id }
        });

        return enrollment;
      });

      res.status(201).json({
        message: 'Student enrolled successfully',
        enrollment: result
      });

    } catch (error) {
      console.error('Enroll student error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'Duplicate roll number detected. Please try again.'
        });
      }
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  // Transfer student to different class
  async transferStudent(req, res) {
    try {
      const { studentId, newClassRoomId, reason } = req.body;

      if (!studentId || !newClassRoomId) {
        return res.status(400).json({
          error: 'Student ID and New Class Room ID are required'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            currentEnrollment: {
              select: {
                id: true,
                classRoomId: true,
                classRoom: {
                  select: { name: true }
                }
              }
            }
          }
        });

        if (!student) {
          throw new Error('Student not found');
        }

        if (!student.currentEnrollment) {
          throw new Error('Student is not currently enrolled in any class');
        }

        if (student.currentEnrollment.classRoomId === newClassRoomId) {
          throw new Error('Student is already enrolled in this class');
        }

        const newClassRoom = await tx.classRoom.findUnique({
          where: { id: newClassRoomId }
        });

        if (!newClassRoom) {
          throw new Error('New class room not found');
        }

        await tx.enrollment.update({
          where: { id: student.currentEnrollment.id },
          data: {
            isCurrent: false,
            endDate: new Date(),
            promotedTo: reason || `Transferred to ${newClassRoom.name}`
          }
        });

        const rollNumber = await generateRollNumber(newClassRoomId, tx);

        const newEnrollment = await tx.enrollment.create({
          data: {
            studentId,
            classRoomId: newClassRoomId,
            rollNumber,
            isCurrent: true,
            startDate: new Date()
          },
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                type: true
              }
            },
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        await tx.student.update({
          where: { id: studentId },
          data: { currentEnrollmentId: newEnrollment.id }
        });

        return {
          newEnrollment,
          previousClass: student.currentEnrollment.classRoom.name,
          newClass: newClassRoom.name
        };
      });

      res.json({
        message: 'Student transferred successfully',
        transfer: {
          from: result.previousClass,
          to: result.newClass,
          transferDate: new Date()
        },
        enrollment: result.newEnrollment
      });

    } catch (error) {
      console.error('Transfer student error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  // Get student enrollment history
  async getStudentEnrollmentHistory(req, res) {
    try {
      const { studentId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId },
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            classRoom: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                type: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        }),
        prisma.enrollment.count({
          where: { studentId }
        })
      ]);

      res.json({
        student: {
          id: student.id,
          name: student.user.name,
          admissionNo: student.admissionNo
        },
        enrollments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get enrollment history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new EnrollmentController();
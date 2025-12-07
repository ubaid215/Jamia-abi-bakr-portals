const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const { generateStrongPassword, generateEmail, generateStudentEmail, generateAdmissionNumber, generateRollNumber } = require('../utils/passwordGenerator');

const saltRounds = 12;

class EnrollmentController {
  // Register teacher with auto-generated email/password
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

      // Generate email and strong password
      const email = generateEmail(name, 'teacher');
      const password = generateStrongPassword();

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        // Regenerate if duplicate
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
            profileImage: profileData?.profileImage || null
          }
        });

        // Create teacher profile
        const teacherProfile = await prisma.teacher.create({
          data: {
            userId: user.id,
            bio: profileData?.bio || null,
            dateOfBirth: profileData?.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
            gender: profileData?.gender || null,
            cnic: profileData?.cnic || null,
            qualification: profileData?.qualification || null,
            specialization: profileData?.specialization || null,
            experience: profileData?.experience || null,
            address: profileData?.address || null,
            emergencyContactName: profileData?.emergencyContactName || null,
            emergencyContactPhone: profileData?.emergencyContactPhone || null,
            emergencyContactRelation: profileData?.emergencyContactRelation || null,
            phoneSecondary: profileData?.phoneSecondary || null,
            phoneEmergency: profileData?.phoneEmergency || null,
            profileImage: profileData?.profileImage || null,
            cnicFront: profileData?.cnicFront || null,
            cnicBack: profileData?.cnicBack || null,
            degreeDocuments: profileData?.degreeDocuments || null,
            otherDocuments: profileData?.otherDocuments || null,
            joiningDate: profileData?.joiningDate ? new Date(profileData.joiningDate) : null,
            salary: profileData?.salary || null,
            employmentType: profileData?.employmentType || null
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
          password: result.password // Show only once during creation
        },
        user: userData
      });

    } catch (error) {
      console.error('Register teacher error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

   async registerStudent(req, res) {
    try {
      const { 
        name, 
        phone, 
        profileData,
        classRoomId  // Optional: enroll student in a class immediately
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
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
            profileImage: profileData?.profileImage || null
          }
        });

        // Create student profile
        const studentProfile = await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            dob: profileData?.dob ? new Date(profileData.dob) : null,
            gender: profileData?.gender || null,
            placeOfBirth: profileData?.placeOfBirth || null,
            nationality: profileData?.nationality || 'Pakistani',
            religion: profileData?.religion || 'Islam',
            bloodGroup: profileData?.bloodGroup || null,
            profileImage: profileData?.profileImage || null,
            birthCertificate: profileData?.birthCertificate || null,
            cnicOrBForm: profileData?.cnicOrBForm || null,
            previousSchoolCertificate: profileData?.previousSchoolCertificate || null,
            otherDocuments: profileData?.otherDocuments || null,
            medicalConditions: profileData?.medicalConditions || null,
            allergies: profileData?.allergies || null,
            medication: profileData?.medication || null,
            guardianName: profileData?.guardianName || null,
            guardianRelation: profileData?.guardianRelation || null,
            guardianPhone: profileData?.guardianPhone || null,
            guardianEmail: profileData?.guardianEmail || null,
            guardianOccupation: profileData?.guardianOccupation || null,
            guardianCNIC: profileData?.guardianCNIC || null,
            guardian2Name: profileData?.guardian2Name || null,
            guardian2Relation: profileData?.guardian2Relation || null,
            guardian2Phone: profileData?.guardian2Phone || null,
            guardian2Email: profileData?.guardian2Email || null,
            address: profileData?.address || null,
            city: profileData?.city || null,
            province: profileData?.province || null,
            postalCode: profileData?.postalCode || null,
            emergencyContactName: profileData?.emergencyContactName || null,
            emergencyContactPhone: profileData?.emergencyContactPhone || null,
            emergencyContactRelation: profileData?.emergencyContactRelation || null
          }
        });

        let enrollment = null;
        
        // If classRoomId provided, create enrollment with roll number
        if (classRoomId) {
          // Check if class exists
          const classRoom = await tx.classRoom.findUnique({
            where: { id: classRoomId }
          });

          if (!classRoom) {
            throw new Error('Class room not found');
          }

          // Generate roll number using the same transaction to avoid race conditions
          const rollNumber = await generateRollNumber(classRoomId, tx);
          
          // Check if this roll number already exists in the class (safety check)
          const existingEnrollment = await tx.enrollment.findFirst({
            where: {
              classRoomId,
              rollNumber
            }
          });

          if (existingEnrollment) {
            // If duplicate exists (shouldn't happen with proper transaction), regenerate
            const newRollNumber = await generateRollNumber(classRoomId, tx);
            enrollment = await tx.enrollment.create({
              data: {
                studentId: studentProfile.id,
                classRoomId,
                rollNumber: newRollNumber,
                isCurrent: true
              },
              include: {
                classRoom: true
              }
            });
          } else {
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
          }

          // Set as current enrollment
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
          password: result.password, // Show only once during creation
          admissionNo: result.admissionNo,
          rollNumber: result.enrollment?.rollNumber || null
        },
        user: userData
      });

    } catch (error) {
      console.error('Register student error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          error: 'Duplicate roll number detected. Please try again.' 
        });
      }
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

      // Generate email and strong password
      const email = generateEmail(name, 'parent');
      const password = generateStrongPassword();

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return this.registerParent(req, res);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user and parent profile in transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            phone: phone || null,
            role: 'PARENT'
          }
        });

        // Create parent profile
        const parentProfile = await prisma.parent.create({
          data: {
            userId: user.id
          }
        });

        return { user, parentProfile, password };
      });

      // Prepare response
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
          password: result.password // Show only once during creation
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
        // Check if student exists
        const student = await tx.student.findUnique({
          where: { id: studentId },
          include: {
            user: true,
            currentEnrollment: {
              include: {
                classRoom: true
              }
            }
          }
        });

        if (!student) {
          throw new Error('Student not found');
        }

        // Check if class exists
        const classRoom = await tx.classRoom.findUnique({
          where: { id: classRoomId }
        });

        if (!classRoom) {
          throw new Error('Class room not found');
        }

        // If student already has current enrollment, mark it as not current
        if (student.currentEnrollment) {
          await tx.enrollment.update({
            where: { id: student.currentEnrollment.id },
            data: { isCurrent: false, endDate: new Date() }
          });
        }

        // Generate roll number for this class using the same transaction
        const rollNumber = await generateRollNumber(classRoomId, tx);
        
        // Create enrollment
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

        // Update student's current enrollment
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
    const { studentId, newClassRoomId, reason } = req.body;  // ✅ Add reason parameter

    if (!studentId || !newClassRoomId) {
      return res.status(400).json({ 
        error: 'Student ID and New Class Room ID are required' 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if student exists and has current enrollment
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          currentEnrollment: {
            include: {
              classRoom: true  // ✅ Include classRoom to check current class
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

      // ✅ Check if transferring to same class
      if (student.currentEnrollment.classRoomId === newClassRoomId) {
        throw new Error('Student is already enrolled in this class');
      }

      // Check if new class exists
      const newClassRoom = await tx.classRoom.findUnique({
        where: { id: newClassRoomId }
      });

      if (!newClassRoom) {
        throw new Error('New class room not found');
      }

      // End current enrollment (PRESERVES HISTORY)
      await tx.enrollment.update({
        where: { id: student.currentEnrollment.id },
        data: { 
          isCurrent: false, 
          endDate: new Date(),
          promotedTo: reason || `Transferred to ${newClassRoom.name}`  // ✅ Use custom reason
        }
      });

      // ✅ Generate roll number with transaction
      const rollNumber = await generateRollNumber(newClassRoomId, tx);
      
      // Create new enrollment (CREATES NEW RECORD)
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

      // Update student's current enrollment pointer
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

      // Check if student exists
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
const { PrismaClient, ClassType, Role, UserStatus, AssessmentType, Grade } = require('@prisma/client');
const prisma = new PrismaClient();
const bcryptjs = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Hash password once for all users
    const hashedPassword = await bcryptjs.hash('password123', 10);

    // Clear existing data in correct order (respecting foreign key constraints)
    console.log('🧹 Clearing existing data...');
    
    // Delete in order of dependencies (child tables first, parent tables last)
    await prisma.attendance.deleteMany();
    await prisma.examResult.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.dailyStudyReport.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.message.deleteMany();
    await prisma.document.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.hifzProgress.deleteMany();
    await prisma.nazraProgress.deleteMany();
    await prisma.subjectProgress.deleteMany();
    await prisma.monthlyProgress.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.teacherSubject.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.classRoom.deleteMany();
    
    // Delete students and teachers with their users
    const students = await prisma.student.findMany();
    for (const student of students) {
      await prisma.student.delete({ where: { id: student.id } });
      await prisma.user.delete({ where: { id: student.userId } });
    }
    
    const teachers = await prisma.teacher.findMany();
    for (const teacher of teachers) {
      await prisma.teacher.delete({ where: { id: teacher.id } });
      await prisma.user.delete({ where: { id: teacher.userId } });
    }
    
    const parents = await prisma.parent.findMany();
    for (const parent of parents) {
      await prisma.parent.delete({ where: { id: parent.id } });
      await prisma.user.delete({ where: { id: parent.userId } });
    }
    
    // Delete any remaining users
    await prisma.user.deleteMany();
    
    console.log('   ✅ Cleared all existing data');

    // Create Super Admin and Admin users
    console.log('👑 Creating Super Admin and Admin...');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@madrasa.com',
        passwordHash: hashedPassword,
        role: Role.SUPER_ADMIN,
        name: 'Super Admin',
        phone: '+923001234560',
        status: UserStatus.ACTIVE
      }
    });
    console.log(`   ✅ Created Super Admin: ${superAdmin.name}`);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@madrasa.com',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        name: 'Admin User',
        phone: '+923001234561',
        status: UserStatus.ACTIVE
      }
    });
    console.log(`   ✅ Created Admin: ${admin.name}`);

    // Create teachers
    console.log('👨‍🏫 Creating teachers...');

    const teacherUsers = [
      {
        email: 'hifz.teacher@madrasa.com',
        name: 'Hafiz Muhammad Bilal',
        phone: '+923001234567',
        bio: 'Experienced Quran teacher with 10 years in Hifz instruction',
        qualification: 'Hafiz-e-Quran, MA Islamic Studies',
        specialization: 'Quran Memorization & Tajweed',
        experience: '10 years'
      },
      {
        email: 'nazra.teacher@madrasa.com',
        name: 'Qari Ahmed Hassan',
        phone: '+923001234568',
        bio: 'Expert in Quranic recitation and Tajweed',
        qualification: 'Qari, BA Arabic',
        specialization: 'Nazra & Tajweed',
        experience: '8 years'
      },
      {
        email: 'darsenizami.teacher@madrasa.com',
        name: 'Maulana Abdul Rahman',
        phone: '+923001234569',
        bio: 'Scholar of Islamic sciences and Dars-e-Nizami curriculum',
        qualification: 'Aalim, MA Islamic Studies',
        specialization: 'Dars-e-Nizami, Hadith & Fiqh',
        experience: '12 years'
      }
    ];

    const teachersCreated = [];
    for (const teacherData of teacherUsers) {
      // Create user first
      const user = await prisma.user.create({
        data: {
          email: teacherData.email,
          passwordHash: hashedPassword,
          role: Role.TEACHER,
          name: teacherData.name,
          phone: teacherData.phone,
          status: UserStatus.ACTIVE
        }
      });

      // Then create teacher profile
      const teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          bio: teacherData.bio,
          qualification: teacherData.qualification,
          specialization: teacherData.specialization,
          experience: teacherData.experience,
          joiningDate: new Date(),
          employmentType: 'Permanent'
        }
      });
      teachersCreated.push(teacher);
      console.log(`   ✅ Created teacher: ${teacherData.name}`);
    }

    const [hifzTeacher, nazraTeacher, darsTeacher] = teachersCreated;

    // Create classes
    console.log('🏫 Creating classes...');

    const classesData = [
      {
        name: 'Hifz Batch 1',
        grade: 'Hifz',
        section: 'A',
        type: ClassType.HIFZ,
        description: 'Quran Memorization Program - First Batch',
        teacherId: hifzTeacher.id
      },
      {
        name: 'Nazra Class',
        grade: 'Nazra',
        section: 'A',
        type: ClassType.NAZRA, 
        description: 'Quran Recitation Program with Tajweed',
        teacherId: nazraTeacher.id
      },
      {
        name: 'Dars-e-Nizami Year 1',
        grade: 'Year 1',
        section: 'A',
        type: ClassType.REGULAR,
        description: 'First Year of Dars-e-Nizami Curriculum',
        teacherId: darsTeacher.id
      }
    ];

    const classes = [];
    for (const classData of classesData) {
      const classRoom = await prisma.classRoom.create({
        data: classData
      });
      classes.push(classRoom);
      console.log(`   ✅ Created class: ${classData.name} (${classData.type})`);
    }

    const [hifzClass, nazraClass, darsClass] = classes;

    // Create subjects for Dars-e-Nizami
    console.log('📚 Creating subjects for Dars-e-Nizami...');

    const darsENizamiSubjects = [
      { name: 'Quran Tafseer', code: 'QUR101', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Hadith Studies', code: 'HAD102', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Fiqh (Islamic Jurisprudence)', code: 'FIQ103', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Aqeedah (Islamic Creed)', code: 'AQD104', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Seerah (Prophetic Biography)', code: 'SEE105', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Arabic Grammar', code: 'ARB106', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Arabic Literature', code: 'ARB107', classRoomId: darsClass.id, teacherId: darsTeacher.id },
      { name: 'Islamic History', code: 'HIS108', classRoomId: darsClass.id, teacherId: darsTeacher.id }
    ];

    for (const subjectData of darsENizamiSubjects) {
      await prisma.subject.create({
        data: subjectData
      });
      console.log(`   ✅ Created subject: ${subjectData.name}`);
    }

    // Create subjects for Hifz program
    console.log('📖 Creating subjects for Hifz program...');

    const hifzSubjects = [
      { name: 'Hifz (Memorization)', code: 'HIF101', classRoomId: hifzClass.id, teacherId: hifzTeacher.id },
      { name: 'Tajweed', code: 'TAJ102', classRoomId: hifzClass.id, teacherId: hifzTeacher.id },
      { name: 'Tafseer', code: 'TAF103', classRoomId: hifzClass.id, teacherId: hifzTeacher.id }
    ];

    for (const subjectData of hifzSubjects) {
      await prisma.subject.create({
        data: subjectData
      });
      console.log(`   ✅ Created subject: ${subjectData.name}`);
    }

    // Create subjects for Nazra program
    console.log('📘 Creating subjects for Nazra program...');

    const nazraSubjects = [
      { name: 'Nazra Quran', code: 'NAZ101', classRoomId: nazraClass.id, teacherId: nazraTeacher.id },
      { name: 'Tajweed', code: 'TAJ102', classRoomId: nazraClass.id, teacherId: nazraTeacher.id },
      { name: 'Basic Islamic Studies', code: 'ISL103', classRoomId: nazraClass.id, teacherId: nazraTeacher.id }
    ];

    for (const subjectData of nazraSubjects) {
      await prisma.subject.create({
        data: subjectData
      });
      console.log(`   ✅ Created subject: ${subjectData.name}`);
    }

    // Create TeacherSubject relationships
    console.log('🔗 Creating teacher-subject relationships...');

    const allSubjects = await prisma.subject.findMany();
    for (const subject of allSubjects) {
      if (subject.teacherId) {
        await prisma.teacherSubject.create({
          data: {
            teacherId: subject.teacherId,
            subjectId: subject.id
          }
        });
      }
    }
    console.log(`   ✅ Created ${allSubjects.length} teacher-subject relationships`);

    // Create sample students for each class
    console.log('👨‍🎓 Creating sample students...');

    const studentsData = [
      // Hifz students
      {
        email: 'hifz.student1@madrasa.com',
        name: 'Ahmed Raza',
        phone: '+923001234570',
        admissionNo: 'HIFZ2025001',
        classRoomId: hifzClass.id,
        rollNumber: 1
      },
      {
        email: 'hifz.student2@madrasa.com',
        name: 'Usman Ali',
        phone: '+923001234571', 
        admissionNo: 'HIFZ2025002',
        classRoomId: hifzClass.id,
        rollNumber: 2
      },
      // Nazra students
      {
        email: 'nazra.student1@madrasa.com',
        name: 'Fatima Noor',
        phone: '+923001234572',
        admissionNo: 'NAZRA2025001',
        classRoomId: nazraClass.id,
        rollNumber: 1
      },
      {
        email: 'nazra.student2@madrasa.com',
        name: 'Ayesha Khan',
        phone: '+923001234573',
        admissionNo: 'NAZRA2025002',
        classRoomId: nazraClass.id,
        rollNumber: 2
      },
      // Dars-e-Nizami students
      {
        email: 'dars.student1@madrasa.com',
        name: 'Abdullah Khan',
        phone: '+923001234574',
        admissionNo: 'DARS2025001',
        classRoomId: darsClass.id,
        rollNumber: 1
      },
      {
        email: 'dars.student2@madrasa.com',
        name: 'Bilal Ahmed',
        phone: '+923001234575',
        admissionNo: 'DARS2025002',
        classRoomId: darsClass.id,
        rollNumber: 2
      }
    ];

    for (const studentData of studentsData) {
      // Create user first
      const user = await prisma.user.create({
        data: {
          email: studentData.email,
          passwordHash: hashedPassword,
          role: Role.STUDENT,
          name: studentData.name,
          phone: studentData.phone,
          status: UserStatus.ACTIVE
        }
      });

      // Then create student profile
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          admissionNo: studentData.admissionNo,
          dob: new Date('2010-01-01'),
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          nationality: 'Pakistani',
          religion: 'Islam',
          guardianName: `${studentData.name.split(' ')[0]}'s Parent`,
          guardianRelation: 'Father',
          guardianPhone: studentData.phone,
          address: 'Sample Address, City, Pakistan'
        }
      });

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classRoomId: studentData.classRoomId,
          rollNumber: studentData.rollNumber,
          isCurrent: true
        }
      });

      // Set as current enrollment
      await prisma.student.update({
        where: { id: student.id },
        data: { currentEnrollmentId: enrollment.id }
      });

      console.log(`   ✅ Created student: ${studentData.name} (${studentData.admissionNo})`);
    }

    // Create sample progress data
    console.log('📊 Creating sample progress data...');

    // Get all students with their classes
    const allStudents = await prisma.student.findMany({
      include: {
        currentEnrollment: {
          include: {
            classRoom: true
          }
        }
      }
    });

    for (const student of allStudents) {
      const classType = student.currentEnrollment?.classRoom.type;

      if (classType === ClassType.HIFZ) {
        // Create Hifz progress
        await prisma.hifzProgress.create({
          data: {
            studentId: student.id,
            teacherId: hifzTeacher.id,
            sabaqLines: 10,
            sabqiLines: 5,
            currentPara: 1,
            completedParas: [1],
            paraProgress: 25.5,
            mistakes: 2,
            notes: 'Good progress, needs to work on pronunciation',
            date: new Date()
          }
        });
        console.log(`   ✅ Created Hifz progress for: ${student.userId}`);

      } else if (classType === ClassType.NAZRA) {
        // Create Nazra progress
        await prisma.nazraProgress.create({
          data: {
            studentId: student.id,
            teacherId: nazraTeacher.id,
            recitedLines: 15,
            mistakes: 1,
            remarks: 'Excellent tajweed, continue with current pace',
            date: new Date()
          }
        });
        console.log(`   ✅ Created Nazra progress for: ${student.userId}`);

      } else if (classType === ClassType.REGULAR) {
        // Get subjects for Dars-e-Nizami
        const subjects = await prisma.subject.findMany({
          where: { classRoomId: student.currentEnrollment?.classRoomId },
          take: 1
        });

        // Create subject progress for first subject
        if (subjects.length > 0) {
          await prisma.subjectProgress.create({
            data: {
              studentId: student.id,
              subjectId: subjects[0].id,
              teacherId: darsTeacher.id,
              assessmentType: AssessmentType.CLASS_TEST,
              title: 'Chapter 1 Test',
              totalMarks: 100,
              obtainedMarks: 85,
              grade: Grade.A,
              percentage: 85.0,
              topicsCovered: JSON.stringify(['Quranic verses', 'Tafseer basics']),
              strengths: JSON.stringify(['Memorization', 'Understanding']),
              weaknesses: JSON.stringify(['Application']),
              remarks: 'Good performance, needs to work on practical application',
              date: new Date()
            }
          });
          console.log(`   ✅ Created subject progress for: ${student.userId}`);
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Created Resources:');
    console.log(`   - Super Admin: 1`);
    console.log(`   - Admin: 1`);
    console.log(`   - Teachers: ${teachersCreated.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Subjects: ${allSubjects.length}`);
    console.log(`   - Students: ${studentsData.length}`);
    
    const hifzProgressCount = await prisma.hifzProgress.count();
    const nazraProgressCount = await prisma.nazraProgress.count();
    const subjectProgressCount = await prisma.subjectProgress.count();
    console.log(`   - Progress Records: ${hifzProgressCount + nazraProgressCount + subjectProgressCount}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Super Admin:');
    console.log('   - Email: superadmin@madrasa.com / password123');
    console.log('\n   Admin:');
    console.log('   - Email: admin@madrasa.com / password123');
    console.log('\n   Teachers:');
    console.log('   - Hifz Teacher: hifz.teacher@madrasa.com / password123');
    console.log('   - Nazra Teacher: nazra.teacher@madrasa.com / password123');
    console.log('   - Dars-e-Nizami Teacher: darsenizami.teacher@madrasa.com / password123');
    console.log('\n   Students:');
    console.log('   - Use any student email from above with password: password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
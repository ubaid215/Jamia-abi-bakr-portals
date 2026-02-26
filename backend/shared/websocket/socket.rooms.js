/**
 * shared/websocket/socket.rooms.js
 * Room join/leave logic — called on connection after auth
 * Each user is auto-joined to their personal room + role room
 * Teachers are also joined to their classroom rooms
 */

const prisma = require('../../db/prismaClient');
const { SOCKET_ROOMS } = require('./socket.events');
const logger = require('../../utils/logger');

/**
 * Auto-join a socket to the correct rooms based on user role
 * @param {import('socket.io').Socket} socket
 */
const joinUserRooms = async (socket) => {
  const { user } = socket;

  try {
    // 1. Personal room — always joined
    await socket.join(SOCKET_ROOMS.user(user.id));

    // 2. Role-based room
    await socket.join(SOCKET_ROOMS.role(user.role));

    // 3. Role-specific extra rooms
    switch (user.role) {
      case 'TEACHER': {
        // Join all classroom rooms the teacher manages
        const teacher = await prisma.teacher.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            classes: { select: { id: true } },
          },
        });

        if (teacher) {
          for (const cls of teacher.classes) {
            await socket.join(SOCKET_ROOMS.classroom(cls.id));
          }
          logger.info(
            { userId: user.id, classCount: teacher.classes.length },
            'Socket: teacher joined classroom rooms'
          );
        }
        break;
      }

      case 'STUDENT': {
        // Join their own student room so teachers can push to it
        const student = await prisma.student.findUnique({
          where: { userId: user.id },
          select: { id: true, currentEnrollmentId: true },
        });

        if (student) {
          await socket.join(SOCKET_ROOMS.student(student.id));

          // Also join their current classroom room
          if (student.currentEnrollmentId) {
            const enrollment = await prisma.enrollment.findUnique({
              where: { id: student.currentEnrollmentId },
              select: { classRoomId: true },
            });
            if (enrollment) {
              await socket.join(SOCKET_ROOMS.classroom(enrollment.classRoomId));
            }
          }
        }
        break;
      }

      case 'PARENT': {
        // Join all student rooms of their children
        const parent = await prisma.parent.findUnique({
          where: { userId: user.id },
          select: {
            children: { select: { id: true } },
          },
        });

        if (parent) {
          for (const child of parent.children) {
            await socket.join(SOCKET_ROOMS.student(child.id));
          }
        }
        break;
      }

      case 'ADMIN':
      case 'SUPER_ADMIN': {
        // Admins join a global admin room — no extra joins needed
        break;
      }
    }

    logger.info(
      { userId: user.id, role: user.role, rooms: [...socket.rooms] },
      'Socket: rooms joined'
    );
  } catch (err) {
    logger.error({ err, userId: user.id }, 'Socket: joinUserRooms failed');
  }
};

module.exports = { joinUserRooms };
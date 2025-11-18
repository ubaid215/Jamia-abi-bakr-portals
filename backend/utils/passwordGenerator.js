const prisma = require('../db/prismaClient');
// -------------------------------
// 🔐 Generate Strong Password
// -------------------------------
function generateStrongPassword(length = 12) {
  // Ensure minimum length of 8
  const minLength = Math.max(length, 8);

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Ensure at least one of each required character type
  const password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)]
  ];

  // Fill remaining with random characters from all sets
  const allChars = lowercase + uppercase + numbers + specialChars;
  while (password.length < minLength) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Fisher-Yates Shuffle to randomize order
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

// -------------------------------
// 📧 Generate Email (for staff/admins etc.)
// -------------------------------
function generateEmail(name, role = '', domain = 'khanqahsaifia.com') {
  // Clean and normalize name
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '.'); // replace spaces with dots

  // Add role part (if given)
  const rolePart = role ? `.${role.toLowerCase()}` : '';

  // Random 4-digit number to ensure uniqueness
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return `${cleanName}${rolePart}.${randomNum}@${domain}`;
}

// -------------------------------
// 🎓 Generate Student Email (from admission number)
// -------------------------------
function generateStudentEmail(admissionNo, domain = 'khanqahsaifia.com') {
  if (!admissionNo || typeof admissionNo !== 'string' && typeof admissionNo !== 'number') {
    throw new Error('Invalid admission number');
  }

  return `${String(admissionNo).trim()}@${domain}`;
}

// -------------------------------
// 🎓 Generate Sequential Admission Number
// -------------------------------
async function generateAdmissionNumber() {
  const currentYear = new Date().getFullYear();
  
  // Use transaction to ensure atomic update
  const counter = await prisma.$transaction(async (tx) => {
    // Get or create counter for current year
    let yearCounter = await tx.admissionCounter.findUnique({
      where: { year: currentYear }
    });

    if (!yearCounter) {
      // Create new counter for this year
      yearCounter = await tx.admissionCounter.create({
        data: {
          year: currentYear,
          lastNumber: 1
        }
      });
      return yearCounter;
    }

    // Increment the counter
    const updated = await tx.admissionCounter.update({
      where: { year: currentYear },
      data: { lastNumber: { increment: 1 } }
    });

    return updated;
  });

  // Format: KS-YYYY-NNNN (e.g., KS-2025-0001)
  const paddedNumber = String(counter.lastNumber).padStart(4, '0');
  return `KS-${currentYear}-${paddedNumber}`;
}

// -------------------------------
// 🔢 Generate Roll Number for Class
// -------------------------------
async function generateRollNumber(classRoomId) {
  // Use transaction to ensure atomic update
  const rollNumber = await prisma.$transaction(async (tx) => {
    // Get current class
    const classRoom = await tx.classRoom.findUnique({
      where: { id: classRoomId }
    });

    if (!classRoom) {
      throw new Error('Class not found');
    }

    // Increment the roll number
    const updated = await tx.classRoom.update({
      where: { id: classRoomId },
      data: { lastRollNumber: { increment: 1 } }
    });

    return updated.lastRollNumber;
  });

  return rollNumber;
}

module.exports = {
  generateStrongPassword,
  generateEmail,
  generateStudentEmail,
  generateAdmissionNumber,
  generateRollNumber
};
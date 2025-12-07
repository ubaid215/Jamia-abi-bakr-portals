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
// 🔢 Generate Smart Roll Number for Class - Checks ALL enrollments
// -------------------------------
async function generateRollNumber(classRoomId, tx = null) {
  const executeInTransaction = async (transaction) => {
    console.log(`🎯 Finding available roll number for class: ${classRoomId}`);
    
    // Get ALL roll numbers ever used in this class (not just current)
    const allEnrollments = await transaction.enrollment.findMany({
      where: { 
        classRoomId: classRoomId,
        rollNumber: { not: null }
      },
      select: { rollNumber: true },
      orderBy: { rollNumber: 'asc' }
    });

    console.log(`📊 Total enrollments in class: ${allEnrollments.length}`);
    
    // Parse all roll numbers as integers
    const allRollNumbers = allEnrollments
      .map(e => {
        const num = Number(e.rollNumber);
        return isNaN(num) ? null : num;
      })
      .filter(num => num !== null && num > 0)
      .sort((a, b) => a - b);

    console.log(`📝 All roll numbers ever used: [${allRollNumbers.join(', ')}]`);
    
    // Find the smallest available number (starting from 1)
    let nextRollNumber = 1;
    
    if (allRollNumbers.length > 0) {
      // Find gaps in ALL used numbers (not just current)
      for (let i = 0; i <= Math.max(...allRollNumbers); i++) {
        if (!allRollNumbers.includes(i + 1)) {
          nextRollNumber = i + 1;
          break;
        }
      }
      
      // If no gaps found (unlikely), use next number after highest
      if (nextRollNumber === 1) {
        nextRollNumber = Math.max(...allRollNumbers) + 1;
      }
    }
    
    console.log(`🎯 Next available roll number: ${nextRollNumber}`);
    
    // Update class record for reference
    await transaction.classRoom.update({
      where: { id: classRoomId },
      data: { 
        lastRollNumber: nextRollNumber
      }
    });
    
    return nextRollNumber; // Return as integer
  };

  if (tx) {
    return await executeInTransaction(tx);
  } else {
    return await prisma.$transaction(async (transaction) => {
      return await executeInTransaction(transaction);
    });
  }
}

module.exports = {
  generateStrongPassword,
  generateEmail,
  generateStudentEmail,
  generateAdmissionNumber,
  generateRollNumber
};
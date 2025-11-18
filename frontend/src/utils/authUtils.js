// Format credentials for display
export const formatCredentials = (credentials) => {
  if (!credentials) return null;
  
  return {
    email: credentials.email,
    password: credentials.password,
    admissionNo: credentials.admissionNo,
    rollNumber: credentials.rollNumber
  };
};

// Generate password strength indicator
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: 'Weak' };
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#73d13d', '#52c41a'];
  
  return {
    strength: Math.min(strength, 5),
    label: labels[Math.min(strength, 5)],
    color: colors[Math.min(strength, 5)]
  };
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password requirements
export const validatePassword = (password) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  
  const isValid = Object.values(requirements).every(Boolean);
  
  return {
    isValid,
    requirements,
    strength: getPasswordStrength(password)
  };
};

// Format user role for display
export const formatUserRole = (role) => {
  const roleMap = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
    PARENT: 'Parent'
  };
  
  return roleMap[role] || role;
};

// Get user profile type
export const getUserProfileType = (user) => {
  if (user?.teacherProfile) return 'teacher';
  if (user?.studentProfile) return 'student';
  if (user?.parentProfile) return 'parent';
  return 'user';
};

// Check if user is online
export const isUserOnline = (user) => {
  return user?.isOnline === true;
};
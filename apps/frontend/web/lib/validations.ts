export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

export function isUsernameValid(username: string): boolean {
  const usernameRegex = /^(?!.*\.\.)(?!\.)(?!.*\.$)(?!^\d+$)[a-zA-Z0-9_.]{3,30}$/;
  return usernameRegex.test(username);
}

export function isPhoneNumberValid(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{3,14}$/; // E.164 format
  return phoneRegex.test(phone);
}

export function isNameValid(name: string): boolean {
  const nameRegex = /^[\p{L}\s"-]{2,50}$/u; // Allows letters, spaces, apostrophes, and hyphens
  return nameRegex.test(name);
}

export function isBirthdateValid(birthdate: string | Date, minAge = 13): boolean {
  const birth = typeof birthdate === "string" ? new Date(birthdate) : birthdate;

  if (isNaN(birth.getTime())) {
    return false; // Invalid date
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= minAge;
}

export function isPasswordStrong(password: string): { legit: boolean, level: "weak" | "medium" | "strong" } {
  const allowedRegex = /^[A-Za-z\d@$!%*?&]+$/; // Only allows letters, numbers, and specified special characters
  const medium1Regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/; // At least 6 characters, including uppercase, lowercase, and either numbers or special characters
  const medium2Regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/; // At least 6 characters, including uppercase, lowercase, and either numbers or special characters
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/; // At least 8 characters, including uppercase, lowercase, numbers, and special characters

  if (!allowedRegex.test(password)) {
    return { legit: false, level: "weak" };
  }
  if (strongRegex.test(password)) {
    return { legit: true, level: "strong" };
  }
  if (medium1Regex.test(password) || medium2Regex.test(password)) {
    return { legit: true, level: "medium" };
  }
  return { legit: true, level: "weak" };
}

export function doPasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}
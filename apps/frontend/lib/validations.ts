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
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/; // Allows letters, spaces, apostrophes, and hyphens
  return nameRegex.test(name);
}

export function isBirthdateValid(birthdate: string | Date, minAge = 13): boolean {
  const birth = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;

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

export function doPasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}
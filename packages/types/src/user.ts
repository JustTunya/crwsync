export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum UserStatus {
  AVAILABLE = 'available',
  AWAY = 'away',
  BUSY = 'busy',
  DO_NOT_DISTURB = 'do_not_disturb',
  OFFLINE = 'offline',
}

export enum UserGenderValue {
  FEMALE = 'female',
  MALE = 'male',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export const UserGender = {
  FEMALE: { value: UserGenderValue.FEMALE, label: 'Female' },
  MALE: { value: UserGenderValue.MALE, label: 'Male' },
  PREFER_NOT_TO_SAY: { value: UserGenderValue.PREFER_NOT_TO_SAY, label: 'Prefer not to say' },
} as const;

export interface UserPreference {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
  };
}

export interface UserProfile {
  bio?: string;
  location?: string;
  website?: string;
  socials?: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender: UserGenderValue;
  birthdate: string;
  avatarUrl?: string;
  roles: UserRole[];
  status: UserStatus;
  preferences: UserPreference;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserEntity extends User {
  passwordHash: string;
  emailVerified: boolean;
  refreshToken?: string;
}
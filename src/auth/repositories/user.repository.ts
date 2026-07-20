import { User } from '../domain/user.entity';

export interface CreateUserInput {
  email: string;
  phone?: string;
  // Omitted for FR-14's invite flow — the user has no password until they
  // accept the invite.
  passwordHash?: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  phone?: string;
  passwordHash?: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface UserRepository {
  create(data: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: UpdateUserInput): Promise<User>;
}

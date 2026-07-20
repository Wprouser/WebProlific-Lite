import { User } from '../domain/user.entity';

export interface CreateUserInput {
  email: string;
  phone?: string;
  passwordHash: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
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

/**
 * Data Transfer Objects for User operations
 * DTOs separate external representations from domain entities
 */

import { UserRole } from '../../../domain/users/entities/User';

/**
 * DTO for creating a user
 */
export interface CreateUserDTO {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDTO {
  email?: string;
  displayName?: string;
  role?: UserRole;
}

/**
 * DTO for user response
 */
export interface UserResponseDTO {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
  lastLogin?: number;
  createdBy?: string;
}

/**
 * Mapper functions to convert between DTOs and domain entities
 */
export class UserMapper {
  static toDTO(user: import('../../../domain/users/entities/User').User): UserResponseDTO {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      createdBy: user.createdBy,
    };
  }
}

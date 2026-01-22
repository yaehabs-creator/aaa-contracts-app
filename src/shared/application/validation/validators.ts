/**
 * Input validation utilities
 * Validates DTOs and input data at service boundaries
 */

import { CreateContractDTO, ContractMetadataDTO } from '../dto/ContractDTO';
import { CreateUserDTO, UpdateUserDTO } from '../dto/UserDTO';
import { AppErrors } from '../errors/AppError';

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw AppErrors.validationError('Invalid email format', { email });
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (password.length < 6) {
    throw AppErrors.validationError('Password must be at least 6 characters long', {
      minLength: 6,
      actualLength: password.length,
    });
  }
}

/**
 * Validate contract creation DTO
 */
export function validateCreateContractDTO(dto: CreateContractDTO): void {
  if (!dto.name || dto.name.trim().length === 0) {
    throw AppErrors.validationError('Contract name is required');
  }

  if (dto.name.length > 255) {
    throw AppErrors.validationError('Contract name must be less than 255 characters', {
      maxLength: 255,
      actualLength: dto.name.length,
    });
  }

  if (!dto.metadata) {
    throw AppErrors.validationError('Contract metadata is required');
  }

  validateContractMetadata(dto.metadata);
}

/**
 * Validate contract metadata
 */
export function validateContractMetadata(metadata: ContractMetadataDTO): void {
  if (typeof metadata.totalClauses !== 'number' || metadata.totalClauses < 0) {
    throw AppErrors.validationError('totalClauses must be a non-negative number');
  }

  if (typeof metadata.generalCount !== 'number' || metadata.generalCount < 0) {
    throw AppErrors.validationError('generalCount must be a non-negative number');
  }

  if (typeof metadata.particularCount !== 'number' || metadata.particularCount < 0) {
    throw AppErrors.validationError('particularCount must be a non-negative number');
  }

  if (typeof metadata.highRiskCount !== 'number' || metadata.highRiskCount < 0) {
    throw AppErrors.validationError('highRiskCount must be a non-negative number');
  }

  if (typeof metadata.conflictCount !== 'number' || metadata.conflictCount < 0) {
    throw AppErrors.validationError('conflictCount must be a non-negative number');
  }
}

/**
 * Validate user creation DTO
 */
export function validateCreateUserDTO(dto: CreateUserDTO): void {
  validateEmail(dto.email);

  validatePassword(dto.password);

  if (!dto.displayName || dto.displayName.trim().length === 0) {
    throw AppErrors.validationError('Display name is required');
  }

  if (dto.displayName.length > 100) {
    throw AppErrors.validationError('Display name must be less than 100 characters', {
      maxLength: 100,
      actualLength: dto.displayName.length,
    });
  }

  const validRoles: string[] = ['admin', 'editor', 'viewer'];
  if (!validRoles.includes(dto.role)) {
    throw AppErrors.validationError(`Role must be one of: ${validRoles.join(', ')}`, {
      validRoles,
      providedRole: dto.role,
    });
  }
}

/**
 * Validate user update DTO
 */
export function validateUpdateUserDTO(dto: UpdateUserDTO): void {
  if (dto.email !== undefined) {
    validateEmail(dto.email);
  }

  if (dto.displayName !== undefined) {
    if (dto.displayName.trim().length === 0) {
      throw AppErrors.validationError('Display name cannot be empty');
    }

    if (dto.displayName.length > 100) {
      throw AppErrors.validationError('Display name must be less than 100 characters', {
        maxLength: 100,
        actualLength: dto.displayName.length,
      });
    }
  }

  if (dto.role !== undefined) {
    const validRoles: string[] = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(dto.role)) {
      throw AppErrors.validationError(`Role must be one of: ${validRoles.join(', ')}`, {
        validRoles,
        providedRole: dto.role,
      });
    }
  }
}

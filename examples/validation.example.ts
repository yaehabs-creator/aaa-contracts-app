/**
 * Example: Using Validation
 * 
 * This example shows how to use the validation utilities
 * at service boundaries.
 */

import {
  validateEmail,
  validatePassword,
  validateCreateUserDTO,
  validateCreateContractDTO,
} from '../src/shared/application/validation';
import { CreateUserDTO } from '../src/shared/application/dto/UserDTO';
import { CreateContractDTO } from '../src/shared/application/dto/ContractDTO';

/**
 * Example: Validate user creation
 */
function exampleValidateUser() {
  const userDTO: CreateUserDTO = {
    email: 'user@example.com',
    password: 'password123',
    displayName: 'John Doe',
    role: 'editor',
  };

  try {
    // Validate the DTO
    validateCreateUserDTO(userDTO);
    
    // If validation passes, proceed with creation
    console.log('User DTO is valid');
  } catch (error) {
    // Handle validation error
    console.error('Validation failed:', error);
    throw error;
  }
}

/**
 * Example: Validate individual fields
 */
function exampleValidateFields() {
  try {
    validateEmail('user@example.com'); // ✓ Valid
    validateEmail('invalid-email');    // ✗ Throws error

    validatePassword('password123');    // ✓ Valid
    validatePassword('12345');         // ✗ Throws error (too short)
  } catch (error) {
    console.error('Validation error:', error);
  }
}

/**
 * Example: Validate contract creation
 */
function exampleValidateContract() {
  const contractDTO: CreateContractDTO = {
    name: 'Example Contract',
    metadata: {
      totalClauses: 10,
      generalCount: 5,
      particularCount: 5,
      highRiskCount: 2,
      conflictCount: 1,
    },
  };

  try {
    validateCreateContractDTO(contractDTO);
    console.log('Contract DTO is valid');
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

export {
  exampleValidateUser,
  exampleValidateFields,
  exampleValidateContract,
};

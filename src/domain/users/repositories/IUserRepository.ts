import { User } from '../entities/User';

/**
 * Repository interface for user persistence
 * Domain layer - no infrastructure dependencies
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(uid: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users
   */
  findAll(): Promise<User[]>;

  /**
   * Create a new user
   */
  create(user: User): Promise<void>;

  /**
   * Update user
   */
  update(user: User): Promise<void>;

  /**
   * Delete user
   */
  delete(uid: string): Promise<void>;

  /**
   * Check if user exists
   */
  exists(uid: string): Promise<boolean>;
}

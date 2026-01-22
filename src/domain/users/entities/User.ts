/**
 * Domain entity representing a user
 * Pure business logic, no infrastructure dependencies
 */

export type UserRole = 'admin' | 'editor' | 'viewer';

export class User {
  constructor(
    public readonly uid: string,
    public readonly email: string,
    public readonly displayName: string,
    public readonly role: UserRole,
    public readonly createdAt: number,
    public readonly lastLogin?: number,
    public readonly createdBy?: string
  ) {}

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Check if user can edit
   */
  canEdit(): boolean {
    return this.role === 'admin' || this.role === 'editor';
  }

  /**
   * Check if user can view
   */
  canView(): boolean {
    return this.role === 'admin' || this.role === 'editor' || this.role === 'viewer';
  }

  /**
   * Check if user can manage other users
   */
  canManageUsers(): boolean {
    return this.isAdmin();
  }
}

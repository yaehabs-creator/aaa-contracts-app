import type { SupabaseClient } from '@supabase/supabase-js';
import { IContractRepository } from '../../../domain/contracts/repositories/IContractRepository';
import { IUserRepository } from '../../../domain/users/repositories/IUserRepository';
import { SupabaseContractRepository } from '../../../infrastructure/contracts/repositories/SupabaseContractRepository';
import { SupabaseUserRepository } from '../../../infrastructure/users/repositories/SupabaseUserRepository';

/**
 * Service container for dependency injection
 * Provides centralized access to repositories and services
 */
export class ServiceContainer {
  private contractRepository: IContractRepository | null = null;
  private userRepository: IUserRepository | null = null;

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Get contract repository
   */
  getContractRepository(): IContractRepository {
    if (!this.contractRepository) {
      this.contractRepository = new SupabaseContractRepository(this.supabase);
    }
    return this.contractRepository;
  }

  /**
   * Get user repository
   */
  getUserRepository(): IUserRepository {
    if (!this.userRepository) {
      this.userRepository = new SupabaseUserRepository(this.supabase);
    }
    return this.userRepository;
  }

  /**
   * Set contract repository (for testing)
   */
  setContractRepository(repository: IContractRepository): void {
    this.contractRepository = repository;
  }

  /**
   * Set user repository (for testing)
   */
  setUserRepository(repository: IUserRepository): void {
    this.userRepository = repository;
  }
}

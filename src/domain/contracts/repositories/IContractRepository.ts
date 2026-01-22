import { Contract } from '../entities/Contract';

/**
 * Repository interface for contract persistence
 * Domain layer - no infrastructure dependencies
 */
export interface IContractRepository {
  /**
   * Save a contract
   */
  save(contract: Contract): Promise<void>;

  /**
   * Find contract by ID
   */
  findById(id: string): Promise<Contract | null>;

  /**
   * Find all contracts
   */
  findAll(): Promise<Contract[]>;

  /**
   * Delete a contract
   */
  delete(id: string): Promise<void>;

  /**
   * Check if contract exists
   */
  exists(id: string): Promise<boolean>;
}

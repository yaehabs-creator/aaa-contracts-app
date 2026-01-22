/**
 * Example: Using the Repository Pattern
 * 
 * This example shows how to use the new repository pattern
 * instead of directly calling Supabase services.
 */

import { ServiceContainer } from '../src/shared/infrastructure/di/ServiceContainer';
import { supabase } from '../src/supabase/config';
import { Contract } from '../src/domain/contracts/entities/Contract';
import { logger } from '../src/shared/infrastructure/observability/Logger';
import { ErrorHandler } from '../src/shared/application/errors';

// Initialize service container
const container = new ServiceContainer(supabase!);
const contractRepository = container.getContractRepository();

/**
 * Example: Save a contract
 */
async function saveContractExample() {
  try {
    logger.startOperation('saveContractExample');

    // Create a contract (domain entity)
    const contract = new Contract(
      'contract-123',
      'Example Contract',
      Date.now(),
      {
        totalClauses: 10,
        generalCount: 5,
        particularCount: 5,
        highRiskCount: 2,
        conflictCount: 1,
      }
    );

    // Save using repository
    await contractRepository.save(contract);

    logger.endOperation('saveContractExample', 0);
  } catch (error) {
    const appError = ErrorHandler.handle(error, {
      operation: 'saveContractExample',
    });
    logger.operationError('saveContractExample', appError.cause || appError);
    throw appError;
  }
}

/**
 * Example: Find a contract
 */
async function findContractExample(id: string) {
  try {
    const contract = await contractRepository.findById(id);
    
    if (!contract) {
      logger.warn('Contract not found', { contractId: id });
      return null;
    }

    // Use domain methods
    if (contract.hasConflicts()) {
      logger.warn('Contract has conflicts', { contractId: id });
    }

    return contract;
  } catch (error) {
    const appError = ErrorHandler.handle(error, {
      operation: 'findContractExample',
      contractId: id,
    });
    throw appError;
  }
}

/**
 * Example: Find all contracts
 */
async function findAllContractsExample() {
  try {
    const contracts = await contractRepository.findAll();
    
    // Filter using domain methods
    const highRiskContracts = contracts.filter(c => c.isHighRisk());
    const contractsWithConflicts = contracts.filter(c => c.hasConflicts());

    return {
      all: contracts,
      highRisk: highRiskContracts,
      withConflicts: contractsWithConflicts,
    };
  } catch (error) {
    const appError = ErrorHandler.handle(error, {
      operation: 'findAllContractsExample',
    });
    throw appError;
  }
}

export {
  saveContractExample,
  findContractExample,
  findAllContractsExample,
};

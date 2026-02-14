import type { SupabaseClient } from '@supabase/supabase-js';
import { IContractRepository } from '../../../domain/contracts/repositories/IContractRepository';
import { Contract, ContractSection, SectionType, SectionItem } from '../../../domain/contracts/entities/Contract';
import { Clause } from '../../../domain/contracts/entities/Clause';
import { AppError, AppErrors } from '../../../shared/application/errors/AppError';
import { ErrorHandler } from '../../../shared/application/errors/ErrorHandler';
import { logger } from '../../../shared/infrastructure/observability/Logger';
import { metrics } from '../../../shared/infrastructure/observability/Metrics';
import { ensureContractHasSections } from '@/services/contractMigrationService';

const MAX_DOCUMENT_SIZE = 1000000; // 1MB in bytes

/**
 * Recursively removes undefined values from an object.
 * PostgreSQL JSONB doesn't accept undefined values.
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Estimate the size of an object in bytes
 */
function estimateSize(obj: any): number {
  return JSON.stringify(obj).length * 2;
}

/**
 * Convert domain Contract to SavedContract format (for backward compatibility)
 */
function contractToSavedContract(contract: Contract): any {
  return {
    id: contract.id,
    name: contract.name,
    timestamp: contract.timestamp,
    metadata: contract.metadata,
    sections: contract.sections,
    clauses: contract.clauses.map(c => ({
      clause_number: c.clauseNumber,
      clause_title: c.clauseTitle,
      condition_type: c.conditionType,
      clause_text: c.clauseText,
      general_condition: c.generalCondition,
      particular_condition: c.particularCondition,
      comparison: c.comparison,
      has_time_frame: c.hasTimeFrame,
      time_frames: c.timeFrames,
      financial_assets: c.financialAssets,
      category: c.category,
      chapter: c.chapter,
    })),
  };
}

/**
 * Convert SavedContract format to domain Contract
 */
function savedContractToContract(saved: any): Contract {
  const clauses = (saved.clauses || []).map((c: any) => new Clause(
    c.clause_number,
    c.clause_title,
    c.condition_type,
    c.clause_text,
    c.general_condition,
    c.particular_condition,
    c.comparison || [],
    c.has_time_frame || false,
    c.time_frames || [],
    c.financial_assets || [],
    c.category,
    c.chapter
  ));

  return new Contract(
    saved.id,
    saved.name,
    saved.timestamp,
    saved.metadata,
    saved.sections || [],
    clauses
  );
}

/**
 * Supabase implementation of IContractRepository
 */
export class SupabaseContractRepository implements IContractRepository {
  constructor(private readonly supabase: SupabaseClient) {
    if (!supabase) {
      throw new Error('Supabase client is required');
    }
  }

  async save(contract: Contract): Promise<void> {
    const startTime = Date.now();
    logger.startOperation('saveContract', { contractId: contract.id });

    try {
      // Verify authentication
      const { data: { session }, error: authError } = await this.supabase.auth.getSession();
      if (authError || !session?.user) {
        throw AppErrors.unauthorized('You must be logged in to save contracts');
      }

      const savedContract = contractToSavedContract(contract);
      const contractData = removeUndefinedValues({
        id: savedContract.id,
        name: savedContract.name,
        timestamp: savedContract.timestamp,
        metadata: savedContract.metadata,
        clauses: savedContract.clauses || null,
        sections: savedContract.sections || null,
        uses_subcollections: false,
      });

      const estimatedSize = estimateSize(contractData);

      if (estimatedSize > MAX_DOCUMENT_SIZE) {
        await this.saveWithSubcollections(savedContract);
      } else {
        await this.saveAsSingleDocument(contractData);
      }

      const duration = Date.now() - startTime;
      metrics.timing('contract.save', duration);
      logger.endOperation('saveContract', duration, { contractId: contract.id });
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'saveContract',
        contractId: contract.id,
      });
      logger.operationError('saveContract', appError.cause || appError, {
        contractId: contract.id,
      });
      throw appError;
    }
  }

  private async saveAsSingleDocument(contractData: any): Promise<void> {
    const { error } = await this.supabase
      .from('contracts')
      .upsert(contractData, {
        onConflict: 'id',
      });

    if (error) {
      throw AppErrors.databaseError(`Failed to save contract: ${error.message}`, error);
    }
  }

  private async saveWithSubcollections(savedContract: any): Promise<void> {
    const contractMetadata = removeUndefinedValues({
      id: savedContract.id,
      name: savedContract.name,
      timestamp: savedContract.timestamp,
      metadata: savedContract.metadata,
      clauses: savedContract.clauses || null,
      sections: null,
      uses_subcollections: true,
    });

    const { error: contractError } = await this.supabase
      .from('contracts')
      .upsert(contractMetadata, {
        onConflict: 'id',
      });

    if (contractError) {
      throw AppErrors.databaseError(`Failed to save contract metadata: ${contractError.message}`, contractError);
    }

    if (savedContract.sections && savedContract.sections.length > 0) {
      for (const section of savedContract.sections) {
        const { error: sectionError } = await this.supabase
          .from('contract_sections')
          .upsert({
            contract_id: savedContract.id,
            section_type: section.sectionType,
            title: section.title,
            item_count: section.items.length,
          }, {
            onConflict: 'contract_id,section_type',
          });

        if (sectionError) {
          throw AppErrors.databaseError(`Failed to save section ${section.sectionType}: ${sectionError.message}`, sectionError);
        }

        await this.supabase
          .from('contract_items')
          .delete()
          .eq('contract_id', savedContract.id)
          .eq('section_type', section.sectionType);

        if (section.items.length > 0) {
          const itemsToInsert = section.items.map((item: SectionItem, index: number) => ({
            contract_id: savedContract.id,
            section_type: section.sectionType,
            order_index: item.orderIndex ?? index,
            item_data: removeUndefinedValues(item),
          }));

          const { error: itemsError } = await this.supabase
            .from('contract_items')
            .insert(itemsToInsert);

          if (itemsError) {
            throw AppErrors.databaseError(`Failed to save items for section ${section.sectionType}: ${itemsError.message}`, itemsError);
          }
        }
      }
    }
  }

  async findById(id: string): Promise<Contract | null> {
    const startTime = Date.now();
    logger.startOperation('findContractById', { contractId: id });

    try {
      const { data: contractData, error } = await this.supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw AppErrors.databaseError(`Failed to fetch contract: ${error.message}`, error);
      }

      if (!contractData) {
        return null;
      }

      let contract: any;
      if (contractData.uses_subcollections) {
        contract = await this.loadFromSubcollections(id, contractData);
      } else {
        contract = {
          id: contractData.id,
          name: contractData.name,
          timestamp: contractData.timestamp,
          metadata: contractData.metadata,
          clauses: contractData.clauses || null,
          sections: contractData.sections || null,
        };
      }

      const migratedContract = ensureContractHasSections(contract);
      const domainContract = savedContractToContract(migratedContract);

      const duration = Date.now() - startTime;
      metrics.timing('contract.findById', duration);
      logger.endOperation('findContractById', duration, { contractId: id });

      return domainContract;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'findContractById',
        contractId: id,
      });
      logger.operationError('findContractById', appError.cause || appError, {
        contractId: id,
      });
      throw appError;
    }
  }

  private async loadFromSubcollections(contractId: string, contractMetadata: any): Promise<any> {
    const sections: ContractSection[] = [];

    const { data: sectionsData, error: sectionsError } = await this.supabase
      .from('contract_sections')
      .select('*')
      .eq('contract_id', contractId)
      .order('section_type');

    if (sectionsError) {
      throw AppErrors.databaseError(`Failed to load sections: ${sectionsError.message}`, sectionsError);
    }

    for (const sectionRow of sectionsData || []) {
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', contractId)
        .eq('section_type', sectionRow.section_type)
        .order('order_index');

      if (itemsError) {
        logger.warn(`Failed to load items for section ${sectionRow.section_type}`, { error: itemsError });
        continue;
      }

      const items: SectionItem[] = (itemsData || [])
        .map(row => removeUndefinedValues(row.item_data) as SectionItem)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      sections.push({
        sectionType: sectionRow.section_type as SectionType,
        title: sectionRow.title,
        items,
      });
    }

    return {
      ...contractMetadata,
      id: contractId,
      timestamp: contractMetadata.timestamp || Date.now(),
      sections,
    };
  }

  async findAll(): Promise<Contract[]> {
    const startTime = Date.now();
    logger.startOperation('findAllContracts');

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        throw AppErrors.unauthorized('You must be logged in to fetch contracts');
      }

      const { data: contractsData, error } = await this.supabase
        .from('contracts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42501') {
          return [];
        }
        throw AppErrors.databaseError(`Failed to fetch contracts: ${error.message}`, error);
      }

      const contracts = await Promise.all(
        (contractsData || []).map(async (row) => {
          try {
            if (row.uses_subcollections) {
              const contract = await this.loadFromSubcollections(row.id, row);
              const migrated = ensureContractHasSections(contract);
              return savedContractToContract(migrated);
            }

            const contract: any = {
              id: row.id,
              name: row.name,
              timestamp: row.timestamp,
              metadata: row.metadata,
              clauses: row.clauses || null,
              sections: row.sections || null,
            };

            const migrated = ensureContractHasSections(contract);
            return savedContractToContract(migrated);
          } catch (err) {
            logger.warn(`Error loading contract ${row.id}`, { error: err });
            return null;
          }
        })
      );

      const validContracts = contracts.filter((c): c is Contract => c !== null);

      const duration = Date.now() - startTime;
      metrics.timing('contract.findAll', duration);
      metrics.gauge('contract.count', validContracts.length);
      logger.endOperation('findAllContracts', duration, { count: validContracts.length });

      return validContracts;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'findAllContracts',
      });
      logger.operationError('findAllContracts', appError.cause || appError);
      throw appError;
    }
  }

  async delete(id: string): Promise<void> {
    const startTime = Date.now();
    logger.startOperation('deleteContract', { contractId: id });

    try {
      const { data: contractData } = await this.supabase
        .from('contracts')
        .select('uses_subcollections')
        .eq('id', id)
        .single();

      if (contractData?.uses_subcollections) {
        await this.supabase
          .from('contract_items')
          .delete()
          .eq('contract_id', id);

        await this.supabase
          .from('contract_sections')
          .delete()
          .eq('contract_id', id);
      }

      const { error } = await this.supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) {
        throw AppErrors.databaseError(`Failed to delete contract: ${error.message}`, error);
      }

      const duration = Date.now() - startTime;
      metrics.timing('contract.delete', duration);
      logger.endOperation('deleteContract', duration, { contractId: id });
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'deleteContract',
        contractId: id,
      });
      logger.operationError('deleteContract', appError.cause || appError, {
        contractId: id,
      });
      throw appError;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('contracts')
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw AppErrors.databaseError(`Failed to check contract existence: ${error.message}`, error);
      }

      return !!data;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'contractExists',
        contractId: id,
      });
      throw appError;
    }
  }
}

/**
 * Data Transfer Objects for Contract operations
 * DTOs separate external representations from domain entities
 */

import { ContractSection, SectionType, SectionItem, ItemType } from '../../../domain/contracts/entities/Contract';
import { Clause, ConditionType } from '../../../domain/contracts/entities/Clause';

/**
 * DTO for creating/updating a contract
 */
export interface CreateContractDTO {
  name: string;
  sections?: ContractSectionDTO[];
  clauses?: ClauseDTO[];
  metadata: ContractMetadataDTO;
}

/**
 * DTO for contract response
 */
export interface ContractResponseDTO {
  id: string;
  name: string;
  timestamp: number;
  sections?: ContractSectionDTO[];
  clauses?: ClauseDTO[];
  metadata: ContractMetadataDTO;
}

/**
 * DTO for contract section
 */
export interface ContractSectionDTO {
  sectionType: SectionType;
  title: string;
  items: SectionItemDTO[];
}

/**
 * DTO for section item
 */
export interface SectionItemDTO {
  itemType: ItemType;
  number?: string;
  heading?: string;
  text?: string;
  fieldKey?: string;
  fieldValue?: string;
  orderIndex: number;
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
  clause_number?: string;
  clause_title?: string;
  condition_type?: string;
  clause_text?: string;
  general_condition?: string;
  particular_condition?: string;
  comparison?: any[];
  has_time_frame?: boolean;
  time_frames?: any[];
  financial_assets?: any[];
  category?: string;
  chapter?: string;
}

/**
 * DTO for clause
 */
export interface ClauseDTO {
  clause_number: string;
  clause_title: string;
  condition_type: ConditionType;
  clause_text: string;
  general_condition?: string;
  particular_condition?: string;
  comparison: any[];
  has_time_frame?: boolean;
  time_frames?: any[];
  financial_assets?: any[];
  category?: string;
  chapter?: string;
}

/**
 * DTO for contract metadata
 */
export interface ContractMetadataDTO {
  totalClauses: number;
  generalCount: number;
  particularCount: number;
  highRiskCount: number;
  conflictCount: number;
  timeSensitiveCount?: number;
}

/**
 * Mapper functions to convert between DTOs and domain entities
 */
export class ContractMapper {
  static toDTO(section: ContractSection): ContractSectionDTO {
    return {
      sectionType: section.sectionType,
      title: section.title,
      items: section.items.map(item => this.itemToDTO(item)),
    };
  }

  static itemToDTO(item: SectionItem): SectionItemDTO {
    return {
      itemType: item.itemType,
      number: item.number,
      heading: item.heading,
      text: item.text,
      fieldKey: item.fieldKey,
      fieldValue: item.fieldValue,
      orderIndex: item.orderIndex,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      imageTitle: item.imageTitle,
      clause_number: item.clause_number,
      clause_title: item.clause_title,
      condition_type: item.condition_type,
      clause_text: item.clause_text,
      general_condition: item.general_condition,
      particular_condition: item.particular_condition,
      comparison: item.comparison,
      has_time_frame: item.has_time_frame,
      time_frames: item.time_frames,
      financial_assets: item.financial_assets,
      category: item.category,
      chapter: item.chapter,
    };
  }

  static clauseToDTO(clause: Clause): ClauseDTO {
    return {
      clause_number: clause.clauseNumber,
      clause_title: clause.clauseTitle,
      condition_type: clause.conditionType,
      clause_text: clause.clauseText,
      general_condition: clause.generalCondition,
      particular_condition: clause.particularCondition,
      comparison: clause.comparison,
      has_time_frame: clause.hasTimeFrame,
      time_frames: clause.timeFrames,
      financial_assets: clause.financialAssets,
      category: clause.category,
      chapter: clause.chapter,
    };
  }
}

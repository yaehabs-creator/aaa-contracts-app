-- Import Atrium PC Clauses into contract_items table
-- First, get the Atrium contract ID by running:
-- SELECT id, name FROM contracts WHERE name ILIKE '%atrium%';

-- Replace 'YOUR_ATRIUM_CONTRACT_ID' with the actual UUID from the query above

-- Delete existing PARTICULAR items for this contract (to avoid duplicates)
-- DELETE FROM contract_items WHERE contract_id = 'YOUR_ATRIUM_CONTRACT_ID' AND section_type = 'PARTICULAR';

-- Then run the INSERT statements below:

-- Clause 1.1 - Definitions
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 0, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '1.1',
  'clause_title', 'Definitions',
  'clause_text', '',
  'particular_condition', E'(a) "Advance Payment" means the percentage and or the amount stated in the Form of Agreement of this Contract.\n\n(p) "Local Currency" means Egyptian Pound.\n\n(q) "Nominated Sub-Contractor" Add to the definition of the Conditions of Contract "Subcontractor and or supplier".\n\nPlease add the following to the list of Definitions:\n\n(jj) "Base Rate/Range" means the agreed price or price range (as the case may be) stated in the Contract Documents which the agreed corresponding adjustment formula is to be applied.\n\n(kk) "Basic Scope" means all works to be executed by the Contractor excluding the Optional Scope.\n\n(ll) "Commencement Date" means three (3) days from the Effective Date.\n\n(mm) "Contract Administrator" means the entity appointed by the Employer to act as the Contract Administrator as per the Contract which shall have the power and authorities assigned to it thereunder and advised to the Contractor by the Employer within fourteen (14) days from the Commencement Date, or any other entity appointed by the Employer from time to time and advised to the Contractor by the Employer within a reasonable time from the date of such appointment\n\n(nn) "Contract Sum" means the value as stated in the Form of Agreement.\n\n(oo) "Contract Value" means the accepted value as stated in the Form of Agreement, including continuous further adjustment based on the acceptance of the variations as per Clause 22 of Conditions of Contract and, where applicable, re-measurements.\n\n(pp) "Country" means the Arab Republic of Egypt\n\n(qq) "Effective Date" means the earliest event of the following:\n• The date of the signature of the Agreement by the Employer\n• Seven calendar days from the date of the official issuance of the Contract Documents by the Employer to the Contractor for signature\n• The date of signing the Letter of Acceptance (if any) by the Employer\n\n(rr) "Employer" means EMAAR MISR FOR DEVELOPMENT, H/Q at Emaar Misr Sales Center, P.O. Box 229, MOKATTAM 11585, CAIRO, EGYPT and includes the Employer''s successors and assigns.\n\n(ss) "Employer''s Requirements" means the documents entitled Employer''s Requirements as included in the Contract, and any additions and modifications to such document in accordance with the Contract.\n\n(tt) "Fixed fee for Overhead and Profit" means the fixed amount for the overheads and profit.\n\n(uu) "Optional Scope" means works mentioned in the Form of Agreement or the Bills of Quantities as optional scope.\n\n(vv) "Ruling Language" means English language.\n\n(ww) "Section/Portion of Works" means the scope of work identified by a separate individual contractual milestone for handing over.\n\n(xx) "Supervision Consultant" means the entity appointed by the Employer to act as the Supervision Consultant.\n\n(yy) "Addendum or Addenda" means the document/s titled Addendum/Addenda included in the Contract Documents.',
  'condition_type', 'Particular',
  'orderIndex', 0
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 1.6 - Notices, Consents, Approvals and Agreements
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 1, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '1.6',
  'clause_title', 'Notices, Consents, Approvals and Agreements',
  'clause_text', '',
  'particular_condition', E'Delete paragraph (b) of Sub-Clause 1.6 and substitute by the following:\n\n1.6 (b) Wherever a provision of the Contract includes the word "agree", "agreed" or "agreement", then unless otherwise specified such provision requires the agreement to be in writing in form of signed & stamped hardcopy.',
  'condition_type', 'Particular',
  'orderIndex', 1
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 1.7 - Communications
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 2, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '1.7',
  'clause_title', 'Communications',
  'clause_text', '',
  'particular_condition', E'Wherever in the Contract provision is made for a communication to be "written" or "in writing", then unless otherwise specified this means any hand-written, type-written, or printed communication including communications by telefax, electronic mail, and communications by modem.\n\nUnless otherwise instructed by the Employer / Contract Administrator, all information related to the scheduling, RFI, shop drawings, transmittals, submittals, cost, payment, field, document control, and any other related information shall be communicated between parties through an Automation Application (ex: Oracle or any other Automation application as may be instructed by the Employer).\n\nThe Employer will purchase and supply an adequate number of licenses for use by himself, the Contract Administrator, consultants, and the Contractor.',
  'condition_type', 'Particular',
  'orderIndex', 2
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 4 - Contract Documents
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 3, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '4',
  'clause_title', 'Contract Documents',
  'clause_text', '',
  'particular_condition', E'Add new Sub-Clauses 4.3, 4.4, 4.5 & 4.6 as follows:\n\n4.3 The listed documents under Clause 2 of the Form of Agreement are to be considered as one indivisible whole and the various conditions and clauses are mutually complementary and explanatory.\n\n4.4 Contract Sum is considered as based on the various Contract Documents being complimentary and interpreted on a collective basis.\n\n4.5 Any ambiguity or discrepancy shall be resolved by the Contract Administrator who shall then notify the Contractor thereon, with a copy to the Employer.\n\n4.6 In the Specification, all Drawings, all Contractors'' Drawings, and all other documents relating to the Works, the metric system shall be used throughout.',
  'condition_type', 'Particular',
  'orderIndex', 3
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 5.1 - Submission and Approval
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 4, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '5.1',
  'clause_title', 'Submission and Approval',
  'clause_text', '',
  'particular_condition', E'The periods referred to in Sub-Clause 5.1 of Conditions of Contract (Submission and Approval) are as follows:\n• The period for the review (approve / disapprove) of drawings and / or materials submissions is 14 days.\n• The period for the review (approve / disapprove) re-submission of drawings and / or materials is 7 days.\n• The period for inspection requests is 24 hours in advance.',
  'condition_type', 'Particular',
  'orderIndex', 4
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 5.7 - As-built Drawings
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 5, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '5.7',
  'clause_title', 'As-built Drawings, Operations and Maintenance Manuals',
  'clause_text', '',
  'particular_condition', E'The period referred to in Sub-Clause 5.7 of Conditions of Contract for As-built Drawings, Operations and Maintenance Manuals is fourteen days (14) days.\n\nThe Contractor submittal to As Built drawings, Catalogues, Operation and Maintenance manuals must be in three hard copies and one Softcopy in its original Program format.',
  'condition_type', 'Particular',
  'orderIndex', 5
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6.1 - General Obligations
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 6, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6.1',
  'clause_title', 'General Obligations',
  'clause_text', '',
  'particular_condition', E'In paragraph (a) of this Sub-Clause 6.1\nIn the 7th line after "...they are intended" add "in accordance with the Contract requirements."\n\n(b) Should the Contractor disregard or fail to act within a reasonable or stipulated time frame upon receipt of such Instructions, the Employer upon recommendation from the Contract Administrator, shall have the right to implement remedies or measures deemed essential or necessary.\n\n(c) The Contractor shall take full responsibility for the adequacy, stability and safety of all Site operations and methods of construction.\n\nCash Flow Estimate: The period referred to is thirty (30) days from the Effective Date and any further Contract Value adjustment.',
  'condition_type', 'Particular',
  'orderIndex', 6
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6.8 - Quality Assurance
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 7, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6.8',
  'clause_title', 'Quality Assurance',
  'clause_text', '',
  'particular_condition', E'Add the following paragraph at the beginning of Sub-Clause 6.8.\n\nThe Contractor shall submit for the Contract Administrator approval within thirty (30) days from Effective Date a Quality Control Program defining how it intends to establish and implement his proposed QC program.',
  'condition_type', 'Particular',
  'orderIndex', 7
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6A.2 - Collection and Taking Delivery
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 8, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6A.2',
  'clause_title', 'Collection and Taking Delivery',
  'clause_text', '',
  'particular_condition', E'In paragraph (c)\nIn the first line after "shall" add "visually".\nIn the 10th line before "All additional" add "In respect of defects or damages that can be visually detected or any shortage in quantities,".\nDelete "All" and substitute with "all".',
  'condition_type', 'Particular',
  'orderIndex', 8
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6A.5 - Notification of Damage
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 9, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6A.5',
  'clause_title', 'Notification of Damage',
  'clause_text', '',
  'particular_condition', E'Delete this Sub-Clause entirely.',
  'condition_type', 'Particular',
  'orderIndex', 9
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6A.6 - Quantities of Free Issue Items
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 10, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6A.6',
  'clause_title', 'Quantities of Free Issue Items',
  'clause_text', '',
  'particular_condition', E'Change the title of this Sub-Clause to read "Quantities of Free Issue Items".\n\nDelete paragraph (b) of this Sub-Clause and substitute by the following:\n\n(b) The Contractor shall calculate the actual quantities of all Free Issue Items required for the Works and place a written application to the Supervision Consultant with a copy to the Employer in a timely manner requesting the supply of required quantities of each Free Issue Item.',
  'condition_type', 'Particular',
  'orderIndex', 10
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6A.8 - Contractor's Confirmation Procedures
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 11, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6A.8',
  'clause_title', 'Contractor''s Confirmation Procedures',
  'clause_text', '',
  'particular_condition', E'Add New Sub-Clause 6A.8 as follows:\n\n6A.8 Contractor''s Confirmation Procedures\n\nFor the Items provided by the Employer "Free Issue Items" or among the "Items that May Be Supplied By the Employer, the Contractor shall:\n\na. Within three (3) days from the receipt of the item, submit to the Supervision Consultant a material inspection request (MIR) to obtain its approval.\n\nb. Within seven (7) days of the Supervision Consultant''s approval of the material inspection request, submit a declaration letter to the Supervision Consultant confirming the receipt of such material.\n\nFailure on the Contractor''s part to comply with the provisions of paragraphs (a) and (b) above shall be construed as a confirmation by the Contractor of the receipt of the respective Free Issue Item with no concern whatsoever.',
  'condition_type', 'Particular',
  'orderIndex', 11
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 6B.1 - Early Procured Materials
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 12, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '6B.1',
  'clause_title', 'Early Procured Materials',
  'clause_text', '',
  'particular_condition', E'Add New Clause 6B as follows:\n\n6B EARLY PROCURED MATERIALS\n\nWhere applicable to the Scope of Works, the Employer will support the funding of purchasing the below listed Items "Early Procured Materials", within the first 120 days following the Commencement Date.\n\nThe Early Procured Materials are:\na. Aluminum works.\nb. Steel reinforcement.\nc. Aluminum & Copper Cables.\nd. Porcelain\ne. Engineered Wood.\nf. Marble.\ng. Refrigerant pipes.',
  'condition_type', 'Particular',
  'orderIndex', 12
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 7.1 - Provision of Bonds
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 13, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '7.1',
  'clause_title', 'Provision of Bonds',
  'clause_text', '',
  'particular_condition', E'In the first paragraph, replace the "fourteen (14) days after the Commencement Date" with "fourteen (14) days after the Effective Date".\n\n7.1 (a) The Performance Bond guarantee amount: The value shall be the same value of the Performance Bond as stated in the Agreement Form of this Contract and shall be subject to further increase during the contract period based on the adjusted Contract Value.\n\n7.1 (b) The Advance Payment Bond guarantee amount: The value shall be the same value of the Advance Payment as stated in the Agreement Form of this Contract.',
  'condition_type', 'Particular',
  'orderIndex', 13
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.1 - Information and Inspection
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 14, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.1',
  'clause_title', 'Information and Inspection',
  'clause_text', '',
  'particular_condition', E'Delete the second paragraph of Sub-Clause 9.1 and substitute by the following:\n\nThe Contractor is obliged to perform additional exploratory pits and/or boreholes by numbers and depths in full compliance with the requirements of Egyptian Codes and standard schedule 1-13 & 1-14. Time and Cost associated shall be the sole responsibility of the Contractor.\n\nAt the end of the last paragraph add "except for reasons stipulated in article 9.1A (Unforeseeable Physical Conditions)"',
  'condition_type', 'Particular',
  'orderIndex', 14
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.1A - Unforeseeable Physical Conditions
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 15, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.1A',
  'clause_title', 'Unforeseeable Physical Conditions',
  'clause_text', '',
  'particular_condition', E'Add New Sub-Clause 9.1A as follows:\n\n9.1A Unforeseeable Physical Conditions:\n\nIn this Sub-Clause, "physical conditions" or "physical obstructions" means sub-surface and hydrological conditions only.\n\nNotwithstanding the provisions of Sub-Clause 9.1, if during the execution of the Works the Contractor encounters physical obstructions or physical conditions, which obstructions or conditions were, in his opinion, not foreseeable by an experienced contractor, the Contractor shall forthwith give notice thereof to the Contract Administrator with a copy to the Employer.',
  'condition_type', 'Particular',
  'orderIndex', 15
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.4 - Opportunities for Other Contractors
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 16, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.4',
  'clause_title', 'Opportunities for Other Contractors',
  'clause_text', '',
  'particular_condition', E'In the 1st line after "requirements of" add "and in coordination with"\n\nAt the end of this Sub-Clause add "If the works carried out by such other contractors employed by the Employer caused the Contractor to incur additional cost or time and provided that it is not attributable partially or wholly to the Contractor, the Contractor will have the right to claim for such additional cost or time in accordance with the procedures set out in the Contract."',
  'condition_type', 'Particular',
  'orderIndex', 16
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.6 - Notices, Permits, and Fees
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 17, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.6',
  'clause_title', 'Notices, Permits, and Fees',
  'clause_text', '',
  'particular_condition', E'In the 3rd line after the word, "permits" add "except for building permits".\n\nAt the end of this Sub-Clause add the following:\n\nFor any part designed by the Contractor, the Contractor shall be responsible for preparing, submitting to the meant authorities for, and obtaining all permits required for the Works whether of permanent or temporary nature including, without limitation Building Permits, excavation licenses, utilities, no objection certificates and the like.\n\nThe Employer shall pay the fees of the building permits only after being collected by the Contractor against Contractor submission of the official Invoices.',
  'condition_type', 'Particular',
  'orderIndex', 17
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.13 - Fossils
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 18, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.13',
  'clause_title', 'Fossils, Remnant of Wars',
  'clause_text', '',
  'particular_condition', E'Change the title of the Sub-Clause to be "Fossils, Remnant of Wars" and substitute by the following:\n\nAll fossils, coins, articles of value or antiquity, and structures and other remains or things of geological or archaeological interest discovered on the Site shall, as between the Employer and the Contractor, be deemed to be the absolute property of the Employer.',
  'condition_type', 'Particular',
  'orderIndex', 18
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.18 - Mobilization
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 19, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.18',
  'clause_title', 'Mobilization',
  'clause_text', '',
  'particular_condition', E'Add new Sub-Clauses 9.18 & 9.19 as follows:\n\n9.18 Mobilization\n\nMobilization period as stipulated in Appendix (D) (if exist) commences from the contract''s Commencement Date. Mobilization is the making available and/or delivery and installation on-site and/or reallocation, if necessary, of all temporary equipment, systems, services, facilities, resources, and all the preparatory works.',
  'condition_type', 'Particular',
  'orderIndex', 19
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 9.19 - Independent Site Survey
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 20, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '9.19',
  'clause_title', 'Independent Site Survey and Progressive Surveys',
  'clause_text', '',
  'particular_condition', E'9.19 Independent Site Survey and Progressive Surveys\n\nContractor shall allow for the provision of modern "Total Station" surveying equipment, properly calibrated, checked, and certified on a programmed basis. Copies of calibration certificates shall be provided. Survey team members shall be properly trained in the use of the said equipment.',
  'condition_type', 'Particular',
  'orderIndex', 20
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 10.1 - Contractor's Representative
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 21, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '10.1',
  'clause_title', 'Contractor''s Representative',
  'clause_text', '',
  'particular_condition', E'In the first line replace "Immediately following the Commencement Date,..." with "Immediately following the Effective Date,..."',
  'condition_type', 'Particular',
  'orderIndex', 21
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 10.3 - Employees
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 22, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '10.3',
  'clause_title', 'Employees',
  'clause_text', '',
  'particular_condition', E'Rename the existing paragraph as (a).\n\nAdd new paragraph (b) as follows:\n\n(b) For the purpose of maintaining and controlling the supervision and quality of Works. The Contractor shall provide the relevant supervision staff for each respective discipline.\n\nFailure of the Contractor to provide the required level of staff after 72 hours'' notice shall subject Contractor to a daily fine to be calculated based on the following monthly rates:\n\nProject Manager: 250,000 EGP\nConstruction Manager: 125,000 EGP\nQ/C Engineer: 100,000 EGP\nSite Engineer: 50,000 EGP\nSenior Planning Engineer: 80,000 EGP\nSenior Specialist Engineer: 80,000 EGP\nTechnical Office Manager: 125,000 EGP\nForman: 30,000 EGP\n\nContractor shall assemble required staff within fourteen (14) days maximum from Contract Administrator written request.',
  'condition_type', 'Particular',
  'orderIndex', 22
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 11.1 - Plant General
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 23, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '11.1',
  'clause_title', 'Plant, Workmanship - General',
  'clause_text', '',
  'particular_condition', E'Rename the existing paragraph as (a)\n\nAdd new paragraphs (b) to (d) as follows:\n\n(b) The Contractor shall place the Employer name sign on all his equipment and facilities at the Site.\n\n(c) The Contractor shall allow for the use of mechanical concrete placement methods as dictated by good modern practice.\n\n(d) The Contractor shall plan and allow for concrete placement on a monolithic basis minimizing construction joints.',
  'condition_type', 'Particular',
  'orderIndex', 23
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 11.2 - Inspection and Testing
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 24, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '11.2',
  'clause_title', 'Inspection and Testing',
  'clause_text', '',
  'particular_condition', E'Rename the existing paragraph as (a)\n\nAdd new paragraphs (b) & (c) as follows:\n\n(b) Testing and commissioning for all disciplines shall be carried out using temporary power and water services provided by the Contractor.\n\n(c) The Contractor shall allow for the supply, installation and removal of all temporary equipment and services.',
  'condition_type', 'Particular',
  'orderIndex', 24
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 11.8 - No Release
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 25, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '11.8',
  'clause_title', 'No Release',
  'clause_text', '',
  'particular_condition', E'The approval or consent of the Employer or Contract Administrator to or of any document, drawing, specification, programme, method statement or any other document or proposal submitted by the Contractor shall not relieve the Contractor of any of its obligations under the Contract.',
  'condition_type', 'Particular',
  'orderIndex', 25
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 12.5 - Risk and Care
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 26, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '12.5',
  'clause_title', 'Risk and Care',
  'clause_text', '',
  'particular_condition', E'In the fifth line of Sub-Clause b (i) after the word "war" add ", terrorisms".',
  'condition_type', 'Particular',
  'orderIndex', 26
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 12.6 - General Indemnity
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 27, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '12.6',
  'clause_title', 'General Indemnity',
  'clause_text', '',
  'particular_condition', E'In paragraph (b) of this Sub-Clause 12.6, 2nd line delete "(whether direct or indirect actual or consequential)".',
  'condition_type', 'Particular',
  'orderIndex', 27
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 12.9 - Insurance
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 28, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '12.9',
  'clause_title', 'Insurance',
  'clause_text', '',
  'particular_condition', E'Delete this Sub-Clause 12.9 entirely and substitute by the following:\n\nThe Contractor at its own Cost shall take out and maintain all insurances referred to in this Clause 12.9 with insurers acceptable to the Employer and under one or more policies in such form and with only such exclusions and restrictions as the Employer may approve.\n\nAll Insurance Policies shall be submitted in both Arabic and English.',
  'condition_type', 'Particular',
  'orderIndex', 28
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 17.1 - Commencement
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 29, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '17.1',
  'clause_title', 'Commencement',
  'clause_text', '',
  'particular_condition', E'Delete this Sub-Clause entirely and substitute by the following:\n\nThe Contractor shall commence the Works not later than seven (7) days after the Commencement Date and thereafter shall proceed with the same with due expedition and without delay, Commencement of Section or Portion of the Works must be in accordance with the construction schedule milestones and phases of work in accordance with Appendix D.',
  'condition_type', 'Particular',
  'orderIndex', 29
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 17.3 - Programme
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 30, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '17.3',
  'clause_title', 'Programme',
  'clause_text', '',
  'particular_condition', E'Rename the existing paragraph as (a), and amend as follows:\n\nIn paragraph (a) of this Sub-Clause; the period referred to in Conditions of Contract is twenty-eight (28) days following the Effective Date.\n\nAdd the following paragraphs (b) & (c):\n\n(b) The Programme must represent and fully respect the milestones of the schedule issued under Appendix D.\n\n(c) Unless the Contract Administrator, within twenty-eight (28) days after receiving the Programme, gives notice to the Contractor stating the extent to which it doesn''t comply with the Contract, the Contractor shall proceed in accordance with the Programme.',
  'condition_type', 'Particular',
  'orderIndex', 30
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 17.6 - Progress Reports
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 31, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '17.6',
  'clause_title', 'Progress Reports',
  'clause_text', '',
  'particular_condition', E'The period referred to in Conditions of Contract is five (5) days after the end of each month.',
  'condition_type', 'Particular',
  'orderIndex', 31
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 17.7 - Rate of Progress
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 32, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '17.7',
  'clause_title', 'Rate of Progress',
  'clause_text', '',
  'particular_condition', E'Insert "based on the approved Programme critical path" after "The Contract Administrator" in the fourth line of Sub Clause 17.7',
  'condition_type', 'Particular',
  'orderIndex', 32
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 17.8 - Site Working Hours
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 33, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '17.8',
  'clause_title', 'Site Working Hours',
  'clause_text', '',
  'particular_condition', E'None of the Works shall be carried out on Site during the night or on locally recognized days of rest or on declared public holidays in the Country without the prior approval of the Contract Administrator.\n\nIn case the work requires the presence of the Consultant beyond the normal working hours, a prior notice shall be given by the Contractor and the Contractor shall bear Egyptian Pounds two hundred and seventy-five (EGP 275/hour / engineer).\n\nThe normal working hours shall be 8 hours/day, 6 days/week.',
  'condition_type', 'Particular',
  'orderIndex', 33
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 19.1 - Time for Completion
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 34, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '19.1',
  'clause_title', 'Time for Completion',
  'clause_text', '',
  'particular_condition', E'Rename the existing paragraph as (a)\nAdd new paragraphs (b) & (c) as follows:\n\n(b) The Time for Completion (contract period) shall be as stated in the Form of Agreement and in accordance with the Master Construction Schedule Appendix D of Conditions of Contract.\n\n(c) Both parties have agreed that the Works shall be carried out and handed over to the Employer in phases.',
  'condition_type', 'Particular',
  'orderIndex', 34
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 19.2 - Extension of Time
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 35, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '19.2',
  'clause_title', 'Extension of Time',
  'clause_text', '',
  'particular_condition', E'Replace "as may in his opinion be reasonable" in the 5th line of Sub-Clause 19.2 with "based on the critical path of the updated approved Programme".',
  'condition_type', 'Particular',
  'orderIndex', 35
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 19.3 - Liquidated Damages
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 36, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '19.3',
  'clause_title', 'Liquidated Damages',
  'clause_text', '',
  'particular_condition', E'The amount of Liquidated Damages for delay beyond the Time for Completion of the Works or of any Contractual Milestone for each Section of the Works is equal to ten per cent (10%) of the Contract Value of the Works or of such Section as the case may be.\n\nSuch Liquidated Damages shall be applied on a weekly basis as follows: The Liquidated Damages (LDs) to be applied at 0.5% for the 1st week, 1% for the 2nd week, 1.5% for the 3rd week, 2% for the 4th week, 2.5% for the 5th week and 2.5% for the 6th week to reach maximum LDs of 10% after 6 weeks.\n\nIn addition, should the Contractor fail to meet any other intermediate milestones for any given phase as shown in Appendix (D) due to his own default, then the Employer is entitled to apply a penalty with a value of 25,000 EGP/Day.\n\nThe total amount of Liquidated Damages and the Penalties together shall not exceed 10% of the Contract Value.',
  'condition_type', 'Particular',
  'orderIndex', 36
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 20.1 - Taking-Over Certificate
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 37, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '20.1',
  'clause_title', 'Taking-Over Certificate',
  'clause_text', '',
  'particular_condition', E'Delete paragraph (a) of this Sub-Clause 20.1 entirely and substitute by the following:\n\n(a) any Section or Portion of the Works (as per the Construction Schedule Contractual milestones and phases of Works in accordance with Appendix D) has been completed in accordance with the Contract, except for any minor outstanding work and defects which will not affect the use of that Section or Portion of the Works for its intended purpose.',
  'condition_type', 'Particular',
  'orderIndex', 37
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 20.2 - Use Before Taking Over
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 38, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '20.2',
  'clause_title', 'Use Before Taking Over',
  'clause_text', '',
  'particular_condition', E'Delete this Sub-Clause 20.2 entirely and substitute by the following:\n\nIt may be necessary for the Employer to use a part or parts of any Section or Portion of the Works before issuance of the applicable Taking-Over Certificate as a temporary measure but not for its intended purpose. In such instance the Contractor shall, for all purposes, continue to have the full responsibility for the Works.',
  'condition_type', 'Particular',
  'orderIndex', 38
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 22.3 - Valuation of Variation Orders
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 39, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '22.3',
  'clause_title', 'Valuation of Variation Orders',
  'clause_text', '',
  'particular_condition', E'Delete paragraphs (a) to (c) and substitute by paragraphs (a) and (d) as follows:\n\n(a) the Variation Order shall be valued at rates and prices contained in the Contract insofar as such rates and prices shall, in the opinion of the Employer be appropriate and applicable;\n\n(b) insofar as applicable and appropriate in the opinion of the Employer the rates and prices contained in the Contract shall be used as the basis of valuation;\n\n(c) insofar as the Variation Order cannot be valued in accordance with Clause 22.3 (a) & (b) above the Employer and the Contractor shall endeavour to agree a suitable valuation; or\n\n(d) in the event of failure to agree as aforesaid, the Employer shall fix a valuation which, in its opinion, is appropriate.',
  'condition_type', 'Particular',
  'orderIndex', 39
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 22.5 - Value Engineering
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 40, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '22.5',
  'clause_title', 'Value Engineering',
  'clause_text', '',
  'particular_condition', E'Add the following paragraph at the end of this sub-clause.\n\nShould the Contractor''s proposal for the Works, Programme, and valuation be approved by the Employer, and the approved proposal set out clearly the amount of reduction in the cost to the Employer as per point (c) above, then the Contractor shall be entitled to an amount equal to 40% of the cost reduction so achieved.',
  'condition_type', 'Particular',
  'orderIndex', 40
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 23.1 - Notice of Claims
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 41, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '23.1',
  'clause_title', 'Notice of Claims',
  'clause_text', '',
  'particular_condition', E'At the end of this Sub-Clause add the following:\n\nThe Contractor shall send to the Contract Administrator''s Representative once in every month a separate account giving particulars of all claims for any additional expense to which the Contractor may consider himself entitled and of all extra and additional work ordered by the Employer which he has executed during the preceding month and no claim for payment for any such work or expense will be considered unless it has been included in such monthly particulars.',
  'condition_type', 'Particular',
  'orderIndex', 41
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 26.1 - Application of Interim Certificates
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 42, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '26.1',
  'clause_title', 'Application of Interim Certificates',
  'clause_text', '',
  'particular_condition', E'Add the following paragraph to Sub-Clause 26.1 (a):\nThe Advance Payment Bond shall be reduced in amount according to the refunded values through progress payments.\n\nReplace 26.1 (b) (ii) with the following "ninety percent (90%) of the estimated net direct cost" in item 26.1 (b) (ii) by "seventy five percent (75%) of the estimated net direct cost or sixty percent (60%) of the BOQ item rate for architectural works and fifty percent (50%) of the BOQ item rate for electromechanical works".',
  'condition_type', 'Particular',
  'orderIndex', 42
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Clause 26.2 - Issue of Interim Certificates
INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
SELECT id, 'PARTICULAR', 43, jsonb_build_object(
  'itemType', 'CLAUSE',
  'clause_number', '26.2',
  'clause_title', 'Issue of Interim Certificates',
  'clause_text', '',
  'particular_condition', E'The percentage referred to in Sub-Clause 26.2 (b) of Conditions of Contract for retention is the percent stated in the Form of Agreement.\n\nIn Sub-Clause 26.2 (h), replace the 30 days with 15 days.\n\nAdd new paragraph (J) as follows:\n\n(J) The Employer retains his right to withhold (15%) fifteen percent of the monthly payment in the event the Contractor failed to deliver the following documentation:\n1. Material submissions scheduled through the month\n2. Shop drawings scheduled through the month\n3. As built drawings scheduled through the month\n4. Progress update throughout the month\n5. Removal of faulty executed works.',
  'condition_type', 'Particular',
  'orderIndex', 43
)
FROM contracts WHERE name ILIKE '%atrium%' LIMIT 1;

-- Verify the import
SELECT 
  'Imported ' || COUNT(*) || ' clauses for Atrium contract' as result
FROM contract_items ci
JOIN contracts c ON ci.contract_id = c.id
WHERE c.name ILIKE '%atrium%' AND ci.section_type = 'PARTICULAR';

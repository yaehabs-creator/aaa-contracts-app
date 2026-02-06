-- Atrium Contract Document Insertion
-- Run this in Supabase SQL Editor to bypass RLS
-- After running this, use the app to upload actual files or run embeddings

-- Contract ID for Atrium
-- f8edad2c-e752-440a-bf84-0627eedb69fd

-- =====================================================
-- IMPORTANT: Update the file paths below to match your
-- actual uploaded file paths in Supabase Storage
-- =====================================================

-- Insert General Conditions (GC) document
INSERT INTO contract_documents (
    contract_id,
    document_group,
    name,
    original_filename,
    file_path,
    file_type,
    page_count,
    sequence_number,
    status
) VALUES (
    'f8edad2c-e752-440a-bf84-0627eedb69fd',
    'C',
    'General Conditions',
    'C001_General_Conditions.pdf',
    'contracts/f8edad2c-e752-440a-bf84-0627eedb69fd/C/C001_General_Conditions.pdf',
    'pdf',
    39,
    1,
    'pending'
) ON CONFLICT (contract_id, document_group, sequence_number) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert Particular Conditions (PC) document
INSERT INTO contract_documents (
    contract_id,
    document_group,
    name,
    original_filename,
    file_path,
    file_type,
    page_count,
    sequence_number,
    status
) VALUES (
    'f8edad2c-e752-440a-bf84-0627eedb69fd',
    'C',
    'Particular Conditions',
    'C002_Particular_Conditions.pdf',
    'contracts/f8edad2c-e752-440a-bf84-0627eedb69fd/C/C002_Particular_Conditions.pdf',
    'pdf',
    NULL,
    2,
    'pending'
) ON CONFLICT (contract_id, document_group, sequence_number) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- =====================================================
-- Add more documents as needed using this template:
-- =====================================================
/*
INSERT INTO contract_documents (
    contract_id,
    document_group,  -- 'A', 'B', 'C', 'D', 'I', or 'N'
    name,
    original_filename,
    file_path,
    file_type,
    page_count,
    sequence_number,
    effective_date,  -- Use for Addendums (group D)
    status
) VALUES (
    'f8edad2c-e752-440a-bf84-0627eedb69fd',
    'A',  -- Change group as needed
    'Form of Agreement',
    'A001_Form_of_Agreement.pdf',
    'contracts/f8edad2c-e752-440a-bf84-0627eedb69fd/A/A001_Form_of_Agreement.pdf',
    'pdf',
    NULL,  -- Page count (can be updated later)
    1,     -- Sequence number within group
    NULL,  -- Effective date (format: '2024-01-15')
    'pending'
);
*/

-- Verify inserted documents
SELECT 
    id,
    document_group,
    name,
    sequence_number,
    status,
    created_at
FROM contract_documents 
WHERE contract_id = 'f8edad2c-e752-440a-bf84-0627eedb69fd'
ORDER BY document_group, sequence_number;

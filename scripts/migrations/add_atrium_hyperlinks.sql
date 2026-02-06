-- Add hyperlinks to Atrium contract clauses
-- Generated: 2026-01-26T18:28:50.163Z
-- This script updates clause text fields to include clickable hyperlinks
-- for clause references (e.g., "Clause 7.1" becomes a link to clause 7.1)

BEGIN;


-- Clause 1.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'In the Contract, as defined in the Particular Conditions attached to these Conditions of Contract as Appendix A, the following words and expressions shall have the meanings hereby assigned to them except where the context otherwise requires: (a) \"Advance Payment Bond\" means the bond named in <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) as the Advance Payment Bond. (b) \"Bills of Quantities\" means the document entitled bills of quantities, duly completed and priced, forming a part of the Contract. (c) \"Conditions of Contract\" means these Conditions of Contract including Appendices forming a part of the Contract. (d) \"Contractor''s Drawings\" means all drawings, calculations, computer programmes and other software, samples, patterns, models, manuals and other documents and information of a technical nature (if any) to be submitted by the Contractor under the Contract. (e) \"Contractor''s Equipment\" means all apparatus, machinery, vehicles and other things of whatsoever nature required for the carrying out and completion of the Works and the remedying of defects therein other than Plant and Free Issue Items. (f) \"Contractor''s Representative\" means the person for the time being in office as the Contractor''s Representative pursuant to <a href=\"#clause-10.1\" class=\"clause-link\" data-clause-id=\"10.1\">Clause 10.1</a> (Contractor''s Representative). (g) \"Cost\" means all expenditure reasonably incurred (or to be incurred), whether on or off the Site, including overhead and similar charges, but does not include profit. (h) \"Defects Liability Period\" has the meaning assigned by <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over). (i) \"Employer''s Representative\" means the person for the time being appointed by the Employer and notified in writing to the Project Manager, the Supervision Consultant and the Contractor to act on behalf of the Employer for the purposes of the Contract to the extent provided for by the said appointment. (j) \"Extended Warranty\" means any guarantee or warranty either express or implied whether provided for by the Contract or otherwise which extends beyond the expiry of the relevant Defects Liability Period. (k) \"Final Certificate\" means the certificate referred to in <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). (l) \"Form of Tender\" means the completed, priced and signed form of tender submitted by the Contractor as part of its Tender and forming a part of the Contract. (m) \"Free Issue Items\" has the meaning assigned by Clause 6A (Free Issue Items). (n) \"Instructions to Tenderers\" means the document entitled instructions to tenderers forming a part of the Contract. (o) \"Interim Certificate\" means the certificate referred to in <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates). (q) \"Nominated Subcontractor\" means any person nominated by the Employer (whether in the Contract, pursuant to a power to make such nominations specifically reserved in the Contract or by way of a Variation Order issued pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders)) to receive a subcontract from the Contractor for any specified part of the Works when acting within the scope of such subcontract. (r) \"Particular Conditions\" means the terms, conditions and provisions set down in Appendix A to these Conditions of Contract. (s) \"Performance Bond\" means the bond named in <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) as the Performance Bond. (t) \"Plant\" means machinery, apparatus, materials and all other things to be provided by the Contractor under the Contract for incorporation in the Works including the supply-only items (if any) to be supplied by the Contractor under the Contract. (u) \"Portion of the Works\" means a part of a Section of the Works or a part of another Portion of the Works which part, in each case, may from time to time be designated as such by the Employer and notified in writing to the Project Manager, the Supervision Consultant and the Contractor. The residue of the said Section of the Works or said other Portion of the Works shall itself automatically constitute a Portion of the Works. (v) \"Programme\" means the programme submitted by the Contractor in accordance with <a href=\"#clause-17.3\" class=\"clause-link\" data-clause-id=\"17.3\">Clause 17.3</a> (Programme) and approved by the Project Manager and any revised programme which may be submitted by the Contractor to the Project Manager and approved by the Project Manager from time to time and which shall, upon such approval, be substituted for the previous programme. (w) \"Project Manager''s Representative\" means any representative of the Project Manager appointed from time to time by the Project Manager under <a href=\"#clause-2.5\" class=\"clause-link\" data-clause-id=\"2.5\">Clause 2.5</a> (Project Manager''s Representative). (x) \"Provisional Sum\" has the meaning assigned by Clause 22A.1 (Definition of Provisional Sum). (y) \"Site\" means the place or places provided or made available by the Employer where work is to be done by the Contractor, or to which Plant or Free Issue Items are to be delivered together with so much of the area surrounding the same as the Contractor shall with the written consent of the Project Manager use in connection with the Works otherwise than merely for the purposes of access. (z) \"Specification\" means the document entitled specification forming a part of the Contract together with any modifications thereof or additions thereto or deletions therefrom as may from time to time be made in accordance with the Contract. (aa) \"Subcontractor\" means any Nominated Subcontractor or any person to whom any part of the Works has been sublet by the Contractor with (where required in accordance with <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting)) the consent in writing of the Project Manager and the Supervision Consultant and includes the Subcontractor''s legal successors but not assigns. (bb) \"Supervision Consultant''s Representative\" means any representative of the Supervision Consultant appointed from time to time by the Supervision Consultant under Clause 2A.5 (Supervision Consultant''s Representative). (cc) \"Suspension Order\" has the meaning assigned by <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order). (dd) \"Taking-Over Certificate\" has the meaning assigned by <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate). (ee) \"Tender\" means the Contractor''s priced offer to the Employer for the carrying out and completion of the Works and the remedying of defects therein. (ff) \"Tests on Completion\" means such tests to be made by the Contractor before the relevant Section or Portion of the Works is taken over by the Employer as are provided for in the Contract or otherwise agreed between the Employer or the Supervision Consultant and the Contractor. (gg) \"Variation Order\" has the meaning assigned by <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders). (hh) \"Works\" means all Plant to be provided and work to be done by the Contractor under the Contract.'::jsonb
        ),
        '{general_condition}',
        'In the Contract, as defined in the Particular Conditions attached to these Conditions of Contract as Appendix A, the following words and expressions shall have the meanings hereby assigned to them except where the context otherwise requires: (a) \"Advance Payment Bond\" means the bond named in <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) as the Advance Payment Bond. (b) \"Bills of Quantities\" means the document entitled bills of quantities, duly completed and priced, forming a part of the Contract. (c) \"Conditions of Contract\" means these Conditions of Contract including Appendices forming a part of the Contract. (d) \"Contractor''s Drawings\" means all drawings, calculations, computer programmes and other software, samples, patterns, models, manuals and other documents and information of a technical nature (if any) to be submitted by the Contractor under the Contract. (e) \"Contractor''s Equipment\" means all apparatus, machinery, vehicles and other things of whatsoever nature required for the carrying out and completion of the Works and the remedying of defects therein other than Plant and Free Issue Items. (f) \"Contractor''s Representative\" means the person for the time being in office as the Contractor''s Representative pursuant to <a href=\"#clause-10.1\" class=\"clause-link\" data-clause-id=\"10.1\">Clause 10.1</a> (Contractor''s Representative). (g) \"Cost\" means all expenditure reasonably incurred (or to be incurred), whether on or off the Site, including overhead and similar charges, but does not include profit. (h) \"Defects Liability Period\" has the meaning assigned by <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over). (i) \"Employer''s Representative\" means the person for the time being appointed by the Employer and notified in writing to the Project Manager, the Supervision Consultant and the Contractor to act on behalf of the Employer for the purposes of the Contract to the extent provided for by the said appointment. (j) \"Extended Warranty\" means any guarantee or warranty either express or implied whether provided for by the Contract or otherwise which extends beyond the expiry of the relevant Defects Liability Period. (k) \"Final Certificate\" means the certificate referred to in <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). (l) \"Form of Tender\" means the completed, priced and signed form of tender submitted by the Contractor as part of its Tender and forming a part of the Contract. (m) \"Free Issue Items\" has the meaning assigned by Clause 6A (Free Issue Items). (n) \"Instructions to Tenderers\" means the document entitled instructions to tenderers forming a part of the Contract. (o) \"Interim Certificate\" means the certificate referred to in <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates). (q) \"Nominated Subcontractor\" means any person nominated by the Employer (whether in the Contract, pursuant to a power to make such nominations specifically reserved in the Contract or by way of a Variation Order issued pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders)) to receive a subcontract from the Contractor for any specified part of the Works when acting within the scope of such subcontract. (r) \"Particular Conditions\" means the terms, conditions and provisions set down in Appendix A to these Conditions of Contract. (s) \"Performance Bond\" means the bond named in <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) as the Performance Bond. (t) \"Plant\" means machinery, apparatus, materials and all other things to be provided by the Contractor under the Contract for incorporation in the Works including the supply-only items (if any) to be supplied by the Contractor under the Contract. (u) \"Portion of the Works\" means a part of a Section of the Works or a part of another Portion of the Works which part, in each case, may from time to time be designated as such by the Employer and notified in writing to the Project Manager, the Supervision Consultant and the Contractor. The residue of the said Section of the Works or said other Portion of the Works shall itself automatically constitute a Portion of the Works. (v) \"Programme\" means the programme submitted by the Contractor in accordance with <a href=\"#clause-17.3\" class=\"clause-link\" data-clause-id=\"17.3\">Clause 17.3</a> (Programme) and approved by the Project Manager and any revised programme which may be submitted by the Contractor to the Project Manager and approved by the Project Manager from time to time and which shall, upon such approval, be substituted for the previous programme. (w) \"Project Manager''s Representative\" means any representative of the Project Manager appointed from time to time by the Project Manager under <a href=\"#clause-2.5\" class=\"clause-link\" data-clause-id=\"2.5\">Clause 2.5</a> (Project Manager''s Representative). (x) \"Provisional Sum\" has the meaning assigned by Clause 22A.1 (Definition of Provisional Sum). (y) \"Site\" means the place or places provided or made available by the Employer where work is to be done by the Contractor, or to which Plant or Free Issue Items are to be delivered together with so much of the area surrounding the same as the Contractor shall with the written consent of the Project Manager use in connection with the Works otherwise than merely for the purposes of access. (z) \"Specification\" means the document entitled specification forming a part of the Contract together with any modifications thereof or additions thereto or deletions therefrom as may from time to time be made in accordance with the Contract. (aa) \"Subcontractor\" means any Nominated Subcontractor or any person to whom any part of the Works has been sublet by the Contractor with (where required in accordance with <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting)) the consent in writing of the Project Manager and the Supervision Consultant and includes the Subcontractor''s legal successors but not assigns. (bb) \"Supervision Consultant''s Representative\" means any representative of the Supervision Consultant appointed from time to time by the Supervision Consultant under Clause 2A.5 (Supervision Consultant''s Representative). (cc) \"Suspension Order\" has the meaning assigned by <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order). (dd) \"Taking-Over Certificate\" has the meaning assigned by <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate). (ee) \"Tender\" means the Contractor''s priced offer to the Employer for the carrying out and completion of the Works and the remedying of defects therein. (ff) \"Tests on Completion\" means such tests to be made by the Contractor before the relevant Section or Portion of the Works is taken over by the Employer as are provided for in the Contract or otherwise agreed between the Employer or the Supervision Consultant and the Contractor. (gg) \"Variation Order\" has the meaning assigned by <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders). (hh) \"Works\" means all Plant to be provided and work to be done by the Contractor under the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '1.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 1.9
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Contractor consists of more than one legal person, the persons comprising the same shall be jointly and severally liable to the Employer for each and every liability and obligation under the Contract, and any of the events listed in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default) shall be deemed to have occurred in relation to the Contractor if it has occurred in relation to any one of the persons comprising the Contractor. Such persons shall designate one of them to act as leader with authority to bind the Contractor and each such person and shall notify the Employer accordingly. The composition or the legal status of the Contractor shall not be altered without the prior consent of the Employer.'::jsonb
        ),
        '{general_condition}',
        'If the Contractor consists of more than one legal person, the persons comprising the same shall be jointly and severally liable to the Employer for each and every liability and obligation under the Contract, and any of the events listed in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default) shall be deemed to have occurred in relation to the Contractor if it has occurred in relation to any one of the persons comprising the Contractor. Such persons shall designate one of them to act as leader with authority to bind the Contractor and each such person and shall notify the Employer accordingly. The composition or the legal status of the Contractor shall not be altered without the prior consent of the Employer.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '1.9'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 2.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Contractor shall, by written notice to the Project Manager within (but not after) seven (7) days after receiving any decision, order or instruction of the Project Manager in writing or written confirmation under <a href=\"#clause-2.3\" class=\"clause-link\" data-clause-id=\"2.3\">Clause 2.3</a> (Unwritten Decisions), dispute or question the decision, order or instruction giving its reasons for so doing it shall serve notice on the Project Manager in accordance with Clause 32 (Notices) and the Project Manager shall reconsider his decision, order or instruction and within a further period of seven days by notice in writing, with reasons therefor, to the Contractor and the Employer, confirm, reverse or vary such decision, order or instruction.'::jsonb
        ),
        '{general_condition}',
        'If the Contractor shall, by written notice to the Project Manager within (but not after) seven (7) days after receiving any decision, order or instruction of the Project Manager in writing or written confirmation under <a href=\"#clause-2.3\" class=\"clause-link\" data-clause-id=\"2.3\">Clause 2.3</a> (Unwritten Decisions), dispute or question the decision, order or instruction giving its reasons for so doing it shall serve notice on the Project Manager in accordance with Clause 32 (Notices) and the Project Manager shall reconsider his decision, order or instruction and within a further period of seven days by notice in writing, with reasons therefor, to the Contractor and the Employer, confirm, reverse or vary such decision, order or instruction.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '2.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 2.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Project Manager''s Representative shall be appointed in writing by and be responsible to the Project Manager and shall carry out only such duties and have such powers, discretions, functions and authorities as may be delegated to him by the Project Manager under <a href=\"#clause-2.6\" class=\"clause-link\" data-clause-id=\"2.6\">Clause 2.6</a> (Project Manager''s Power to Delegate).'::jsonb
        ),
        '{general_condition}',
        'The Project Manager''s Representative shall be appointed in writing by and be responsible to the Project Manager and shall carry out only such duties and have such powers, discretions, functions and authorities as may be delegated to him by the Project Manager under <a href=\"#clause-2.6\" class=\"clause-link\" data-clause-id=\"2.6\">Clause 2.6</a> (Project Manager''s Power to Delegate).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '2.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 2.6
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Project Manager may from time to time in writing delegate to the Project Manager''s Representative any of the powers, discretions, functions and/or authorities vested in him or any of his duties and he may at any time revoke any such delegation in writing. The Project Manager shall deliver to the Contractor, to the Employer and to the Supervision Consultant a copy of any such written delegation or revocation and the same shall not have effect until all such copies have been so delivered. Any written communication given by the Project Manager''s Representative to the Contractor in accordance with such delegation shall have the same effect as though it had been given by the Project Manager Provided always that if the Contractor questions any communication of the Project Manager''s Representative the Contractor shall be entitled within (but not after) four (4) days of the receipt thereof by the Contractor to refer the matter to the Project Manager who will thereupon confirm, reverse or vary the content of such communication and such confirmation, reversal or variation shall (subject to the provisions relating to the resolution of disputes contained in the Particular Conditions) be final notwithstanding the provisions of <a href=\"#clause-2.4\" class=\"clause-link\" data-clause-id=\"2.4\">Clause 2.4</a> (Reconfirmation of Decisions).'::jsonb
        ),
        '{general_condition}',
        'The Project Manager may from time to time in writing delegate to the Project Manager''s Representative any of the powers, discretions, functions and/or authorities vested in him or any of his duties and he may at any time revoke any such delegation in writing. The Project Manager shall deliver to the Contractor, to the Employer and to the Supervision Consultant a copy of any such written delegation or revocation and the same shall not have effect until all such copies have been so delivered. Any written communication given by the Project Manager''s Representative to the Contractor in accordance with such delegation shall have the same effect as though it had been given by the Project Manager Provided always that if the Contractor questions any communication of the Project Manager''s Representative the Contractor shall be entitled within (but not after) four (4) days of the receipt thereof by the Contractor to refer the matter to the Project Manager who will thereupon confirm, reverse or vary the content of such communication and such confirmation, reversal or variation shall (subject to the provisions relating to the resolution of disputes contained in the Particular Conditions) be final notwithstanding the provisions of <a href=\"#clause-2.4\" class=\"clause-link\" data-clause-id=\"2.4\">Clause 2.4</a> (Reconfirmation of Decisions).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '2.6'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 3.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall not sublet the whole of the Works. Except in the case of subcontracts to Nominated Subcontractors and except in any case where the Contract specifically permits subcontracting, the Contractor shall not sublet any part of the Works (whether that part involves the carrying out of any work or the provision of any Plant or a combination of such activities) without the prior written consent of the Project Manager and the Supervision Consultant and only (such prior written consent having been obtained) upon such terms as the Project Manager may require. The Contractor shall obtain the prior written consent of the Project Manager and the Supervision Consultant to proposed Subcontractors. The Contractor shall give the Project Manager not less than twenty eight (28) days'' notice of the intended date of the commencement of each Subcontractor''s work and of the commencement of such work on the Site. No subcontract whether with a Nominated Subcontractor, a Subcontractor to whom the Contract specifically permits subcontracting or a Subcontractor to whose subcontract the Project Manager and the Supervision Consultant have given prior written consent shall relieve the Contractor from any liability or obligation under the Contract and the Contractor shall be responsible for the acts, defaults and neglects of each Subcontractor, its agents or employees as fully as if they were the acts, defaults or neglects of the Contractor, its agents or employees. The Contractor shall be responsible for the observance by all Subcontractors of all provisions of the Contract. Every subcontract shall contain a prohibition on assignment in the same terms as <a href=\"#clause-3.1\" class=\"clause-link\" data-clause-id=\"3.1\">Clause 3.1</a> (Assignment) and a total prohibition on subletting the whole of the works covered thereby and a prohibition on subletting any part of the works covered thereby without the prior written consent of the Project Manager and the Supervision Consultant.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall not sublet the whole of the Works. Except in the case of subcontracts to Nominated Subcontractors and except in any case where the Contract specifically permits subcontracting, the Contractor shall not sublet any part of the Works (whether that part involves the carrying out of any work or the provision of any Plant or a combination of such activities) without the prior written consent of the Project Manager and the Supervision Consultant and only (such prior written consent having been obtained) upon such terms as the Project Manager may require. The Contractor shall obtain the prior written consent of the Project Manager and the Supervision Consultant to proposed Subcontractors. The Contractor shall give the Project Manager not less than twenty eight (28) days'' notice of the intended date of the commencement of each Subcontractor''s work and of the commencement of such work on the Site. No subcontract whether with a Nominated Subcontractor, a Subcontractor to whom the Contract specifically permits subcontracting or a Subcontractor to whose subcontract the Project Manager and the Supervision Consultant have given prior written consent shall relieve the Contractor from any liability or obligation under the Contract and the Contractor shall be responsible for the acts, defaults and neglects of each Subcontractor, its agents or employees as fully as if they were the acts, defaults or neglects of the Contractor, its agents or employees. The Contractor shall be responsible for the observance by all Subcontractors of all provisions of the Contract. Every subcontract shall contain a prohibition on assignment in the same terms as <a href=\"#clause-3.1\" class=\"clause-link\" data-clause-id=\"3.1\">Clause 3.1</a> (Assignment) and a total prohibition on subletting the whole of the works covered thereby and a prohibition on subletting any part of the works covered thereby without the prior written consent of the Project Manager and the Supervision Consultant.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '3.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 5.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Subject to provisos (a) and (b) in <a href=\"#clause-2.1\" class=\"clause-link\" data-clause-id=\"2.1\">Clause 2.1</a> (Project Manager''s Powers and Duties), the Project Manager shall have full power and authority to issue to the Contractor from time to time such further Drawings, such modifications and additions to and such deletions from the Specification and such instructions as shall be necessary for the purpose of the proper and adequate carrying out of the Works and the remedying of defects therein and the Contractor shall comply therewith.'::jsonb
        ),
        '{general_condition}',
        'Subject to provisos (a) and (b) in <a href=\"#clause-2.1\" class=\"clause-link\" data-clause-id=\"2.1\">Clause 2.1</a> (Project Manager''s Powers and Duties), the Project Manager shall have full power and authority to issue to the Contractor from time to time such further Drawings, such modifications and additions to and such deletions from the Specification and such instructions as shall be necessary for the purpose of the proper and adequate carrying out of the Works and the remedying of defects therein and the Contractor shall comply therewith.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '5.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 5.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) It shall be a condition precedent to the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for any Section or Portion of the Works that the Contractor shall have prepared and delivered to the Project Manager for approval by the Supervision Consultant: (i) all Drawings of that Section or Portion of the Works marked up to show the as-built status as required by the Specification; and (ii) comprehensive drafts of all operations and maintenance manuals (including without limitation charts and spare parts information) relating to that Section or Portion of the Works as required by the Specification. Such marked up Drawings and draft operations and maintenance manuals shall include but shall not be limited to details sufficient to enable the Employer to operate, maintain, dismantle, reassemble, adjust and repair all parts of the relevant Section or Portion of the Works. (b) It shall be a condition precedent to the issue of the Final Certificate under <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) for any Section or Portion of the Works that the Contractor shall have prepared and delivered to the Project Manager for approval by the Supervision Consultant all as-built drawings and operations and maintenance manuals relating to that Section or Portion of the Works as required by the Specification and such as-built drawings and operations and maintenance manuals have been approved by the Supervision Consultant.'::jsonb
        ),
        '{general_condition}',
        '(a) It shall be a condition precedent to the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for any Section or Portion of the Works that the Contractor shall have prepared and delivered to the Project Manager for approval by the Supervision Consultant: (i) all Drawings of that Section or Portion of the Works marked up to show the as-built status as required by the Specification; and (ii) comprehensive drafts of all operations and maintenance manuals (including without limitation charts and spare parts information) relating to that Section or Portion of the Works as required by the Specification. Such marked up Drawings and draft operations and maintenance manuals shall include but shall not be limited to details sufficient to enable the Employer to operate, maintain, dismantle, reassemble, adjust and repair all parts of the relevant Section or Portion of the Works. (b) It shall be a condition precedent to the issue of the Final Certificate under <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) for any Section or Portion of the Works that the Contractor shall have prepared and delivered to the Project Manager for approval by the Supervision Consultant all as-built drawings and operations and maintenance manuals relating to that Section or Portion of the Works as required by the Specification and such as-built drawings and operations and maintenance manuals have been approved by the Supervision Consultant.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '5.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 6.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall carry out and complete the Works and remedy defects therein in strict accordance with the Contract to the satisfaction of the Supervision Consultant and, subject to provisos (a) and (b) in <a href=\"#clause-2.1\" class=\"clause-link\" data-clause-id=\"2.1\">Clause 2.1</a> (Project Manager''s Powers and Duties), shall comply with and adhere strictly to the Project Manager''s instructions, decisions and orders on any matter, whether mentioned in the Contract or not, touching or concerning the Works.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall carry out and complete the Works and remedy defects therein in strict accordance with the Contract to the satisfaction of the Supervision Consultant and, subject to provisos (a) and (b) in <a href=\"#clause-2.1\" class=\"clause-link\" data-clause-id=\"2.1\">Clause 2.1</a> (Project Manager''s Powers and Duties), shall comply with and adhere strictly to the Project Manager''s instructions, decisions and orders on any matter, whether mentioned in the Contract or not, touching or concerning the Works.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '6.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 7.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'An appropriate proportion of the Performance Bond as determined from time to time by the Project Manager after reference to the Bills of Quantities and the valuation of the Works under <a href=\"#clause-25.2\" class=\"clause-link\" data-clause-id=\"25.2\">Clause 25.2</a> (Works to be Measured) shall apply to each Section and Portion of the Works. Such proportion as determined by the Project Manager shall be notified in writing by the Project Manager to the Employer and the Contractor.'::jsonb
        ),
        '{general_condition}',
        'An appropriate proportion of the Performance Bond as determined from time to time by the Project Manager after reference to the Bills of Quantities and the valuation of the Works under <a href=\"#clause-25.2\" class=\"clause-link\" data-clause-id=\"25.2\">Clause 25.2</a> (Works to be Measured) shall apply to each Section and Portion of the Works. Such proportion as determined by the Project Manager shall be notified in writing by the Project Manager to the Employer and the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '7.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 7.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The value of the Advance Payment Bond shall be reduced by the amount of Advance Payment recovered under <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates).'::jsonb
        ),
        '{general_condition}',
        'The value of the Advance Payment Bond shall be reduced by the amount of Advance Payment recovered under <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '7.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 8.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Employer shall be responsible for all bank charges incurred in connection with the transfer of the Advance Payment to the bank account nominated by the Contractor under <a href=\"#clause-27.4\" class=\"clause-link\" data-clause-id=\"27.4\">Clause 27.4</a> (Place of Payment).'::jsonb
        ),
        '{general_condition}',
        'The Employer shall be responsible for all bank charges incurred in connection with the transfer of the Advance Payment to the bank account nominated by the Contractor under <a href=\"#clause-27.4\" class=\"clause-link\" data-clause-id=\"27.4\">Clause 27.4</a> (Place of Payment).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '8.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 9.16
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Prior to and as a condition precedent to the issue by the Supervision Consultant of the Taking-Over Certificate for any Section or Portion of the Works in accordance with <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) the Contractor shall to the satisfaction of the Project Manager: (a) clear away and remove from that part of the Site and the Works to which such Taking-Over Certificate relates all rubbish and wreckage and all Contractor''s Equipment, surplus Plant and surplus Free Issue Items other than such as may be necessary for the proper performance of the Contractor''s obligations to remedy defects in and otherwise in relation to the applicable Section or Portion of the Works; and (b) leave such part of the Site and the Works in a clean and safe condition.'::jsonb
        ),
        '{general_condition}',
        'Prior to and as a condition precedent to the issue by the Supervision Consultant of the Taking-Over Certificate for any Section or Portion of the Works in accordance with <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) the Contractor shall to the satisfaction of the Project Manager: (a) clear away and remove from that part of the Site and the Works to which such Taking-Over Certificate relates all rubbish and wreckage and all Contractor''s Equipment, surplus Plant and surplus Free Issue Items other than such as may be necessary for the proper performance of the Contractor''s obligations to remedy defects in and otherwise in relation to the applicable Section or Portion of the Works; and (b) leave such part of the Site and the Works in a clean and safe condition.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '9.16'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 9.17
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Prior to and as a condition precedent to the issue by the Project Manager of the Final Certificate for any Section or Portion of the Works in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates), the Contractor shall to the satisfaction of the Project Manager clear away and remove from that part of the Site and the Works to which such Final Certificate relates all rubbish and wreckage and all Contractor''s Equipment, surplus Plant and surplus Free Issue Items remaining thereon.'::jsonb
        ),
        '{general_condition}',
        'Prior to and as a condition precedent to the issue by the Project Manager of the Final Certificate for any Section or Portion of the Works in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates), the Contractor shall to the satisfaction of the Project Manager clear away and remove from that part of the Site and the Works to which such Final Certificate relates all rubbish and wreckage and all Contractor''s Equipment, surplus Plant and surplus Free Issue Items remaining thereon.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '9.17'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 10.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Immediately following the Commencement Date, the Contractor shall appoint one of its suitably competent employees approved in writing by the Project Manager as the Contractor''s Representative and shall notify the Project Manager, the Supervision Consultant and the Employer of such appointment. The Contractor shall not revoke the appointment of the Contractor''s Representative without the prior written approval of the Project Manager. The Contractor''s Representative shall give the whole of his working time to directing the Contractor''s performance of the Contract. The Contractor''s Representative shall have sufficient authority to act on behalf of and to bind the Contractor in all respects in connection with the Contract and the Works and to receive on the Contractor''s behalf decisions, orders and instructions from the Project Manager, the Supervision Consultant and the Employer. The Project Manager''s approval of the Contractor''s Representative may at any time be withdrawn and in such event the Contractor shall as soon as practicable remove the said Representative from the Works, shall not thereafter employ him again on the Works in any capacity and shall replace him by a suitably competent employee approved in writing by the Project Manager. The Contractor shall ensure that a Contractor''s Representative remains in office and duly approved by the Project Manager at all times until the issue of the last Final Certificate for any Section or Portion of the Works under <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). If the Contractor''s Representative is to be temporarily absent from the Works, the Contractor shall appoint another of its suitably competent employees approved in writing by the Project Manager to act as the Contractor''s Representative during such temporary absence and shall notify the Project Manager, the Supervision Consultant and the Employer of such appointment.'::jsonb
        ),
        '{general_condition}',
        'Immediately following the Commencement Date, the Contractor shall appoint one of its suitably competent employees approved in writing by the Project Manager as the Contractor''s Representative and shall notify the Project Manager, the Supervision Consultant and the Employer of such appointment. The Contractor shall not revoke the appointment of the Contractor''s Representative without the prior written approval of the Project Manager. The Contractor''s Representative shall give the whole of his working time to directing the Contractor''s performance of the Contract. The Contractor''s Representative shall have sufficient authority to act on behalf of and to bind the Contractor in all respects in connection with the Contract and the Works and to receive on the Contractor''s behalf decisions, orders and instructions from the Project Manager, the Supervision Consultant and the Employer. The Project Manager''s approval of the Contractor''s Representative may at any time be withdrawn and in such event the Contractor shall as soon as practicable remove the said Representative from the Works, shall not thereafter employ him again on the Works in any capacity and shall replace him by a suitably competent employee approved in writing by the Project Manager. The Contractor shall ensure that a Contractor''s Representative remains in office and duly approved by the Project Manager at all times until the issue of the last Final Certificate for any Section or Portion of the Works under <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). If the Contractor''s Representative is to be temporarily absent from the Works, the Contractor shall appoint another of its suitably competent employees approved in writing by the Project Manager to act as the Contractor''s Representative during such temporary absence and shall notify the Project Manager, the Supervision Consultant and the Employer of such appointment.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '10.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 10.11
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall (without limiting the generality of the requirements of <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting)) be responsible for observance by its Subcontractors of the provisions of Clauses 10.2 to 10.10 inclusive and shall hold the Employer fully and effectually indemnified accordingly.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall (without limiting the generality of the requirements of <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting)) be responsible for observance by its Subcontractors of the provisions of Clauses 10.2 to 10.10 inclusive and shall hold the Employer fully and effectually indemnified accordingly.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '10.11'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 11.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Supervision Consultant and the Project Manager shall be entitled at any time to inspect, examine, measure and/or test any workmanship and/or Plant, including the materials for the manufacture or fabrication thereof and/or samples of such materials, whether on the Site, on the Contractor''s premises or on or at any other premises or places where the same may be. In the event of the Supervision Consultant wishing to inspect, examine, measure and/or test on or at any such other premises or places as aforesaid, the Contractor shall obtain for the Supervision Consultant and any person authorised by him all such permissions and facilities as the Contractor would have been bound to provide were the same being carried out on the Contractor''s premises. The Contractor shall (at its own Cost save as provided in <a href=\"#clause-11.3\" class=\"clause-link\" data-clause-id=\"11.3\">Clause 11.3</a> (Covering and Uncovering the Works)) provide or procure the provision of such documents and other information, assistance, instruments, apparatus, machines, labour, materials, fuel, stores, samples, utilities and consumables as may be required by the Supervision Consultant for the purpose of any such inspection, examination, measurement and/or testing as aforesaid. The Contractor shall afford full opportunity for the Supervision Consultant to inspect, examine, measure and/or test any work on Site or wherever carried out. No inspection, examination, measurement and/or testing shall release the Contractor from any of its obligations under the Contract.'::jsonb
        ),
        '{general_condition}',
        'The Supervision Consultant and the Project Manager shall be entitled at any time to inspect, examine, measure and/or test any workmanship and/or Plant, including the materials for the manufacture or fabrication thereof and/or samples of such materials, whether on the Site, on the Contractor''s premises or on or at any other premises or places where the same may be. In the event of the Supervision Consultant wishing to inspect, examine, measure and/or test on or at any such other premises or places as aforesaid, the Contractor shall obtain for the Supervision Consultant and any person authorised by him all such permissions and facilities as the Contractor would have been bound to provide were the same being carried out on the Contractor''s premises. The Contractor shall (at its own Cost save as provided in <a href=\"#clause-11.3\" class=\"clause-link\" data-clause-id=\"11.3\">Clause 11.3</a> (Covering and Uncovering the Works)) provide or procure the provision of such documents and other information, assistance, instruments, apparatus, machines, labour, materials, fuel, stores, samples, utilities and consumables as may be required by the Supervision Consultant for the purpose of any such inspection, examination, measurement and/or testing as aforesaid. The Contractor shall afford full opportunity for the Supervision Consultant to inspect, examine, measure and/or test any work on Site or wherever carried out. No inspection, examination, measurement and/or testing shall release the Contractor from any of its obligations under the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '11.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 11.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall give to the Project Manager (with a copy to the Supervision Consultant) not less than fourteen (14) days'' prior written notice of its readiness to carry out any test and shall agree with the Project Manager and the Supervision Consultant the date, time and place at which the same is to be carried out. The Contractor shall carry out such test on the date and at the time and place agreed. If the Contractor fails to carry out any such test on the date and at the time and place so agreed, any additional Costs consequently incurred by the Employer as determined by the Project Manager may be deducted by the Employer from any monies due or which may become due to the Contractor or the Employer may recover the same from the Contractor as a debt due from the Contractor. After carrying out any test the Contractor shall forthwith forward to the Project Manager (with a copy to the Supervision Consultant) a duly certified report of the test results. The provisions of this <a href=\"#clause-11.5\" class=\"clause-link\" data-clause-id=\"11.5\">Clause 11.5</a> shall not apply to Tests on Completion, to which the provisions of Clause 19A.1 (Time for Tests) shall apply.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall give to the Project Manager (with a copy to the Supervision Consultant) not less than fourteen (14) days'' prior written notice of its readiness to carry out any test and shall agree with the Project Manager and the Supervision Consultant the date, time and place at which the same is to be carried out. The Contractor shall carry out such test on the date and at the time and place agreed. If the Contractor fails to carry out any such test on the date and at the time and place so agreed, any additional Costs consequently incurred by the Employer as determined by the Project Manager may be deducted by the Employer from any monies due or which may become due to the Contractor or the Employer may recover the same from the Contractor as a debt due from the Contractor. After carrying out any test the Contractor shall forthwith forward to the Project Manager (with a copy to the Supervision Consultant) a duly certified report of the test results. The provisions of this <a href=\"#clause-11.5\" class=\"clause-link\" data-clause-id=\"11.5\">Clause 11.5</a> shall not apply to Tests on Completion, to which the provisions of Clause 19A.1 (Time for Tests) shall apply.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '11.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Where in accordance with <a href=\"#clause-12.1\" class=\"clause-link\" data-clause-id=\"12.1\">Clause 12.1</a> (Passage of Title) the legal title to any item of Plant passes to the Employer prior to the delivery to Site of such item, the Contractor shall so far as is practicable and to the satisfaction of the Project Manager set aside and mark the item and all component parts thereof and designated materials therefor as the property of the Employer. In the event of the Contractor failing so to set aside and mark as aforesaid the Project Manager shall be entitled to exclude from any Interim Certificate the value of any such items (and all component parts thereof and designated materials therefor) which the Contractor may otherwise be entitled to have included in such Interim Certificate.'::jsonb
        ),
        '{general_condition}',
        'Where in accordance with <a href=\"#clause-12.1\" class=\"clause-link\" data-clause-id=\"12.1\">Clause 12.1</a> (Passage of Title) the legal title to any item of Plant passes to the Employer prior to the delivery to Site of such item, the Contractor shall so far as is practicable and to the satisfaction of the Project Manager set aside and mark the item and all component parts thereof and designated materials therefor as the property of the Employer. In the event of the Contractor failing so to set aside and mark as aforesaid the Project Manager shall be entitled to exclude from any Interim Certificate the value of any such items (and all component parts thereof and designated materials therefor) which the Contractor may otherwise be entitled to have included in such Interim Certificate.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Any item of Plant the legal title to which has passed to the Employer in accordance with <a href=\"#clause-12.1\" class=\"clause-link\" data-clause-id=\"12.1\">Clause 12.1</a> (Passage of Title) and Free Issue Items shall be in the care and possession of the Contractor solely for the purposes of the Contract and shall not be within the ownership or disposition of the Contractor. Any Interim Certificate issued by the Project Manager pursuant to <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) shall be without prejudice to the exercise of any power of the Supervision Consultant contained in the Contract to reject any item of Plant covered thereby which is not in accordance with the Contract and upon any such rejection the legal title to the rejected item of Plant shall immediately revert to the Contractor. The legal title to any Plant removed from the Site in accordance with <a href=\"#clause-9.15\" class=\"clause-link\" data-clause-id=\"9.15\">Clause 9.15</a> (Removal of Plant and Contractor''s Equipment) shall revert to the Contractor immediately upon such removal.'::jsonb
        ),
        '{general_condition}',
        'Any item of Plant the legal title to which has passed to the Employer in accordance with <a href=\"#clause-12.1\" class=\"clause-link\" data-clause-id=\"12.1\">Clause 12.1</a> (Passage of Title) and Free Issue Items shall be in the care and possession of the Contractor solely for the purposes of the Contract and shall not be within the ownership or disposition of the Contractor. Any Interim Certificate issued by the Project Manager pursuant to <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) shall be without prejudice to the exercise of any power of the Supervision Consultant contained in the Contract to reject any item of Plant covered thereby which is not in accordance with the Contract and upon any such rejection the legal title to the rejected item of Plant shall immediately revert to the Contractor. The legal title to any Plant removed from the Site in accordance with <a href=\"#clause-9.15\" class=\"clause-link\" data-clause-id=\"9.15\">Clause 9.15</a> (Removal of Plant and Contractor''s Equipment) shall revert to the Contractor immediately upon such removal.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) The Works or any Section or Portion of the Works and any Plant or any Free Issue Items shall be at the risk of the Contractor until the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) in respect of the relevant Section or Portion and accordingly until such time the Contractor shall take full responsibility for the care thereof. Provided that the Contractor shall continue to take full responsibility for the care of any outstanding work (and any Plant and Free Issue Items relating thereto) which it shall have undertaken to finish during the Defects Liability Period until such outstanding work is completed. If while the Contractor shall be responsible for the care thereof of any Section or Portion of the Works or any Plant or any Free Issue Items any loss or damage shall happen to any Section or Portion of the Works or to any relevant Plant or to any Free Issue Items from any cause whatsoever (save and except the excepted risks as defined in paragraph (b) of this Clause) then: (i) in respect of any such Section or Portion or Plant the Contractor shall at its own Cost replace, repair and make good the same to the satisfaction of the Supervision Consultant; and (ii) in respect of any such Free Issue Items the Employer may himself replace, repair and make good the same or the Project Manager may instruct the Contractor in writing at the Contractor''s Cost to carry out such replacement, repair and making good to the satisfaction of the Supervision Consultant. All Costs which the Employer incurs as a result of such replacement, repair and making good by the Employer and/or the Contractor shall be recoverable from the Contractor by the Employer as a debt due from the Contractor, or may be deducted by the Employer from any monies due or which may become due to the Contractor. The Contractor shall also at its own Cost replace, repair and make good to the satisfaction of the Supervision Consultant any loss or damage which may happen to the Works or any part thereof or any Plant or any Free Issue Items if such loss or damage is occasioned by it or by any Subcontractor in the course of any operations carried out by it or by such Subcontractor for the purpose of completing any outstanding work or complying with its obligations under Clauses 21.2 (Defects after Taking Over) or 21.7 (Contractor to Search) or complying with its obligations under any Extended Warranty. (i) (insofar as they directly interfere with the progress of the Works and relate to and directly affect the Country) war, hostilities (whether war be declared or not), invasion, act of foreign enemies, rebellion, revolution, insurrection, military or usurped power, civil war, or (unless solely restricted to employees of the Contractor or of its Subcontractors and arising from the conduct of the Works) riot, commotion or disorder in the Country; or (ii) without prejudice to the Contractor''s responsibilities and liabilities under the Contract and the applicable Law, a cause solely due to a design supplied or specified by the Employer, the Project Manager or the Supervision Consultant if the Contractor can demonstrate that it had taken all necessary steps to satisfy itself as to the sufficiency of the said design and had promptly notified the Project Manager (with a copy to the Supervision Consultant) in writing after discovering any insufficiency in the said design; or (iii) ionising radiation or contamination by radio-activity from any nuclear fuel or from any nuclear waste from the combustion of nuclear fuel, radio-active toxic explosives or other hazardous properties of any explosive nuclear assembly or nuclear components thereof; or (iv) pressure waves caused by aircraft or other aerial devices travelling at sonic or supersonic speeds; or (v) any occurrence of the forces of nature (excluding any quantity of rainfall) that an experienced contractor could not foresee, or (if foreseeable) could not reasonably make provision for. (c) In the event of any such loss or damage as aforesaid arising from or occasioned by any of the excepted risks: (i) in respect of the relevant part of the Works and Plant the Contractor shall be entitled to payment as if such loss or damage had not occurred; and (ii) in respect of the relevant part of the Works, Plant and Free Issue Items the same shall, if required by the Employer, be replaced, repaired and made good by the Contractor but at the Cost of the Employer at a price to be determined in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders). If not so required by the Employer, the Employer may at his own Cost replace, repair and make good such loss or damage. (d) The Contractor''s risks are all risks other than the \"excepted risks\" as defined in paragraph (b) of this <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a>.'::jsonb
        ),
        '{general_condition}',
        '(a) The Works or any Section or Portion of the Works and any Plant or any Free Issue Items shall be at the risk of the Contractor until the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) in respect of the relevant Section or Portion and accordingly until such time the Contractor shall take full responsibility for the care thereof. Provided that the Contractor shall continue to take full responsibility for the care of any outstanding work (and any Plant and Free Issue Items relating thereto) which it shall have undertaken to finish during the Defects Liability Period until such outstanding work is completed. If while the Contractor shall be responsible for the care thereof of any Section or Portion of the Works or any Plant or any Free Issue Items any loss or damage shall happen to any Section or Portion of the Works or to any relevant Plant or to any Free Issue Items from any cause whatsoever (save and except the excepted risks as defined in paragraph (b) of this Clause) then: (i) in respect of any such Section or Portion or Plant the Contractor shall at its own Cost replace, repair and make good the same to the satisfaction of the Supervision Consultant; and (ii) in respect of any such Free Issue Items the Employer may himself replace, repair and make good the same or the Project Manager may instruct the Contractor in writing at the Contractor''s Cost to carry out such replacement, repair and making good to the satisfaction of the Supervision Consultant. All Costs which the Employer incurs as a result of such replacement, repair and making good by the Employer and/or the Contractor shall be recoverable from the Contractor by the Employer as a debt due from the Contractor, or may be deducted by the Employer from any monies due or which may become due to the Contractor. The Contractor shall also at its own Cost replace, repair and make good to the satisfaction of the Supervision Consultant any loss or damage which may happen to the Works or any part thereof or any Plant or any Free Issue Items if such loss or damage is occasioned by it or by any Subcontractor in the course of any operations carried out by it or by such Subcontractor for the purpose of completing any outstanding work or complying with its obligations under Clauses 21.2 (Defects after Taking Over) or 21.7 (Contractor to Search) or complying with its obligations under any Extended Warranty. (i) (insofar as they directly interfere with the progress of the Works and relate to and directly affect the Country) war, hostilities (whether war be declared or not), invasion, act of foreign enemies, rebellion, revolution, insurrection, military or usurped power, civil war, or (unless solely restricted to employees of the Contractor or of its Subcontractors and arising from the conduct of the Works) riot, commotion or disorder in the Country; or (ii) without prejudice to the Contractor''s responsibilities and liabilities under the Contract and the applicable Law, a cause solely due to a design supplied or specified by the Employer, the Project Manager or the Supervision Consultant if the Contractor can demonstrate that it had taken all necessary steps to satisfy itself as to the sufficiency of the said design and had promptly notified the Project Manager (with a copy to the Supervision Consultant) in writing after discovering any insufficiency in the said design; or (iii) ionising radiation or contamination by radio-activity from any nuclear fuel or from any nuclear waste from the combustion of nuclear fuel, radio-active toxic explosives or other hazardous properties of any explosive nuclear assembly or nuclear components thereof; or (iv) pressure waves caused by aircraft or other aerial devices travelling at sonic or supersonic speeds; or (v) any occurrence of the forces of nature (excluding any quantity of rainfall) that an experienced contractor could not foresee, or (if foreseeable) could not reasonably make provision for. (c) In the event of any such loss or damage as aforesaid arising from or occasioned by any of the excepted risks: (i) in respect of the relevant part of the Works and Plant the Contractor shall be entitled to payment as if such loss or damage had not occurred; and (ii) in respect of the relevant part of the Works, Plant and Free Issue Items the same shall, if required by the Employer, be replaced, repaired and made good by the Contractor but at the Cost of the Employer at a price to be determined in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders). If not so required by the Employer, the Employer may at his own Cost replace, repair and make good such loss or damage. (d) The Contractor''s risks are all risks other than the \"excepted risks\" as defined in paragraph (b) of this <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a>.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.6
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) The Contractor shall indemnify the Employer (including without limitation any consultant, servant, agent or employee of the Employer) against any and all losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any loss, injury (including death) or damage to persons or property (other than property forming part of the Works and Free Issue Items not yet taken over) which may result from or occur in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract. Provided that the foregoing indemnity shall not apply with regard to any such matters incurred or made as a result of or in connection with: (i) losses, injuries or damage to persons or property which are in the opinion of the Project Manager the unavoidable result of the carrying out of the Works in accordance with the Contract or the remedying of defects therein but this exclusion shall only apply with regard to any such matter of which the Contractor has notified the Project Manager in writing not less than fourteen (14) days prior to the occurrence of the relevant loss, injury or damage; (ii) losses, injuries or damage to persons or property directly resulting from any act or neglect of the Employer, its agents, employees or other contractors not being employed by the Contractor; or (iii) losses, injuries or damage to persons or property contributed to by any such act or neglect as is referred to in paragraph (ii) above, to the extent of an equitable proportion thereof having regard to the degree of such contribution. Without in any way limiting its generality, the above indemnity shall apply to claims, actions and demands brought or made by employees or agents of the Contractor, of any of its Subcontractors or of the Employer. In the event of any claim or demand being made against or any action being taken against either party to the Contract which claim, demand or action is within the scope of the relevant indemnity contained in this <a href=\"#clause-12.6\" class=\"clause-link\" data-clause-id=\"12.6\">Clause 12.6</a>, the party liable to indemnify shall be promptly notified in writing by the other party and the party liable to indemnify shall at its own Cost conduct all negotiations for the settlement of the same and any litigation that may arise therefrom. The party to be indemnified shall not unless and until the other party shall have failed to take over the conduct of the negotiations or litigation make any admission which may be prejudicial thereto. The conduct (by the party liable to indemnify) of such negotiations or litigation shall be conditional upon that party having first given to the other party such reasonable security as shall from time to time be required by the other party to cover the amount ascertained or agreed or estimated, as the case may be, of any losses, liabilities and costs which the other party may incur or for which it may become liable. The other party shall, at the request of the party liable to indemnify, afford all available assistance for any such purpose and shall be repaid all reasonable Costs incurred in so doing. (b) The Contractor shall indemnify the Employer against any loss or damage (whether direct or indirect actual or consequential) resulting from the installation of software or firmware into equipment at the Site which has not been tested for and shown to be clear of viruses or like agents.'::jsonb
        ),
        '{general_condition}',
        '(a) The Contractor shall indemnify the Employer (including without limitation any consultant, servant, agent or employee of the Employer) against any and all losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any loss, injury (including death) or damage to persons or property (other than property forming part of the Works and Free Issue Items not yet taken over) which may result from or occur in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract. Provided that the foregoing indemnity shall not apply with regard to any such matters incurred or made as a result of or in connection with: (i) losses, injuries or damage to persons or property which are in the opinion of the Project Manager the unavoidable result of the carrying out of the Works in accordance with the Contract or the remedying of defects therein but this exclusion shall only apply with regard to any such matter of which the Contractor has notified the Project Manager in writing not less than fourteen (14) days prior to the occurrence of the relevant loss, injury or damage; (ii) losses, injuries or damage to persons or property directly resulting from any act or neglect of the Employer, its agents, employees or other contractors not being employed by the Contractor; or (iii) losses, injuries or damage to persons or property contributed to by any such act or neglect as is referred to in paragraph (ii) above, to the extent of an equitable proportion thereof having regard to the degree of such contribution. Without in any way limiting its generality, the above indemnity shall apply to claims, actions and demands brought or made by employees or agents of the Contractor, of any of its Subcontractors or of the Employer. In the event of any claim or demand being made against or any action being taken against either party to the Contract which claim, demand or action is within the scope of the relevant indemnity contained in this <a href=\"#clause-12.6\" class=\"clause-link\" data-clause-id=\"12.6\">Clause 12.6</a>, the party liable to indemnify shall be promptly notified in writing by the other party and the party liable to indemnify shall at its own Cost conduct all negotiations for the settlement of the same and any litigation that may arise therefrom. The party to be indemnified shall not unless and until the other party shall have failed to take over the conduct of the negotiations or litigation make any admission which may be prejudicial thereto. The conduct (by the party liable to indemnify) of such negotiations or litigation shall be conditional upon that party having first given to the other party such reasonable security as shall from time to time be required by the other party to cover the amount ascertained or agreed or estimated, as the case may be, of any losses, liabilities and costs which the other party may incur or for which it may become liable. The other party shall, at the request of the party liable to indemnify, afford all available assistance for any such purpose and shall be repaid all reasonable Costs incurred in so doing. (b) The Contractor shall indemnify the Employer against any loss or damage (whether direct or indirect actual or consequential) resulting from the installation of software or firmware into equipment at the Site which has not been tested for and shown to be clear of viruses or like agents.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.6'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Employer (including without limitation any consultant, servant, agent or employee of the Employer) shall not be liable for and the Contractor shall indemnify it against any and all losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any loss, injury (including death) or damage to any workman or other person in the employment of the Contractor or any of its Subcontractors save and except any such matters which may arise from any act or neglect of the Employer, its consultants, servants, agents, employees or other contractors not being employed by the Contractor. The provisions of the last paragraph of Sub-Clause (a) of <a href=\"#clause-12.6\" class=\"clause-link\" data-clause-id=\"12.6\">Clause 12.6</a> (General Indemnity) shall also apply to the indemnity in this <a href=\"#clause-12.7\" class=\"clause-link\" data-clause-id=\"12.7\">Clause 12.7</a>.'::jsonb
        ),
        '{general_condition}',
        'The Employer (including without limitation any consultant, servant, agent or employee of the Employer) shall not be liable for and the Contractor shall indemnify it against any and all losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any loss, injury (including death) or damage to any workman or other person in the employment of the Contractor or any of its Subcontractors save and except any such matters which may arise from any act or neglect of the Employer, its consultants, servants, agents, employees or other contractors not being employed by the Contractor. The provisions of the last paragraph of Sub-Clause (a) of <a href=\"#clause-12.6\" class=\"clause-link\" data-clause-id=\"12.6\">Clause 12.6</a> (General Indemnity) shall also apply to the indemnity in this <a href=\"#clause-12.7\" class=\"clause-link\" data-clause-id=\"12.7\">Clause 12.7</a>.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.9
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Without in any way limiting or detracting from the Contractor''s liabilities under Clauses 12.5 (Risk and Care), 12.6 (General Indemnity), or 12.7 (Loss, Injury or Damage to Workmen) or under any other provision of the Contract the Contractor shall at its own Cost take out as from the commencement of the Works and maintain until the issue by the Project Manager of the last Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) the following insurances with insurers acceptable to the Employer and under one or more policies in such form and with only such exclusions and restrictions as the Employer may approve, namely: (a) Plant and Contractor''s Equipment - being coverage in respect of all risks of physical loss or damage which may occur: (i) to any Plant prior to its delivery to and during its unloading at the Site; and The said Plant and Contractor''s Equipment shall be covered wherever in the world the same may for the time being be situated and even if the same be in storage or in transit except that Plant shall cease to be so covered under this policy upon its delivery to and it having been unloaded at the Site. Such coverage shall have a limit of liability of not less than the current replacement value of all relevant Plant and Contractor''s Equipment, and shall include all labour charges, transportation charges, professional fees, debris removal and demolition Costs, and other Costs. In the case of physical loss or damage occurring to any Plant prior to its delivery to and during its unloading at the Site, the policy of insurance shall be an all risks marine insurance policy in accordance with the Institute Cargo Clauses \"A\". The insurance on Plant shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". The Contractor shall following the delivery to and unloading at the Site of any Plant, promptly inspect such Plant to determine whether any physical loss or damage has occurred thereto and shall immediately notify the Project Manager in writing with a copy to the Employer of any such loss or damage that has so occurred. Such notification shall be accompanied by full details of the said loss or damage. (b) Contractor''s All Risks - being coverage in respect of all risks (other than the excepted risks as defined in paragraph (b) of <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care)) of physical loss or damage which may occur: (i) to any Section or Portion of the Works or any relevant Plant or any relevant Free Issue Items while the Contractor shall be responsible for the care thereof as provided in the said <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> and, with regard to loss or damage arising from a cause occurring prior to the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for any Section or Portion of the Works, during the Defects Liability Period applicable to that Section or Portion of the Works; and (ii) to the Works, or any part thereof or any Plant or any Free Issue Items if such loss or damage is occasioned by the Contractor or by any Subcontractor in the course of any operations carried out by it or by such Subcontractor for the purpose of completing any outstanding work which it shall have undertaken to finish during the Defects Liability Period or complying with its obligations under Clauses 21.2 (Defects after Taking Over) or 21.7 (Contractor to Search) or complying with its obligations under any Extended Warranty. However the said Plant shall not be covered under these policies prior to its delivery to and during its unloading at the Site. Such coverage shall in the case of sub-paragraph (i) above have a limit of liability of not less than one hundred and fifteen per cent (115%) of the current replacement value of the Works and the Free Issue Items which the Contractor shall for the time being be responsible for the care of. Such coverage shall in the case of sub-paragraph (ii) above have a limit of liability of not less than one hundred and fifteen per cent (115%) of the current replacement value of the whole of the Works and the Free Issue Items. Each such limit of liability as aforesaid shall apply for any one occurrence or series of occurrences arising out of one event. Such coverage shall exclude the first part of any loss or damage not exceeding the amounts stated in the Particular Conditions. Such coverage shall in all cases include all labour charges, transportation charges, professional fees, debris removal and demolition Costs, and other Costs. The insurance shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". (c) Public Liability - being coverage in respect of legal liability for loss, injury (including death) or damage to persons or property (other than property forming part of the Works and the Free Issue Items not yet taken over), including in each case claimant''s and defence costs, resulting from or occurring in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract. Such liability shall without limitation include liability to consultants, servants, employees and agents of the Employer. Such coverage shall have a limit of liability of not less than the amount stated in the Particular Conditions for any one occurrence or series of occurrences arising out of one event and may, in respect only of the said loss or damage to property, exclude the first part of any loss or damage not exceeding the amount stated in the Particular Conditions for any one occurrence or such series thereof. The insurance shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". The insurance shall include a Cross Liability Clause. (d) Workmen''s Compensation - being coverage as required by the laws and regulations in the Country in respect of personal injuries (including death and including claimant''s and defence costs) to employees of the Contractor and its Subcontractors resulting from or occurring in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract including its Extended Warranty obligations. Such coverage shall be extended to include Employer''s Liability of not less than the statutory amount for each accident or (if no such statutory amount) not less than the amount stated in the Particular Conditions for each accident. The obligations of this paragraph (d) shall with respect to any employees of a Subcontractor be satisfied by a policy otherwise complying with this sub-paragraph but being in the name of the Subcontractor rather than of the Contractor, provided that the Employer is indemnified under the policy; but the Contractor shall be liable for procuring the compliance by the Subcontractor with the provisions of the three paragraphs immediately following paragraph (e) of this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a>. (e) Motor Vehicle Third Party and Passenger Liability Insurance being coverage in respect of death of or injury to persons and/or loss of or damage to property in respect of motor vehicles used by the Contractor in connection with the carrying out of the Works or the remedying of defects therein. The Contractor shall ensure that Subcontractors maintain such insurance in respect of motor vehicles used by them. Such insurance shall provide an unlimited indemnity for death of or injury to persons and the equivalent of not less than the amount stated in the Particular Conditions for loss of or damage to property which shall be extended as may be necessary to cover any additional cover required by statutory requirements in the Country. The Contractor shall procure that the policy, or each of the policies, of insurance referred to in this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> contains a waiver by the insurers of any and all rights of subrogation they might otherwise be able to exercise against the Employer or any of its consultants, servants, employees or agents. The Contractor shall procure that each of the policies of insurance referred to in paragraphs (d) and (e) of this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> contains a clause indemnifying the Employer or any of its consultants, servants, employees or agents as though they are the Insured. The Employer and the Project Manager shall each be entitled to a copy of the said policy or policies of insurance together with copies of either the premium receipts or certificates from the insurers confirming receipt of premiums as appropriate and from time to time upon demand to inspect the originals of the said policy or policies of insurance and to have produced to them satisfactory evidence that the same are in full force and effect. The said policy or policies shall provide that the Employer and the Project Manager are each entitled to not less than thirty (30) days'' notice from the insurers prior to cancellation, termination or alteration of cover. The Contractor shall not do or omit to do any act or thing whereby the said policy or policies may be or become void or voidable. If the Contractor shall fail to effect and keep in force any of the insurances referred to in this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a>, or any other insurance which the Contractor may be required to effect under the terms of the Contract, then and in any such case the Employer may (without prejudice to any other remedy) effect and keep in force such insurance and pay such premium or premiums as may be necessary for that purpose and from time to time deduct the amount so paid by the Employer from any monies due or which may become due to the Contractor, or recover the same as a debt due from the Contractor. The Contractor shall notify the insurers of any changes in the nature, extent or programme for the carrying out of the Works with a copy to the Employer and to the Project Manager and ensure the adequacy of the insurances at all times in accordance with the terms of the Contract. Notwithstanding the foregoing provisions it shall be a condition of each of the policies of insurance required to be taken out under the Contract that the insurer will not exercise its right to avoid the insurance cover on the grounds of any non-disclosure, mis-description or misrepresentation in any information relevant to the risks insured under such policy. If the Contractor considers that additional insurance is required either by way of wider cover or higher sums insured or higher limits of indemnity then this shall be taken out by the Contractor at its Cost. The Contractor shall indemnify the Employer against any amount which would otherwise be claimable by the Employer under any of the insurances required to be effected under this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> but which the Employer is unable to claim by virtue of the amount concerned falling within any deductible (Insured''s Retained Liability) applicable to the relevant insurance cover.'::jsonb
        ),
        '{general_condition}',
        'Without in any way limiting or detracting from the Contractor''s liabilities under Clauses 12.5 (Risk and Care), 12.6 (General Indemnity), or 12.7 (Loss, Injury or Damage to Workmen) or under any other provision of the Contract the Contractor shall at its own Cost take out as from the commencement of the Works and maintain until the issue by the Project Manager of the last Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) the following insurances with insurers acceptable to the Employer and under one or more policies in such form and with only such exclusions and restrictions as the Employer may approve, namely: (a) Plant and Contractor''s Equipment - being coverage in respect of all risks of physical loss or damage which may occur: (i) to any Plant prior to its delivery to and during its unloading at the Site; and The said Plant and Contractor''s Equipment shall be covered wherever in the world the same may for the time being be situated and even if the same be in storage or in transit except that Plant shall cease to be so covered under this policy upon its delivery to and it having been unloaded at the Site. Such coverage shall have a limit of liability of not less than the current replacement value of all relevant Plant and Contractor''s Equipment, and shall include all labour charges, transportation charges, professional fees, debris removal and demolition Costs, and other Costs. In the case of physical loss or damage occurring to any Plant prior to its delivery to and during its unloading at the Site, the policy of insurance shall be an all risks marine insurance policy in accordance with the Institute Cargo Clauses \"A\". The insurance on Plant shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". The Contractor shall following the delivery to and unloading at the Site of any Plant, promptly inspect such Plant to determine whether any physical loss or damage has occurred thereto and shall immediately notify the Project Manager in writing with a copy to the Employer of any such loss or damage that has so occurred. Such notification shall be accompanied by full details of the said loss or damage. (b) Contractor''s All Risks - being coverage in respect of all risks (other than the excepted risks as defined in paragraph (b) of <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care)) of physical loss or damage which may occur: (i) to any Section or Portion of the Works or any relevant Plant or any relevant Free Issue Items while the Contractor shall be responsible for the care thereof as provided in the said <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> and, with regard to loss or damage arising from a cause occurring prior to the issue of the Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for any Section or Portion of the Works, during the Defects Liability Period applicable to that Section or Portion of the Works; and (ii) to the Works, or any part thereof or any Plant or any Free Issue Items if such loss or damage is occasioned by the Contractor or by any Subcontractor in the course of any operations carried out by it or by such Subcontractor for the purpose of completing any outstanding work which it shall have undertaken to finish during the Defects Liability Period or complying with its obligations under Clauses 21.2 (Defects after Taking Over) or 21.7 (Contractor to Search) or complying with its obligations under any Extended Warranty. However the said Plant shall not be covered under these policies prior to its delivery to and during its unloading at the Site. Such coverage shall in the case of sub-paragraph (i) above have a limit of liability of not less than one hundred and fifteen per cent (115%) of the current replacement value of the Works and the Free Issue Items which the Contractor shall for the time being be responsible for the care of. Such coverage shall in the case of sub-paragraph (ii) above have a limit of liability of not less than one hundred and fifteen per cent (115%) of the current replacement value of the whole of the Works and the Free Issue Items. Each such limit of liability as aforesaid shall apply for any one occurrence or series of occurrences arising out of one event. Such coverage shall exclude the first part of any loss or damage not exceeding the amounts stated in the Particular Conditions. Such coverage shall in all cases include all labour charges, transportation charges, professional fees, debris removal and demolition Costs, and other Costs. The insurance shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". (c) Public Liability - being coverage in respect of legal liability for loss, injury (including death) or damage to persons or property (other than property forming part of the Works and the Free Issue Items not yet taken over), including in each case claimant''s and defence costs, resulting from or occurring in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract. Such liability shall without limitation include liability to consultants, servants, employees and agents of the Employer. Such coverage shall have a limit of liability of not less than the amount stated in the Particular Conditions for any one occurrence or series of occurrences arising out of one event and may, in respect only of the said loss or damage to property, exclude the first part of any loss or damage not exceeding the amount stated in the Particular Conditions for any one occurrence or such series thereof. The insurance shall be in the joint names of the Employer and the Contractor and with the Employer named as \"First Loss Payee\". The insurance shall include a Cross Liability Clause. (d) Workmen''s Compensation - being coverage as required by the laws and regulations in the Country in respect of personal injuries (including death and including claimant''s and defence costs) to employees of the Contractor and its Subcontractors resulting from or occurring in connection with the carrying out of the Works and/or the remedying of defects therein and/or the Contractor''s observance or performance of or failure to observe or perform its other obligations under the Contract including its Extended Warranty obligations. Such coverage shall be extended to include Employer''s Liability of not less than the statutory amount for each accident or (if no such statutory amount) not less than the amount stated in the Particular Conditions for each accident. The obligations of this paragraph (d) shall with respect to any employees of a Subcontractor be satisfied by a policy otherwise complying with this sub-paragraph but being in the name of the Subcontractor rather than of the Contractor, provided that the Employer is indemnified under the policy; but the Contractor shall be liable for procuring the compliance by the Subcontractor with the provisions of the three paragraphs immediately following paragraph (e) of this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a>. (e) Motor Vehicle Third Party and Passenger Liability Insurance being coverage in respect of death of or injury to persons and/or loss of or damage to property in respect of motor vehicles used by the Contractor in connection with the carrying out of the Works or the remedying of defects therein. The Contractor shall ensure that Subcontractors maintain such insurance in respect of motor vehicles used by them. Such insurance shall provide an unlimited indemnity for death of or injury to persons and the equivalent of not less than the amount stated in the Particular Conditions for loss of or damage to property which shall be extended as may be necessary to cover any additional cover required by statutory requirements in the Country. The Contractor shall procure that the policy, or each of the policies, of insurance referred to in this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> contains a waiver by the insurers of any and all rights of subrogation they might otherwise be able to exercise against the Employer or any of its consultants, servants, employees or agents. The Contractor shall procure that each of the policies of insurance referred to in paragraphs (d) and (e) of this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> contains a clause indemnifying the Employer or any of its consultants, servants, employees or agents as though they are the Insured. The Employer and the Project Manager shall each be entitled to a copy of the said policy or policies of insurance together with copies of either the premium receipts or certificates from the insurers confirming receipt of premiums as appropriate and from time to time upon demand to inspect the originals of the said policy or policies of insurance and to have produced to them satisfactory evidence that the same are in full force and effect. The said policy or policies shall provide that the Employer and the Project Manager are each entitled to not less than thirty (30) days'' notice from the insurers prior to cancellation, termination or alteration of cover. The Contractor shall not do or omit to do any act or thing whereby the said policy or policies may be or become void or voidable. If the Contractor shall fail to effect and keep in force any of the insurances referred to in this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a>, or any other insurance which the Contractor may be required to effect under the terms of the Contract, then and in any such case the Employer may (without prejudice to any other remedy) effect and keep in force such insurance and pay such premium or premiums as may be necessary for that purpose and from time to time deduct the amount so paid by the Employer from any monies due or which may become due to the Contractor, or recover the same as a debt due from the Contractor. The Contractor shall notify the insurers of any changes in the nature, extent or programme for the carrying out of the Works with a copy to the Employer and to the Project Manager and ensure the adequacy of the insurances at all times in accordance with the terms of the Contract. Notwithstanding the foregoing provisions it shall be a condition of each of the policies of insurance required to be taken out under the Contract that the insurer will not exercise its right to avoid the insurance cover on the grounds of any non-disclosure, mis-description or misrepresentation in any information relevant to the risks insured under such policy. If the Contractor considers that additional insurance is required either by way of wider cover or higher sums insured or higher limits of indemnity then this shall be taken out by the Contractor at its Cost. The Contractor shall indemnify the Employer against any amount which would otherwise be claimable by the Employer under any of the insurances required to be effected under this <a href=\"#clause-12.9\" class=\"clause-link\" data-clause-id=\"12.9\">Clause 12.9</a> but which the Employer is unable to claim by virtue of the amount concerned falling within any deductible (Insured''s Retained Liability) applicable to the relevant insurance cover.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.9'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 12.10
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall (unless the governing law of the Contract otherwise provides) in respect of the whole of the Works be liable for inherent defects and for its own design for a period of ten (10) years from the date of issue of the last Final Certificate issued in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates).'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall (unless the governing law of the Contract otherwise provides) in respect of the whole of the Works be liable for inherent defects and for its own design for a period of ten (10) years from the date of issue of the last Final Certificate issued in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '12.10'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 13.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall fully and effectively indemnify the Employer, the Project Manager and the Supervision Consultant at all times hereafter against any losses, liabilities, costs, claims, actions or demands which the Employer, the Project Manager or the Supervision Consultant may incur or which may be made against the Employer, the Project Manager or the Supervision Consultant as a result of or in connection with any failure by the Contractor to observe and perform strictly the provisions of <a href=\"#clause-9.6\" class=\"clause-link\" data-clause-id=\"9.6\">Clause 9.6</a> (Notices, Permits and Fees) and <a href=\"#clause-13.1\" class=\"clause-link\" data-clause-id=\"13.1\">Clause 13.1</a> (Covenant to Comply).'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall fully and effectively indemnify the Employer, the Project Manager and the Supervision Consultant at all times hereafter against any losses, liabilities, costs, claims, actions or demands which the Employer, the Project Manager or the Supervision Consultant may incur or which may be made against the Employer, the Project Manager or the Supervision Consultant as a result of or in connection with any failure by the Contractor to observe and perform strictly the provisions of <a href=\"#clause-9.6\" class=\"clause-link\" data-clause-id=\"9.6\">Clause 9.6</a> (Notices, Permits and Fees) and <a href=\"#clause-13.1\" class=\"clause-link\" data-clause-id=\"13.1\">Clause 13.1</a> (Covenant to Comply).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '13.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 14.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'In the event of any claim being made against or any proceedings being brought against the Employer, which claim or proceedings are within the scope of the indemnity contained in <a href=\"#clause-14.1\" class=\"clause-link\" data-clause-id=\"14.1\">Clause 14.1</a> (Indemnity), the Contractor shall be promptly notified in writing by the Employer and may at its own Cost conduct all negotiations for the settlement of the same and any litigation that may arise therefrom. The Employer shall not, unless and until the Contractor shall have failed to take over the conduct of the negotiations or litigation, within a reasonable time after having been so requested by the Employer, make any admission which might be prejudicial thereto. The conduct by the Contractor of such negotiations or litigation shall be conditional upon the Contractor having first given to the Employer such reasonable security as shall from time to time be required by the Employer to cover the amount ascertained or agreed or estimated, as the case may be, of any compensation, damages, losses, costs, expenses, royalties and fees which the Employer may incur or for which it may become liable. The Employer shall, at the request of the Contractor, afford all available assistance for the purpose of contesting any such claim or proceedings, and shall be repaid all reasonable Costs incurred in so doing.'::jsonb
        ),
        '{general_condition}',
        'In the event of any claim being made against or any proceedings being brought against the Employer, which claim or proceedings are within the scope of the indemnity contained in <a href=\"#clause-14.1\" class=\"clause-link\" data-clause-id=\"14.1\">Clause 14.1</a> (Indemnity), the Contractor shall be promptly notified in writing by the Employer and may at its own Cost conduct all negotiations for the settlement of the same and any litigation that may arise therefrom. The Employer shall not, unless and until the Contractor shall have failed to take over the conduct of the negotiations or litigation, within a reasonable time after having been so requested by the Employer, make any admission which might be prejudicial thereto. The conduct by the Contractor of such negotiations or litigation shall be conditional upon the Contractor having first given to the Employer such reasonable security as shall from time to time be required by the Employer to cover the amount ascertained or agreed or estimated, as the case may be, of any compensation, damages, losses, costs, expenses, royalties and fees which the Employer may incur or for which it may become liable. The Employer shall, at the request of the Contractor, afford all available assistance for the purpose of contesting any such claim or proceedings, and shall be repaid all reasonable Costs incurred in so doing.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '14.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 15.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Any written consent which the Employer may give for the purpose of <a href=\"#clause-15.1\" class=\"clause-link\" data-clause-id=\"15.1\">Clause 15.1</a> (General Covenant) shall be confined to the particular use or disclosure and the particular occasion which it specifies.'::jsonb
        ),
        '{general_condition}',
        'Any written consent which the Employer may give for the purpose of <a href=\"#clause-15.1\" class=\"clause-link\" data-clause-id=\"15.1\">Clause 15.1</a> (General Covenant) shall be confined to the particular use or disclosure and the particular occasion which it specifies.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '15.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 16.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'All operations for or in connection with the Works shall, so far as compliance with the requirements of the Contract permits, be carried on so as not to interfere with the convenience of the public, or the access to or use or occupation of public or private roads or footpaths or to or of properties whether in the possession of the Employer or of any other person. The Contractor shall fully and effectually indemnify the Employer against any losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any failure by the Contractor to honour the terms of the preceding sentence of this <a href=\"#clause-16.1\" class=\"clause-link\" data-clause-id=\"16.1\">Clause 16.1</a>.'::jsonb
        ),
        '{general_condition}',
        'All operations for or in connection with the Works shall, so far as compliance with the requirements of the Contract permits, be carried on so as not to interfere with the convenience of the public, or the access to or use or occupation of public or private roads or footpaths or to or of properties whether in the possession of the Employer or of any other person. The Contractor shall fully and effectually indemnify the Employer against any losses, liabilities, costs, claims, actions or demands which it may incur or which may be made against it as a result of or in connection with any failure by the Contractor to honour the terms of the preceding sentence of this <a href=\"#clause-16.1\" class=\"clause-link\" data-clause-id=\"16.1\">Clause 16.1</a>.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '16.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 16.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Where the Contractor uses waterborne transport for any Plant or Contractor''s Equipment the provisions of <a href=\"#clause-16.2\" class=\"clause-link\" data-clause-id=\"16.2\">Clause 16.2</a> (Damage to Roads or Bridges) shall be construed as though \"road\" included a lock, dock sea wall or other structure related to a waterway and \"vehicle\" included craft, and shall have effect accordingly.'::jsonb
        ),
        '{general_condition}',
        'Where the Contractor uses waterborne transport for any Plant or Contractor''s Equipment the provisions of <a href=\"#clause-16.2\" class=\"clause-link\" data-clause-id=\"16.2\">Clause 16.2</a> (Damage to Roads or Bridges) shall be construed as though \"road\" included a lock, dock sea wall or other structure related to a waterway and \"vehicle\" included craft, and shall have effect accordingly.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '16.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 17.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The submission to the Project Manager and approval by the Supervision Consultant of the general description referred to in <a href=\"#clause-17.2\" class=\"clause-link\" data-clause-id=\"17.2\">Clause 17.2</a> (General Descriptions) and the submission to and approval by the Project Manager of the programmes referred to in Clauses 17.3 (Programme) and 17.4 (Revision of Programme) shall not relieve the Contractor of any of its duties or responsibilities under the Contract.'::jsonb
        ),
        '{general_condition}',
        'The submission to the Project Manager and approval by the Supervision Consultant of the general description referred to in <a href=\"#clause-17.2\" class=\"clause-link\" data-clause-id=\"17.2\">Clause 17.2</a> (General Descriptions) and the submission to and approval by the Project Manager of the programmes referred to in Clauses 17.3 (Programme) and 17.4 (Revision of Programme) shall not relieve the Contractor of any of its duties or responsibilities under the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '17.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 17.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If for any reason which does not entitle the Contractor to an extension of time in accordance with <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time), the rate of progress of the Works or any Section or Portion thereof is at any time, in the opinion of the Project Manager, too slow to ensure completion within the applicable Time for Completion the Project Manager shall so notify the Contractor in writing and the Contractor shall thereupon take such steps as are necessary, subject to the approval of the Project Manager, to expedite progress so as to complete the Works or such Section or Portion thereof within the applicable Time for Completion. The Contractor shall not be entitled to any additional payment for taking such steps. Provided that if any steps taken by the Contractor in meeting its obligations under this Clause involves the Employer in additional Costs, such Costs after due consultation with the Employer and the Contractor shall be determined by the Project Manager and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same from the Contractor as a debt due from the Contractor. The Project Manager shall notify the Contractor accordingly with a copy to the Employer.'::jsonb
        ),
        '{general_condition}',
        'If for any reason which does not entitle the Contractor to an extension of time in accordance with <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time), the rate of progress of the Works or any Section or Portion thereof is at any time, in the opinion of the Project Manager, too slow to ensure completion within the applicable Time for Completion the Project Manager shall so notify the Contractor in writing and the Contractor shall thereupon take such steps as are necessary, subject to the approval of the Project Manager, to expedite progress so as to complete the Works or such Section or Portion thereof within the applicable Time for Completion. The Contractor shall not be entitled to any additional payment for taking such steps. Provided that if any steps taken by the Contractor in meeting its obligations under this Clause involves the Employer in additional Costs, such Costs after due consultation with the Employer and the Contractor shall be determined by the Project Manager and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same from the Contractor as a debt due from the Contractor. The Project Manager shall notify the Contractor accordingly with a copy to the Employer.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '17.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 18.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall, on the written order of the Project Manager stating the date of suspension and bearing the written consent of the Employer (herein referred to as a \"Suspension Order\"), suspend the progress of the Works or any part thereof for such time or times and in such manner as the Project Manager may consider necessary and shall during such suspension properly protect, store and secure the Works or such part thereof against damage to the satisfaction of the Project Manager. The extra Cost incurred by the Contractor in giving effect to the Project Manager''s instructions under this Clause shall be borne and paid by the Employer unless such suspension is: (b) necessary by reason of some default of or breach of contract by the Contractor, or (c) necessary by reason of an occurrence of the forces of nature which an experienced contractor should have foreseen and provided for or insured against (for the purposes of this Sub-Clause (c) rainfall in any quantity shall be deemed to be such an occurrence), or (d) necessary for the proper carrying out of the Works or for the safety of the Works or any part thereof insofar as such necessity does not arise from any act or default by the Project Manager, the Supervision Consultant or the Employer or from any of the excepted risks (as defined in <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care)). Provided that the Contractor shall not be entitled to claim recovery of any such extra Cost unless, within twenty eight (28) days after receipt of the Suspension Order, it gives to the Project Manager written notice of its intention to make such claim. If such notice is duly given the extra Cost recoverable by the Contractor shall be determined by the Project Manager and paid to the Contractor in accordance with Clause 26 (Interim and Final Certificates).'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall, on the written order of the Project Manager stating the date of suspension and bearing the written consent of the Employer (herein referred to as a \"Suspension Order\"), suspend the progress of the Works or any part thereof for such time or times and in such manner as the Project Manager may consider necessary and shall during such suspension properly protect, store and secure the Works or such part thereof against damage to the satisfaction of the Project Manager. The extra Cost incurred by the Contractor in giving effect to the Project Manager''s instructions under this Clause shall be borne and paid by the Employer unless such suspension is: (b) necessary by reason of some default of or breach of contract by the Contractor, or (c) necessary by reason of an occurrence of the forces of nature which an experienced contractor should have foreseen and provided for or insured against (for the purposes of this Sub-Clause (c) rainfall in any quantity shall be deemed to be such an occurrence), or (d) necessary for the proper carrying out of the Works or for the safety of the Works or any part thereof insofar as such necessity does not arise from any act or default by the Project Manager, the Supervision Consultant or the Employer or from any of the excepted risks (as defined in <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care)). Provided that the Contractor shall not be entitled to claim recovery of any such extra Cost unless, within twenty eight (28) days after receipt of the Suspension Order, it gives to the Project Manager written notice of its intention to make such claim. If such notice is duly given the extra Cost recoverable by the Contractor shall be determined by the Project Manager and paid to the Contractor in accordance with Clause 26 (Interim and Final Certificates).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '18.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 18.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Works or any part thereof is the subject of a Suspension Order and if written permission (bearing the written consent of the Employer) to resume work is not given by the Project Manager within a period of ninety (90) days from the date of suspension then, unless such suspension is within any of paragraphs (a) to (d) inclusive of <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order), the Contractor may serve a written notice on the Project Manager requiring permission within twenty eight (28) days from the receipt thereof to proceed with the Works or that part thereof the subject of the Suspension Order and, if such permission is not within that time granted by the Project Manager in writing and bearing the written consent of the Employer, the Contractor by a further written notice so served may, but is not bound to, elect to treat the suspension where it affects part only of the Works as an omission of such part pursuant to a Variation Order under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders), or, where it affects the whole of the Works, as a termination of the Contract by the Employer for its convenience under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Termination for Convenience) thereby giving the Contractor the rights conferred by <a href=\"#clause-31.3\" class=\"clause-link\" data-clause-id=\"31.3\">Clause 31.3</a> (Payment on Termination).'::jsonb
        ),
        '{general_condition}',
        'If the Works or any part thereof is the subject of a Suspension Order and if written permission (bearing the written consent of the Employer) to resume work is not given by the Project Manager within a period of ninety (90) days from the date of suspension then, unless such suspension is within any of paragraphs (a) to (d) inclusive of <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order), the Contractor may serve a written notice on the Project Manager requiring permission within twenty eight (28) days from the receipt thereof to proceed with the Works or that part thereof the subject of the Suspension Order and, if such permission is not within that time granted by the Project Manager in writing and bearing the written consent of the Employer, the Contractor by a further written notice so served may, but is not bound to, elect to treat the suspension where it affects part only of the Works as an omission of such part pursuant to a Variation Order under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders), or, where it affects the whole of the Works, as a termination of the Contract by the Employer for its convenience under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Termination for Convenience) thereby giving the Contractor the rights conferred by <a href=\"#clause-31.3\" class=\"clause-link\" data-clause-id=\"31.3\">Clause 31.3</a> (Payment on Termination).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '18.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 19.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor acknowledges that time is of the essence. The Contractor shall complete the whole of the Works and each Section and Portion of the Works within the applicable Time for Completion in accordance with the provisions of <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking Over Certificate). Provided that in the circumstances set out in <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time) the Employer shall extend any such Time for Completion in accordance with the provisions of that Clause.'::jsonb
        ),
        '{general_condition}',
        'The Contractor acknowledges that time is of the essence. The Contractor shall complete the whole of the Works and each Section and Portion of the Works within the applicable Time for Completion in accordance with the provisions of <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking Over Certificate). Provided that in the circumstances set out in <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time) the Employer shall extend any such Time for Completion in accordance with the provisions of that Clause.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '19.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 19.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'After due consultation with the Project Manager, the Supervision Consultant and the Contractor the Employer shall grant and notify to the Contractor, the Project Manager and the Supervision Consultant such extension, if any, of the Time for Completion of the whole of the Works or of any Section or Portion of the Works as may in his opinion be reasonable in respect of such part of any delay in completing the whole of the Works or any such Section or Portion of the Works as is caused solely by any of the following events or circumstances, namely: (a) any variation of the Works made pursuant to a Variation Order issued under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders) but in evaluating the reasonableness of the period of any extension required as a result of any such variation account shall be taken of any other variation which has caused a decrease in the Works or has otherwise reduced the time the Contractor should reasonably need for completion thereof; or (b) any Suspension Order under <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order) except in relation to a suspension within any of paragraphs (a) to (d) inclusive of <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a>; or (c) any of the excepted risks as defined in <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care); or (d) any other event or circumstance (not otherwise provided for in the Contract) for which the Employer, the Project Manager, the Supervision Consultant or some other contractor employed by the Employer is responsible, for which the Contractor is not directly or indirectly responsible, and which should not have been foreseen and prevented by the Contractor and which is beyond the reasonable control of the Contractor. (1) the Contractor shall not under any circumstances be entitled to any such extension of the Time for Completion of the whole of the Works or of any Section or Portion of the Works and the Employer shall be discharged from any and all liability in connection therewith unless as soon as possible and in any event within twenty eight (28) days after receipt of a Variation Order or a Suspension Order or of the occurrence of a relevant excepted risk or of any other event or circumstance beyond the reasonable control of the Contractor (as the case may be) it gives written notice to the Project Manager (with a copy to the Employer) with full and detailed particulars of any extension of time to which it may consider itself entitled together with any other notice required by the Contract and relevant to such event or circumstance; and (2) it shall be the duty of the Contractor at all times to use all reasonable endeavours to prevent any delay being caused by any of the events or circumstances mentioned in paragraphs (a) to (d) inclusive of this Clause, to minimise any such delay as may be caused thereby, and to do all that may be reasonably required, to the satisfaction of the Project Manager and the Supervision Consultant, to proceed with the Works.'::jsonb
        ),
        '{general_condition}',
        'After due consultation with the Project Manager, the Supervision Consultant and the Contractor the Employer shall grant and notify to the Contractor, the Project Manager and the Supervision Consultant such extension, if any, of the Time for Completion of the whole of the Works or of any Section or Portion of the Works as may in his opinion be reasonable in respect of such part of any delay in completing the whole of the Works or any such Section or Portion of the Works as is caused solely by any of the following events or circumstances, namely: (a) any variation of the Works made pursuant to a Variation Order issued under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders) but in evaluating the reasonableness of the period of any extension required as a result of any such variation account shall be taken of any other variation which has caused a decrease in the Works or has otherwise reduced the time the Contractor should reasonably need for completion thereof; or (b) any Suspension Order under <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order) except in relation to a suspension within any of paragraphs (a) to (d) inclusive of <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a>; or (c) any of the excepted risks as defined in <a href=\"#clause-12.5\" class=\"clause-link\" data-clause-id=\"12.5\">Clause 12.5</a> (Risk and Care); or (d) any other event or circumstance (not otherwise provided for in the Contract) for which the Employer, the Project Manager, the Supervision Consultant or some other contractor employed by the Employer is responsible, for which the Contractor is not directly or indirectly responsible, and which should not have been foreseen and prevented by the Contractor and which is beyond the reasonable control of the Contractor. (1) the Contractor shall not under any circumstances be entitled to any such extension of the Time for Completion of the whole of the Works or of any Section or Portion of the Works and the Employer shall be discharged from any and all liability in connection therewith unless as soon as possible and in any event within twenty eight (28) days after receipt of a Variation Order or a Suspension Order or of the occurrence of a relevant excepted risk or of any other event or circumstance beyond the reasonable control of the Contractor (as the case may be) it gives written notice to the Project Manager (with a copy to the Employer) with full and detailed particulars of any extension of time to which it may consider itself entitled together with any other notice required by the Contract and relevant to such event or circumstance; and (2) it shall be the duty of the Contractor at all times to use all reasonable endeavours to prevent any delay being caused by any of the events or circumstances mentioned in paragraphs (a) to (d) inclusive of this Clause, to minimise any such delay as may be caused thereby, and to do all that may be reasonably required, to the satisfaction of the Project Manager and the Supervision Consultant, to proceed with the Works.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '19.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 19.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) (i) Without prejudice to any other rights or remedies available to the Employer in respect of such failure and subject to Sub-Clause (a)(iii) below if the Contractor shall fail to complete any Section or Portion of the Works within its Time for Completion, the Contractor shall pay to the Employer for each day or part of a day of the delay as liquidated damages: (1) in respect of a delay in the completion of any Section of the Works, the applicable amount stated in the Particular Conditions; and (2) in respect of a delay in the completion of any Portion of the Works, the amount calculated by multiplying the amount of liquidated damages per day stated in the Particular Conditions for that Section of the Works of which the said Portion was previously a part by the percentage that the finally determined Contract value of the said Portion is of the finally determined Contract value of the said Section. For this purpose a Section or Portion of the Works shall be deemed to have been completed on the date of its taking over as stated in its Taking-Over Certificate. (ii) Payments shall be made at the end of each week or part of a week of such delay. In the case of such payments to be made in respect of Portions of the Works, the aforesaid Contract values shall be as then determined by the Project Manager and the balance due, if any, shall be paid forthwith upon final determination of such Contract values by the Project Manager. (iii) Subject to the Employer''s right to claim any further costs or damages under the Contract the aggregate amount of all such payments as are made under Sub-Clause (a)(i) above shall not exceed the amount stated in the Particular Conditions. (b) Any such payments as are referred to in Sub-Clause (a)(i) of this <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> shall constitute genuine attempts by the parties to pre-estimate the damage or loss which would be suffered by the Employer, but shall be made irrespective of and without need to prove any damage or loss which may actually be so suffered. (c) The Employer may at any time without prior notice to the Contractor recover any unpaid amount of any such payment due from the Contractor under Sub-Clause (a)(i) above by deduction from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor. (d) No such payments as are referred to in Sub-Clause (a)(i) above and no such deduction or recovery as is referred to in Sub-Clause (c) above shall release the Contractor from its obligations to complete the whole of the Works (including, without limitation, the relevant Section or Portion of the Works) or from any of its other obligations or liabilities under the Contract.'::jsonb
        ),
        '{general_condition}',
        '(a) (i) Without prejudice to any other rights or remedies available to the Employer in respect of such failure and subject to Sub-Clause (a)(iii) below if the Contractor shall fail to complete any Section or Portion of the Works within its Time for Completion, the Contractor shall pay to the Employer for each day or part of a day of the delay as liquidated damages: (1) in respect of a delay in the completion of any Section of the Works, the applicable amount stated in the Particular Conditions; and (2) in respect of a delay in the completion of any Portion of the Works, the amount calculated by multiplying the amount of liquidated damages per day stated in the Particular Conditions for that Section of the Works of which the said Portion was previously a part by the percentage that the finally determined Contract value of the said Portion is of the finally determined Contract value of the said Section. For this purpose a Section or Portion of the Works shall be deemed to have been completed on the date of its taking over as stated in its Taking-Over Certificate. (ii) Payments shall be made at the end of each week or part of a week of such delay. In the case of such payments to be made in respect of Portions of the Works, the aforesaid Contract values shall be as then determined by the Project Manager and the balance due, if any, shall be paid forthwith upon final determination of such Contract values by the Project Manager. (iii) Subject to the Employer''s right to claim any further costs or damages under the Contract the aggregate amount of all such payments as are made under Sub-Clause (a)(i) above shall not exceed the amount stated in the Particular Conditions. (b) Any such payments as are referred to in Sub-Clause (a)(i) of this <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> shall constitute genuine attempts by the parties to pre-estimate the damage or loss which would be suffered by the Employer, but shall be made irrespective of and without need to prove any damage or loss which may actually be so suffered. (c) The Employer may at any time without prior notice to the Contractor recover any unpaid amount of any such payment due from the Contractor under Sub-Clause (a)(i) above by deduction from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor. (d) No such payments as are referred to in Sub-Clause (a)(i) above and no such deduction or recovery as is referred to in Sub-Clause (c) above shall release the Contractor from its obligations to complete the whole of the Works (including, without limitation, the relevant Section or Portion of the Works) or from any of its other obligations or liabilities under the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '19.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 20.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'When: (a) any Section or Portion of the Works has been completed in accordance with the Contract, except for any minor outstanding work and defects which will not affect the use of that Section or Portion of the Works for its intended purpose (either until or whilst such work is completed and such defects are remedied); and (b) all Tests on Completion in respect of that Section or Portion of the Works have been duly passed to the satisfaction of the Supervision Consultant; and (c) paragraph (a) of <a href=\"#clause-5.7\" class=\"clause-link\" data-clause-id=\"5.7\">Clause 5.7</a> (As-built Drawings, Operations and Maintenance Manuals) has been fully complied with in respect of that Section or Portion of the Works; and (d) all the other conditions precedent to the issue of a Taking-Over Certificate in respect of that Section or Portion of the Works as required by the Contract have been satisfied; the Contractor shall give notice in writing to the Project Manager, (with a copy to the Supervision Consultant and to the Employer), that the aforesaid Section or Portion of the Works is ready for taking over, such notice being accompanied by a written undertaking to complete any minor outstanding work and remedy any minor outstanding defects as mentioned above as soon as practicable during the Defects Liability Period. The Supervision Consultant shall, within twenty eight (28) days after the date of delivery of such notice and undertaking, either issue to the Contractor, with a copy to the Employer and the Project Manager, a certificate (herein called a \"Taking-Over Certificate\") stating the date on which, in his opinion, paragraphs (a) to (d) inclusive of this Clause have been complied with in respect of that Section or Portion of the Works which date shall become the date of its taking over, or give written notice to the Contractor specifying in his opinion all the work which requires to be done and/or defects which require to be remedied and/or Tests on Completion which require to be duly passed and/or items within paragraph (c) which remain to be fully complied with and/or other conditions precedent which remain to be satisfied before the issue of such Taking-Over Certificate. Once all such work has been done and/or defects remedied and/or Tests on Completion duly passed and/or items fully complied with and/or other conditions precedent satisfied, the Contractor shall repeat delivery of the aforesaid notice and undertaking. It shall be a condition precedent to the issue of a Taking-Over Certificate for any Section or Portion of the Works that the Employer as the end-user, is satisfied that the said Section or Portion of the Works is ready to be taken into use by the Employer and has notified the Supervision Consultant (with a copy to the Project Manager) in writing accordingly. No Taking-Over Certificate in respect of a Section or Portion of the Works (other than the last Taking-Over Certificate) shall unless it specifically states to the contrary be deemed to certify completion of any ground or other surfaces requiring treatment or reinstatement.'::jsonb
        ),
        '{general_condition}',
        'When: (a) any Section or Portion of the Works has been completed in accordance with the Contract, except for any minor outstanding work and defects which will not affect the use of that Section or Portion of the Works for its intended purpose (either until or whilst such work is completed and such defects are remedied); and (b) all Tests on Completion in respect of that Section or Portion of the Works have been duly passed to the satisfaction of the Supervision Consultant; and (c) paragraph (a) of <a href=\"#clause-5.7\" class=\"clause-link\" data-clause-id=\"5.7\">Clause 5.7</a> (As-built Drawings, Operations and Maintenance Manuals) has been fully complied with in respect of that Section or Portion of the Works; and (d) all the other conditions precedent to the issue of a Taking-Over Certificate in respect of that Section or Portion of the Works as required by the Contract have been satisfied; the Contractor shall give notice in writing to the Project Manager, (with a copy to the Supervision Consultant and to the Employer), that the aforesaid Section or Portion of the Works is ready for taking over, such notice being accompanied by a written undertaking to complete any minor outstanding work and remedy any minor outstanding defects as mentioned above as soon as practicable during the Defects Liability Period. The Supervision Consultant shall, within twenty eight (28) days after the date of delivery of such notice and undertaking, either issue to the Contractor, with a copy to the Employer and the Project Manager, a certificate (herein called a \"Taking-Over Certificate\") stating the date on which, in his opinion, paragraphs (a) to (d) inclusive of this Clause have been complied with in respect of that Section or Portion of the Works which date shall become the date of its taking over, or give written notice to the Contractor specifying in his opinion all the work which requires to be done and/or defects which require to be remedied and/or Tests on Completion which require to be duly passed and/or items within paragraph (c) which remain to be fully complied with and/or other conditions precedent which remain to be satisfied before the issue of such Taking-Over Certificate. Once all such work has been done and/or defects remedied and/or Tests on Completion duly passed and/or items fully complied with and/or other conditions precedent satisfied, the Contractor shall repeat delivery of the aforesaid notice and undertaking. It shall be a condition precedent to the issue of a Taking-Over Certificate for any Section or Portion of the Works that the Employer as the end-user, is satisfied that the said Section or Portion of the Works is ready to be taken into use by the Employer and has notified the Supervision Consultant (with a copy to the Project Manager) in writing accordingly. No Taking-Over Certificate in respect of a Section or Portion of the Works (other than the last Taking-Over Certificate) shall unless it specifically states to the contrary be deemed to certify completion of any ground or other surfaces requiring treatment or reinstatement.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '20.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 20.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Within the period after the date of issue of a Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for a Section or Portion of the Works stated in the Particular Conditions the Contractor shall prepare and submit to the Project Manager in triplicate a draft final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) in respect of the said Section or Portion of the Works which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion are payable under the Contract in respect of the said Section or Portion of the Works.'::jsonb
        ),
        '{general_condition}',
        'Within the period after the date of issue of a Taking-Over Certificate under <a href=\"#clause-20.1\" class=\"clause-link\" data-clause-id=\"20.1\">Clause 20.1</a> (Taking-Over Certificate) for a Section or Portion of the Works stated in the Particular Conditions the Contractor shall prepare and submit to the Project Manager in triplicate a draft final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) in respect of the said Section or Portion of the Works which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion are payable under the Contract in respect of the said Section or Portion of the Works.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '20.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall as soon as practicable commence and thereafter carry out with due expedition and without delay all such work as may be necessary to remedy to the satisfaction of the Supervision Consultant any defect of any kind whatsoever in any Section or Portion of the Works of which the Contractor may be notified in writing by the Supervision Consultant, such notification being received either during the Defects Liability Period for that Section or Portion of the Works or within fourteen (14) days after its expiration but (in the latter case) the relevant defect having been found by the Supervision Consultant upon an inspection made by him or on his behalf prior to the expiration of the Defects Liability Period. For this purpose: (a) the word \"defect\" shall be construed to cover any manner in which the relevant Section or Portion of the Works is not in accordance with the Contract to the satisfaction of the Supervision Consultant; and (b) the expression \"Defects Liability Period\" shall mean a period of one (1) year calculated for each Section and Portion of the Works from the date of its taking over as stated in the relevant Taking-Over Certificate but: (i) in respect of any part of the relevant Section or Portion of the Works replaced, repaired or modified pursuant to a notice from the Supervision Consultant under this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>, the Defects Liability Period shall be extended so as to run for a period of one (1) year calculated from the date of completion of such replacement, repair or modification to the satisfaction of the Supervision Consultant; and (ii) in respect of any part of the Works which has been taken over (whether in the same or any different Section or Portion of the Works as the defect of which notice has been given by the Supervision Consultant under this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>) but which cannot at some time during its Defects Liability Period be used for the purposes for which it is intended by reason of the defect so notified or of work to remedy that defect, its Defects Liability Period shall be extended by a period equal to the time during which the said part of the Works could not be used as aforesaid. The Project Manager shall notify the Contractor in writing with a copy to the Employer and the Supervision Consultant of any extensions to the Defects Liability Period arising pursuant to this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall as soon as practicable commence and thereafter carry out with due expedition and without delay all such work as may be necessary to remedy to the satisfaction of the Supervision Consultant any defect of any kind whatsoever in any Section or Portion of the Works of which the Contractor may be notified in writing by the Supervision Consultant, such notification being received either during the Defects Liability Period for that Section or Portion of the Works or within fourteen (14) days after its expiration but (in the latter case) the relevant defect having been found by the Supervision Consultant upon an inspection made by him or on his behalf prior to the expiration of the Defects Liability Period. For this purpose: (a) the word \"defect\" shall be construed to cover any manner in which the relevant Section or Portion of the Works is not in accordance with the Contract to the satisfaction of the Supervision Consultant; and (b) the expression \"Defects Liability Period\" shall mean a period of one (1) year calculated for each Section and Portion of the Works from the date of its taking over as stated in the relevant Taking-Over Certificate but: (i) in respect of any part of the relevant Section or Portion of the Works replaced, repaired or modified pursuant to a notice from the Supervision Consultant under this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>, the Defects Liability Period shall be extended so as to run for a period of one (1) year calculated from the date of completion of such replacement, repair or modification to the satisfaction of the Supervision Consultant; and (ii) in respect of any part of the Works which has been taken over (whether in the same or any different Section or Portion of the Works as the defect of which notice has been given by the Supervision Consultant under this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>) but which cannot at some time during its Defects Liability Period be used for the purposes for which it is intended by reason of the defect so notified or of work to remedy that defect, its Defects Liability Period shall be extended by a period equal to the time during which the said part of the Works could not be used as aforesaid. The Project Manager shall notify the Contractor in writing with a copy to the Employer and the Supervision Consultant of any extensions to the Defects Liability Period arising pursuant to this <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a>.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Cost of all work to remedy any defect shall be borne by the Contractor if, in the opinion of the Supervision Consultant, the defect concerned was due to the use of Plant or workmanship not in accordance with the Contract, to any other neglect or failure by the Contractor to comply strictly with any obligation, expressed or implied, on the Contractor''s part under the Contract or to the use of any design supplied or specified by the Contractor. If, in the opinion of the Supervision Consultant, the defect concerned was due to any other cause the work concerned shall be valued as if it were an addition to the Works under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders) and accordingly the Contractor shall be paid such value in accordance with Clause 26 (Interim and Final Certificates). Provided that if any steps taken by the Contractor in meeting its obligations to remedy any defect during the Defects Liability Period or thereafter (where the Cost of all work to remedy such defect is to be borne by the Contractor pursuant to this <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a>) involves the Employer in additional Costs, such Costs after due consultation with the Employer and the Contractor shall be determined by the Project Manager and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same from the Contractor as a debt due from the Contractor.'::jsonb
        ),
        '{general_condition}',
        'The Cost of all work to remedy any defect shall be borne by the Contractor if, in the opinion of the Supervision Consultant, the defect concerned was due to the use of Plant or workmanship not in accordance with the Contract, to any other neglect or failure by the Contractor to comply strictly with any obligation, expressed or implied, on the Contractor''s part under the Contract or to the use of any design supplied or specified by the Contractor. If, in the opinion of the Supervision Consultant, the defect concerned was due to any other cause the work concerned shall be valued as if it were an addition to the Works under <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders) and accordingly the Contractor shall be paid such value in accordance with Clause 26 (Interim and Final Certificates). Provided that if any steps taken by the Contractor in meeting its obligations to remedy any defect during the Defects Liability Period or thereafter (where the Cost of all work to remedy such defect is to be borne by the Contractor pursuant to this <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a>) involves the Employer in additional Costs, such Costs after due consultation with the Employer and the Contractor shall be determined by the Project Manager and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same from the Contractor as a debt due from the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the work carried out by the Contractor pursuant to any notice from the Supervision Consultant under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) is such that, in the opinion of the Supervision Consultant, any of the Tests on Completion should be repeated, the Supervision Consultant may, either in his notice to remedy the relevant defect or by subsequent written notice at any time not later than one month after the completion by the Contractor of the aforesaid work to the satisfaction of the Supervision Consultant, require the Contractor so to repeat the same and in such event Clause 19A (Tests on Completion) shall (with only such changes therein as may be necessary for the purpose) apply thereto.'::jsonb
        ),
        '{general_condition}',
        'If the work carried out by the Contractor pursuant to any notice from the Supervision Consultant under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) is such that, in the opinion of the Supervision Consultant, any of the Tests on Completion should be repeated, the Supervision Consultant may, either in his notice to remedy the relevant defect or by subsequent written notice at any time not later than one month after the completion by the Contractor of the aforesaid work to the satisfaction of the Supervision Consultant, require the Contractor so to repeat the same and in such event Clause 19A (Tests on Completion) shall (with only such changes therein as may be necessary for the purpose) apply thereto.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Save as may in the opinion of the Supervision Consultant be necessary for the purpose of remedying any defect of which the Supervision Consultant may have given notice under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) or making any search required by the Supervision Consultant under <a href=\"#clause-21.7\" class=\"clause-link\" data-clause-id=\"21.7\">Clause 21.7</a> (Contractor to Search) or finishing any work related to any respects in which the relevant Section or Portion of the Works was not completed at the time of issue of the Taking-Over Certificate in respect thereof, the Contractor shall not, and shall procure that its employees, representatives, agents, Subcontractors and visitors do not, enter any Section or Portion of the Works after issue of the Taking-Over Certificate relating thereto. Provided that access by the Contractor to any Section or Portion of the Works for the aforesaid purposes shall not be allowed when such access is inconsistent with the Employer''s reasonable security restrictions.'::jsonb
        ),
        '{general_condition}',
        'Save as may in the opinion of the Supervision Consultant be necessary for the purpose of remedying any defect of which the Supervision Consultant may have given notice under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) or making any search required by the Supervision Consultant under <a href=\"#clause-21.7\" class=\"clause-link\" data-clause-id=\"21.7\">Clause 21.7</a> (Contractor to Search) or finishing any work related to any respects in which the relevant Section or Portion of the Works was not completed at the time of issue of the Taking-Over Certificate in respect thereof, the Contractor shall not, and shall procure that its employees, representatives, agents, Subcontractors and visitors do not, enter any Section or Portion of the Works after issue of the Taking-Over Certificate relating thereto. Provided that access by the Contractor to any Section or Portion of the Works for the aforesaid purposes shall not be allowed when such access is inconsistent with the Employer''s reasonable security restrictions.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.6
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If after the Supervision Consultant has given the Contractor any notice under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) the Contractor does not in the opinion of the Supervision Consultant commence as soon as practicable or thereafter carry out with due expedition and without delay all such work as may be necessary to remedy to the satisfaction of the Supervision Consultant the defect concerned, then (without prejudice to any other rights the Employer may have by virtue of the said failure of the Contractor): (a) The Employer may itself or may employ and pay any other person, firm or company to carry out and complete that work at the Contractor''s risk. If any of that work is work the Cost of which, in accordance with <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a> (Cost of Remedying Defects), the Contractor would in the opinion of the Supervision Consultant have been bound to bear, then all Costs which the Employer may incur as a result of or in connection with itself carrying out and completing such work or employing and paying that other person, firm or company so to do shall be borne by the Contractor. In such event the Project Manager shall determine such Costs and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor; or (b) If the defect is such that the Employer has been deprived of substantially the whole of the benefit of the Works or a part thereof, it may terminate the Contract in respect of such parts of the Works as cannot be put to the intended use. The Employer shall be entitled to recover all sums paid in respect of such parts of the Works plus financing costs and the Cost of dismantling the same, clearing the Site and returning Plant to the Contractor or otherwise disposing of it in accordance with the Contractor''s instructions. Such sums, costs and Cost shall be determined by the Project Manager and the Employer may deduct the same from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor.'::jsonb
        ),
        '{general_condition}',
        'If after the Supervision Consultant has given the Contractor any notice under <a href=\"#clause-21.2\" class=\"clause-link\" data-clause-id=\"21.2\">Clause 21.2</a> (Defects after Taking Over) the Contractor does not in the opinion of the Supervision Consultant commence as soon as practicable or thereafter carry out with due expedition and without delay all such work as may be necessary to remedy to the satisfaction of the Supervision Consultant the defect concerned, then (without prejudice to any other rights the Employer may have by virtue of the said failure of the Contractor): (a) The Employer may itself or may employ and pay any other person, firm or company to carry out and complete that work at the Contractor''s risk. If any of that work is work the Cost of which, in accordance with <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a> (Cost of Remedying Defects), the Contractor would in the opinion of the Supervision Consultant have been bound to bear, then all Costs which the Employer may incur as a result of or in connection with itself carrying out and completing such work or employing and paying that other person, firm or company so to do shall be borne by the Contractor. In such event the Project Manager shall determine such Costs and the Employer may deduct the Costs so incurred from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor; or (b) If the defect is such that the Employer has been deprived of substantially the whole of the benefit of the Works or a part thereof, it may terminate the Contract in respect of such parts of the Works as cannot be put to the intended use. The Employer shall be entitled to recover all sums paid in respect of such parts of the Works plus financing costs and the Cost of dismantling the same, clearing the Site and returning Plant to the Contractor or otherwise disposing of it in accordance with the Contractor''s instructions. Such sums, costs and Cost shall be determined by the Project Manager and the Employer may deduct the same from any monies due or which may become due to the Contractor or recover the same as a debt due from the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.6'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 21.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall, if required by the Supervision Consultant in writing, search under the directions of the Supervision Consultant for the cause of any defect appearing during the progress of the Works or during the Defects Liability Period for any Section or Portion thereof. Unless such defect shall be one of the Costs of remedying which the Contractor is liable to bear under <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a> (Cost of Remedying Defects), the Cost of the work carried out by the Contractor in searching as aforesaid shall be determined by the Project Manager and the Contractor shall be paid such Cost in accordance with Clause 26 (Interim and Final Certificates). If such defect shall be one of the Costs of remedying which the Contractor is liable to bear as aforesaid, the Cost of the work carried out in searching as aforesaid shall be borne by the Contractor.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall, if required by the Supervision Consultant in writing, search under the directions of the Supervision Consultant for the cause of any defect appearing during the progress of the Works or during the Defects Liability Period for any Section or Portion thereof. Unless such defect shall be one of the Costs of remedying which the Contractor is liable to bear under <a href=\"#clause-21.3\" class=\"clause-link\" data-clause-id=\"21.3\">Clause 21.3</a> (Cost of Remedying Defects), the Cost of the work carried out by the Contractor in searching as aforesaid shall be determined by the Project Manager and the Contractor shall be paid such Cost in accordance with Clause 26 (Interim and Final Certificates). If such defect shall be one of the Costs of remedying which the Contractor is liable to bear as aforesaid, the Cost of the work carried out in searching as aforesaid shall be borne by the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '21.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 22.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Employer may from time to time during the currency of the Contract by written order (herein referred to as a \"Variation Order\") direct the Contractor to alter, amend, omit, add to or otherwise vary the Works or any part thereof or to change any sequence or timing of construction of any part of the Works specified in the Contract and the Contractor shall be bound to carry out such Variation Order as if the provisions of the same had been incorporated into the Contract. The Contractor shall not alter, amend, omit, add to or otherwise vary the Works or any part thereof or change any sequence or timing of construction of any part of the Works specified in the Contract in any way whatsoever except as directed by a Variation Order. The effect, if any, of all such Variation Orders shall be valued in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) provided that where the issue of a Variation Order is necessitated by some default of or breach of contract by the Contractor or for which it is responsible, any additional Costs attributable to such default or breach shall be borne by the Contractor.'::jsonb
        ),
        '{general_condition}',
        'The Employer may from time to time during the currency of the Contract by written order (herein referred to as a \"Variation Order\") direct the Contractor to alter, amend, omit, add to or otherwise vary the Works or any part thereof or to change any sequence or timing of construction of any part of the Works specified in the Contract and the Contractor shall be bound to carry out such Variation Order as if the provisions of the same had been incorporated into the Contract. The Contractor shall not alter, amend, omit, add to or otherwise vary the Works or any part thereof or change any sequence or timing of construction of any part of the Works specified in the Contract in any way whatsoever except as directed by a Variation Order. The effect, if any, of all such Variation Orders shall be valued in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) provided that where the issue of a Variation Order is necessitated by some default of or breach of contract by the Contractor or for which it is responsible, any additional Costs attributable to such default or breach shall be borne by the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '22.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 22.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Forthwith after receiving any Variation Order the Contractor shall proceed with the carrying out thereof and shall within the period required by the Project Manager notify the Project Manager in writing whether in the Contractor''s opinion the Variation Order will result in any need to revise the Programme and, if in the Contractor''s opinion there is such a need, the said written notification shall be accompanied by a proposed revised programme for the approval of the Project Manager. The Contractor shall not delay so carrying out the Variation Order pending determination in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) of the value of the Variation Order or pending approval of any proposed revised programme. Nor shall the Contractor delay pending the grant of any consequent extension of the Time for Completion to which the Contractor may be entitled in accordance with <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time).'::jsonb
        ),
        '{general_condition}',
        'Forthwith after receiving any Variation Order the Contractor shall proceed with the carrying out thereof and shall within the period required by the Project Manager notify the Project Manager in writing whether in the Contractor''s opinion the Variation Order will result in any need to revise the Programme and, if in the Contractor''s opinion there is such a need, the said written notification shall be accompanied by a proposed revised programme for the approval of the Project Manager. The Contractor shall not delay so carrying out the Variation Order pending determination in accordance with <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) of the value of the Variation Order or pending approval of any proposed revised programme. Nor shall the Contractor delay pending the grant of any consequent extension of the Time for Completion to which the Contractor may be entitled in accordance with <a href=\"#clause-19.2\" class=\"clause-link\" data-clause-id=\"19.2\">Clause 19.2</a> (Extensions of Time).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '22.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 22.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'As soon as practicable after the issue of any Variation Order the value thereof shall be determined as follows: (a) the Variation Order shall be valued at rates and prices contained in the Contract insofar as such rates and prices shall, in the opinion of the Employer be appropriate and applicable; and (b) insofar as the Variation Order cannot be valued in accordance with Clause 22.3(a) above the Employer and the Contractor shall endeavour to agree a suitable valuation; or (c) in the event of failure to agree as aforesaid the Employer shall fix a valuation which, in its opinion, is appropriate and shall notify the Contractor accordingly with a copy to the Project Manager. Until such time as a valuation is agreed or fixed, the Project Manager shall after consultation with the Employer and the Contractor determine a provisional valuation to enable on-account payments to be included in certificates issued in accordance with Clause 26 (Interim and Final Certificates). The Contractor shall submit to the Employer all such documents, evidence and calculations as the Employer shall require for the purpose of agreeing a suitable valuation under Clause 22.3(b) above. Provided that where any Variation Order renders abortive any work already carried out by the Contractor (which work it is reasonable for the Contractor so to have carried out having regard to the requirements of the then current Programme) due account shall be taken thereof in valuing that Variation Order. Pending determination in accordance with this <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) of the value of the Variation Order, and if the Employer or the Project Manager considers it to be appropriate, the Contractor shall keep records of the Cost of carrying out the Variation Order and of time expended thereon. Such records shall be open to inspection by the Project Manager and the Employer at all reasonable times.'::jsonb
        ),
        '{general_condition}',
        'As soon as practicable after the issue of any Variation Order the value thereof shall be determined as follows: (a) the Variation Order shall be valued at rates and prices contained in the Contract insofar as such rates and prices shall, in the opinion of the Employer be appropriate and applicable; and (b) insofar as the Variation Order cannot be valued in accordance with Clause 22.3(a) above the Employer and the Contractor shall endeavour to agree a suitable valuation; or (c) in the event of failure to agree as aforesaid the Employer shall fix a valuation which, in its opinion, is appropriate and shall notify the Contractor accordingly with a copy to the Project Manager. Until such time as a valuation is agreed or fixed, the Project Manager shall after consultation with the Employer and the Contractor determine a provisional valuation to enable on-account payments to be included in certificates issued in accordance with Clause 26 (Interim and Final Certificates). The Contractor shall submit to the Employer all such documents, evidence and calculations as the Employer shall require for the purpose of agreeing a suitable valuation under Clause 22.3(b) above. Provided that where any Variation Order renders abortive any work already carried out by the Contractor (which work it is reasonable for the Contractor so to have carried out having regard to the requirements of the then current Programme) due account shall be taken thereof in valuing that Variation Order. Pending determination in accordance with this <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) of the value of the Variation Order, and if the Employer or the Project Manager considers it to be appropriate, the Contractor shall keep records of the Cost of carrying out the Variation Order and of time expended thereon. Such records shall be open to inspection by the Project Manager and the Employer at all reasonable times.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '22.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 22.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) The Employer may, if in his opinion it is necessary or desirable, issue an instruction that any varied work shall be carried out on a daywork basis. The Contractor shall then be paid for such varied work in accordance with the Dayworks Bill forming part of the Bills of Quantities and at the rates and prices stated in such Bill. (b) In respect of any part of the Works carried out on a daywork basis, the Contractor shall, during the continuance of such part of the Works, submit to the Project Manager each day in duplicate daywork sheets signed by the Contractor''s Representative, in such form as the Project Manager shall require, giving the following details and such other details as the Project Manager may require: (ii) the name and occupation of and the hours properly and necessarily worked by all workmen employed in carrying out such work; (iii) a description of and the hours properly and necessarily worked by all plant and equipment used in carrying out such work; and (iv) a description and the quantity of all Plant properly and necessarily used in the carrying out of such work. The Project Manager shall arrange for the Supervision Consultant to consider such daywork sheets, to make any adjustments that the Supervision Consultant considers necessary and to thereafter sign one copy, adjusted as aforesaid, and return the said copy to the Contractor. (c) At the end of each month the Contractor shall submit to the Project Manager in duplicate statements signed by the Contractor''s Representative, in such form as the Project Manager shall require, giving full details of any part of the Works carried out on a daywork basis during that month including but not limited to details of all workmen, Plant, plant and equipment used in carrying out such part of the Works and agreed by the Supervision Consultant in accordance with paragraph (b) of this <a href=\"#clause-22.4\" class=\"clause-link\" data-clause-id=\"22.4\">Clause 22.4</a> such details being priced in accordance with the Dayworks Bill forming part of the Bills of Quantities. Such statements shall be accompanied by all relevant quotations, invoices, vouchers, receipts and any other documents and evidence which the Project Manager shall require in order to substantiate such statements. (d) The Contractor shall not be entitled to any payment for work carried out on a daywork basis unless the daywork sheets and statements and accompanying documents and evidence referred to in paragraphs (b) and (c) respectively of this <a href=\"#clause-22.4\" class=\"clause-link\" data-clause-id=\"22.4\">Clause 22.4</a> have been fully and punctually rendered. Provided always that if the Employer considers that for any reason the sending of such daywork sheets and statements and accompanying documents and evidence by the Contractor in accordance with the said paragraphs was impracticable, he shall nevertheless be entitled to authorise payment for the relevant part of the Works, either on a daywork basis or at such value as shall, in his opinion, be fair and reasonable.'::jsonb
        ),
        '{general_condition}',
        '(a) The Employer may, if in his opinion it is necessary or desirable, issue an instruction that any varied work shall be carried out on a daywork basis. The Contractor shall then be paid for such varied work in accordance with the Dayworks Bill forming part of the Bills of Quantities and at the rates and prices stated in such Bill. (b) In respect of any part of the Works carried out on a daywork basis, the Contractor shall, during the continuance of such part of the Works, submit to the Project Manager each day in duplicate daywork sheets signed by the Contractor''s Representative, in such form as the Project Manager shall require, giving the following details and such other details as the Project Manager may require: (ii) the name and occupation of and the hours properly and necessarily worked by all workmen employed in carrying out such work; (iii) a description of and the hours properly and necessarily worked by all plant and equipment used in carrying out such work; and (iv) a description and the quantity of all Plant properly and necessarily used in the carrying out of such work. The Project Manager shall arrange for the Supervision Consultant to consider such daywork sheets, to make any adjustments that the Supervision Consultant considers necessary and to thereafter sign one copy, adjusted as aforesaid, and return the said copy to the Contractor. (c) At the end of each month the Contractor shall submit to the Project Manager in duplicate statements signed by the Contractor''s Representative, in such form as the Project Manager shall require, giving full details of any part of the Works carried out on a daywork basis during that month including but not limited to details of all workmen, Plant, plant and equipment used in carrying out such part of the Works and agreed by the Supervision Consultant in accordance with paragraph (b) of this <a href=\"#clause-22.4\" class=\"clause-link\" data-clause-id=\"22.4\">Clause 22.4</a> such details being priced in accordance with the Dayworks Bill forming part of the Bills of Quantities. Such statements shall be accompanied by all relevant quotations, invoices, vouchers, receipts and any other documents and evidence which the Project Manager shall require in order to substantiate such statements. (d) The Contractor shall not be entitled to any payment for work carried out on a daywork basis unless the daywork sheets and statements and accompanying documents and evidence referred to in paragraphs (b) and (c) respectively of this <a href=\"#clause-22.4\" class=\"clause-link\" data-clause-id=\"22.4\">Clause 22.4</a> have been fully and punctually rendered. Provided always that if the Employer considers that for any reason the sending of such daywork sheets and statements and accompanying documents and evidence by the Contractor in accordance with the said paragraphs was impracticable, he shall nevertheless be entitled to authorise payment for the relevant part of the Works, either on a daywork basis or at such value as shall, in his opinion, be fair and reasonable.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '22.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 22.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor may at any time submit to the Employer for his consideration (with a copy to the Project Manager) a written proposal which (in the Contractor''s opinion) would, if implemented by way of a Variation Order issued by the Employer pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders): (b) improve the performance of the Works or any part thereof; (c) reduce the cost to the Employer of carrying out, maintaining or operating the Works or any part thereof; or The said proposal shall include a description of the proposed work to be performed and a programme for its execution, the Contractor''s proposal for any necessary revisions to the programme and to the Time for Completion and the Contractor''s proposal for the valuation of the Variation Order. The Cost of preparing the said proposal and any modifications thereto and of attending meetings with the Employer and/or the Project Manager and/or the Supervision Consultant in relation thereto shall be borne by the Contractor.'::jsonb
        ),
        '{general_condition}',
        'The Contractor may at any time submit to the Employer for his consideration (with a copy to the Project Manager) a written proposal which (in the Contractor''s opinion) would, if implemented by way of a Variation Order issued by the Employer pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders): (b) improve the performance of the Works or any part thereof; (c) reduce the cost to the Employer of carrying out, maintaining or operating the Works or any part thereof; or The said proposal shall include a description of the proposed work to be performed and a programme for its execution, the Contractor''s proposal for any necessary revisions to the programme and to the Time for Completion and the Contractor''s proposal for the valuation of the Variation Order. The Cost of preparing the said proposal and any modifications thereto and of attending meetings with the Employer and/or the Project Manager and/or the Supervision Consultant in relation thereto shall be borne by the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '22.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Notwithstanding any other provision of the Contract, if the Contractor intends to make a claim against the Employer for any additional payment in connection with or arising out of the Contract or the Works or any Section or Portion thereof other than a claim for a payment of or on account of any Variation Order issued pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders), the Contractor shall give notice in writing thereof to the Project Manager, with a copy to the Employer, as soon as possible and in any event within twenty eight (28) days after the event or circumstance giving rise to the claim has first occurred. Such notice shall contain full and detailed particulars of and information concerning such claim insofar as those particulars are or that information is then known to it or reasonably available to it. Such particulars and information shall without limitation include the grounds upon which such claim is based, the Contractor''s then estimate as to the amount of the aforesaid claim and details of the build-up of such estimate. The claims to which this <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> applies shall without limitation include any claims for extra Cost under <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order) and in those cases the notice given under this <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> shall provided it is given within the period of twenty eight (28) days referred to in the said <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> fulfill the requirements of that Clause concerning notice of intention to claim.'::jsonb
        ),
        '{general_condition}',
        'Notwithstanding any other provision of the Contract, if the Contractor intends to make a claim against the Employer for any additional payment in connection with or arising out of the Contract or the Works or any Section or Portion thereof other than a claim for a payment of or on account of any Variation Order issued pursuant to <a href=\"#clause-22.1\" class=\"clause-link\" data-clause-id=\"22.1\">Clause 22.1</a> (Variation Orders), the Contractor shall give notice in writing thereof to the Project Manager, with a copy to the Employer, as soon as possible and in any event within twenty eight (28) days after the event or circumstance giving rise to the claim has first occurred. Such notice shall contain full and detailed particulars of and information concerning such claim insofar as those particulars are or that information is then known to it or reasonably available to it. Such particulars and information shall without limitation include the grounds upon which such claim is based, the Contractor''s then estimate as to the amount of the aforesaid claim and details of the build-up of such estimate. The claims to which this <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> applies shall without limitation include any claims for extra Cost under <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> (Suspension Order) and in those cases the notice given under this <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> shall provided it is given within the period of twenty eight (28) days referred to in the said <a href=\"#clause-18.1\" class=\"clause-link\" data-clause-id=\"18.1\">Clause 18.1</a> fulfill the requirements of that Clause concerning notice of intention to claim.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'As soon as the Contractor becomes aware of any particulars of or other information concerning any claim of which notice has been given to the Project Manager under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) additional to the particulars and information contained in the aforesaid notice or to any further particulars or information previously notified to the Project Manager under this <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a>, the Contractor shall give notice in writing thereof to the Project Manager containing full details including without limitation any revision to the Contractor''s previous estimate as to the amount of the aforesaid claim and details of the revision.'::jsonb
        ),
        '{general_condition}',
        'As soon as the Contractor becomes aware of any particulars of or other information concerning any claim of which notice has been given to the Project Manager under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) additional to the particulars and information contained in the aforesaid notice or to any further particulars or information previously notified to the Project Manager under this <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a>, the Contractor shall give notice in writing thereof to the Project Manager containing full details including without limitation any revision to the Contractor''s previous estimate as to the amount of the aforesaid claim and details of the revision.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Whenever an event or circumstance occurs which gives rise to a claim as provided in <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) the Contractor shall keep full and detailed contemporary records of and relating to all matters relevant to any such claim either on the Site or at another location acceptable to the Project Manager. The Project Manager shall at any time during normal working hours of the Contractor be entitled to inspect such contemporary records and to require the Contractor to supply it with copies of any of the same.'::jsonb
        ),
        '{general_condition}',
        'Whenever an event or circumstance occurs which gives rise to a claim as provided in <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) the Contractor shall keep full and detailed contemporary records of and relating to all matters relevant to any such claim either on the Site or at another location acceptable to the Project Manager. The Project Manager shall at any time during normal working hours of the Contractor be entitled to inspect such contemporary records and to require the Contractor to supply it with copies of any of the same.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Project Manager shall at any time or times be entitled to require the Contractor to deliver to the Project Manager in writing its then latest estimate as to the amount of any claim of which notice has been given to the Project Manager under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims).'::jsonb
        ),
        '{general_condition}',
        'The Project Manager shall at any time or times be entitled to require the Contractor to deliver to the Project Manager in writing its then latest estimate as to the amount of any claim of which notice has been given to the Project Manager under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Within twenty eight (28) days, or such extended time as the Project Manager may allow, of giving notice under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims), the Contractor shall submit to the Project Manager a comprehensive account of the claim giving full and detailed particulars of and information concerning such claim. Such particulars and information shall without limitation include the grounds upon which the claim is based, the final amount of the claim and the build-up thereof and the contemporary records required under <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records). Such particulars and information shall incorporate as applicable the particulars and information previously submitted under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims), <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a> (Notice of Further Particulars or Information) and <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records). The Contractor shall thereafter promptly submit such further particulars and information of its claim as the Project Manager may require to assess the validity of the claim.'::jsonb
        ),
        '{general_condition}',
        'Within twenty eight (28) days, or such extended time as the Project Manager may allow, of giving notice under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims), the Contractor shall submit to the Project Manager a comprehensive account of the claim giving full and detailed particulars of and information concerning such claim. Such particulars and information shall without limitation include the grounds upon which the claim is based, the final amount of the claim and the build-up thereof and the contemporary records required under <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records). Such particulars and information shall incorporate as applicable the particulars and information previously submitted under <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims), <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a> (Notice of Further Particulars or Information) and <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records). The Contractor shall thereafter promptly submit such further particulars and information of its claim as the Project Manager may require to assess the validity of the claim.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.6
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Contractor fails to comply with any of the provisions of <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) in respect of any such claim as is referred to therein, the Contractor shall not under any circumstances be entitled to any additional payment in respect of the claim concerned and the Employer shall be discharged from any and all liability in connection therewith. Otherwise, if the Contractor fails to comply with any of the provisions of <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a> (Notice of Further Particulars or Information), <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records), <a href=\"#clause-23.4\" class=\"clause-link\" data-clause-id=\"23.4\">Clause 23.4</a> (Current Estimates), <a href=\"#clause-23.5\" class=\"clause-link\" data-clause-id=\"23.5\">Clause 23.5</a> (Comprehensive Claim) or any other Clauses of these Conditions of Contract which may be applicable in respect of any such claim as is referred to therein, then (without prejudice to any other rights the Employer may have in respect of the said failure) the Contractor shall be entitled to payment in respect of the claim concerned only to the extent that the Project Manager is not thereby prejudiced in fully investigating the claim and provided that the Contractor''s entitlement to payment shall not exceed such amount as the Project Manager considers to be verified by contemporary records and is nevertheless able to establish that the same is fair and reasonable and should in accordance with the provisions of the Contract be paid by the Employer.'::jsonb
        ),
        '{general_condition}',
        'If the Contractor fails to comply with any of the provisions of <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) in respect of any such claim as is referred to therein, the Contractor shall not under any circumstances be entitled to any additional payment in respect of the claim concerned and the Employer shall be discharged from any and all liability in connection therewith. Otherwise, if the Contractor fails to comply with any of the provisions of <a href=\"#clause-23.2\" class=\"clause-link\" data-clause-id=\"23.2\">Clause 23.2</a> (Notice of Further Particulars or Information), <a href=\"#clause-23.3\" class=\"clause-link\" data-clause-id=\"23.3\">Clause 23.3</a> (Contemporary Records), <a href=\"#clause-23.4\" class=\"clause-link\" data-clause-id=\"23.4\">Clause 23.4</a> (Current Estimates), <a href=\"#clause-23.5\" class=\"clause-link\" data-clause-id=\"23.5\">Clause 23.5</a> (Comprehensive Claim) or any other Clauses of these Conditions of Contract which may be applicable in respect of any such claim as is referred to therein, then (without prejudice to any other rights the Employer may have in respect of the said failure) the Contractor shall be entitled to payment in respect of the claim concerned only to the extent that the Project Manager is not thereby prejudiced in fully investigating the claim and provided that the Contractor''s entitlement to payment shall not exceed such amount as the Project Manager considers to be verified by contemporary records and is nevertheless able to establish that the same is fair and reasonable and should in accordance with the provisions of the Contract be paid by the Employer.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.6'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'When the Project Manager has received the comprehensive account of the claim as required by <a href=\"#clause-23.5\" class=\"clause-link\" data-clause-id=\"23.5\">Clause 23.5</a> (Comprehensive Claim) and such further particulars and information as he may require under such Clause, the Project Manager shall, after due consultation with the Employer, the Supervision Consultant and the Contractor, determine the amount, if any, to which the Contractor is entitled and the Contractor shall be paid that amount in accordance with Clause 26 (Interim and Final Certificates). The Project Manager shall notify the Contractor of any determination made under this <a href=\"#clause-23.7\" class=\"clause-link\" data-clause-id=\"23.7\">Clause 23.7</a> with a copy to the Employer.'::jsonb
        ),
        '{general_condition}',
        'When the Project Manager has received the comprehensive account of the claim as required by <a href=\"#clause-23.5\" class=\"clause-link\" data-clause-id=\"23.5\">Clause 23.5</a> (Comprehensive Claim) and such further particulars and information as he may require under such Clause, the Project Manager shall, after due consultation with the Employer, the Supervision Consultant and the Contractor, determine the amount, if any, to which the Contractor is entitled and the Contractor shall be paid that amount in accordance with Clause 26 (Interim and Final Certificates). The Project Manager shall notify the Contractor of any determination made under this <a href=\"#clause-23.7\" class=\"clause-link\" data-clause-id=\"23.7\">Clause 23.7</a> with a copy to the Employer.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 23.8
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Notwithstanding anything contained in the foregoing provisions of this Clause 23 (Claims) or elsewhere in the Contract, any such claim as is referred to in <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) shall only be valid if: (a) it concerns a matter which, in the opinion of the Project Manager, could not have been reasonably foreseen by an experienced contractor prior to the latest date for submission of the Tender; and (b) such claim is otherwise fully substantiated under the terms, conditions and provisions of the Contract to the satisfaction of the Project Manager; and (c) in any event, such substantiated claim (when taken together only with any other such substantiated claim which, in the opinion of the Project Manager, is clearly related to and evolves out of the same cause) is not less than the amount stated in the Particular Conditions.'::jsonb
        ),
        '{general_condition}',
        'Notwithstanding anything contained in the foregoing provisions of this Clause 23 (Claims) or elsewhere in the Contract, any such claim as is referred to in <a href=\"#clause-23.1\" class=\"clause-link\" data-clause-id=\"23.1\">Clause 23.1</a> (Notice of Claims) shall only be valid if: (a) it concerns a matter which, in the opinion of the Project Manager, could not have been reasonably foreseen by an experienced contractor prior to the latest date for submission of the Tender; and (b) such claim is otherwise fully substantiated under the terms, conditions and provisions of the Contract to the satisfaction of the Project Manager; and (c) in any event, such substantiated claim (when taken together only with any other such substantiated claim which, in the opinion of the Project Manager, is clearly related to and evolves out of the same cause) is not less than the amount stated in the Particular Conditions.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '23.8'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 24.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Contractor shall enter into a subcontract for the applicable specified part of the Works with any Nominated Subcontractor. However, notwithstanding that any person might otherwise fall within the definition in <a href=\"#clause-1.1\" class=\"clause-link\" data-clause-id=\"1.1\">Clause 1.1</a> (Definitions) of \"Nominated Subcontractor\", he shall not so fall and the Contractor shall not be under any obligation to grant any subcontract to him if: (a) he shall in relation to the whole or any part of the Works to be subcontracted to him decline to grant to the Employer or the Contractor any guarantee or warranty which it may be stipulated in the Contract that he should so grant; or (b) the Contractor shall have any other objection to him which in the opinion of the Project Manager is reasonable in the circumstances.'::jsonb
        ),
        '{general_condition}',
        'The Contractor shall enter into a subcontract for the applicable specified part of the Works with any Nominated Subcontractor. However, notwithstanding that any person might otherwise fall within the definition in <a href=\"#clause-1.1\" class=\"clause-link\" data-clause-id=\"1.1\">Clause 1.1</a> (Definitions) of \"Nominated Subcontractor\", he shall not so fall and the Contractor shall not be under any obligation to grant any subcontract to him if: (a) he shall in relation to the whole or any part of the Works to be subcontracted to him decline to grant to the Employer or the Contractor any guarantee or warranty which it may be stipulated in the Contract that he should so grant; or (b) the Contractor shall have any other objection to him which in the opinion of the Project Manager is reasonable in the circumstances.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '24.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 24.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Before issuing any Interim Certificate or Final Certificate under Clause 26 (Interim and Final Certificates) which includes any amount in respect of work done and/or Plant provided by any Nominated Subcontractor, the Project Manager shall be entitled to require from the Contractor reasonable evidence that all amounts due to such Nominated Subcontractor in respect of work done and/or Plant provided and covered by previous Interim Certificates or Final Certificates, less applicable deductions for retention or otherwise, have been received by such Nominated Subcontractor. Unless the Contractor (a) submits such reasonable evidence to the Project Manager; or (b) (i) satisfies the Project Manager in writing that the Contractor has reasonable cause for withholding or refusing to pay the said amounts (less applicable deductions); and (ii) produces to the Project Manager reasonable evidence that the Contractor has informed such Nominated Subcontractor in writing of that reasonable cause; the Employer may (at its sole discretion) pay to such Nominated Subcontractor direct, upon the certificate of the Project Manager, part or all of such amounts (less applicable deductions) as are due to such Nominated Subcontractor and for which the Contractor has failed to comply with the requirements of paragraphs (a) or (b) above. In such event, the Employer shall be entitled to deduct any amount so paid direct to the Nominated Subcontractor by the Employer from any sums due or which may become due from the Employer to the Contractor or to recover the same as a debt due from the Contractor. Provided that the Employer shall, in no circumstances where it exercises its discretion to pay a Nominated Subcontractor direct as aforesaid, be obliged to pay any amount to a Nominated Subcontractor in excess of amounts available for deduction as set out in this <a href=\"#clause-24.2\" class=\"clause-link\" data-clause-id=\"24.2\">Clause 24.2</a>. Notwithstanding the foregoing, the Employer expressly excludes all liability to the Contractor for any wrongful or incorrect payment direct to any Nominated Subcontractor by the Employer.'::jsonb
        ),
        '{general_condition}',
        'Before issuing any Interim Certificate or Final Certificate under Clause 26 (Interim and Final Certificates) which includes any amount in respect of work done and/or Plant provided by any Nominated Subcontractor, the Project Manager shall be entitled to require from the Contractor reasonable evidence that all amounts due to such Nominated Subcontractor in respect of work done and/or Plant provided and covered by previous Interim Certificates or Final Certificates, less applicable deductions for retention or otherwise, have been received by such Nominated Subcontractor. Unless the Contractor (a) submits such reasonable evidence to the Project Manager; or (b) (i) satisfies the Project Manager in writing that the Contractor has reasonable cause for withholding or refusing to pay the said amounts (less applicable deductions); and (ii) produces to the Project Manager reasonable evidence that the Contractor has informed such Nominated Subcontractor in writing of that reasonable cause; the Employer may (at its sole discretion) pay to such Nominated Subcontractor direct, upon the certificate of the Project Manager, part or all of such amounts (less applicable deductions) as are due to such Nominated Subcontractor and for which the Contractor has failed to comply with the requirements of paragraphs (a) or (b) above. In such event, the Employer shall be entitled to deduct any amount so paid direct to the Nominated Subcontractor by the Employer from any sums due or which may become due from the Employer to the Contractor or to recover the same as a debt due from the Contractor. Provided that the Employer shall, in no circumstances where it exercises its discretion to pay a Nominated Subcontractor direct as aforesaid, be obliged to pay any amount to a Nominated Subcontractor in excess of amounts available for deduction as set out in this <a href=\"#clause-24.2\" class=\"clause-link\" data-clause-id=\"24.2\">Clause 24.2</a>. Notwithstanding the foregoing, the Employer expressly excludes all liability to the Contractor for any wrongful or incorrect payment direct to any Nominated Subcontractor by the Employer.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '24.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 25.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The quantities set out in the Bills of Quantities are estimated quantities and are not to be taken as the actual and correct quantities of the Works which the Contractor is required to carry out or for the purposes of <a href=\"#clause-25.2\" class=\"clause-link\" data-clause-id=\"25.2\">Clause 25.2</a> (Works to be Measured).'::jsonb
        ),
        '{general_condition}',
        'The quantities set out in the Bills of Quantities are estimated quantities and are not to be taken as the actual and correct quantities of the Works which the Contractor is required to carry out or for the purposes of <a href=\"#clause-25.2\" class=\"clause-link\" data-clause-id=\"25.2\">Clause 25.2</a> (Works to be Measured).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '25.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 25.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Subject to the provisions of <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) in relation to the valuation of Variation Orders, the rates and prices contained in the Bills of Quantities shall be used in valuing the Works measured in accordance with Clauses 25.2 (Works to be Measured) and 25.3 (Method of Measurement). Where the said Bills do not contain a rate or price for a particular measured item the Employer and the Contractor shall endeavour to agree a suitable rate or price. In the event of failure to agree as aforesaid the Employer shall fix a rate or price which, in his opinion, is appropriate and shall notify the Contractor accordingly with a copy to the Project Manager. The Contractor shall submit to the Employer all such documents, evidence and calculations as the Employer shall require for the purpose of agreeing a suitable rate or price as aforesaid.'::jsonb
        ),
        '{general_condition}',
        'Subject to the provisions of <a href=\"#clause-22.3\" class=\"clause-link\" data-clause-id=\"22.3\">Clause 22.3</a> (Valuation of Variation Orders) in relation to the valuation of Variation Orders, the rates and prices contained in the Bills of Quantities shall be used in valuing the Works measured in accordance with Clauses 25.2 (Works to be Measured) and 25.3 (Method of Measurement). Where the said Bills do not contain a rate or price for a particular measured item the Employer and the Contractor shall endeavour to agree a suitable rate or price. In the event of failure to agree as aforesaid the Employer shall fix a rate or price which, in his opinion, is appropriate and shall notify the Contractor accordingly with a copy to the Project Manager. The Contractor shall submit to the Employer all such documents, evidence and calculations as the Employer shall require for the purpose of agreeing a suitable rate or price as aforesaid.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '25.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 26.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) After the Commencement Date, the Contractor shall submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate for the Advance Payment. (b) After the end of each calendar month the Contractor shall submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate stating: (i) the estimated Contract value of the Works carried out on Site up to the end of that month; (ii) ninety per cent (90%) of the estimated net direct cost delivered to Site of all Plant on Site at the end of that month intended exclusively for incorporation in the Works but not yet so incorporated; less however any such Plant which: (1) has been delivered to Site in breach of paragraph (b) of Clause 11.9 (Delivery to Site) unless such breach has by that time been waived by the Project Manager in writing; or (2) it was not reasonable to deliver to Site by that time having regard to the requirements of the Programme; or (3) has not by that time been placed in appropriate storage and properly protected to the satisfaction of the Project Manager and the Supervision Consultant; (iii) any other amounts to which the Contractor considers itself to be entitled at the end of that month under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works or any Section or Portion thereof. Such Interim Certificate application shall show separately the Contract values and amounts within paragraphs (i), (ii) and (iii) of this Sub-Clause which relate to work done and/or Plant provided by (or other entitlements of) each Nominated Subcontractor. (c) After the issue of a Taking-Over Certificate for a Section or Portion of the Works, the Contractor may submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate stating the amount equal to fifty per cent (50%) of the amount of retention held in respect of the said Section or Portion as part of the Project Manager''s computation of the amount which the Contractor was entitled to be paid as shown in the latest Interim Certificate to be issued in accordance with Clause 26.2(b) (Issue of Interim Certificates). (d) The Interim Certificate applications referred to in Sub-Clauses (a), (b) and (c) of this <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> shall be accompanied by all relevant time sheets, quotations, invoices, vouchers, accounts, receipts and any other documents and evidence which the Project Manager shall require in order to substantiate such application. (e) The Contractor shall submit to the Project Manager within twenty eight (28) days after the Commencement Date a proposed breakdown of each lump sum price in the Bills of Quantities. The Project Manager may take account of the said breakdown when considering each Interim Certificate application and Final Certificate application but shall not be bound by it.'::jsonb
        ),
        '{general_condition}',
        '(a) After the Commencement Date, the Contractor shall submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate for the Advance Payment. (b) After the end of each calendar month the Contractor shall submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate stating: (i) the estimated Contract value of the Works carried out on Site up to the end of that month; (ii) ninety per cent (90%) of the estimated net direct cost delivered to Site of all Plant on Site at the end of that month intended exclusively for incorporation in the Works but not yet so incorporated; less however any such Plant which: (1) has been delivered to Site in breach of paragraph (b) of Clause 11.9 (Delivery to Site) unless such breach has by that time been waived by the Project Manager in writing; or (2) it was not reasonable to deliver to Site by that time having regard to the requirements of the Programme; or (3) has not by that time been placed in appropriate storage and properly protected to the satisfaction of the Project Manager and the Supervision Consultant; (iii) any other amounts to which the Contractor considers itself to be entitled at the end of that month under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works or any Section or Portion thereof. Such Interim Certificate application shall show separately the Contract values and amounts within paragraphs (i), (ii) and (iii) of this Sub-Clause which relate to work done and/or Plant provided by (or other entitlements of) each Nominated Subcontractor. (c) After the issue of a Taking-Over Certificate for a Section or Portion of the Works, the Contractor may submit to the Project Manager in triplicate in such form and with such detail as the Project Manager shall require an Interim Certificate application signed by the Contractor''s Representative for an Interim Certificate stating the amount equal to fifty per cent (50%) of the amount of retention held in respect of the said Section or Portion as part of the Project Manager''s computation of the amount which the Contractor was entitled to be paid as shown in the latest Interim Certificate to be issued in accordance with Clause 26.2(b) (Issue of Interim Certificates). (d) The Interim Certificate applications referred to in Sub-Clauses (a), (b) and (c) of this <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> shall be accompanied by all relevant time sheets, quotations, invoices, vouchers, accounts, receipts and any other documents and evidence which the Project Manager shall require in order to substantiate such application. (e) The Contractor shall submit to the Project Manager within twenty eight (28) days after the Commencement Date a proposed breakdown of each lump sum price in the Bills of Quantities. The Project Manager may take account of the said breakdown when considering each Interim Certificate application and Final Certificate application but shall not be bound by it.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '26.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 26.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) The Project Manager shall consider the Interim Certificate application submitted to him in accordance with Sub-Clause (a) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and provided that the Project Manager has received from the Contractor the Performance Bond and the Advance Payment Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) the Project Manager shall prepare an Interim Certificate for the payment of the Advance Payment. (b) The Project Manager shall consider each Interim Certificate application (and accompanying documents and evidence) submitted to him in accordance with Sub-Clause (b) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and from the information contained therein and the accompanying documents and evidence, the Bills of Quantities and any other information which he may deem relevant shall prepare an Interim Certificate stating the total amount which the Contractor is, in the opinion of the Project Manager, entitled to be paid, such amount being computed in the following manner: (i) the Project Manager''s estimate of the Contract value of the Works carried out on Site up to the end of the relevant month; plus (ii) ninety per cent (90%) of the Project Manager''s estimate of the net direct cost delivered to Site, as proven to the satisfaction of the Project Manager, of all Plant on Site at the end of the relevant month intended exclusively for incorporation in the Works but not yet so incorporated; less however any such Plant within any of sub-paragraphs (1) to (3) inclusive of paragraph (ii) of Sub-Clause (b) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates); plus (iii) any other amounts to which the Project Manager considers the Contractor to be entitled under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works or any Section or Portion thereof; less (iv) the amount calculated by multiplying the total of paragraphs (i) to (iii) inclusive of this Sub-Clause (b) by the percentage that the Advance Payment is of the Contract Sum as partial recovery of the Advance Payment; less (v) the amount calculated by multiplying the total of paragraphs (i) to (iii) inclusive of this Sub-Clause (b) by the percentage stated in the Particular Conditions as retention; less (vi) any amounts which the Project Manager considers the Employer or the Project Manager entitled to deduct or otherwise recover from the Contractor under any term, condition or provision of the Contract or otherwise except where such amounts have been recovered from the Contractor by the Employer as a debt due from the Contractor or have been deducted by the Employer from monies due to the Contractor; and less (vii) except in the case of the first Interim Certificate issued under this Sub-Clause (b), the nett total of paragraphs (i) to (vi) inclusive of this Sub-Clause (b) as applied to the immediately previous Interim Certificate issued under this Sub-Clause (b). (c) The Project Manager shall consider each Interim Certificate application (and accompanying documents and evidence) submitted to him in accordance with Sub-Clause (c) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and, in respect of the Section or Portion of the Works to which the said Interim Certificate application relates, shall prepare an Interim Certificate for the payment of fifty per cent (50%) of the amount of retention held in respect of the said Section or Portion as part of the Project Manager''s computation of the amount which the Contractor was entitled to be paid as shown in the latest Interim Certificate to be issued in accordance with Clause 26.2(b) (Issue of Interim Certificates). (d) Notwithstanding the foregoing, the maximum deduction to be made under this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> with respect to the Advance Payment shall be equal to the amount of such Advance Payment. If, however, at any time or times in the opinion of the Project Manager such deduction at the percentage stipulated in this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> will be insufficient to recover to the Employer the full amount of such Advance Payment the Project Manager may increase such deduction to such percentage as will in his opinion be sufficient for that purpose. (e) The balance of the retention held under this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) shall be included in the calculation of the final nett amounts remaining payable to the Contractor or the Employer as the case may be in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). (f) Without in any way limiting the Project Manager''s right to exclude from any Interim Certificate any amount which in his opinion the Contractor is not entitled to be paid as a result of the application of any term, condition or provision of the Contract, the Project Manager shall have power to exclude from any Interim Certificate any work or Plant which in the Supervision Consultant''s opinion is defective or otherwise not in accordance with the Contract. The Project Manager''s aforesaid right shall also not be in any way limited or prejudiced by the inclusion of any particular amount in any previous Interim Certificate and accordingly such amount may be wholly or partly excluded in any subsequent Interim Certificate if in the Project Manager''s opinion at the time of the subsequent Certificate the Contractor is not entitled to be paid the same. The Project Manager may in any Interim Certificate make any correction or modification that should properly be made in respect of any previous Interim Certificate. (g) Within seven (7) days after receipt by the Project Manager from the Contractor of the Interim Certificate application duly completed in accordance with Sub-Clause (a) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and accompanied by all such documents and evidence relevant thereto as are referred to in Sub-Clause (d) of the said <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> or within seven (7) days after receipt by the Project Manager from the Contractor of the Performance Bond and the Advance Payment Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds), whichever date of receipt is the later, the Project Manager shall complete his preparation of the Interim Certificate, sign and submit the same to the Employer and a copy to the Contractor. (h) Within thirty (30) days after receipt by the Project Manager from the Contractor of any Interim Certificate application duly completed in accordance with Sub-Clauses (b) or (c) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates), and accompanied by all such documents and evidence relevant thereto as are referred to in Sub-Clause (d) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and provided that the Project Manager has received from the Contractor the Performance Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) the Project Manager shall complete his preparation of the Interim Certificate, sign and submit the same to the Employer and a copy to the Contractor. (i) Each Interim Certificate is provisional only and shall not be relied upon as evidence of any matter or thing stated therein or omitted therefrom nor shall it in any way prejudice or otherwise affect the rights or obligations of the Employer, the Project Manager, the Supervision Consultant or the Contractor under the terms of the Contract.'::jsonb
        ),
        '{general_condition}',
        '(a) The Project Manager shall consider the Interim Certificate application submitted to him in accordance with Sub-Clause (a) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and provided that the Project Manager has received from the Contractor the Performance Bond and the Advance Payment Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) the Project Manager shall prepare an Interim Certificate for the payment of the Advance Payment. (b) The Project Manager shall consider each Interim Certificate application (and accompanying documents and evidence) submitted to him in accordance with Sub-Clause (b) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and from the information contained therein and the accompanying documents and evidence, the Bills of Quantities and any other information which he may deem relevant shall prepare an Interim Certificate stating the total amount which the Contractor is, in the opinion of the Project Manager, entitled to be paid, such amount being computed in the following manner: (i) the Project Manager''s estimate of the Contract value of the Works carried out on Site up to the end of the relevant month; plus (ii) ninety per cent (90%) of the Project Manager''s estimate of the net direct cost delivered to Site, as proven to the satisfaction of the Project Manager, of all Plant on Site at the end of the relevant month intended exclusively for incorporation in the Works but not yet so incorporated; less however any such Plant within any of sub-paragraphs (1) to (3) inclusive of paragraph (ii) of Sub-Clause (b) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates); plus (iii) any other amounts to which the Project Manager considers the Contractor to be entitled under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works or any Section or Portion thereof; less (iv) the amount calculated by multiplying the total of paragraphs (i) to (iii) inclusive of this Sub-Clause (b) by the percentage that the Advance Payment is of the Contract Sum as partial recovery of the Advance Payment; less (v) the amount calculated by multiplying the total of paragraphs (i) to (iii) inclusive of this Sub-Clause (b) by the percentage stated in the Particular Conditions as retention; less (vi) any amounts which the Project Manager considers the Employer or the Project Manager entitled to deduct or otherwise recover from the Contractor under any term, condition or provision of the Contract or otherwise except where such amounts have been recovered from the Contractor by the Employer as a debt due from the Contractor or have been deducted by the Employer from monies due to the Contractor; and less (vii) except in the case of the first Interim Certificate issued under this Sub-Clause (b), the nett total of paragraphs (i) to (vi) inclusive of this Sub-Clause (b) as applied to the immediately previous Interim Certificate issued under this Sub-Clause (b). (c) The Project Manager shall consider each Interim Certificate application (and accompanying documents and evidence) submitted to him in accordance with Sub-Clause (c) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and, in respect of the Section or Portion of the Works to which the said Interim Certificate application relates, shall prepare an Interim Certificate for the payment of fifty per cent (50%) of the amount of retention held in respect of the said Section or Portion as part of the Project Manager''s computation of the amount which the Contractor was entitled to be paid as shown in the latest Interim Certificate to be issued in accordance with Clause 26.2(b) (Issue of Interim Certificates). (d) Notwithstanding the foregoing, the maximum deduction to be made under this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> with respect to the Advance Payment shall be equal to the amount of such Advance Payment. If, however, at any time or times in the opinion of the Project Manager such deduction at the percentage stipulated in this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> will be insufficient to recover to the Employer the full amount of such Advance Payment the Project Manager may increase such deduction to such percentage as will in his opinion be sufficient for that purpose. (e) The balance of the retention held under this <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) shall be included in the calculation of the final nett amounts remaining payable to the Contractor or the Employer as the case may be in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates). (f) Without in any way limiting the Project Manager''s right to exclude from any Interim Certificate any amount which in his opinion the Contractor is not entitled to be paid as a result of the application of any term, condition or provision of the Contract, the Project Manager shall have power to exclude from any Interim Certificate any work or Plant which in the Supervision Consultant''s opinion is defective or otherwise not in accordance with the Contract. The Project Manager''s aforesaid right shall also not be in any way limited or prejudiced by the inclusion of any particular amount in any previous Interim Certificate and accordingly such amount may be wholly or partly excluded in any subsequent Interim Certificate if in the Project Manager''s opinion at the time of the subsequent Certificate the Contractor is not entitled to be paid the same. The Project Manager may in any Interim Certificate make any correction or modification that should properly be made in respect of any previous Interim Certificate. (g) Within seven (7) days after receipt by the Project Manager from the Contractor of the Interim Certificate application duly completed in accordance with Sub-Clause (a) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and accompanied by all such documents and evidence relevant thereto as are referred to in Sub-Clause (d) of the said <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> or within seven (7) days after receipt by the Project Manager from the Contractor of the Performance Bond and the Advance Payment Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds), whichever date of receipt is the later, the Project Manager shall complete his preparation of the Interim Certificate, sign and submit the same to the Employer and a copy to the Contractor. (h) Within thirty (30) days after receipt by the Project Manager from the Contractor of any Interim Certificate application duly completed in accordance with Sub-Clauses (b) or (c) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates), and accompanied by all such documents and evidence relevant thereto as are referred to in Sub-Clause (d) of <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) and provided that the Project Manager has received from the Contractor the Performance Bond due to be obtained and delivered in accordance with <a href=\"#clause-7.1\" class=\"clause-link\" data-clause-id=\"7.1\">Clause 7.1</a> (Provision of Bonds) the Project Manager shall complete his preparation of the Interim Certificate, sign and submit the same to the Employer and a copy to the Contractor. (i) Each Interim Certificate is provisional only and shall not be relied upon as evidence of any matter or thing stated therein or omitted therefrom nor shall it in any way prejudice or otherwise affect the rights or obligations of the Employer, the Project Manager, the Supervision Consultant or the Contractor under the terms of the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '26.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 26.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'When: (a) at least fourteen (14) days have elapsed after the expiration of the Defects Liability Period for a Section or Portion of the Works and the Contractor has in relation thereto performed all its obligations under Clause 21 (Defects), has finished any work related to the said Section or Portion of the Works which had not been completed at the time of issue of the Taking-Over Certificate in respect thereof, and has to the satisfaction of the Project Manager and the Supervision Consultant observed and performed all its other obligations and liabilities (including without limitation those under paragraph (b) of <a href=\"#clause-5.7\" class=\"clause-link\" data-clause-id=\"5.7\">Clause 5.7</a> (As-Built Drawings, Operations and Maintenance Manuals) and Clause 25A (Extended Warranties from Subcontractors) but excluding any which have not yet arisen under any Extended Warranty still continuing at the time of submission of the relevant Final Certificate application) relating to the said Section or Portion of the Works on its part to be so observed or performed in accordance with the Contract; and (b) the Contractor has prepared and submitted to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) in respect of the said Section or Portion of the Works which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion are payable under the Contract in respect of the said Section or Portion of the Works and such final account has been adjusted as appropriate and agreed and signed by the Project Manager and the Contractor; the Contractor shall submit to the Project Manager in triplicate a Final Certificate application signed by the Contractor''s Representative for that Section or Portion of the Works which confirms the due performance of all the requirements of paragraphs (a) and (b) of this Clause. The application for the last Final Certificate shall be accompanied by a written discharge, signed by the Contractor''s Representative, confirming that the total of the final accounts for all Sections and Portions of the Works represents full and final settlement of all monies due to the Contractor under or in connection with the Contract.'::jsonb
        ),
        '{general_condition}',
        'When: (a) at least fourteen (14) days have elapsed after the expiration of the Defects Liability Period for a Section or Portion of the Works and the Contractor has in relation thereto performed all its obligations under Clause 21 (Defects), has finished any work related to the said Section or Portion of the Works which had not been completed at the time of issue of the Taking-Over Certificate in respect thereof, and has to the satisfaction of the Project Manager and the Supervision Consultant observed and performed all its other obligations and liabilities (including without limitation those under paragraph (b) of <a href=\"#clause-5.7\" class=\"clause-link\" data-clause-id=\"5.7\">Clause 5.7</a> (As-Built Drawings, Operations and Maintenance Manuals) and Clause 25A (Extended Warranties from Subcontractors) but excluding any which have not yet arisen under any Extended Warranty still continuing at the time of submission of the relevant Final Certificate application) relating to the said Section or Portion of the Works on its part to be so observed or performed in accordance with the Contract; and (b) the Contractor has prepared and submitted to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) in respect of the said Section or Portion of the Works which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion are payable under the Contract in respect of the said Section or Portion of the Works and such final account has been adjusted as appropriate and agreed and signed by the Project Manager and the Contractor; the Contractor shall submit to the Project Manager in triplicate a Final Certificate application signed by the Contractor''s Representative for that Section or Portion of the Works which confirms the due performance of all the requirements of paragraphs (a) and (b) of this Clause. The application for the last Final Certificate shall be accompanied by a written discharge, signed by the Contractor''s Representative, confirming that the total of the final accounts for all Sections and Portions of the Works represents full and final settlement of all monies due to the Contractor under or in connection with the Contract.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '26.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 26.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Following receipt of each Final Certificate application in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) the Project Manager shall prepare a Final Certificate for the relevant Section or Portion of the Works which shall state the amounts shown by the agreed final account as payable to the Contractor in respect of the said Section or Portion of the Works, shall show the total deduction to be made from those amounts by virtue of payments already made to the Contractor pursuant to Interim Certificates or otherwise and amounts payable to the Employer from the Contractor under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works including those amounts which the Contract specifically provides shall be recoverable from the Contractor by the Employer as a debt due from the Contractor or may be deducted by the Employer from any monies due or which may become due to the Contractor, and shall show the final nett amounts accordingly remaining payable to the Contractor or the Employer as the case may be. If at the time of preparation of any Final Certificate there is under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works any amount to which the Project Manager considers the Contractor to be entitled or which the Project Manager considers the Employer or the Project Manager entitled to deduct or otherwise recover from the Contractor, and if such amount does not in the Project Manager''s opinion relate specifically to any particular Section(s) or Portion(s) of the Works and has not been included in any previous Final Certificate, the Project Manager shall include the same at the end of the Final Certificate then being prepared as an addition to or deduction from (as appropriate) the figures which would otherwise be the final nett amounts shown by that Final Certificate. Within thirty (30) days after receipt from the Contractor of any Final Certificate application duly completed in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) and provided that all the requirements of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) have been performed in respect of the relevant Section or Portion of the Works, the Project Manager shall complete his preparation of the relevant Final Certificate in draft, and submit copies of the same to the Employer and to the Supervision Consultant. Thereafter the Project Manager shall consult with the Employer, the Supervision Consultant and the Contractor as necessary, and when the Employer and the Supervision Consultant agree with the contents of the proposed Final Certificate the Project Manager, the Employer and the Supervision Consultant shall sign the Final Certificate and the Project Manager shall issue it to the Contractor. If all the requirements of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) have not been performed in respect of the relevant Section or Portion of the Works the Project Manager shall not prepare a Final Certificate but shall, within thirty (30) days after receipt from the Contractor of the Final Certificate application, give written notice to the Contractor specifying in the opinion of the Project Manager and/or the Employer and/or the Supervision Consultant those requirements of the said <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> which have not been performed. Once all such requirements have been performed the Contractor shall repeat the submission of the Final Certificate application in accordance with the said <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a>. A Final Certificate issued in accordance with this Clause for any Section or Portion of the Works shall (subject as hereinafter provided) be conclusive evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates), of the final nett amounts remaining payable to the Contractor or the Employer (as the case may be) in respect of the said Section or Portion of the Works, and of any addition to or deduction from those final nett amounts to be made as provided in this Clause provided that: (i) no Final Certificate shall prejudice the continued validity and enforceability in accordance with its terms of any Extended Warranty or any warranty implied by law in relation to the relevant Section or Portion of the Works or any part thereof; (ii) no Final Certificate shall relieve the Contractor of any and all of its continuing liabilities and obligations provided by the Contract including but not limited to those provided in <a href=\"#clause-12.10\" class=\"clause-link\" data-clause-id=\"12.10\">Clause 12.10</a> (Inherent Defects) and Clause 15 (Secrecy); (iii) no Final Certificate shall be conclusive evidence as aforesaid if there has been fraud or dishonesty on the part of the Contractor; and (iv) no Final Certificate shall be conclusive evidence as aforesaid with respect to any matter or thing of which either party has either before or within ninety (90) days after the date of issue of that Final Certificate given written notice of dispute to the other party in accordance with Clause 32 (Notices) specifying in detail the matter or thing disputed. The last Final Certificate issued in accordance with this Clause shall, in addition to being (subject as provided above) conclusive evidence of the matters stated above, be (subject as hereinafter provided) conclusive evidence of the performance and observance by the Employer of each and every obligation and liability on the Employer''s part to be so performed or observed under or in accordance with the Contract or otherwise in relation to the Works or any Section or Portion thereof provided that the last Final Certificate shall not itself be conclusive evidence of the payment by the Employer of any amount shown therein as remaining payable to the Contractor.'::jsonb
        ),
        '{general_condition}',
        'Following receipt of each Final Certificate application in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) the Project Manager shall prepare a Final Certificate for the relevant Section or Portion of the Works which shall state the amounts shown by the agreed final account as payable to the Contractor in respect of the said Section or Portion of the Works, shall show the total deduction to be made from those amounts by virtue of payments already made to the Contractor pursuant to Interim Certificates or otherwise and amounts payable to the Employer from the Contractor under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works including those amounts which the Contract specifically provides shall be recoverable from the Contractor by the Employer as a debt due from the Contractor or may be deducted by the Employer from any monies due or which may become due to the Contractor, and shall show the final nett amounts accordingly remaining payable to the Contractor or the Employer as the case may be. If at the time of preparation of any Final Certificate there is under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works any amount to which the Project Manager considers the Contractor to be entitled or which the Project Manager considers the Employer or the Project Manager entitled to deduct or otherwise recover from the Contractor, and if such amount does not in the Project Manager''s opinion relate specifically to any particular Section(s) or Portion(s) of the Works and has not been included in any previous Final Certificate, the Project Manager shall include the same at the end of the Final Certificate then being prepared as an addition to or deduction from (as appropriate) the figures which would otherwise be the final nett amounts shown by that Final Certificate. Within thirty (30) days after receipt from the Contractor of any Final Certificate application duly completed in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) and provided that all the requirements of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) have been performed in respect of the relevant Section or Portion of the Works, the Project Manager shall complete his preparation of the relevant Final Certificate in draft, and submit copies of the same to the Employer and to the Supervision Consultant. Thereafter the Project Manager shall consult with the Employer, the Supervision Consultant and the Contractor as necessary, and when the Employer and the Supervision Consultant agree with the contents of the proposed Final Certificate the Project Manager, the Employer and the Supervision Consultant shall sign the Final Certificate and the Project Manager shall issue it to the Contractor. If all the requirements of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates) have not been performed in respect of the relevant Section or Portion of the Works the Project Manager shall not prepare a Final Certificate but shall, within thirty (30) days after receipt from the Contractor of the Final Certificate application, give written notice to the Contractor specifying in the opinion of the Project Manager and/or the Employer and/or the Supervision Consultant those requirements of the said <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> which have not been performed. Once all such requirements have been performed the Contractor shall repeat the submission of the Final Certificate application in accordance with the said <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a>. A Final Certificate issued in accordance with this Clause for any Section or Portion of the Works shall (subject as hereinafter provided) be conclusive evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates), of the final nett amounts remaining payable to the Contractor or the Employer (as the case may be) in respect of the said Section or Portion of the Works, and of any addition to or deduction from those final nett amounts to be made as provided in this Clause provided that: (i) no Final Certificate shall prejudice the continued validity and enforceability in accordance with its terms of any Extended Warranty or any warranty implied by law in relation to the relevant Section or Portion of the Works or any part thereof; (ii) no Final Certificate shall relieve the Contractor of any and all of its continuing liabilities and obligations provided by the Contract including but not limited to those provided in <a href=\"#clause-12.10\" class=\"clause-link\" data-clause-id=\"12.10\">Clause 12.10</a> (Inherent Defects) and Clause 15 (Secrecy); (iii) no Final Certificate shall be conclusive evidence as aforesaid if there has been fraud or dishonesty on the part of the Contractor; and (iv) no Final Certificate shall be conclusive evidence as aforesaid with respect to any matter or thing of which either party has either before or within ninety (90) days after the date of issue of that Final Certificate given written notice of dispute to the other party in accordance with Clause 32 (Notices) specifying in detail the matter or thing disputed. The last Final Certificate issued in accordance with this Clause shall, in addition to being (subject as provided above) conclusive evidence of the matters stated above, be (subject as hereinafter provided) conclusive evidence of the performance and observance by the Employer of each and every obligation and liability on the Employer''s part to be so performed or observed under or in accordance with the Contract or otherwise in relation to the Works or any Section or Portion thereof provided that the last Final Certificate shall not itself be conclusive evidence of the payment by the Employer of any amount shown therein as remaining payable to the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '26.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 27.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Subject to <a href=\"#clause-27.2\" class=\"clause-link\" data-clause-id=\"27.2\">Clause 27.2</a> (Employer''s Right of Set-Off): (a) within fourteen (14) days after the date of issue by the Project Manager of an Interim Certificate in accordance with Sub-Clause (g) of <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates); or (b) within thirty (30) days after the date of issue by the Project Manager of any Interim Certificate in accordance with Sub-Clause (h) of <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) or any Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates); the Employer shall pay to the Contractor or the Contractor shall pay to the Employer (as the circumstances may require) the nett amount or final nett amount(s) shown by the relevant Interim Certificate or Final Certificate.'::jsonb
        ),
        '{general_condition}',
        'Subject to <a href=\"#clause-27.2\" class=\"clause-link\" data-clause-id=\"27.2\">Clause 27.2</a> (Employer''s Right of Set-Off): (a) within fourteen (14) days after the date of issue by the Project Manager of an Interim Certificate in accordance with Sub-Clause (g) of <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates); or (b) within thirty (30) days after the date of issue by the Project Manager of any Interim Certificate in accordance with Sub-Clause (h) of <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) or any Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates); the Employer shall pay to the Contractor or the Contractor shall pay to the Employer (as the circumstances may require) the nett amount or final nett amount(s) shown by the relevant Interim Certificate or Final Certificate.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '27.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 27.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Employer shall be entitled to deduct and recover from any payment under <a href=\"#clause-27.1\" class=\"clause-link\" data-clause-id=\"27.1\">Clause 27.1</a> (Time of Payment) any amounts due to the Employer from the Contractor.'::jsonb
        ),
        '{general_condition}',
        'The Employer shall be entitled to deduct and recover from any payment under <a href=\"#clause-27.1\" class=\"clause-link\" data-clause-id=\"27.1\">Clause 27.1</a> (Time of Payment) any amounts due to the Employer from the Contractor.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '27.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 27.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) No commission, fee, payment, gift or other benefit of a like or similar kind has been or will in the future be made by the Contractor to any third party (which expression shall without limitation include any consultant, servant, agent, employee, sponsor or distributor of the Employer) in connection with or arising out of the Contract. (b) If the Contractor breaches paragraph (a) of this <a href=\"#clause-27.5\" class=\"clause-link\" data-clause-id=\"27.5\">Clause 27.5</a> at any time or if the Employer reasonably believes that the Contractor has breached paragraph (a) of this <a href=\"#clause-27.5\" class=\"clause-link\" data-clause-id=\"27.5\">Clause 27.5</a> at any time, the Employer may terminate the Contractor''s employment under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Employer may Terminate Contractor''s Employment) and recover damages from the Contractor whether for consequential loss or otherwise. (c) Nothing herein shall prevent the Contractor from making bona fide payments to its Country sponsor or agent in accordance with a properly registered and recorded agreement, or to its employees or Subcontractors.'::jsonb
        ),
        '{general_condition}',
        '(a) No commission, fee, payment, gift or other benefit of a like or similar kind has been or will in the future be made by the Contractor to any third party (which expression shall without limitation include any consultant, servant, agent, employee, sponsor or distributor of the Employer) in connection with or arising out of the Contract. (b) If the Contractor breaches paragraph (a) of this <a href=\"#clause-27.5\" class=\"clause-link\" data-clause-id=\"27.5\">Clause 27.5</a> at any time or if the Employer reasonably believes that the Contractor has breached paragraph (a) of this <a href=\"#clause-27.5\" class=\"clause-link\" data-clause-id=\"27.5\">Clause 27.5</a> at any time, the Employer may terminate the Contractor''s employment under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Employer may Terminate Contractor''s Employment) and recover damages from the Contractor whether for consequential loss or otherwise. (c) Nothing herein shall prevent the Contractor from making bona fide payments to its Country sponsor or agent in accordance with a properly registered and recorded agreement, or to its employees or Subcontractors.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '27.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 29.1
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Notwithstanding any other provision of this Clause 29 (Frustration and Force Majeure), if an event or circumstance outside the control of both parties arises after the date of the Contract rendering in the opinion of the Project Manager performance of the Contract impossible such that under the law governing the Contract specified in <a href=\"#clause-4.2\" class=\"clause-link\" data-clause-id=\"4.2\">Clause 4.2</a> (Governing Law) the Contract is frustrated then upon notice by either party to the other party of such event or circumstance both parties shall be released from further performance, the Contract shall be deemed to have been terminated under this Clause without prejudice to any rights or obligations which may have accrued due between the parties prior to such termination and the sum payable by the Employer to the Contractor shall be determined and paid in accordance with <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) however obligations under the Contract which survive such termination including without limitation <a href=\"#clause-12.10\" class=\"clause-link\" data-clause-id=\"12.10\">Clause 12.10</a> (Inherent Defects), Clause 15 (Secrecy) and Clause 25A (Extended Warranties from Subcontractors) shall continue notwithstanding any such termination.'::jsonb
        ),
        '{general_condition}',
        'Notwithstanding any other provision of this Clause 29 (Frustration and Force Majeure), if an event or circumstance outside the control of both parties arises after the date of the Contract rendering in the opinion of the Project Manager performance of the Contract impossible such that under the law governing the Contract specified in <a href=\"#clause-4.2\" class=\"clause-link\" data-clause-id=\"4.2\">Clause 4.2</a> (Governing Law) the Contract is frustrated then upon notice by either party to the other party of such event or circumstance both parties shall be released from further performance, the Contract shall be deemed to have been terminated under this Clause without prejudice to any rights or obligations which may have accrued due between the parties prior to such termination and the sum payable by the Employer to the Contractor shall be determined and paid in accordance with <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) however obligations under the Contract which survive such termination including without limitation <a href=\"#clause-12.10\" class=\"clause-link\" data-clause-id=\"12.10\">Clause 12.10</a> (Inherent Defects), Clause 15 (Secrecy) and Clause 25A (Extended Warranties from Subcontractors) shall continue notwithstanding any such termination.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '29.1'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 29.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Neither party shall be considered to be in default or in breach of its obligations under the Contract to the extent that performance of such obligations is prevented by any exceptional event or circumstance constituting Force Majeure which arises after the date of the Contract provided that it has given notice to the other party in accordance with <a href=\"#clause-29.3\" class=\"clause-link\" data-clause-id=\"29.3\">Clause 29.3</a> (Notice of Force Majeure).'::jsonb
        ),
        '{general_condition}',
        'Neither party shall be considered to be in default or in breach of its obligations under the Contract to the extent that performance of such obligations is prevented by any exceptional event or circumstance constituting Force Majeure which arises after the date of the Contract provided that it has given notice to the other party in accordance with <a href=\"#clause-29.3\" class=\"clause-link\" data-clause-id=\"29.3\">Clause 29.3</a> (Notice of Force Majeure).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '29.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 29.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '(a) If the carrying out of substantially all the Works in progress is prevented for a continuous period of not less than one hundred and eighty two (182) days by reason of Force Majeure of which notice has been given under <a href=\"#clause-29.3\" class=\"clause-link\" data-clause-id=\"29.3\">Clause 29.3</a> (Notice of Force Majeure) then, notwithstanding that the Contractor may by reason thereof have been granted an extension of the Time for Completion, either party shall be entitled to serve upon the other twenty eight (28) days'' notice to terminate the Contract. (b) In the event that either party gives notice of termination for Force Majeure in accordance with the provisions of Sub-Clause (a) of this <a href=\"#clause-29.7\" class=\"clause-link\" data-clause-id=\"29.7\">Clause 29.7</a> (and provided that the Contract has not been terminated for frustration in accordance with the provisions of <a href=\"#clause-29.1\" class=\"clause-link\" data-clause-id=\"29.1\">Clause 29.1</a> (Frustration)) such notice shall operate to terminate the Contract at the end of the twenty eight (28) day period referred to in the said Sub-Clause (a) but without prejudice to: (i) the obligation of the Employer to pay to the Contractor a sum determined in accordance with <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure); and (ii) any rights or obligations which may have accrued due between the parties prior to such termination.'::jsonb
        ),
        '{general_condition}',
        '(a) If the carrying out of substantially all the Works in progress is prevented for a continuous period of not less than one hundred and eighty two (182) days by reason of Force Majeure of which notice has been given under <a href=\"#clause-29.3\" class=\"clause-link\" data-clause-id=\"29.3\">Clause 29.3</a> (Notice of Force Majeure) then, notwithstanding that the Contractor may by reason thereof have been granted an extension of the Time for Completion, either party shall be entitled to serve upon the other twenty eight (28) days'' notice to terminate the Contract. (b) In the event that either party gives notice of termination for Force Majeure in accordance with the provisions of Sub-Clause (a) of this <a href=\"#clause-29.7\" class=\"clause-link\" data-clause-id=\"29.7\">Clause 29.7</a> (and provided that the Contract has not been terminated for frustration in accordance with the provisions of <a href=\"#clause-29.1\" class=\"clause-link\" data-clause-id=\"29.1\">Clause 29.1</a> (Frustration)) such notice shall operate to terminate the Contract at the end of the twenty eight (28) day period referred to in the said Sub-Clause (a) but without prejudice to: (i) the obligation of the Employer to pay to the Contractor a sum determined in accordance with <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure); and (ii) any rights or obligations which may have accrued due between the parties prior to such termination.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '29.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 29.8
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Contract is terminated or deemed terminated under <a href=\"#clause-29.7\" class=\"clause-link\" data-clause-id=\"29.7\">Clause 29.7</a> (Termination in Consequence of Force Majeure) or <a href=\"#clause-29.1\" class=\"clause-link\" data-clause-id=\"29.1\">Clause 29.1</a> (Frustration) the Contractor shall promptly cease all further work, except for such work as may be instructed by the Employer for the protection of life or property or for the safety of the Works, submit to the Project Manager all Contractor''s Drawings, comply with any instructions of the Employer in relation to Plant not yet delivered to Site, remove from the Site, with the prior written consent of the Project Manager, all Contractor''s Equipment and submit to the Project Manager in triplicate an Interim Certificate application prepared and accompanied in accordance with <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) up to the time of termination or deemed termination. The Project Manager shall consider the Interim Certificate application, prepare an Interim Certificate up to such time and issue the same in accordance with <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Thereafter, as soon as the required documents and evidence have become available the Contractor shall prepare and submit to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion represent: (a) the Contract value of the Works carried out in accordance with the Contract up to the time of termination; (b) any expenditure, not otherwise included in the final account, reasonably incurred by the Contractor prior to the time of termination in the expectation of the Contract continuing and of carrying out the Works; (c) any amounts, not otherwise included in the final account, to which the Contractor is entitled or which the Employer or the Project Manager is entitled to deduct or otherwise recover, in each case, under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works; and (d) the reasonable cost not already allowed and paid for (and as certified by the Project Manager) of repatriation of the Contractor''s employees wholly engaged at the time of such termination on or in connection with the Works within the Country. Such final account shall be adjusted to reflect the amounts in respect of the foregoing items which in the Project Manager''s opinion are appropriate and the adjusted final account shall be agreed to and signed by the Project Manager and the Contractor. Thereupon the Contractor shall submit to the Project Manager in triplicate a Final Certificate application (prepared and accompanied in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates)) from which the Project Manager shall prepare and issue a Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Notwithstanding the said <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a>, where this Clause operates the Final Certificate shall not be evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates).'::jsonb
        ),
        '{general_condition}',
        'If the Contract is terminated or deemed terminated under <a href=\"#clause-29.7\" class=\"clause-link\" data-clause-id=\"29.7\">Clause 29.7</a> (Termination in Consequence of Force Majeure) or <a href=\"#clause-29.1\" class=\"clause-link\" data-clause-id=\"29.1\">Clause 29.1</a> (Frustration) the Contractor shall promptly cease all further work, except for such work as may be instructed by the Employer for the protection of life or property or for the safety of the Works, submit to the Project Manager all Contractor''s Drawings, comply with any instructions of the Employer in relation to Plant not yet delivered to Site, remove from the Site, with the prior written consent of the Project Manager, all Contractor''s Equipment and submit to the Project Manager in triplicate an Interim Certificate application prepared and accompanied in accordance with <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) up to the time of termination or deemed termination. The Project Manager shall consider the Interim Certificate application, prepare an Interim Certificate up to such time and issue the same in accordance with <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Thereafter, as soon as the required documents and evidence have become available the Contractor shall prepare and submit to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion represent: (a) the Contract value of the Works carried out in accordance with the Contract up to the time of termination; (b) any expenditure, not otherwise included in the final account, reasonably incurred by the Contractor prior to the time of termination in the expectation of the Contract continuing and of carrying out the Works; (c) any amounts, not otherwise included in the final account, to which the Contractor is entitled or which the Employer or the Project Manager is entitled to deduct or otherwise recover, in each case, under any term, condition or provision of the Contract or otherwise in connection with or arising out of the Works; and (d) the reasonable cost not already allowed and paid for (and as certified by the Project Manager) of repatriation of the Contractor''s employees wholly engaged at the time of such termination on or in connection with the Works within the Country. Such final account shall be adjusted to reflect the amounts in respect of the foregoing items which in the Project Manager''s opinion are appropriate and the adjusted final account shall be agreed to and signed by the Project Manager and the Contractor. Thereupon the Contractor shall submit to the Project Manager in triplicate a Final Certificate application (prepared and accompanied in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates)) from which the Project Manager shall prepare and issue a Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Notwithstanding the said <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a>, where this Clause operates the Final Certificate shall not be evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '29.8'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Project Manager shall certify in writing that in his opinion the Contractor: (a) has failed to comply with a notice under <a href=\"#clause-30.1\" class=\"clause-link\" data-clause-id=\"30.1\">Clause 30.1</a> (Notice to Correct); or (b) has failed to comply with Clause 7 (Bonds) in respect of the Performance Bond; or (c) is in breach of any of the provisions of Sub-Clause 27.5(a) (Third Party Payments); or (e) without reasonable excuse has failed to commence the Works within seven (7) days after the Commencement Date or thereafter has suspended the progress of the Works or any Section or Portion thereof for an aggregate of not less than twenty eight (28) days; or (f) despite previous written warnings from the Project Manager, is not carrying out the Works or any Section or Portion thereof in accordance with the Contract or is refusing or failing to observe or perform any other term, provision or condition of the Contract; or (g) (i) without the prior written consent of the Employer has (otherwise than as permitted by <a href=\"#clause-3.1\" class=\"clause-link\" data-clause-id=\"3.1\">Clause 3.1</a> (Assignment)) assigned or purported to assign the Contract or any part thereof or any benefit, obligation or interest therein or thereunder; or (ii) has or has purported to sublet the whole of the Works; or (iii) without the prior written consent of the Project Manager and the Supervision Consultant in any case where in accordance with <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting) such consent is requisite has or has purported to sublet any part of the Works; or (h) has for a period of not less than twenty eight (28) days refused or failed to act in accordance with any order of the Supervision Consultant under <a href=\"#clause-11.7\" class=\"clause-link\" data-clause-id=\"11.7\">Clause 11.7</a> (Rejection and Remedy); or (i) has so failed to complete within the Time for Completion that the aggregate amount of all such payments as are due by the Contractor to the Employer under paragraph (a)(i) of <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> (Liquidated Damages) shall at any time have reached the amount stated in the Particular Conditions; or (j) has compounded with or negotiated for any composition with or called any meeting of its creditors generally, has had a receiver of all or any of its assets appointed, has committed any act of bankruptcy or insolvency, has had a receiving order made against it, has had an administration order made against it, has entered into any liquidation (other than a voluntary liquidation for the purposes of amalgamation or reconstruction on terms previously approved in writing by the Employer) or has taken or suffered any action analogous to any of the foregoing under the laws of any applicable jurisdiction; or (k) is in breach of any of the provisions of <a href=\"#clause-15.1\" class=\"clause-link\" data-clause-id=\"15.1\">Clause 15.1</a> (General Covenant); then, subject to the Employer giving fourteen (14) days'' prior written notice to the Contractor, the Employer may enter upon the Site and the Works, and expel the Contractor therefrom. The Contractor shall then forthwith leave the Site and the Works and submit to the Project Manager all Contractor''s Drawings. Provided that the Contractor shall comply immediately with any instructions included in the notice for the protection of life or property or for the safety of the Works or in relation to Plant not yet delivered to Site.'::jsonb
        ),
        '{general_condition}',
        'If the Project Manager shall certify in writing that in his opinion the Contractor: (a) has failed to comply with a notice under <a href=\"#clause-30.1\" class=\"clause-link\" data-clause-id=\"30.1\">Clause 30.1</a> (Notice to Correct); or (b) has failed to comply with Clause 7 (Bonds) in respect of the Performance Bond; or (c) is in breach of any of the provisions of Sub-Clause 27.5(a) (Third Party Payments); or (e) without reasonable excuse has failed to commence the Works within seven (7) days after the Commencement Date or thereafter has suspended the progress of the Works or any Section or Portion thereof for an aggregate of not less than twenty eight (28) days; or (f) despite previous written warnings from the Project Manager, is not carrying out the Works or any Section or Portion thereof in accordance with the Contract or is refusing or failing to observe or perform any other term, provision or condition of the Contract; or (g) (i) without the prior written consent of the Employer has (otherwise than as permitted by <a href=\"#clause-3.1\" class=\"clause-link\" data-clause-id=\"3.1\">Clause 3.1</a> (Assignment)) assigned or purported to assign the Contract or any part thereof or any benefit, obligation or interest therein or thereunder; or (ii) has or has purported to sublet the whole of the Works; or (iii) without the prior written consent of the Project Manager and the Supervision Consultant in any case where in accordance with <a href=\"#clause-3.2\" class=\"clause-link\" data-clause-id=\"3.2\">Clause 3.2</a> (Subletting) such consent is requisite has or has purported to sublet any part of the Works; or (h) has for a period of not less than twenty eight (28) days refused or failed to act in accordance with any order of the Supervision Consultant under <a href=\"#clause-11.7\" class=\"clause-link\" data-clause-id=\"11.7\">Clause 11.7</a> (Rejection and Remedy); or (i) has so failed to complete within the Time for Completion that the aggregate amount of all such payments as are due by the Contractor to the Employer under paragraph (a)(i) of <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> (Liquidated Damages) shall at any time have reached the amount stated in the Particular Conditions; or (j) has compounded with or negotiated for any composition with or called any meeting of its creditors generally, has had a receiver of all or any of its assets appointed, has committed any act of bankruptcy or insolvency, has had a receiving order made against it, has had an administration order made against it, has entered into any liquidation (other than a voluntary liquidation for the purposes of amalgamation or reconstruction on terms previously approved in writing by the Employer) or has taken or suffered any action analogous to any of the foregoing under the laws of any applicable jurisdiction; or (k) is in breach of any of the provisions of <a href=\"#clause-15.1\" class=\"clause-link\" data-clause-id=\"15.1\">Clause 15.1</a> (General Covenant); then, subject to the Employer giving fourteen (14) days'' prior written notice to the Contractor, the Employer may enter upon the Site and the Works, and expel the Contractor therefrom. The Contractor shall then forthwith leave the Site and the Works and submit to the Project Manager all Contractor''s Drawings. Provided that the Contractor shall comply immediately with any instructions included in the notice for the protection of life or property or for the safety of the Works or in relation to Plant not yet delivered to Site.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'The Employer may within fourteen (14) days after the expiry of the fourteen (14) day notice referred to in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default) give a further written notice to the Contractor which shall be effective to terminate the Contract immediately. Provided that in the case of paragraphs (c), (j) or (k) of <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default), the Employer may by written notice terminate the Contract immediately. Any termination under this <a href=\"#clause-30.3\" class=\"clause-link\" data-clause-id=\"30.3\">Clause 30.3</a> shall be without prejudice to: (a) any rights for damages or compensation to which the Employer may be entitled under any applicable law; and (b) any rights or obligations which may have accrued due between the parties prior to such termination.'::jsonb
        ),
        '{general_condition}',
        'The Employer may within fourteen (14) days after the expiry of the fourteen (14) day notice referred to in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default) give a further written notice to the Contractor which shall be effective to terminate the Contract immediately. Provided that in the case of paragraphs (c), (j) or (k) of <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default), the Employer may by written notice terminate the Contract immediately. Any termination under this <a href=\"#clause-30.3\" class=\"clause-link\" data-clause-id=\"30.3\">Clause 30.3</a> shall be without prejudice to: (a) any rights for damages or compensation to which the Employer may be entitled under any applicable law; and (b) any rights or obligations which may have accrued due between the parties prior to such termination.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.4
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Unless the Contract is terminated in accordance with <a href=\"#clause-30.3\" class=\"clause-link\" data-clause-id=\"30.3\">Clause 30.3</a> (Termination following Default) the same shall continue in force and the entry by the Employer and expulsion of the Contractor shall not void the Contract, release the Contractor from any of its obligations or liabilities under the Contract or adversely affect any of the rights or powers conferred on the Employer, the Project Manager or the Supervision Consultant by the Contract. Following such entry and expulsion the Employer may (without prejudice to any other remedy) itself complete the Works and/or employ any other contractor or contractors to complete the Works at the Contractor''s risk and without any obligation to submit any Taking-Over Certificate or Final Certificate to the Contractor. For this purpose the Employer and/or any such other contractor may have free use of any of the Contractor''s Equipment without being responsible to the Contractor for loss or damage, wear and tear thereof. Further, the Employer may at any time sell any of the Contractor''s Equipment (for the purpose of which sale the Employer is hereby irrevocably appointed as the agent of the Contractor) and apply the nett proceeds of sale in or towards satisfaction of any monies due or which may become due from the Contractor. Following such entry and expulsion, the Contractor shall comply immediately at its own Cost with any instruction given by the Project Manager to remove from the Site and the Works any Contractor''s Equipment. Such instruction by the Project Manager may be given at any time following such entry and expulsion.'::jsonb
        ),
        '{general_condition}',
        'Unless the Contract is terminated in accordance with <a href=\"#clause-30.3\" class=\"clause-link\" data-clause-id=\"30.3\">Clause 30.3</a> (Termination following Default) the same shall continue in force and the entry by the Employer and expulsion of the Contractor shall not void the Contract, release the Contractor from any of its obligations or liabilities under the Contract or adversely affect any of the rights or powers conferred on the Employer, the Project Manager or the Supervision Consultant by the Contract. Following such entry and expulsion the Employer may (without prejudice to any other remedy) itself complete the Works and/or employ any other contractor or contractors to complete the Works at the Contractor''s risk and without any obligation to submit any Taking-Over Certificate or Final Certificate to the Contractor. For this purpose the Employer and/or any such other contractor may have free use of any of the Contractor''s Equipment without being responsible to the Contractor for loss or damage, wear and tear thereof. Further, the Employer may at any time sell any of the Contractor''s Equipment (for the purpose of which sale the Employer is hereby irrevocably appointed as the agent of the Contractor) and apply the nett proceeds of sale in or towards satisfaction of any monies due or which may become due from the Contractor. Following such entry and expulsion, the Contractor shall comply immediately at its own Cost with any instruction given by the Project Manager to remove from the Site and the Works any Contractor''s Equipment. Such instruction by the Project Manager may be given at any time following such entry and expulsion.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.4'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.5
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Where <a href=\"#clause-30.4\" class=\"clause-link\" data-clause-id=\"30.4\">Clause 30.4</a> (Continuation following Default) applies, the Project Manager shall, as soon as may be practicable after such entry by the Employer and expulsion of the Contractor, make such investigation and enquiries as he may think necessary and from the results thereof shall prepare and sign a final account which in his opinion shows all amounts which should have been within paragraphs (a) and (c) of <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) had the entry and expulsion been a termination under Clause 29 (Frustration and Force Majeure).'::jsonb
        ),
        '{general_condition}',
        'Where <a href=\"#clause-30.4\" class=\"clause-link\" data-clause-id=\"30.4\">Clause 30.4</a> (Continuation following Default) applies, the Project Manager shall, as soon as may be practicable after such entry by the Employer and expulsion of the Contractor, make such investigation and enquiries as he may think necessary and from the results thereof shall prepare and sign a final account which in his opinion shows all amounts which should have been within paragraphs (a) and (c) of <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) had the entry and expulsion been a termination under Clause 29 (Frustration and Force Majeure).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.5'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.6
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Where <a href=\"#clause-30.4\" class=\"clause-link\" data-clause-id=\"30.4\">Clause 30.4</a> (Continuation following Default) applies, the Employer shall not after the entry and expulsion be liable to make any payment whatsoever to the Contractor, whether in connection with the Contract or the Works or for any other reason of any kind until the expiration of the last date of expiry of a Defects Liability Period or any extension thereof for a Section or Portion of the Works, and thereafter until the Cost of completing the Works and all other Costs incurred by the Employer in relation thereto have been ascertained and the amount thereof certified by the Project Manager. The Employer shall (without prejudice to his right to recover from the Contractor damages arising out of the Contractor''s default together with damages for all consequential loss) then be liable to pay to the Contractor only an amount certified by the Project Manager and calculated as being: (a) the amount shown by the final account prepared in accordance with <a href=\"#clause-30.5\" class=\"clause-link\" data-clause-id=\"30.5\">Clause 30.5</a> (Valuation at Entry and Expulsion); less (b) the total of all payments already made to the Contractor pursuant to Interim Certificates or otherwise and to any Nominated Subcontractor under <a href=\"#clause-24.2\" class=\"clause-link\" data-clause-id=\"24.2\">Clause 24.2</a> (Delayed Payments to Nominated Subcontractors); less (c) any amount by which the Costs of completing the Works and other Costs incurred by the Employer in relation thereto exceed the difference between the amount which would have been payable to the Contractor upon due completion of the Works by it and the amounts shown by the final account; and less (d) any amount which is or becomes payable under <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> (Liquidated Damages). If the foregoing calculation should produce a negative result then the Contractor shall upon demand pay a sum equal to that result to the Employer and such sum shall be deemed a debt due from the Contractor to the Employer and be recoverable accordingly.'::jsonb
        ),
        '{general_condition}',
        'Where <a href=\"#clause-30.4\" class=\"clause-link\" data-clause-id=\"30.4\">Clause 30.4</a> (Continuation following Default) applies, the Employer shall not after the entry and expulsion be liable to make any payment whatsoever to the Contractor, whether in connection with the Contract or the Works or for any other reason of any kind until the expiration of the last date of expiry of a Defects Liability Period or any extension thereof for a Section or Portion of the Works, and thereafter until the Cost of completing the Works and all other Costs incurred by the Employer in relation thereto have been ascertained and the amount thereof certified by the Project Manager. The Employer shall (without prejudice to his right to recover from the Contractor damages arising out of the Contractor''s default together with damages for all consequential loss) then be liable to pay to the Contractor only an amount certified by the Project Manager and calculated as being: (a) the amount shown by the final account prepared in accordance with <a href=\"#clause-30.5\" class=\"clause-link\" data-clause-id=\"30.5\">Clause 30.5</a> (Valuation at Entry and Expulsion); less (b) the total of all payments already made to the Contractor pursuant to Interim Certificates or otherwise and to any Nominated Subcontractor under <a href=\"#clause-24.2\" class=\"clause-link\" data-clause-id=\"24.2\">Clause 24.2</a> (Delayed Payments to Nominated Subcontractors); less (c) any amount by which the Costs of completing the Works and other Costs incurred by the Employer in relation thereto exceed the difference between the amount which would have been payable to the Contractor upon due completion of the Works by it and the amounts shown by the final account; and less (d) any amount which is or becomes payable under <a href=\"#clause-19.3\" class=\"clause-link\" data-clause-id=\"19.3\">Clause 19.3</a> (Liquidated Damages). If the foregoing calculation should produce a negative result then the Contractor shall upon demand pay a sum equal to that result to the Employer and such sum shall be deemed a debt due from the Contractor to the Employer and be recoverable accordingly.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.6'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 30.7
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'Unless prohibited by law, the Contractor shall, if so instructed by the Project Manager, after such entry by the Employer referred to in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default), within fourteen (14) days of the receipt of such instruction assign to the Employer the benefit (and at the Employer''s option, the burden) of any agreement for the provision of any Plant, Contractor''s Equipment or services and/or for the carrying out of any work for the purposes of the Contract which the Contractor may have entered into with any Subcontractors.'::jsonb
        ),
        '{general_condition}',
        'Unless prohibited by law, the Contractor shall, if so instructed by the Project Manager, after such entry by the Employer referred to in <a href=\"#clause-30.2\" class=\"clause-link\" data-clause-id=\"30.2\">Clause 30.2</a> (Definition of Default), within fourteen (14) days of the receipt of such instruction assign to the Employer the benefit (and at the Employer''s option, the burden) of any agreement for the provision of any Plant, Contractor''s Equipment or services and/or for the carrying out of any work for the purposes of the Contract which the Contractor may have entered into with any Subcontractors.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '30.7'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 31.2
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Employer: (a) has failed to pay to the Contractor the nett amount or final nett amount shown by any Interim Certificate or Final Certificate within thirty (30) days after expiry of the period of thirty (30) days under Sub-Clause (b) of <a href=\"#clause-27.1\" class=\"clause-link\" data-clause-id=\"27.1\">Clause 27.1</a> (Time of Payment) and such failure is not due to the making by the Employer of any deduction or recovery from the Contractor which the Employer may be entitled to make under the Contract or otherwise; or (b) has compounded with or negotiated for any composition with or called any meeting of its creditors generally, has had a receiver of all or any of its assets appointed, has had a receiving order made against it, has had an administration order made against it, has entered into any liquidation (other than a voluntary liquidation for the purposes of amalgamation or reconstruction) or has taken or suffered any action analogous to any of the foregoing under the laws of the Country; then, subject (in any case where the event concerned is remediable) to the Contractor giving fourteen (14) days prior written notice to the Employer with a copy to the Project Manager and the event concerned not having been remedied before expiry of that notice, the Contractor may within fourteen (14) days after such expiry give a further written notice to the Employer which shall be effective to terminate the Contract immediately.'::jsonb
        ),
        '{general_condition}',
        'If the Employer: (a) has failed to pay to the Contractor the nett amount or final nett amount shown by any Interim Certificate or Final Certificate within thirty (30) days after expiry of the period of thirty (30) days under Sub-Clause (b) of <a href=\"#clause-27.1\" class=\"clause-link\" data-clause-id=\"27.1\">Clause 27.1</a> (Time of Payment) and such failure is not due to the making by the Employer of any deduction or recovery from the Contractor which the Employer may be entitled to make under the Contract or otherwise; or (b) has compounded with or negotiated for any composition with or called any meeting of its creditors generally, has had a receiver of all or any of its assets appointed, has had a receiving order made against it, has had an administration order made against it, has entered into any liquidation (other than a voluntary liquidation for the purposes of amalgamation or reconstruction) or has taken or suffered any action analogous to any of the foregoing under the laws of the Country; then, subject (in any case where the event concerned is remediable) to the Contractor giving fourteen (14) days prior written notice to the Employer with a copy to the Project Manager and the event concerned not having been remedied before expiry of that notice, the Contractor may within fourteen (14) days after such expiry give a further written notice to the Employer which shall be effective to terminate the Contract immediately.'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '31.2'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

-- Clause 31.3
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            'If the Contract is terminated under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Termination for Convenience) or <a href=\"#clause-31.2\" class=\"clause-link\" data-clause-id=\"31.2\">Clause 31.2</a> (Default of Employer) such termination shall be without prejudice to any rights or obligations which may have accrued due between the parties prior to such termination. Following such termination, the Contractor shall promptly cease all further work, except for such work as may be instructed by the Employer for the protection of life or property or for the safety of the Works, submit to the Project Manager all Contractor''s Drawings, comply with any instructions of the Employer in relation to Plant not yet delivered to Site, remove from the Site, with the prior consent of the Project Manager, all Contractor''s Equipment and submit to the Project Manager in triplicate an Interim Certificate application prepared and accompanied in accordance with <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) up to the time of termination. The Project Manager shall consider the Interim Certificate application, prepare an Interim Certificate up to such time and issue the same in accordance with <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Thereafter, as soon as the required documents and evidence have become available the Contractor shall prepare and submit to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion represent the items listed in paragraphs (a) to (d) inclusive of <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) together with the amount which in the Contractor''s opinion represents any other reasonably foreseeable loss or damage to the Contractor arising out of or in connection with such termination but excluding any loss of use or profit or indirect or consequential loss. Such final account shall be adjusted as appropriate to reflect the amounts in respect of the foregoing items which in the Project Manager''s opinion are fair and reasonable and the adjusted final account shall be agreed to and signed by the Project Manager and the Contractor. Thereupon the Contractor shall submit to the Project Manager in triplicate a Final Certificate application (prepared and accompanied in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates)) from which the Project Manager shall prepare and issue a Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Notwithstanding the said <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a>, where this Clause operates the Final Certificate shall not be evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates).'::jsonb
        ),
        '{general_condition}',
        'If the Contract is terminated under <a href=\"#clause-31.1\" class=\"clause-link\" data-clause-id=\"31.1\">Clause 31.1</a> (Termination for Convenience) or <a href=\"#clause-31.2\" class=\"clause-link\" data-clause-id=\"31.2\">Clause 31.2</a> (Default of Employer) such termination shall be without prejudice to any rights or obligations which may have accrued due between the parties prior to such termination. Following such termination, the Contractor shall promptly cease all further work, except for such work as may be instructed by the Employer for the protection of life or property or for the safety of the Works, submit to the Project Manager all Contractor''s Drawings, comply with any instructions of the Employer in relation to Plant not yet delivered to Site, remove from the Site, with the prior consent of the Project Manager, all Contractor''s Equipment and submit to the Project Manager in triplicate an Interim Certificate application prepared and accompanied in accordance with <a href=\"#clause-26.1\" class=\"clause-link\" data-clause-id=\"26.1\">Clause 26.1</a> (Application for Interim Certificates) up to the time of termination. The Project Manager shall consider the Interim Certificate application, prepare an Interim Certificate up to such time and issue the same in accordance with <a href=\"#clause-26.2\" class=\"clause-link\" data-clause-id=\"26.2\">Clause 26.2</a> (Issue of Interim Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Thereafter, as soon as the required documents and evidence have become available the Contractor shall prepare and submit to the Project Manager in triplicate a final account (together with all such documents and evidence as the Project Manager may require in order to substantiate the same) which shows and breaks down in such form and with such detail as the Project Manager may require all amounts which in the Contractor''s opinion represent the items listed in paragraphs (a) to (d) inclusive of <a href=\"#clause-29.8\" class=\"clause-link\" data-clause-id=\"29.8\">Clause 29.8</a> (Payment on Frustration or Force Majeure) together with the amount which in the Contractor''s opinion represents any other reasonably foreseeable loss or damage to the Contractor arising out of or in connection with such termination but excluding any loss of use or profit or indirect or consequential loss. Such final account shall be adjusted as appropriate to reflect the amounts in respect of the foregoing items which in the Project Manager''s opinion are fair and reasonable and the adjusted final account shall be agreed to and signed by the Project Manager and the Contractor. Thereupon the Contractor shall submit to the Project Manager in triplicate a Final Certificate application (prepared and accompanied in accordance with <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates)) from which the Project Manager shall prepare and issue a Final Certificate in accordance with <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a> (Issue of Final Certificates) and payment thereof shall be made in accordance with Clause 27 (Payment). Notwithstanding the said <a href=\"#clause-26.4\" class=\"clause-link\" data-clause-id=\"26.4\">Clause 26.4</a>, where this Clause operates the Final Certificate shall not be evidence of the matters stated in paragraph (a) of <a href=\"#clause-26.3\" class=\"clause-link\" data-clause-id=\"26.3\">Clause 26.3</a> (Application for Final Certificates).'::jsonb
    ),
    '{particular_condition}',
    ''::jsonb
)
WHERE item_data->>'clause_number' = '31.3'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);

COMMIT;

-- Verify the updates
SELECT 
    item_data->>'clause_number' as clause_number,
    CASE 
        WHEN item_data->>'clause_text' LIKE '%class="clause-link"%' THEN 'YES'
        ELSE 'NO'
    END as has_links
FROM contract_items
WHERE section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
)
ORDER BY item_data->>'clause_number'
LIMIT 20;

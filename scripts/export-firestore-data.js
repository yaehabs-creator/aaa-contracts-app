/**
 * Export script to migrate data from Firestore to Supabase
 * 
 * Usage:
 * 1. Set up Firebase Admin SDK credentials (service account key)
 * 2. Set FIREBASE_PROJECT_ID environment variable
 * 3. Run: node scripts/export-firestore-data.js
 * 
 * Output: Creates JSON files in ./migration-data/ directory
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Initialize Firebase Admin SDK
// You'll need to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or provide service account key path
const projectId = process.env.FIREBASE_PROJECT_ID || 'aaa-contract-department-f5a18';

let db;

try {
  // Try to initialize with default credentials
  initializeApp({
    projectId: projectId
  });
  db = getFirestore();
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  console.error('Please set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.error('or provide service account key in firebase-admin-config.json');
  process.exit(1);
}

const OUTPUT_DIR = './migration-data';

async function ensureDirectoryExists(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function exportUsers() {
  console.log('📤 Exporting users...');
  const usersSnapshot = await db.collection('users').get();
  const users = [];
  
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    users.push({
      uid: doc.id,
      ...data,
      // Convert Firestore Timestamp to milliseconds
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
      lastLogin: data.lastLogin?.toMillis?.() || data.lastLogin || null
    });
  });
  
  await writeFile(
    join(OUTPUT_DIR, 'users.json'),
    JSON.stringify(users, null, 2)
  );
  
  console.log(`✅ Exported ${users.length} users`);
  return users;
}

async function exportContracts() {
  console.log('📤 Exporting contracts...');
  const contractsSnapshot = await db.collection('contracts').get();
  const contracts = [];
  
  for (const doc of contractsSnapshot.docs) {
    const data = doc.data();
    const contractId = doc.id;
    
    // Check if contract uses subcollections
    const usesSubcollections = data._usesSubcollections || false;
    
    let contract = {
      id: contractId,
      name: data.name,
      timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
      metadata: data.metadata || {},
      clauses: data.clauses || null,
      sections: data.sections || null,
      usesSubcollections: usesSubcollections
    };
    
    // If contract uses subcollections, export sections and items
    if (usesSubcollections) {
      contract.sections = [];
      
      // Export sections
      const sectionsSnapshot = await db
        .collection('contracts')
        .doc(contractId)
        .collection('sections')
        .get();
      
      for (const sectionDoc of sectionsSnapshot.docs) {
        const sectionData = sectionDoc.data();
        const sectionType = sectionDoc.id;
        
        // Export items for this section
        const itemsSnapshot = await db
          .collection('contracts')
          .doc(contractId)
          .collection('sections')
          .doc(sectionType)
          .collection('items')
          .get();
        
        const items = [];
        itemsSnapshot.forEach(itemDoc => {
          items.push(itemDoc.data());
        });
        
        // Sort items by orderIndex
        items.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        contract.sections.push({
          sectionType: sectionData.sectionType || sectionType,
          title: sectionData.title,
          items: items
        });
      }
    }
    
    // Convert Firestore Timestamps in nested data
    if (contract.clauses) {
      contract.clauses = contract.clauses.map(clause => ({
        ...clause,
        // Handle any timestamp fields in clauses
      }));
    }
    
    contracts.push(contract);
  }
  
  await writeFile(
    join(OUTPUT_DIR, 'contracts.json'),
    JSON.stringify(contracts, null, 2)
  );
  
  console.log(`✅ Exported ${contracts.length} contracts`);
  return contracts;
}

async function exportActivityLogs() {
  console.log('📤 Exporting activity logs...');
  const logsSnapshot = await db.collection('activityLogs').get();
  const logs = [];
  
  logsSnapshot.forEach(doc => {
    const data = doc.data();
    logs.push({
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toMillis?.() || data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
    });
  });
  
  await writeFile(
    join(OUTPUT_DIR, 'activity_logs.json'),
    JSON.stringify(logs, null, 2)
  );
  
  console.log(`✅ Exported ${logs.length} activity logs`);
  return logs;
}

async function main() {
  console.log('🚀 Starting Firestore data export...\n');
  
  await ensureDirectoryExists(OUTPUT_DIR);
  
  try {
    const users = await exportUsers();
    const contracts = await exportContracts();
    const logs = await exportActivityLogs();
    
    // Create summary
    const summary = {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        contracts: contracts.length,
        activityLogs: logs.length
      }
    };
    
    await writeFile(
      join(OUTPUT_DIR, 'export-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Export completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Contracts: ${contracts.length}`);
    console.log(`   - Activity Logs: ${logs.length}`);
    console.log(`\n📁 Data exported to: ${OUTPUT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

main();

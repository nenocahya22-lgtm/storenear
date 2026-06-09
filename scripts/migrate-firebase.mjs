import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const oldConfig = {
  projectId: "quick-codex-1cf5x",
  appId: "1:540332291979:web:a7eb10f36506c6830fa18e",
  apiKey: "AIzaSyCbKLmaJUA2CEtdodtdmhivSaEFPK7bd7I",
  authDomain: "quick-codex-1cf5x.firebaseapp.com",
  storageBucket: "quick-codex-1cf5x.firebasestorage.app",
  messagingSenderId: "540332291979"
};

const newConfig = {
  apiKey: "AIzaSyDAoTZXv7H849mwP4A29_Ohhbri7_ztLm4",
  authDomain: "near-bakery-store.firebaseapp.com",
  projectId: "near-bakery-store",
  storageBucket: "near-bakery-store.firebasestorage.app",
  messagingSenderId: "372268498721",
  appId: "1:372268498721:web:b53913da71aae373154860",
  measurementId: "G-PZ14L7218E"
};

console.log('Initializing Firebase apps...');
const oldApp = initializeApp(oldConfig, 'old');
const newApp = initializeApp(newConfig, 'new');

// Try both databases in old project
const OLD_DATABASE_CUSTOM = 'ai-studio-9e420702-3e63-4587-a7e9-2f225c2ac0c6';
const oldDbCustom = getFirestore(oldApp, OLD_DATABASE_CUSTOM);
const oldDbDefault = getFirestore(oldApp); // (default)
const newDb = getFirestore(newApp);

const collections = ['webstore_config', 'products', 'orders', 'cabang_subdomains', 'erp_notifications'];

async function checkCollection(db, dbLabel) {
  const allData = {};
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.docs.length > 0) {
        allData[colName] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
        console.log(`  [${dbLabel}] ${colName}: ${snap.docs.length} docs`);
      }
    } catch (err) {
      console.log(`  [${dbLabel}] ${colName}: ERROR - ${err.message}`);
    }
  }
  return allData;
}

async function migrate() {
  console.log('\n=== Checking CUSTOM database ===');
  const customData = await checkCollection(oldDbCustom, 'CUSTOM');
  
  console.log('\n=== Checking DEFAULT database ===');
  const defaultData = await checkCollection(oldDbDefault, 'DEFAULT');
  
  // Merge data from both
  const merged = {};
  for (const col of collections) {
    merged[col] = [];
    if (customData[col]) merged[col].push(...customData[col]);
    if (defaultData[col]) merged[col].push(...defaultData[col]);
    // Deduplicate by id
    const seen = new Set();
    merged[col] = merged[col].filter(doc => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  }
  
  console.log('\n=== Writing to NEW project ===');
  for (const colName of collections) {
    const docs = merged[colName] || [];
    if (docs.length === 0) {
      console.log(`  ${colName}: SKIP (no data)`);
      continue;
    }
    let count = 0;
    for (const { id, data } of docs) {
      const cleanData = JSON.parse(JSON.stringify(data));
      await setDoc(doc(newDb, colName, id), cleanData);
      count++;
    }
    console.log(`  ✅ ${colName}: ${count} docs written`);
  }
  
  console.log('\n🎉 Migration complete!');
}

migrate().catch(console.error);

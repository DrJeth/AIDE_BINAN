// Migration Script - Run this once sa Firebase Console o sa Node.js backend
// Purpose: Convert twoFAEnabled from string to boolean

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateTwoFAData() {
  try {
    console.log("Starting 2FA data migration...");
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let migratedCount = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        
        // Check if twoFAEnabled exists and fix it
        if ('twoFAEnabled' in data) {
          const currentValue = data.twoFAEnabled;
          const newValue = currentValue === 'true' || currentValue === true; // Convert to boolean
          
          if (typeof currentValue !== 'boolean') {
            console.log(`Converting ${doc.id}: "${currentValue}" (${typeof currentValue}) -> ${newValue} (boolean)`);
            
            await doc.ref.update({
              twoFAEnabled: newValue
            });
            
            migratedCount++;
          }
        } else {
          // Add twoFAEnabled field if missing
          await doc.ref.update({
            twoFAEnabled: false
          });
          migratedCount++;
        }
      } catch (error) {
        console.error(`Error processing ${doc.id}:`, error);
        errors++;
      }
    }
    
    console.log(`Migration complete! Migrated: ${migratedCount}, Errors: ${errors}`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateTwoFAData();
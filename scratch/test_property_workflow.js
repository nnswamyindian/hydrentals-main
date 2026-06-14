const Database = require('c:/Users/nnswa/Downloads/hydrentals-main-main/server/db');
const jwt = require('c:/Users/nnswa/Downloads/hydrentals-main-main/server/node_modules/jsonwebtoken');
const { JWT_SECRET } = require('c:/Users/nnswa/Downloads/hydrentals-main-main/server/middleware/auth');

(async () => {
  try {
    console.log('--- START WORKFLOW TEST ---');

    // 1. Get test accounts
    const owner = Database.prepare("SELECT id, email, role FROM users WHERE role = 'owner' LIMIT 1").get();
    const admin = Database.prepare("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1").get();

    if (!owner || !admin) {
      throw new Error('Test owner or admin accounts not found in database.');
    }

    console.log(`Using owner: ${owner.email} (${owner.id})`);
    console.log(`Using admin: ${admin.email} (${admin.id})`);

    // Sign JWT tokens
    const ownerToken = jwt.sign({ id: owner.id, email: owner.email, role: owner.role }, JWT_SECRET);
    const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET);

    const propertyId = 'test-property-' + Date.now();
    const propertyTitle = 'Test Automated Property ' + Date.now();

    // 2. Perform property insert via API
    console.log('\nStep 1: Inserting property via rest API...');
    const insertRes = await fetch('http://localhost:3000/api/rest', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        table: 'properties',
        action: 'insert',
        payload: {
          id: propertyId,
          owner_id: owner.id,
          title: propertyTitle,
          locality: 'Gachibowli',
          rent: 45000,
          status: 'pending'
        }
      })
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      throw new Error(`Insert failed: ${insertRes.status} - ${text}`);
    }
    const insertData = await insertRes.json();
    console.log('Insert response:', insertData);

    // Give asynchronous notifications/emails a brief moment to run
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. Verify notifications in database
    console.log('\nStep 2: Verifying submission notifications...');
    const ownerNotif = Database.prepare("SELECT * FROM notifications WHERE user_id = ? AND link = '/my-properties' ORDER BY created_at DESC LIMIT 1").get(owner.id);
    const adminNotif = Database.prepare("SELECT * FROM notifications WHERE user_id = ? AND link = '/admin/properties' ORDER BY created_at DESC LIMIT 1").get(admin.id);

    console.log('Owner notification:', ownerNotif);
    console.log('Admin notification:', adminNotif);

    if (!ownerNotif || !ownerNotif.title.includes('Submitted')) {
      throw new Error('Owner submission notification is missing or incorrect!');
    }
    if (!adminNotif || !adminNotif.title.includes('Pending')) {
      throw new Error('Admin pending approval notification is missing or incorrect!');
    }
    console.log('✅ Submission notifications verified successfully.');

    // 4. Update status to 'approved' via API
    console.log('\nStep 3: Approving property via update API...');
    const updateRes = await fetch('http://localhost:3000/api/rest', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        table: 'properties',
        action: 'update',
        payload: {
          status: 'approved'
        },
        modifiers: [
          { type: 'eq', column: 'id', value: propertyId }
        ]
      })
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`Update failed: ${updateRes.status} - ${text}`);
    }
    const updateData = await updateRes.json();
    console.log('Update response:', updateData);

    // Wait for async update notification
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Verify status update notification in database
    console.log('\nStep 4: Verifying approval notification...');
    const approvalNotif = Database.prepare("SELECT * FROM notifications WHERE user_id = ? AND title LIKE 'Property Approved%' ORDER BY created_at DESC LIMIT 1").get(owner.id);
    console.log('Owner approval notification:', approvalNotif);

    if (!approvalNotif || !approvalNotif.body.includes(propertyTitle)) {
      throw new Error('Owner approval notification is missing or does not reference property title!');
    }
    console.log('✅ Status update notification verified successfully.');
    console.log('--- ALL WORKFLOW TESTS PASSED ---');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
  }
})();

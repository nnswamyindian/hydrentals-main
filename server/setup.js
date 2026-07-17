const db = require('./db');

(async () => {
  try {
    console.log('Initializing MySQL database...');

    // Users Table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(50) DEFAULT 'tenant',
      is_verified TINYINT(1) DEFAULT 0,
      avatar_url LONGTEXT,
      verification_token VARCHAR(255),
      otp_expires_at BIGINT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

    // Properties Table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id VARCHAR(36) PRIMARY KEY,
      owner_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description LONGTEXT,
      property_type VARCHAR(100),
      room_type VARCHAR(100),
      listing_type VARCHAR(50) DEFAULT 'rent',
      rent FLOAT,
      sale_price FLOAT,
      deposit FLOAT,
      maintenance FLOAT,
      locality VARCHAR(255),
      address LONGTEXT,
      city VARCHAR(100) DEFAULT 'Hyderabad',
      pincode VARCHAR(20),
      latitude FLOAT,
      longitude FLOAT,
      furnished_status VARCHAR(100),
      amenities LONGTEXT,
      tenant_preference VARCHAR(100) DEFAULT 'any',
      gender_preference VARCHAR(100) DEFAULT 'any',
      food_available TINYINT(1) DEFAULT 0,
      pets_allowed TINYINT(1) DEFAULT 0,
      available_from VARCHAR(100),
      images LONGTEXT,
      is_verified TINYINT(1) DEFAULT 0,
      is_direct_owner TINYINT(1) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      unavailable_dates LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Payments Table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      amount FLOAT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      payment_type VARCHAR(100),
      payment_method VARCHAR(100),
      transaction_id VARCHAR(255),
      razorpay_order_id VARCHAR(255),
      razorpay_payment_id VARCHAR(255),
      razorpay_signature VARCHAR(255),
      payment_link LONGTEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    `);

    // Favorites
    await db.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
      UNIQUE(user_id, property_id)
    );
    `);

    // Messages
    await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36),
      content LONGTEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Notifications
    await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body LONGTEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      link LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Saved Searches
    await db.execute(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      filters LONGTEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Visit Requests
    await db.execute(`
    CREATE TABLE IF NOT EXISTS visit_requests (
      id VARCHAR(36) PRIMARY KEY,
      property_id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      owner_id VARCHAR(36),
      visit_date VARCHAR(100),
      visit_time VARCHAR(100),
      note LONGTEXT,
      status VARCHAR(50) DEFAULT 'pending',
      message LONGTEXT,
      scheduled_visit DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY(tenant_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Complaints
    await db.execute(`
    CREATE TABLE IF NOT EXISTS complaints (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description LONGTEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    `);

    // Reviews
    await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    `);

    // Property Views
    await db.execute(`
    CREATE TABLE IF NOT EXISTS property_views (
      id VARCHAR(36) PRIMARY KEY,
      property_id VARCHAR(36) NOT NULL,
      session_id VARCHAR(255) NOT NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    `);

    // Property Reports
    await db.execute(`
    CREATE TABLE IF NOT EXISTS property_reports (
      id VARCHAR(36) PRIMARY KEY,
      reporter_id VARCHAR(36) NOT NULL,
      property_id VARCHAR(36) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      description LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    `);

    // Community Badges
    await db.execute(`
    CREATE TABLE IF NOT EXISTS community_badges (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      badge_name VARCHAR(100) NOT NULL,
      badge_code VARCHAR(100),
      description LONGTEXT,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    // Broker Complaints
    await db.execute(`
    CREATE TABLE IF NOT EXISTS broker_complaints (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      complainant_name VARCHAR(255) NOT NULL,
      complainant_email VARCHAR(255) NOT NULL,
      complainant_phone VARCHAR(50),
      broker_name VARCHAR(255) NOT NULL,
      broker_phone VARCHAR(50),
      property_reference VARCHAR(255),
      description LONGTEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    `);

    console.log('Database schema created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error setting up DB schema:', err);
    process.exit(1);
  }
})();

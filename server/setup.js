const db = require('./db');

console.log('Initializing SQLite database...');

// Users Table (combines auth.users and public.profiles)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'tenant',
  is_verified BOOLEAN DEFAULT 0,
  avatar_url TEXT,
  verification_token TEXT,
  otp_expires_at INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Properties Table
db.exec(`
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT,
  room_type TEXT,
  listing_type TEXT DEFAULT 'rent',
  rent REAL,
  sale_price REAL,
  deposit REAL,
  maintenance REAL,
  locality TEXT,
  address TEXT,
  city TEXT DEFAULT 'Hyderabad',
  pincode TEXT,
  latitude REAL,
  longitude REAL,
  furnished_status TEXT,
  amenities TEXT, -- stored as JSON array string
  tenant_preference TEXT DEFAULT 'any',
  gender_preference TEXT DEFAULT 'any',
  food_available BOOLEAN DEFAULT 0,
  pets_allowed BOOLEAN DEFAULT 0,
  available_from TEXT,
  images TEXT, -- stored as JSON array string
  is_verified BOOLEAN DEFAULT 0,
  is_direct_owner BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'pending',
  unavailable_dates TEXT, -- stored as JSON array string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Payments Table
db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_type TEXT,
  payment_method TEXT,
  transaction_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_link TEXT,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`);

// Favorites
db.exec(`
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE(user_id, property_id)
);
`);

// Messages
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  property_id TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Notifications
db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Saved Searches
db.exec(`
CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters TEXT NOT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Visit Requests
db.exec(`
CREATE TABLE IF NOT EXISTS visit_requests (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  owner_id TEXT,
  visit_date TEXT,
  visit_time TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  message TEXT,
  scheduled_visit DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Complaints
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`);

// Reviews
db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`);

// Property Views
db.exec(`
CREATE TABLE IF NOT EXISTS property_views (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`);

// Property Reports
db.exec(`
CREATE TABLE IF NOT EXISTS property_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`);

// Community Badges
db.exec(`
CREATE TABLE IF NOT EXISTS community_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_code TEXT,
  description TEXT,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Broker Complaints (Report a Broker from Contact page)
db.exec(`
CREATE TABLE IF NOT EXISTS broker_complaints (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  complainant_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  complainant_phone TEXT,
  broker_name TEXT NOT NULL,
  broker_phone TEXT,
  property_reference TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
`);

console.log('Database schema created successfully.');

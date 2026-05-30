const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    let { table, action, columns, payload, modifiers } = req.body;

    if (table === 'user_roles') {
      table = 'users';
      if (action === 'select') {
         modifiers = modifiers.map(m => m.column === 'user_id' ? {...m, column: 'id'} : m);
      } else if (action === 'insert') {
         action = 'update';
         payload = { role: payload.role };
         modifiers = [{ type: 'eq', column: 'id', value: req.body.payload.user_id }];
      }
    }

    if (table === 'profiles_public' || table === 'profiles') {
      table = 'users'; // Map alias used for real-time messaging
    }

    // Verify User Role via JWT Context
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try { user = jwt.verify(token, JWT_SECRET); } catch (e) { }
    }

    // Security Gate check
    if (action === 'insert' && table === 'properties' && payload) {
      payload.status = 'pending';
      if (!user) return res.status(401).json({ error: 'Unauthorized to insert property' });
    }

    if (action === 'select') {
      let queryStr = `SELECT * FROM ${table.replace(/[^a-zA-Z0-9_]/g, '')} WHERE 1=1`;
      let params = [];

      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
        if (mod.type === 'neq') { queryStr += ` AND ${mod.column} != ?`; params.push(mod.value); }
        if (mod.type === 'gte') { queryStr += ` AND ${mod.column} >= ?`; params.push(mod.value); }
        if (mod.type === 'lte') { queryStr += ` AND ${mod.column} <= ?`; params.push(mod.value); }
        if (mod.type === 'ilike') { queryStr += ` AND ${mod.column} LIKE ?`; params.push(mod.value.replace(/%/g, '')); }
        if (mod.type === 'in') {
          const placeholders = mod.value.map(() => '?').join(',');
          queryStr += ` AND ${mod.column} IN (${placeholders})`;
          params.push(...mod.value);
        }
        if (mod.type === 'contains') { 
          // SQLite JSON / List String approximation
          queryStr += ` AND ${mod.column} LIKE ?`; 
          params.push(`%${mod.value.replace(/\[|\]/g, '')}%`); 
        }
        if (mod.type === 'or') {
          const conditions = mod.value.split(',');
          const parsed = conditions.map(c => {
            const [col, op, val] = c.split('.');
            params.push(val.replace(/%/g, ''));
            return `${col} LIKE '%' || ? || '%'`;
          });
          queryStr += ` AND (${parsed.join(' OR ')})`;
        }
      });

      const orderMod = modifiers.find(m => m.type === 'order');
      if (orderMod) {
        queryStr += ` ORDER BY ${orderMod.column} ${orderMod.value ? 'ASC' : 'DESC'}`;
      }

      const rangeMod = modifiers.find(m => m.type === 'range');
      if (rangeMod) {
        queryStr += ` LIMIT ${rangeMod.to - rangeMod.from + 1} OFFSET ${rangeMod.from}`;
      } else {
        const limitMod = modifiers.find(m => m.type === 'limit');
        if (limitMod) {
          queryStr += ` LIMIT ${limitMod.value}`;
        } else {
          const hasSingle = modifiers.some(m => m.type === 'single' || m.type === 'maybeSingle');
          if (hasSingle) queryStr += ' LIMIT 1';
        }
      }

      try {
        const stmt = db.prepare(queryStr);
        let data = stmt.all(...params);

        const arrayFields = ['images', 'amenities', 'unavailable_dates'];
        
        // Deep formatting & recursive joins
        data = data.map(d => {
           for (const field of arrayFields) {
               if (d[field]) {
                   try { d[field] = JSON.parse(d[field]); } catch(e) { d[field] = []; }
               } else if (d[field] === null && table === 'properties') {
                   d[field] = []; // explicit fallback mapping
               }
           }
           if (d.filters) {
               try { d.filters = JSON.parse(d.filters); } catch(e) { d.filters = {}; }
           }

           // Explicit booleans casting for typical Supabase hooks
           ['is_verified', 'is_direct_owner', 'food_available', 'pets_allowed', 'is_read'].forEach(bool => {
              if (d[bool] !== undefined) d[bool] = Boolean(d[bool]);
           });
           
           return d;
        });

        if (columns) {
          if (columns.includes('profiles_public')) {
            const profiles = db.prepare('SELECT id, is_verified, full_name, avatar_url FROM users').all();
            data = data.map(d => {
               d.profiles_public = profiles.find(p => p.id === d.owner_id) || null;
               return d;
            });
          }
          if (columns.includes('properties')) {
            const allPropsRaw = db.prepare('SELECT * FROM properties').all();
            data = data.map(d => {
               const matchingProp = allPropsRaw.find(p => p.id === d.property_id);
               if (matchingProp) {
                  for (const field of arrayFields) {
                     if (matchingProp[field]) {
                         try { matchingProp[field] = JSON.parse(matchingProp[field]); } catch(e) { matchingProp[field] = []; }
                     } else {
                         matchingProp[field] = [];
                     }
                  }
                  ['is_verified', 'is_direct_owner', 'food_available', 'pets_allowed'].forEach(bool => {
                     if (matchingProp[bool] !== undefined) matchingProp[bool] = Boolean(matchingProp[bool]);
                  });
               }
               d.properties = matchingProp || null;
               return d;
            });
          }
        }

        res.json({ data });
      } catch (sqlErr) {
        console.error('REST Select SQLite Parse Warning:', sqlErr.message);
        res.json({ data: [] });
      }
    } 
    
    else if (action === 'insert') {
      if (!payload.id) payload.id = crypto.randomUUID();
      
      const keys = Object.keys(payload);
      const insertKeys = keys.join(',');
      const insertBind = keys.map(() => '?').join(',');
      const queryStr = `INSERT INTO ${table} (${insertKeys}) VALUES (${insertBind})`;
      
      try {
        const bindValues = Object.values(payload).map(v => {
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
        });
        console.log(`[REST Insert] Table: ${table}`);
        console.log(`[REST Insert] Query: ${queryStr}`);
        console.log(`[REST Insert] BindValues:`, bindValues);
        
        db.prepare(queryStr).run(bindValues);
        const insertedRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(payload.id);
        
        // Ensure returning actual object so the client doesn't get an empty/null that drops their UI updates
        const returnData = insertedRow ? insertedRow : payload;
        
        res.json({ data: [returnData] });
      } catch (sqlErr) {
        console.error('[REST Insert SQL Error]', sqlErr.message);
        res.status(500).json({ data: null, error: sqlErr.message });
      }
    }

    else if (action === 'update') {
      const keys = Object.keys(payload);
      const setArray = keys.map(k => `${k} = ?`).join(', ');
      
      let queryStr = `UPDATE ${table} SET ${setArray} WHERE 1=1`;
      let params = Object.values(payload).map(v => {
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
      });

      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
      });

      try {
        db.prepare(queryStr).run(...params);
        res.json({ data: [payload] });
      } catch (sqlErr) {
         res.json({ data: null, error: sqlErr.message });
      }
    }
    
    else if (action === 'delete') {
      let queryStr = `DELETE FROM ${table} WHERE 1=1`;
      let params = [];
      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
      });
      try {
        db.prepare(queryStr).run(...params);
        res.json({ data: [] });
      } catch (sqlErr) {
         res.json({ data: null, error: sqlErr.message });
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'API REST Compilation Error' });
  }
});

module.exports = router;

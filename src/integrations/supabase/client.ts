// @ts-nocheck
class SupabaseQueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.modifiers = [];
  }

  select(columns = '*') { if (!this.action) this.action = 'select'; this.columns = columns; return this; }
  insert(data) { this.action = 'insert'; this.payload = data; return this; }
  update(data) { this.action = 'update'; this.payload = data; return this; }
  delete() { this.action = 'delete'; return this; }

  eq(column, value) { this.modifiers.push({ type: 'eq', column, value }); return this; }
  neq(column, value) { this.modifiers.push({ type: 'neq', column, value }); return this; }
  in(column, values) { this.modifiers.push({ type: 'in', column, value: values }); return this; }
  gte(column, value) { this.modifiers.push({ type: 'gte', column, value }); return this; }
  lte(column, value) { this.modifiers.push({ type: 'lte', column, value }); return this; }
  order(column, options = { ascending: true }) { this.modifiers.push({ type: 'order', column, value: options.ascending }); return this; }
  ilike(column, value) { this.modifiers.push({ type: 'ilike', column, value }); return this; }
  contains(column, value) { this.modifiers.push({ type: 'contains', column, value }); return this; }
  or(filterStr) { this.modifiers.push({ type: 'or', value: filterStr }); return this; }
  range(from, to) { this.modifiers.push({ type: 'range', from, to }); return this; }
  limit(count) { this.modifiers.push({ type: 'limit', value: count }); return this; }
  single() { this.modifiers.push({ type: 'single' }); return this; }
  maybeSingle() { this.modifiers.push({ type: 'maybeSingle' }); return this; }

  async execute() {
    try {
      const token = localStorage.getItem('supabase-auth-token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/rest'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          payload: this.payload,
          modifiers: this.modifiers
        })
      });
      
      const responseBody = await res.json();
      if (!res.ok) return { data: null, error: { message: responseBody.error || 'API Error' } };
      
      let finalData = responseBody.data;
      const isSingle = this.modifiers.some(m => m.type === 'single' || m.type === 'maybeSingle');
      
      if (isSingle && Array.isArray(finalData)) finalData = finalData[0] || null;

      return { data: finalData, error: null };
    } catch(err) {
      return { data: null, error: { message: err.message } };
    }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

class SupabaseMock {
  from(table) {
    return new SupabaseQueryBuilder(table);
  }
  
  auth = {
    listeners: [],
    onAuthStateChange: function(callback) {
      const token = localStorage.getItem('supabase-auth-token');
      const userStr = localStorage.getItem('supabase-auth-user');
      const session = token && userStr ? { user: JSON.parse(userStr), access_token: token } : null;
      callback('INITIAL_SESSION', session);
      this.listeners.push(callback);
      return { data: { subscription: { unsubscribe: () => { this.listeners = this.listeners.filter(l => l !== callback) } } } };
    },
    getSession: async function() {
      const token = localStorage.getItem('supabase-auth-token');
      const userStr = localStorage.getItem('supabase-auth-user');
      const session = token && userStr ? { user: JSON.parse(userStr), access_token: token } : null;
      return { data: { session }, error: null };
    },
    getUser: async function() {
      const userStr = localStorage.getItem('supabase-auth-user');
      return { data: { user: userStr ? JSON.parse(userStr) : null }, error: null };
    },
    signUp: async function({ email, password, options }) {
      const res = await fetch(getApiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          name: options?.data?.full_name || 'User', 
          phone: options?.data?.phone || '', 
          role: options?.data?.role || 'tenant' 
        })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      
      if (data.session) {
        localStorage.setItem('supabase-auth-token', data.session.access_token);
        localStorage.setItem('supabase-auth-user', JSON.stringify(data.user));
        this.listeners.forEach(cb => cb('SIGNED_IN', data.session));
      }
      
      return { data: { user: data.user, session: data.session }, error: null };
    },
    signInWithPassword: async function({ email, password }) {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      localStorage.setItem('supabase-auth-token', data.token);
      localStorage.setItem('supabase-auth-user', JSON.stringify(data.user));
      const session = { user: data.user, access_token: data.token };
      this.listeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: { user: data.user, session }, error: null };
    },
    signOut: async function() {
      localStorage.removeItem('supabase-auth-token');
      localStorage.removeItem('supabase-auth-user');
      this.listeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    resetPasswordForEmail: async function(email) {
      const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      
      // Store token so ResetPassword can get the session
      localStorage.setItem('supabase-auth-token', data.token);
      localStorage.setItem('supabase-auth-user', JSON.stringify(data.user));
      
      return { data: {}, error: null };
    },
    updateUser: async function({ password }) {
      const token = localStorage.getItem('supabase-auth-token');
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      return { data: { user: data.user }, error: null };
    }
  };

  storage = {
    from: (bucket) => ({
      upload: async (path, file) => {
        const formData = new FormData();
        formData.append('images', file);
        const res = await fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) return { error: { message: data.error } };
        return { data: { path: data.images[0] }, error: null };
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: path.startsWith('http') ? path : getApiUrl(path) } };
      }
    })
  };

  functions = {
    invoke: async (name, options) => {
      try {
        const token = localStorage.getItem('supabase-auth-token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(getApiUrl(`/api/edge/${name}`), {
          method: 'POST',
          headers,
          body: JSON.stringify(options?.body || {})
        });
        
        const data = await res.json();
        if (!res.ok) return { data: null, error: { message: data.error } };
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  };

  removeChannel(channel) {
    if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe();
  }

  channel(name) {
    return {
      on: (event, filter, callback) => {
        // Mock chainable pipeline avoiding React DOM crashes
        return this.channel(name);
      },
      subscribe: (callback) => {
        if (typeof callback === 'function') callback('SUBSCRIBED');
        return { unsubscribe: () => {} };
      }
    };
  }
}

export const supabase = new SupabaseMock();

export const getApiUrl = (path: string): string => {
  const base = import.meta.env.VITE_API_URL || 
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : window.location.origin);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
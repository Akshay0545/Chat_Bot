// src/services/api.js

// ---- Base URL resolution ----
// In prod set: VITE_API_URL=https://chat-bot-4oy4.onrender.com/api
// (No trailing slash needed; this code handles both cases.)
const RAW_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL || // optional alias if you use it elsewhere
  'http://localhost:5000/api';

// Normalize base (no trailing slash)
const API_BASE = RAW_BASE.replace(/\/+$/, '');

// Join base + endpoint safely (single slash)
function joinUrl(base, endpoint) {
  if (!endpoint) return base;
  // If endpoint is already absolute (http/https), use it as-is
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const left = base.replace(/\/+$/, '');
  const right = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${left}${right}`;
}

// Attempt to parse JSON; fall back to raw text
async function parseResponseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = joinUrl(this.baseURL, endpoint);

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Stringify body if it's a plain object and method expects a body
    let body = options.body;
    const method = (options.method || 'GET').toUpperCase();
    const hasJsonBody = body && typeof body === 'object' && !(body instanceof FormData);
    if (hasJsonBody && method !== 'GET' && method !== 'HEAD') {
      body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, {
        // Keep credentials optional; you’re using Bearer tokens.
        // If you later switch to httpOnly cookies, set credentials: 'include'.
        credentials: options.credentials || 'same-origin',
        ...options,
        method,
        headers,
        body,
      });
    } catch (networkErr) {
      // e.g., CORS blocked, DNS, offline
      console.error('API network error:', networkErr);
      throw new Error('Failed to fetch');
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      // Try to extract a meaningful message
      let errMessage = `HTTP error! status: ${response.status}`;
      if (isJson) {
        const data = await parseResponseBody(response);
        if (data && typeof data === 'object' && (data.message || data.error)) {
          errMessage = data.message || data.error;
        }
      } else {
        const text = await parseResponseBody(response);
        if (typeof text === 'string' && text.trim()) errMessage = text;
      }
      throw new Error(errMessage);
    }

    // No-content or plain text responses
    if (response.status === 204) return null;
    if (!isJson) return parseResponseBody(response);

    // JSON
    return parseResponseBody(response);
  }

  // ---------- Auth ----------
  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  refreshToken(refreshToken) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  getCurrentUser() {
    return this.request('/auth/me');
  }

  // ---------- Chat ----------
  getConversations() {
    return this.request('/chat/conversations');
  }

  createConversation(title) {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: { title },
    });
  }

  getMessages(conversationId, page = 1, limit = 50) {
    return this.request(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  sendMessage(conversationId, content) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
    });
  }

  deleteConversation(conversationId) {
    return this.request(`/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  updateConversation(conversationId, title) {
    return this.request(`/chat/conversations/${conversationId}`, {
      method: 'PUT',
      body: { title },
    });
  }

  // ---------- User ----------
  getUserProfile() {
    return this.request('/user/profile');
  }

  updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  getNotifications(page = 1, limit = 20, unreadOnly = false) {
    return this.request(`/user/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
  }

  markNotificationRead(notificationId) {
    return this.request(`/user/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  markAllNotificationsRead() {
    return this.request('/user/notifications/read-all', {
      method: 'PUT',
    });
  }

  deleteNotification(notificationId) {
    return this.request(`/user/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  getUserStats() {
    return this.request('/user/stats');
  }
}

export default new ApiService();

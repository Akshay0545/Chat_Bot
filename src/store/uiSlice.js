import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  notificationPanelOpen: false,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    toggleNotificationPanel: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.notificationPanelOpen = action.payload;
      } else {
        state.notificationPanelOpen = !state.notificationPanelOpen;
      }
    },
    addNotification: (state, action) => {
      console.log('Adding notification to Redux:', action.payload);
      
      // Check if notification already exists to prevent duplicates
      const existingNotification = state.notifications.find(n => n.id === action.payload.id);
      if (existingNotification) {
        console.log('Duplicate notification prevented:', action.payload.id);
        return;
      }
      
      state.notifications.unshift(action.payload);
    },
    markNotificationRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
  },
});

export const { 
  toggleSidebar, 
  toggleNotificationPanel, 
  addNotification, 
  markNotificationRead,
  markAllNotificationsRead
} = uiSlice.actions;
export default uiSlice.reducer;
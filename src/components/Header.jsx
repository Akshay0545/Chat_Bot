import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { toggleNotificationPanel, markAllNotificationsRead } from '../store/uiSlice';
import { logout } from '../store/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { notificationPanelOpen, notifications } = useSelector((state) => state.ui);
  
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead());
  };

  return (
            <header className="w-full bg-white shadow-md px-4 py-3 flex items-center justify-between relative z-10">
      <div className="flex items-center space-x-4">
        <h1 className="font-bold text-gray-900" style={{ fontSize: '18px' }}>AI Chat</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Credits */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coins h-4 w-4 text-blue-600" aria-hidden="true">
            <circle cx="8" cy="8" r="6"></circle>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
            <path d="M7 6h1v4"></path>
            <path d="m16.71 13.88.7.71-2.82 2.82"></path>
          </svg>
          <span className="text-sm font-medium text-blue-700">
            {user?.credits !== undefined && user?.credits !== null ? user.credits.toLocaleString() : '1,244'}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => dispatch(toggleNotificationPanel())}
                    className={`p-1.5 rounded-lg transition-all duration-200 relative ${
              notificationPanelOpen 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {unreadCount}
              </div>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {notificationPanelOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => dispatch(toggleNotificationPanel(false))}
              />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900" style={{ fontSize: '12px' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                        <div className="max-h-48 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="px-3 py-2 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.type === 'welcome' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.type === 'welcome' ? 'Welcome!' : 'Feature Update'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.type === 'welcome' ? '6m ago' : '2h ago'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative mr-2">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-900 truncate max-w-32">
                {user?.username || 'akshay'}
              </p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {userDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setUserDropdownOpen(false)}
              />
              <div 
                data-side="bottom" 
                data-align="end" 
                role="menu" 
                aria-orientation="vertical" 
                data-state="open" 
                data-radix-menu-content="" 
                dir="ltr" 
                data-slot="dropdown-menu-content" 
                className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto p-1 w-56 shadow-xl border-0 rounded-2xl absolute right-0 mt-2"
                tabIndex="-1" 
                data-orientation="vertical" 
                style={{ outline: 'none' }}
              >
                <div 
                  role="menuitem" 
                  aria-disabled="true" 
                  data-disabled="" 
                  data-slot="dropdown-menu-item" 
                  data-variant="default" 
                  className="focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                  tabIndex="-1" 
                  data-orientation="vertical" 
                  data-radix-collection-item=""
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user h-4 w-4 mr-2" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {user?.username || 'akshay'}
                </div>
                <div role="separator" aria-orientation="horizontal" data-slot="dropdown-menu-separator" className="bg-border -mx-1 my-1 h-px"></div>
                <div 
                  role="menuitem" 
                  data-slot="dropdown-menu-item" 
                  data-variant="default" 
                  className="focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                  tabIndex="-1" 
                  data-orientation="vertical" 
                  data-radix-collection-item=""
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings h-4 w-4 mr-2" aria-hidden="true">
                    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Settings
                </div>
                <div role="separator" aria-orientation="horizontal" data-slot="dropdown-menu-separator" className="bg-border -mx-1 my-1 h-px"></div>
                <div 
                  role="menuitem" 
                  data-slot="dropdown-menu-item" 
                  data-variant="default" 
                  className="focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                  tabIndex="-1" 
                  data-orientation="vertical" 
                  data-radix-collection-item=""
                  onClick={handleLogout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out h-4 w-4 mr-2" aria-hidden="true">
                    <path d="m16 17 5-5-5-5"></path>
                    <path d="M21 12H9"></path>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  </svg>
                  Sign Out
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
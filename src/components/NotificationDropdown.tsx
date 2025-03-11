import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { notifications, clearAllNotifications, fetchNotifications } = useNotificationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      fetchNotifications(user.uid);
    }
  }, [user, fetchNotifications]);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  const handleClearNotifications = async () => {
    if (user) {
      await clearAllNotifications(user.uid);
      setIsOpen(false);
    }
  };

  const handleNotificationClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={toggleNotifications} className="focus:outline-none">
        <Bell className="h-6 w-6" />
        {notifications.length > 0 && (
          <span className="absolute top-0 transform translate-x-1 -translate-y-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute -right-36 z-10 mt-2 w-64 h-96 bg-white text-black rounded-lg shadow-2xl p-4 overflow-y-auto notification-box translate-y-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="text-blue-500 text-sm" 
                onClick={handleClearNotifications}
              >
                Clear
              </button>
            )}
          </div>
          <ul className="mt-2">
            {notifications.length === 0 ? (
              <li className="py-2 text-center text-gray-500">No notifications</li>
            ) : (
              notifications.map((notification) => (
                <li 
                  key={notification.id} 
                  className="py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleNotificationClick(notification.url)}
                >
                  {notification.content}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
} 
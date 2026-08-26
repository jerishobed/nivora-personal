import React from 'react';
import { UserProfile } from '../types';
import { LogOut, ShieldCheck, Settings } from 'lucide-react';

interface UserCardProps {
  user: UserProfile;
  onSignOut: () => void;
  onOpenSettings?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onSignOut, onOpenSettings }) => {
  const getInitials = () => {
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return user.displayName.slice(0, 2).toUpperCase();
    }
    return 'JD';
  };

  return (
    <div
      id="nivora-user-card"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/90 border border-[#e8ddd2] rounded-[24px] p-6 shadow-sm gap-4"
    >
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-[#eee7de] rounded-full overflow-hidden border-2 border-white shadow-inner shrink-0 flex items-center justify-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User Avatar'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[#7b4a27] font-bold text-xl">{getInitials()}</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1f1b18]">
              {user.displayName || 'Julian Draxler'}
            </h2>
            {user.isAnonymous && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f3e8dc] text-[#7b4a27] px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Guest Mode
              </span>
            )}
          </div>
          <p className="text-[#756b63] text-sm mt-0.5">
            {user.email || 'julian.d@nivora.ai'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {onOpenSettings && (
          <button
            id="user-settings-button"
            onClick={onOpenSettings}
            className="px-5 py-2.5 bg-[#f3e8dc] text-[#7b4a27] rounded-xl text-sm font-semibold hover:bg-[#e8ddd2] transition-colors cursor-pointer"
          >
            Settings
          </button>
        )}
        <button
          id="user-signout-button"
          onClick={onSignOut}
          className="px-5 py-2.5 bg-[#7b4a27] text-white rounded-xl text-sm font-semibold hover:bg-[#603a1f] transition-colors cursor-pointer flex items-center gap-2"
          title="Sign out of NIVORA"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};


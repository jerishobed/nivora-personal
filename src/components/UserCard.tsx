import React from 'react';
import { UserProfile, SUPPORTED_CURRENCIES } from '../types';
import { LogOut, ShieldCheck, Settings, Coins } from 'lucide-react';

interface UserCardProps {
  user: UserProfile;
  currency?: string;
  onSignOut: () => void;
  onOpenSettings?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currency = 'USD',
  onSignOut,
  onOpenSettings
}) => {
  const getInitials = () => {
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return user.displayName.slice(0, 2).toUpperCase();
    }
    return 'NV';
  };

  const currConfig =
    SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0];

  return (
    <div
      id="nivora-user-card"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/90 border border-[#e8ddd2] rounded-[24px] p-5 sm:p-6 shadow-xs gap-4"
    >
      <div className="flex items-center gap-4 sm:gap-5 min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#eee7de] rounded-full overflow-hidden border-2 border-white shadow-2xs shrink-0 flex items-center justify-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User Avatar'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[#7b4a27] font-bold text-lg sm:text-xl">{getInitials()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#1f1b18] truncate">
              {user.displayName || 'Nivora Explorer'}
            </h2>
            {user.isAnonymous ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f3e8dc] text-[#7b4a27] px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Guest
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f5f1eb] text-[#756b63] px-2 py-0.5 rounded-full border border-[#e8ddd2]">
                <Coins className="w-3 h-3 text-[#7b4a27]" />
                {currConfig.symbol} ({currConfig.code})
              </span>
            )}
          </div>
          <p className="text-[#756b63] text-xs sm:text-sm truncate mt-0.5">
            {user.bio || user.email || 'Personal Private Workspace'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {onOpenSettings && (
          <button
            id="user-settings-button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f3e8dc] hover:bg-[#ebd9c7] text-[#7b4a27] rounded-[14px] text-xs font-semibold transition-colors cursor-pointer"
            title="Edit profile and currency preferences"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        )}
        <button
          id="user-signout-button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#fff5f5] text-[#756b63] hover:text-[#c62828] border border-[#e8ddd2] hover:border-[#fecaca] rounded-[14px] text-xs font-medium transition-colors cursor-pointer"
          title="Sign out of NIVORA"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
};


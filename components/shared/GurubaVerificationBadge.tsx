// components/shared/GurubaVerificationBadge.tsx

import React from 'react';
import { BadgeCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface BadgeProps {
  isVerified?: boolean;
  gurubaType?: 'brahmin' | 'non_brahmin' | 'astrologer';
}

export const GurubaVerificationBadge: React.FC<BadgeProps> = ({ isVerified, gurubaType }) => {
  if (!isVerified) {
    return (
      <ShieldAlert
        className="h-5 w-5 text-yellow-500"
        title="Unverified Guruba"
      />
    );
  }

  switch (gurubaType) {
    case 'brahmin':
      return (
        <BadgeCheck
          className="h-5 w-5 text-saffron-600 fill-saffron-100"
          title="Verified Brahmin Guruba"
        />
      );
    case 'non_brahmin':
      return (
        <BadgeCheck
          className="h-5 w-5 text-blue-600 fill-blue-100"
          title="Verified Non-Brahmin Guruba"
        />
      );
    case 'astrologer':
      return (
        <Sparkles
          className="h-5 w-5 text-purple-600 fill-purple-100"
          title="Verified Astrologer"
        />
      );
    default:
      return (
        <BadgeCheck
          className="h-5 w-5 text-gray-400 fill-gray-100"
          title="Verified"
        />
      );
  }
};

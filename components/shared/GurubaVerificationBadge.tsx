
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
      <span title="Unverified Guruba" className="inline-flex">
        <ShieldAlert
          className="h-5 w-5 text-yellow-500"
        />
      </span>
    );
  }

  switch (gurubaType) {
    case 'brahmin':
      return (
        <span title="Verified Brahmin Guruba" className="inline-flex">
          <BadgeCheck
            className="h-5 w-5 text-saffron-600 fill-saffron-100"
          />
        </span>
      );
    case 'non_brahmin':
      return (
        <span title="Verified Non-Brahmin Guruba" className="inline-flex">
          <BadgeCheck
            className="h-5 w-5 text-blue-600 fill-blue-100"
          />
        </span>
      );
    case 'astrologer':
      return (
        <span title="Verified Astrologer" className="inline-flex">
          <Sparkles
            className="h-5 w-5 text-purple-600 fill-purple-100"
          />
        </span>
      );
    default:
      return (
        <span title="Verified" className="inline-flex">
          <BadgeCheck
            className="h-5 w-5 text-gray-400 fill-gray-100"
          />
        </span>
      );
  }
};

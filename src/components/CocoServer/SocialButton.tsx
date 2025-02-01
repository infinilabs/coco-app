import React from 'react';

interface SocialButtonProps {
  icon: React.ReactNode;
  provider: string;
  onClick: () => void;
}

export function SocialButton({ icon, provider, onClick }: SocialButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
    >
      {icon}
      <span>Continue with {provider}</span>
    </button>
  );
}
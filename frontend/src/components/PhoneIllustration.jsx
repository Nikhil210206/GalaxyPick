import React from 'react';

// Simple SVG phone illustration in Samsung theme (avoids relying on external image quality)
export const PhoneIllustration = ({ className = '', gradient = 'from-slate-200 via-slate-100 to-white' }) => (
  <div className={`relative ${className}`}>
    <div className={`absolute inset-0 rounded-[3rem] bg-gradient-to-br ${gradient} blur-3xl opacity-60 scale-110`} />
    <svg viewBox="0 0 240 480" className="relative w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="phone-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5e7eb" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="phone-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#1B4EFF" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="220" height="460" rx="42" fill="url(#phone-body)" />
      <rect x="20" y="20" width="200" height="440" rx="34" fill="url(#phone-screen)" />
      <rect x="105" y="30" width="30" height="6" rx="3" fill="#0f172a" opacity="0.4" />
      <circle cx="200" cy="35" r="3" fill="#0f172a" opacity="0.4" />
      <g opacity="0.9">
        <circle cx="70" cy="410" r="6" fill="#1B4EFF" />
        <circle cx="120" cy="410" r="6" fill="#1B4EFF" opacity="0.6" />
        <circle cx="170" cy="410" r="6" fill="#1B4EFF" opacity="0.3" />
      </g>
    </svg>
  </div>
);

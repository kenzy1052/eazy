import React from 'react';

interface EazyPostLogoProps {
  size?: number;
  className?: string;
  variant?: 'pink' | 'white';
}

/**
 * EazyPost Official Logo: Three horizontal rounded pills forming the dynamic 'E'.
 * Styled in the website's signature vibrant pink brand gradient.
 */
export function EazyPostLogo({ size = 20, className = '', variant = 'pink' }: EazyPostLogoProps) {
  const gradientIdTop = `ep-pink-top-${React.useId()}`;
  const gradientIdMid = `ep-pink-mid-${React.useId()}`;
  const gradientIdBot = `ep-pink-bot-${React.useId()}`;

  if (variant === 'white') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <rect x="290" y="225" width="480" height="175" rx="87.5" fill="#FFFFFF" />
        <rect x="235" y="425" width="380" height="175" rx="87.5" fill="#FFFFFF" />
        <rect x="290" y="625" width="480" height="175" rx="87.5" fill="#FFFFFF" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Top Pill Gradient: Rich brand rose to luminous coral-pink */}
        <linearGradient id={gradientIdTop} x1="290" y1="312" x2="770" y2="312" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#C7154B" />
          <stop offset="50%" stop-color="#F02D63" />
          <stop offset="100%" stop-color="#FF5A87" />
        </linearGradient>

        {/* Middle Pill Gradient */}
        <linearGradient id={gradientIdMid} x1="235" y1="512" x2="615" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#A80E3D" />
          <stop offset="50%" stop-color="#E02257" />
          <stop offset="100%" stop-color="#FF4D7E" />
        </linearGradient>

        {/* Bottom Pill Gradient */}
        <linearGradient id={gradientIdBot} x1="290" y1="712" x2="770" y2="712" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#BF1347" />
          <stop offset="50%" stop-color="#F02D63" />
          <stop offset="100%" stop-color="#FF386E" />
        </linearGradient>
      </defs>

      {/* Top Pill */}
      <rect x="290" y="225" width="480" height="175" rx="87.5" fill={`url(#${gradientIdTop})`} />

      {/* Middle Pill */}
      <rect x="235" y="425" width="380" height="175" rx="87.5" fill={`url(#${gradientIdMid})`} />

      {/* Bottom Pill */}
      <rect x="290" y="625" width="480" height="175" rx="87.5" fill={`url(#${gradientIdBot})`} />
    </svg>
  );
}

export default EazyPostLogo;

interface IntegraLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * Ownable municipal identity mark for ID Maricá:
 * A rounded civic badge uniting a geolocation pin, human identity emblem,
 * and coastal arc in Atlantic Teal (#0B3B49), Sun Amber (#E89B0C), and Coral (#D93829).
 */
export function IntegraLogo({
  variant = 'light',
  size = 'md',
  showSubtitle = false,
  subtitle = 'Prefeitura de Maricá',
}: IntegraLogoProps) {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const titleCls =
    size === 'sm'
      ? 'text-[15px]'
      : size === 'lg'
        ? 'text-xl'
        : 'text-[18px]';

  const isLight = variant === 'light';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="64"
          height="64"
          rx="16"
          fill={isLight ? '#072933' : '#0B3B49'}
          stroke={isLight ? 'rgba(255,255,255,0.2)' : 'none'}
          strokeWidth="2"
        />
        <path
          d="M32 10C21.5 10 13 18.4 13 28.8C13 41 27.5 51.8 30.8 54.1C31.5 54.6 32.5 54.6 33.2 54.1C36.5 51.8 51 41 51 28.8C51 18.4 42.5 10 32 10Z"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="24.5" r="6" fill="#E89B0C" />
        <path
          d="M21 38.5C24.2 33.9 27.8 31.9 32 31.9C36.2 31.9 39.8 33.9 43 38.5"
          stroke="#D93829"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path
          d="M17 51.5C22.5 55.2 41.5 55.2 47 51.5"
          stroke="#0E7490"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>

      <div className="leading-none">
        <div
          className={`font-display font-extrabold tracking-tight ${titleCls} ${
            isLight ? 'text-white' : 'text-[#0B3B49]'
          }`}
        >
          <span className="text-[#E89B0C]">ID</span>{' '}
          <span className={isLight ? 'text-white' : 'text-[#0B3B49]'}>Maricá</span>
        </div>
        {showSubtitle && (
          <div
            className={`mt-0.5 text-[11px] font-medium ${
              isLight ? 'text-[#C2D6DC]' : 'text-[#52646D]'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

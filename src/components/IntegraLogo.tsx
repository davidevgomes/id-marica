interface IntegraLogoProps {
  /** 'light' renders on dark teal backgrounds; 'dark' renders on white surfaces */
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
}

export function IntegraLogo({
  variant = 'dark',
  size = 'md',
  showSubtitle = false,
  subtitle = 'Prefeitura de Maricá',
}: IntegraLogoProps) {
  const iconDim = size === 'sm' ? 32 : size === 'lg' ? 52 : 38;
  const titleSize =
    size === 'sm'
      ? 'text-[15px]'
      : size === 'lg'
        ? 'text-xl sm:text-2xl'
        : 'text-[17px]';

  const isLight = variant === 'light';
  const shieldFill = isLight ? '#072933' : '#0B3B49';
  const pinStroke = '#FFFFFF';
  const titleColor = isLight ? 'text-white' : 'text-[#0B3B49]';
  const subColor = isLight ? 'text-[#B8D0D8]' : 'text-[#52646D]';

  return (
    <div className="inline-flex items-center gap-2.5">
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Rounded architectural badge */}
        <rect width="64" height="64" rx="14" fill={shieldFill} />
        {/* Coastal horizon arcs */}
        <path
          d="M11 47c7-4.5 14-6.5 21-6.5s14 2 21 6.5"
          stroke="#0E7490"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M16 53c5.3-3 10.7-4.5 16-4.5s10.7 1.5 16 4.5"
          stroke="#E89B0C"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Territorial pin outline */}
        <path
          d="M32 10C22.6 10 15 17.5 15 26.8c0 10.6 12.2 19.8 15.6 22.1a2.5 2.5 0 0 0 2.8 0C36.8 46.6 49 37.4 49 26.8 49 17.5 41.4 10 32 10Z"
          stroke={pinStroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Central citizen heart/sun point */}
        <circle cx="32" cy="24.5" r="5.5" fill="#E89B0C" />
        {/* Embracing territorial bridge */}
        <path
          d="M23.5 34.5c2.4-3.4 5.2-5 8.5-5s6.1 1.6 8.5 5"
          stroke="#D93829"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>

      <div className="leading-tight">
        <div
          className={`font-display whitespace-nowrap font-extrabold tracking-tight ${titleSize} ${titleColor}`}
        >
          Integra <span className="font-semibold opacity-90">Maricá</span>
        </div>
        {showSubtitle && (
          <div className={`whitespace-nowrap text-[11px] font-medium ${subColor}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

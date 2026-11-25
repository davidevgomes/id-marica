interface IdMaricaLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
}

export function IdMaricaLogo({
  variant = 'light',
  size = 'md',
  showSubtitle = false,
  subtitle = 'Identidade cidadã',
}: IdMaricaLogoProps) {
  const iconSize = { sm: 34, md: 44, lg: 52 }[size];
  const titleClass = { sm: 'text-base', md: 'text-[1.35rem]', lg: 'text-2xl' }[size];

  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        width={iconSize}
        height={iconSize}
        alt=""
        className="shrink-0 rounded-[27%] ring-1 ring-white/20"
      />
      <span className="block leading-none">
        <span className={`font-display block font-extrabold tracking-[-0.045em] ${titleClass} ${variant === 'light' ? 'text-white' : 'text-[#0B3B49]'}`}>
          ID Maricá
        </span>
        {showSubtitle && (
          <span className={`mt-1 block text-[0.67rem] font-semibold ${variant === 'light' ? 'text-[#C2D6DC]' : 'text-[#4B6565]'}`}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

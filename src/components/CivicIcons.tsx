/**
 * Bespoke multi-tone civic SVG graphics crafted specifically for Integra Maricá.
 */

export function BiometricFrameGraphic({ scanning = false }: { scanning?: boolean }) {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="mx-auto"
    >
      <circle cx="44" cy="44" r="38" fill="#EDF4F6" />
      <path d="M18 30V22C18 19.8 19.8 18 22 18H30" stroke="#0B3B49" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M58 18H66C68.2 18 70 19.8 70 22V30" stroke="#0B3B49" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M70 58V66C70 68.2 68.2 70 66 70H58" stroke="#0B3B49" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M30 70H22C19.8 70 18 68.2 18 66V58" stroke="#0B3B49" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="44" cy="36" r="10.5" stroke="#0B3B49" strokeWidth="2.6" fill="#FFFFFF" />
      <path
        d="M28 60C30.5 52.5 36.5 49 44 49C51.5 49 57.5 52.5 60 60"
        stroke="#0B3B49"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="39.5" cy="34.5" r="1.7" fill="#D93829" />
      <circle cx="48.5" cy="34.5" r="1.7" fill="#D93829" />
      <line
        x1="22"
        y1="44"
        x2="66"
        y2="44"
        stroke="#E89B0C"
        strokeWidth="2.6"
        strokeLinecap="round"
        className={scanning ? 'anim-scanline' : ''}
        opacity={scanning ? 1 : 0.8}
      />
    </svg>
  );
}

export function VerifiedSealGraphic() {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <span
        aria-hidden="true"
        className="anim-radar absolute inset-0 rounded-full border-2 border-[#156F48]"
      />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#156F48] text-white">
        <svg width="38" height="38" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M7 16.5L13.5 23L25 10"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="anim-check"
          />
        </svg>
      </div>
    </div>
  );
}

export function HomeGeofenceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="#0E7490" strokeWidth="1.8" strokeDasharray="3 2.5" />
      <path
        d="M7.5 11.8L12 8L16.5 11.8V16.2C16.5 16.6 16.2 17 15.7 17H8.3C7.8 17 7.5 16.6 7.5 16.2V11.8Z"
        fill="#0B3B49"
      />
      <circle cx="12" cy="13.2" r="1.5" fill="#E89B0C" />
    </svg>
  );
}

export function FacialBadgeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8V6C4 4.9 4.9 4 6 4H8" stroke="#D93829" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 4H18C19.1 4 20 4.9 20 6V8" stroke="#D93829" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 16V18C20 19.1 19.1 20 18 20H16" stroke="#D93829" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 20H6C4.9 20 4 19.1 4 18V16" stroke="#D93829" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="10.2" r="2.8" fill="#0B3B49" />
      <path d="M8 16.5C8.9 14.7 10.3 13.8 12 13.8C13.7 13.8 15.1 14.7 16 16.5" stroke="#0B3B49" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/* Expressive Landing Page Journey Graphics */
export function StepAlertGraphic() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#072933" stroke="#E89B0C" strokeWidth="1.5" />
      <path
        d="M24 12C19 12 16 15.5 16 20.5V26L13.5 29.5H34.5L32 26V20.5C32 15.5 29 12 24 12Z"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M21 33C21.6 34.5 22.7 35.5 24 35.5C25.3 35.5 26.4 34.5 27 33" stroke="#E89B0C" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="33" cy="15" r="4" fill="#D93829" />
    </svg>
  );
}

export function StepSelfieGpsGraphic() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#072933" stroke="#E89B0C" strokeWidth="1.5" />
      <rect x="15" y="10" width="18" height="28" rx="3.5" stroke="#FFFFFF" strokeWidth="2.2" />
      <circle cx="24" cy="21" r="3.8" fill="#E89B0C" />
      <path d="M19 30C20.2 27.6 22 26.5 24 26.5C26 26.5 27.8 27.6 29 30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="35" cy="14" r="5" fill="#156F48" />
      <path d="M33 14L34.4 15.4L37.2 12.6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StepRenewGraphic() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#072933" stroke="#E89B0C" strokeWidth="1.5" />
      <rect x="11" y="16" width="26" height="17" rx="3" stroke="#FFFFFF" strokeWidth="2.2" />
      <line x1="11" y1="21.5" x2="37" y2="21.5" stroke="#E89B0C" strokeWidth="2.2" />
      <circle cx="33" cy="31" r="6" fill="#156F48" />
      <path d="M30.5 31L32.2 32.7L35.6 29.3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Distinct Multi-Tone Cartographic Layer Icons for Management Panel */
export function LayerBairrosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z" fill="#FEF3DC" stroke="#B4690E" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 4V17M15 7V20" stroke="#B4690E" strokeWidth="1.6" />
    </svg>
  );
}

export function LayerTriangulationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5L5 18H19L12 5Z" stroke="#0E7490" strokeWidth="1.8" strokeDasharray="3 2" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="2.6" fill="#0B3B49" />
      <circle cx="5" cy="18" r="2.6" fill="#0E7490" />
      <circle cx="19" cy="18" r="2.6" fill="#E89B0C" />
    </svg>
  );
}

export function LayerHealthIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="#FDE8E6" stroke="#D93829" strokeWidth="1.8" />
      <path d="M12 7.5V16.5M7.5 12H16.5" stroke="#D93829" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function LayerSchoolIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4L3 8.5L12 13L21 8.5L12 4Z" fill="#EDF4F6" stroke="#0B3B49" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6.5 10.5V16C6.5 17.6 9 19 12 19C15 19 17.5 17.6 17.5 16V10.5" stroke="#0B3B49" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20" cy="13.5" r="1.5" fill="#E89B0C" />
    </svg>
  );
}

export function LayerHeatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#FDE8E6" />
      <circle cx="12" cy="12" r="5.5" fill="#F59E0B" opacity="0.55" />
      <circle cx="12" cy="12" r="2.8" fill="#D93829" />
    </svg>
  );
}

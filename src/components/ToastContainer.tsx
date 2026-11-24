import { AlertTriangle, Info, ShieldAlert, UserRoundCheck, X } from 'lucide-react';
import { useIntegra } from '../context/IntegraContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useIntegra();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[1100] flex w-full max-w-sm flex-col gap-2 md:bottom-5 sm:right-6">
      {toasts.map((toast) => {
        const styles = {
          success: {
            bg: 'bg-[#0B3B49] border-[#156F48] text-white',
            icon: UserRoundCheck,
            iconColor: 'text-[#4ADE80]',
          },
          warning: {
            bg: 'bg-[#0B3B49] border-[#E89B0C] text-white',
            icon: AlertTriangle,
            iconColor: 'text-[#E89B0C]',
          },
          danger: {
            bg: 'bg-[#0B3B49] border-[#D93829] text-white',
            icon: ShieldAlert,
            iconColor: 'text-[#F87171]',
          },
          info: {
            bg: 'bg-[#0B3B49] border-[#38BDF8] text-white',
            icon: Info,
            iconColor: 'text-[#38BDF8]',
          },
        }[toast.tone];

        const Icon = styles.icon;

        return (
          <div
            key={toast.id}
            className={`anim-step pointer-events-auto flex items-start gap-3 rounded-[8px] border-l-4 p-3.5 shadow-xl ${styles.bg}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold leading-snug">{toast.title}</p>
              <p className="mt-0.5 text-xs text-[#CBD5E1] leading-relaxed">
                {toast.description}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar aviso"
              className="rounded-[4px] p-1 text-[#94A3B8] hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

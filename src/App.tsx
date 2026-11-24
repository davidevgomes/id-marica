import { useState } from 'react';
import { CitizenPortalLanding } from './components/CitizenPortalLanding';
import { CrasAndIntegrationsView } from './components/CrasAndIntegrationsView';
import { Header } from './components/Header';
import { MayorDashboard } from './components/MayorDashboard';
import { QrModal } from './components/QrModal';
import { ToastContainer } from './components/ToastContainer';
import { IntegraProvider, useIntegra } from './context/IntegraContext';

function IntegraShell() {
  const { surface, viewMode } = useIntegra();
  const [qrOpen, setQrOpen] = useState(false);

  if (surface === 'portal') {
    return (
      <>
        <CitizenPortalLanding />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <Header onOpenQr={() => setQrOpen(true)} />
      <main>
        {viewMode === 'mapa' && <MayorDashboard />}
        {viewMode === 'busca_ativa' && <CrasAndIntegrationsView mode="busca_ativa" />}
        {viewMode === 'integracoes' && <CrasAndIntegrationsView mode="integracoes" />}
      </main>
      <ToastContainer />
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <IntegraProvider>
      <IntegraShell />
    </IntegraProvider>
  );
}

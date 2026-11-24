import { useState } from 'react';
import { AdminLoginGate } from './components/AdminLoginGate';
import { CitizenPortalLanding } from './components/CitizenPortalLanding';
import { CombinedQueryView } from './components/CombinedQueryView';
import { Header } from './components/Header';
import { IndicatorsEvolutionView } from './components/IndicatorsEvolutionView';
import { LgpdSecurityView } from './components/LgpdSecurityView';
import { QrModal } from './components/QrModal';
import { ReportsExportView } from './components/ReportsExportView';
import { TerritoryMapView } from './components/TerritoryMapView';
import { ToastContainer } from './components/ToastContainer';
import { IntegraProvider, useIntegra } from './context/IntegraContext';

function AppShell() {
  const { portalMode, managementView, authSession } = useIntegra();
  const [qrOpen, setQrOpen] = useState(false);

  if (portalMode === 'portal') {
    return (
      <>
        <CitizenPortalLanding />
        <ToastContainer />
      </>
    );
  }

  if (!authSession) {
    return (
      <>
        <AdminLoginGate />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#11222B]">
      <Header onOpenQr={() => setQrOpen(true)} />
      <main>
        {managementView === 'mapa' && <TerritoryMapView />}
        {managementView === 'consultas' && <CombinedQueryView />}
        {managementView === 'indicadores' && <IndicatorsEvolutionView />}
        {managementView === 'relatorios' && <ReportsExportView />}
        {managementView === 'lgpd' && <LgpdSecurityView />}
      </main>
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <IntegraProvider>
      <AppShell />
    </IntegraProvider>
  );
}

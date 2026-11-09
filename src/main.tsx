import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { httpBackend } from './infrastructure/http-backend';
import { liveSocket } from './infrastructure/live-socket';
import { pushDevice } from './infrastructure/push-device';
import { App } from './ui/App';
import { ServicesProvider } from './ui/backend-context';
import { upgradeOldAddress } from './ui/router';
import './ui/theme/tokens.css';
import './ui/theme/global.css';

upgradeOldAddress();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider backend={httpBackend()} live={liveSocket()} push={pushDevice()}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);

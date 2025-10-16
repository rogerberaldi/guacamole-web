import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuacamoleClient } from './components/GuacamoleClient';

const WEBSOCKET_URL = import.meta.env.VITE_GUACAMOLE_WS_URL || 'ws://localhost:8080/guacamole/websocket-tunnel';
const DEBUG_MODE = import.meta.env.VITE_DEBUG === 'true';

function App() {
  return (
    <ErrorBoundary>
      <GuacamoleClient websocketURL={WEBSOCKET_URL} debug={DEBUG_MODE} />
    </ErrorBoundary>
  );
}

export default App;

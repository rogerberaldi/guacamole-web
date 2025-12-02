import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, Keyboard } from 'lucide-react';
import { GuacamoleConnection, ConnectionState } from '../lib/guacamole/GuacamoleConnection';
import { JWTAuthManager } from '../lib/auth/JWTAuthManager';
import { ConnectionStatus } from './ConnectionStatus';
import { logger, LogLevel } from '../lib/utils/logger';

interface GuacamoleClientProps {
  websocketURL: string;
  debug?: boolean;
}

export const GuacamoleClient: React.FC<GuacamoleClientProps> = ({
  websocketURL,
  debug = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<GuacamoleConnection | null>(null);
  const authManagerRef = useRef<JWTAuthManager | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [error, setError] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);


  // Initialize auth manager once
  useEffect(() => {
    if (!authManagerRef.current) {
      authManagerRef.current = new JWTAuthManager();
    }
  }, []); // Empty dependency array - run once on mount

  useEffect(() => {
    if (debug) {
      logger.setLevel(LogLevel.DEBUG);
    }



    if (!authManagerRef.current.isValid()) {
      setError('Invalid or missing JWT token. Please provide a valid token in the URL.');
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    let mounted = true;
    let connectionTimeout: NodeJS.Timeout;

    const initializeConnection = () => {
      if (!mounted) return;

      connectionRef.current = new GuacamoleConnection(
        { websocketURL },
        authManagerRef.current!
      );

      connectionRef.current.onStateChange((state) => {
        if (mounted) {
          setConnectionState(state);
          if (state === ConnectionState.CONNECTED) {
            setError('');
          }
        }
      });

      connectionRef.current.onError((errorMessage) => {
        if (mounted) {
          setError(errorMessage);
        }
      });

      // Wait for DOM to be ready
      connectionTimeout = setTimeout(() => {
        if (mounted && containerRef.current) {
          logger.info('Connecting to Guacamole with container:', containerRef.current);
          connectionRef.current?.connect(containerRef.current);
        }
      }, 500);
    };

    initializeConnection();

    return () => {
      mounted = false;
      clearTimeout(connectionTimeout);

      // Only disconnect if we're not in an error state and connection exists
      if (connectionRef.current && connectionRef.current.getState() !== ConnectionState.ERROR) {
        logger.info('Cleaning up connection');
        connectionRef.current.disconnect();
      }
      connectionRef.current = null;
    };
  }, [websocketURL]); // Only depend on websocketURL, not debug


  const handleDisconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <header className="bg-neutral-800 border-b border-neutral-700 shadow-lg">
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/redhat-logo.svg"
              alt="Red Hat"
              className="h-6 w-auto"
            />

          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus state={connectionState} error={error} />

            {connectionState === ConnectionState.CONNECTED && (
              <>
                <div className="relative">
                  <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {isSettingsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSettingsOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              connectionRef.current?.releaseAllKeys();
                              setIsSettingsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white flex items-center gap-2"
                          >
                            <Keyboard className="w-4 h-4" />
                            Release all Keys
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={handleDisconnect}
                    className="bg-neutral-700 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                    aria-label="Disconnect"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50">
                    <div className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap shadow-xl">
                      Disconnect
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {connectionState === ConnectionState.ERROR && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
            <div className="max-w-md w-full mx-auto p-6">
              <div className="bg-neutral-800 rounded-lg shadow-xl p-8 text-center">
                <div className="flex justify-center mb-4">
                  <img
                    src="/redhat-logo.svg"
                    alt="Red Hat"
                    className="h-12 w-auto"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                <p className="text-neutral-400 mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {(connectionState === ConnectionState.IDLE ||
          connectionState === ConnectionState.CONNECTING) && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg font-medium">
                  {connectionState === ConnectionState.IDLE
                    ? 'Initializing...'
                    : 'Connecting to remote desktop...'}
                </p>
                <p className="text-neutral-400 text-sm mt-2">Please wait</p>
              </div>
            </div>
          )}

        <div
          ref={containerRef}
          className="h-full overflow-hidden flex items-center justify-center"
          style={{ cursor: 'none' }}
        />
      </main>

      <footer className="bg-neutral-800 border-t border-neutral-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <p>Red Hat Enterprise Remote Desktop Solution</p>
          <p>Version 1.0.0</p>
        </div>
      </footer>
    </div>
  );
};

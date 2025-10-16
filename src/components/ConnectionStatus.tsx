import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { ConnectionState } from '../lib/guacamole/GuacamoleConnection';

interface ConnectionStatusProps {
  state: ConnectionState;
  error?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, error }) => {
  const getStatusConfig = () => {
    switch (state) {
      case ConnectionState.IDLE:
        return {
          icon: WifiOff,
          text: 'Not Connected',
          bgColor: 'bg-neutral-700',
          textColor: 'text-neutral-300',
        };
      case ConnectionState.CONNECTING:
        return {
          icon: Loader2,
          text: 'Connecting...',
          bgColor: 'bg-blue-600',
          textColor: 'text-white',
          animate: true,
        };
      case ConnectionState.CONNECTED:
        return {
          icon: Wifi,
          text: 'Connected',
          bgColor: 'bg-green-600',
          textColor: 'text-white',
        };
      case ConnectionState.DISCONNECTING:
        return {
          icon: Loader2,
          text: 'Disconnecting...',
          bgColor: 'bg-yellow-600',
          textColor: 'text-white',
          animate: true,
        };
      case ConnectionState.DISCONNECTED:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          bgColor: 'bg-neutral-700',
          textColor: 'text-neutral-300',
        };
      case ConnectionState.ERROR:
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          bgColor: 'bg-neutral-700',
          textColor: 'text-neutral-300',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`${config.bgColor} rounded-full px-4 py-2 flex items-center gap-2`}>
        <Icon className={`w-4 h-4 ${config.textColor} ${config.animate ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
      </div>

      {error && state === ConnectionState.ERROR && (
        <div className="bg-red-900 border border-red-700 rounded-lg px-4 py-2 max-w-md">
          <p className="text-sm text-red-100">{error}</p>
        </div>
      )}
    </div>
  );
};

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
    <div className="relative group flex items-center">
      <div
        className={`w-3 h-3 rounded-full ${config.bgColor} ${config.animate ? 'animate-pulse' : ''} cursor-default transition-colors duration-300`}
        aria-label={config.text}
      />

      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 min-w-[max-content]">
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-3 text-xs text-white">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-3 h-3 ${config.textColor} ${config.animate ? 'animate-spin' : ''}`} />
            <span className="font-medium">{config.text}</span>
          </div>
          {error && state === ConnectionState.ERROR && (
            <div className="text-red-400 max-w-xs border-t border-neutral-700 pt-1 mt-1">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

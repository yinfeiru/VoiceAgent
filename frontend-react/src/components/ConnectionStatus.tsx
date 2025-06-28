import React from 'react';
import styled from 'styled-components';
import { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onReconnect?: () => void;
}

const StatusContainer = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(10px);
  font-size: 12px;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.$status) {
      case 'connected':
        return `
          border-color: rgba(67, 233, 123, 0.5);
          background: rgba(67, 233, 123, 0.1);
        `;
      case 'connecting':
        return `
          border-color: rgba(255, 193, 7, 0.5);
          background: rgba(255, 193, 7, 0.1);
        `;
      case 'error':
        return `
          border-color: rgba(220, 53, 69, 0.5);
          background: rgba(220, 53, 69, 0.1);
        `;
      default:
        return '';
    }
  }}
`;

const StatusDot = styled.div<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'connected': return '#43e97b';
      case 'connecting': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  
  ${props => props.$status === 'connecting' && `
    animation: pulse 1.5s infinite;
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}
`;

const StatusText = styled.span`
  color: var(--text-primary);
  font-weight: 500;
`;

const ErrorText = styled.span`
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 4px;
`;

const ReconnectButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onReconnect }) => {
  const getStatusText = () => {
    switch (status.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Failed';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <StatusContainer $status={status.status}>
      <StatusDot $status={status.status} />
      <StatusText>{getStatusText()}</StatusText>
      {status.error && (
        <ErrorText>({status.error})</ErrorText>
      )}
      {status.status === 'error' && onReconnect && (
        <ReconnectButton onClick={onReconnect}>
          Reconnect
        </ReconnectButton>
      )}
    </StatusContainer>
  );
};

export default ConnectionStatus; 
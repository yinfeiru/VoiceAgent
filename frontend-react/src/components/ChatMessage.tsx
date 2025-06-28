import React from 'react';
import styled from 'styled-components';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onPlayAudio?: (message: Message) => void;
}

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  margin: 12px 0;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
  
  @keyframes fadeIn {
    to { opacity: 1; }
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean; $isPlaying?: boolean }>`
  max-width: 70%;
  padding: 16px 20px;
  border-radius: ${props => props.$isUser ? '20px 20px 8px 20px' : '20px 20px 20px 8px'};
  background: ${props => props.$isUser 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'var(--bg-card)'
  };
  border: 1px solid ${props => props.$isUser ? 'transparent' : 'var(--border-light)'};
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  position: relative;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  
  ${props => props.$isPlaying && `
    border-color: rgba(67, 233, 123, 0.5);
    box-shadow: 0 0 20px rgba(67, 233, 123, 0.3);
  `}
  
  &::before {
    content: '';
    position: absolute;
    ${props => props.$isUser ? 'right: -6px;' : 'left: -6px;'}
    bottom: 8px;
    width: 12px;
    height: 12px;
    background: ${props => props.$isUser 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'var(--bg-card)'
    };
    border: 1px solid ${props => props.$isUser ? 'transparent' : 'var(--border-light)'};
    transform: rotate(45deg);
    ${props => props.$isUser ? 'border-left: none; border-top: none;' : 'border-right: none; border-bottom: none;'}
  }
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
`;

const MessageTime = styled.span`
  opacity: 0.7;
`;

const PlayButton = styled.button<{ $isPlaying?: boolean }>`
  background: ${props => props.$isPlaying 
    ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  border: 1px solid ${props => props.$isPlaying ? 'transparent' : 'var(--border-light)'};
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
  font-size: 10px;
  
  &:hover {
    background: ${props => props.$isPlaying 
      ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
      : 'rgba(255, 255, 255, 0.2)'
    };
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const MessageContent = styled.div`
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const UserLabel = styled.span<{ $isUser: boolean }>`
  font-weight: 600;
  color: ${props => props.$isUser ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-primary)'};
`;

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayAudio }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePlayAudio = () => {
    if (onPlayAudio && message.type === 'assistant') {
      onPlayAudio(message);
    }
  };

  return (
    <MessageContainer $isUser={message.type === 'user'}>
      <MessageBubble 
        $isUser={message.type === 'user'} 
        $isPlaying={message.isPlaying}
      >
        <MessageHeader>
          <UserLabel $isUser={message.type === 'user'}>
            {message.type === 'user' ? 'You' : 'AI Assistant'}
          </UserLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageTime>{formatTime(message.timestamp)}</MessageTime>
            {message.type === 'assistant' && (
              <PlayButton 
                $isPlaying={message.isPlaying}
                onClick={handlePlayAudio}
                title={message.isPlaying ? 'Playing' : 'Play Audio'}
              >
                {message.isPlaying ? '⏸' : '▶'}
              </PlayButton>
            )}
          </div>
        </MessageHeader>
        <MessageContent>{message.content}</MessageContent>
      </MessageBubble>
    </MessageContainer>
  );
};

export default ChatMessage; 
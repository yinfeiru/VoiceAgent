import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AudioVisualizationData } from '../types';

interface DualAudioVisualizerProps {
  inputAudioData: AudioVisualizationData;
  outputAudioData?: AudioVisualizationData;
  width?: number;
  height?: number;
  className?: string;
}

const VisualizerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const AudioModule = styled.div<{ $type: 'input' | 'output'; $isActive: boolean }>`
  position: relative;
  border-radius: 12px;
  background: ${props => props.$type === 'input' 
    ? 'rgba(67, 233, 123, 0.05)' 
    : 'rgba(79, 172, 254, 0.05)'};
  border: 2px solid ${props => {
    if (!props.$isActive) return 'rgba(255, 255, 255, 0.1)';
    return props.$type === 'input' 
      ? 'rgba(67, 233, 123, 0.5)' 
      : 'rgba(79, 172, 254, 0.5)';
  }};
  overflow: hidden;
  transition: all 0.3s ease;
  padding: 12px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => {
      if (!props.$isActive) return 'transparent';
      return props.$type === 'input'
        ? 'linear-gradient(45deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.05) 100%)'
        : 'linear-gradient(45deg, rgba(79, 172, 254, 0.1) 0%, rgba(138, 43, 226, 0.05) 100%)';
    }};
    transition: all 0.3s ease;
    pointer-events: none;
  }
`;

const ModuleHeader = styled.div<{ $type: 'input' | 'output' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.$type === 'input' ? '#43e97b' : '#4facfe'};
  
  .icon {
    font-size: 16px;
  }
  
  .label {
    flex: 1;
  }
  
  .status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    background: ${props => props.$type === 'input' 
      ? 'rgba(67, 233, 123, 0.2)' 
      : 'rgba(79, 172, 254, 0.2)'};
  }
`;

const VisualizerContainer = styled.div`
  position: relative;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const LevelBar = styled.div<{ $level: number; $type: 'input' | 'output' }>`
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => props.$level * 100}%;
    background: ${props => props.$type === 'input'
      ? 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'
      : 'linear-gradient(90deg, #4facfe 0%, #8a2be2 100%)'};
    transition: width 0.1s ease;
  }
`;

const MetricsDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  
  .metric {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const AudioModuleComponent: React.FC<{
  audioData: AudioVisualizationData;
  type: 'input' | 'output';
  width: number;
  height: number;
}> = React.memo(({ audioData, type, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const { frequencyData, isActive, level } = audioData;
    const barWidth = width / frequencyData.length;

    // Different color schemes for input and output
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    if (isActive) {
      if (type === 'input') {
        gradient.addColorStop(0, 'rgba(67, 233, 123, 0.8)');
        gradient.addColorStop(0.5, 'rgba(56, 249, 215, 0.6)');
        gradient.addColorStop(1, 'rgba(67, 233, 123, 0.4)');
      } else {
        gradient.addColorStop(0, 'rgba(79, 172, 254, 0.8)');
        gradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.6)');
        gradient.addColorStop(1, 'rgba(79, 172, 254, 0.4)');
      }
    } else {
      gradient.addColorStop(0, 'rgba(168, 168, 179, 0.3)');
      gradient.addColorStop(1, 'rgba(168, 168, 179, 0.1)');
    }

    ctx.fillStyle = gradient;

    // Draw frequency bars
    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height * 0.9; // Leave space for level bar
      const x = i * barWidth;
      const y = height - barHeight - 12; // Offset for level bar

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw center line
    ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, (height - 12) / 2);
    ctx.lineTo(width, (height - 12) / 2);
    ctx.stroke();

  }, [audioData, type, width, height]);

  const getIcon = () => type === 'input' ? '🎤' : '🔊';
  const getLabel = () => type === 'input' ? 'Microphone Input' : 'Speaker Output';
  const getStatus = () => audioData.isActive ? 'Active' : 'Inactive';

  return (
    <AudioModule $type={type} $isActive={audioData.isActive}>
      <ModuleHeader $type={type}>
        <span className="icon">{getIcon()}</span>
        <span className="label">{getLabel()}</span>
        <span className="status">{getStatus()}</span>
      </ModuleHeader>
      
      <VisualizerContainer>
        <Canvas ref={canvasRef} />
        <LevelBar $level={audioData.level} $type={type} />
      </VisualizerContainer>
      
      <MetricsDisplay>
        <div className="metric">
          <span>Level:</span>
          <span>{(audioData.level * 100).toFixed(1)}%</span>
        </div>
                 <div className="metric">
           <span>Peak:</span>
           <span>{(Math.max(...Array.from(audioData.frequencyData)) / 255 * 100).toFixed(1)}%</span>
         </div>
        <div className="metric">
          <span>Status:</span>
          <span style={{ 
            color: audioData.isActive 
              ? (type === 'input' ? '#43e97b' : '#4facfe') 
              : '#999' 
          }}>
            {audioData.isActive ? '●' : '○'}
          </span>
        </div>
      </MetricsDisplay>
    </AudioModule>
  );
});

const DualAudioVisualizer: React.FC<DualAudioVisualizerProps> = ({
  inputAudioData,
  outputAudioData,
  width = 400,
  height = 80,
  className
}) => {
  // Create default empty output data if not provided
  const defaultOutputData: AudioVisualizationData = {
    frequencyData: new Uint8Array(64).fill(0),
    level: 0,
    isActive: false
  };

  const effectiveOutputData = outputAudioData || defaultOutputData;

  return (
    <VisualizerWrapper className={className}>
      <AudioModuleComponent
        audioData={inputAudioData}
        type="input"
        width={width}
        height={height}
      />
      <AudioModuleComponent
        audioData={effectiveOutputData}
        type="output"
        width={width}
        height={height}
      />
    </VisualizerWrapper>
  );
};

export default DualAudioVisualizer; 
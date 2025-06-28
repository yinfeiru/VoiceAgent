import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { AudioVisualizationData } from '../types';

interface AudioVisualizerProps {
  audioData: AudioVisualizationData;
  width?: number;
  height?: number;
  className?: string;
}

const VisualizerContainer = styled.div<{ $isActive: boolean }>`
  position: relative;
  border-radius: var(--radius-lg);
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid ${props => props.$isActive ? 'rgba(67, 233, 123, 0.5)' : 'var(--border-light)'};
  overflow: hidden;
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$isActive 
      ? 'linear-gradient(45deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%)'
      : 'transparent'
    };
    transition: all 0.3s ease;
  }
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const LevelIndicator = styled.div<{ $level: number }>`
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
    background: linear-gradient(90deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%);
    transition: width 0.1s ease;
  }
`;

const AudioVisualizer: React.FC<AudioVisualizerProps> = React.memo(({
  audioData,
  width = 300,
  height = 150,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const { frequencyData, isActive } = audioData;
    const barWidth = width / frequencyData.length;

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    if (isActive) {
      gradient.addColorStop(0, 'rgba(67, 233, 123, 0.8)');
      gradient.addColorStop(0.5, 'rgba(56, 249, 215, 0.6)');
      gradient.addColorStop(1, 'rgba(79, 172, 254, 0.4)');
    } else {
      gradient.addColorStop(0, 'rgba(168, 168, 179, 0.3)');
      gradient.addColorStop(1, 'rgba(168, 168, 179, 0.1)');
    }

    ctx.fillStyle = gradient;

    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

  }, [audioData, width, height]);

  return (
    <VisualizerContainer $isActive={audioData.isActive} className={className}>
      <Canvas ref={canvasRef} />
      <LevelIndicator $level={audioData.level} />
    </VisualizerContainer>
  );
});

export default AudioVisualizer; 
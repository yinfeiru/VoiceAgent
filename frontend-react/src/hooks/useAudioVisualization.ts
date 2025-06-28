import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizationData } from '../types';

export const useAudioVisualization = () => {
  const [audioData, setAudioData] = useState<AudioVisualizationData>({
    frequencyData: new Uint8Array(256),
    level: 0,
    isActive: false
  });
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const lastUpdateTimeRef = useRef(0);

  const startVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000  // Use 48kHz consistently without audio processing
        } 
      });
      
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 512;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsRecording(true);
      
      const updateVisualization = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        const now = Date.now();
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate average level
        const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        const level = average / 255;
        
        // Check if voice is active (simple threshold)
        const isActive = level > 0.02;
        
        // Only update state every 200ms to reduce renders
        if (now - lastUpdateTimeRef.current > 200) {
          lastUpdateTimeRef.current = now;
          
          setAudioData(prevData => {
            // Only update if there's a meaningful change
            const levelDiff = Math.abs(prevData.level - level);
            const activeDiff = prevData.isActive !== isActive;
            
            if (levelDiff > 0.01 || activeDiff) {
              return {
                frequencyData: new Uint8Array(dataArrayRef.current!),
                level: Math.round(level * 100) / 100,
                isActive
              };
            }
            return prevData;
          });
        }
        
        animationIdRef.current = requestAnimationFrame(updateVisualization);
      };
      
      updateVisualization();
      
    } catch (error) {
      console.error('Error starting audio visualization:', error);
    }
  }, []);

  const stopVisualization = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setMediaStream(null);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsRecording(false);
    
    setAudioData({
      frequencyData: new Uint8Array(256),
      level: 0,
      isActive: false
    });
  }, []);

  useEffect(() => {
    return () => {
      // Clean up function without dependency on stopVisualization
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []); // Empty dependency array

  return {
    audioData,
    isRecording,
    startVisualization,
    stopVisualization,
    mediaStream
  };
}; 
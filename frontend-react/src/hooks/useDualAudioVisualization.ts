import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizationData } from '../types';

export const useDualAudioVisualization = () => {
  const [inputAudioData, setInputAudioData] = useState<AudioVisualizationData>({
    frequencyData: new Uint8Array(256),
    level: 0,
    isActive: false
  });
  
  const [outputAudioData, setOutputAudioData] = useState<AudioVisualizationData>({
    frequencyData: new Uint8Array(256),
    level: 0,
    isActive: false
  });
  
  const [isInputRecording, setIsInputRecording] = useState(false);
  const [isOutputMonitoring, setIsOutputMonitoring] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  // Input audio refs
  const inputStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnimationIdRef = useRef<number | null>(null);
  const inputDataArrayRef = useRef<Uint8Array | null>(null);
  const inputLastUpdateTimeRef = useRef(0);
  
  // Output audio refs
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnimationIdRef = useRef<number | null>(null);
  const outputDataArrayRef = useRef<Uint8Array | null>(null);
  const outputLastUpdateTimeRef = useRef(0);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  
  // Audio element refs for capturing speaker output
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const startInputVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } 
      });
      
      inputStreamRef.current = stream;
      setMediaStream(stream);
      inputAudioContextRef.current = new AudioContext();
      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      
      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      source.connect(inputAnalyserRef.current);
      
      inputAnalyserRef.current.fftSize = 512;
      const bufferLength = inputAnalyserRef.current.frequencyBinCount;
      inputDataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsInputRecording(true);
      
      const updateInputVisualization = () => {
        if (!inputAnalyserRef.current || !inputDataArrayRef.current) return;
        
        const now = Date.now();
        
        inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current);
        
        // Calculate average level
        const average = inputDataArrayRef.current.reduce((sum, value) => sum + value, 0) / inputDataArrayRef.current.length;
        const level = average / 255;
        
        // Check if voice is active (simple threshold)
        const isActive = level > 0.02;
        
        // Only update state every 200ms to reduce renders
        if (now - inputLastUpdateTimeRef.current > 200) {
          inputLastUpdateTimeRef.current = now;
          
          setInputAudioData(prevData => {
            // Only update if there's a meaningful change
            const levelDiff = Math.abs(prevData.level - level);
            const activeDiff = prevData.isActive !== isActive;
            
            if (levelDiff > 0.01 || activeDiff) {
              return {
                frequencyData: new Uint8Array(inputDataArrayRef.current!),
                level: Math.round(level * 100) / 100,
                isActive
              };
            }
            return prevData;
          });
        }
        
        inputAnimationIdRef.current = requestAnimationFrame(updateInputVisualization);
      };
      
      updateInputVisualization();
      
    } catch (error) {
      console.error('Error starting input audio visualization:', error);
    }
  }, []);

  const startOutputMonitoring = useCallback(async () => {
    try {
      // Create audio context for monitoring speaker output
      outputAudioContextRef.current = new AudioContext();
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputGainNodeRef.current = outputAudioContextRef.current.createGain();
      
      // Connect to destination (speakers) for monitoring
      outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
      outputGainNodeRef.current.connect(outputAnalyserRef.current);
      
      outputAnalyserRef.current.fftSize = 512;
      const bufferLength = outputAnalyserRef.current.frequencyBinCount;
      outputDataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsOutputMonitoring(true);
      
      const updateOutputVisualization = () => {
        if (!outputAnalyserRef.current || !outputDataArrayRef.current) return;
        
        const now = Date.now();
        
        outputAnalyserRef.current.getByteFrequencyData(outputDataArrayRef.current);
        
        // Calculate average level
        const average = outputDataArrayRef.current.reduce((sum, value) => sum + value, 0) / outputDataArrayRef.current.length;
        const level = average / 255;
        
        // Check if audio is playing
        const isActive = level > 0.01;
        
        // Only update state every 200ms to reduce renders
        if (now - outputLastUpdateTimeRef.current > 200) {
          outputLastUpdateTimeRef.current = now;
          
          setOutputAudioData(prevData => {
            // Only update if there's a meaningful change
            const levelDiff = Math.abs(prevData.level - level);
            const activeDiff = prevData.isActive !== isActive;
            
            if (levelDiff > 0.01 || activeDiff) {
              return {
                frequencyData: new Uint8Array(outputDataArrayRef.current!),
                level: Math.round(level * 100) / 100,
                isActive
              };
            }
            return prevData;
          });
        }
        
        outputAnimationIdRef.current = requestAnimationFrame(updateOutputVisualization);
      };
      
      updateOutputVisualization();
      
    } catch (error) {
      console.error('Error starting output audio monitoring:', error);
    }
  }, []);

  // Function to connect audio elements for output monitoring
  const connectAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;
    
    try {
      const source = outputAudioContextRef.current.createMediaElementSource(audioElement);
      source.connect(outputGainNodeRef.current);
      audioElementsRef.current.add(audioElement);
      
      // Set up event listeners to track playback
      const handlePlay = () => {
        console.log('🔊 Audio playback started');
      };
      
      const handlePause = () => {
        console.log('🔊 Audio playback paused');
      };
      
      const handleEnded = () => {
        console.log('🔊 Audio playback ended');
      };
      
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);
      
      // Cleanup function
      return () => {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
        audioElementsRef.current.delete(audioElement);
      };
    } catch (error) {
      console.error('Error connecting audio element:', error);
    }
  }, []);

  // Monitor WebRTC remote audio stream
  const connectRemoteStream = useCallback((remoteStream: MediaStream) => {
    if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;
    
    try {
      const source = outputAudioContextRef.current.createMediaStreamSource(remoteStream);
      source.connect(outputGainNodeRef.current);
      console.log('🔊 Connected remote WebRTC stream for output monitoring');
    } catch (error) {
      console.error('Error connecting remote stream:', error);
    }
  }, []);

  const stopInputVisualization = useCallback(() => {
    if (inputAnimationIdRef.current) {
      cancelAnimationFrame(inputAnimationIdRef.current);
      inputAnimationIdRef.current = null;
    }
    
    if (inputStreamRef.current) {
      inputStreamRef.current.getTracks().forEach(track => track.stop());
      inputStreamRef.current = null;
      setMediaStream(null);
    }
    
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    inputAnalyserRef.current = null;
    inputDataArrayRef.current = null;
    setIsInputRecording(false);
    
    setInputAudioData({
      frequencyData: new Uint8Array(256),
      level: 0,
      isActive: false
    });
  }, []);

  const stopOutputMonitoring = useCallback(() => {
    if (outputAnimationIdRef.current) {
      cancelAnimationFrame(outputAnimationIdRef.current);
      outputAnimationIdRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    outputAnalyserRef.current = null;
    outputGainNodeRef.current = null;
    outputDataArrayRef.current = null;
    setIsOutputMonitoring(false);
    
    // Clear audio elements
    audioElementsRef.current.clear();
    
    setOutputAudioData({
      frequencyData: new Uint8Array(256),
      level: 0,
      isActive: false
    });
  }, []);

  const startVisualization = useCallback(async () => {
    await startInputVisualization();
    await startOutputMonitoring();
  }, [startInputVisualization, startOutputMonitoring]);

  const stopVisualization = useCallback(() => {
    stopInputVisualization();
    stopOutputMonitoring();
  }, [stopInputVisualization, stopOutputMonitoring]);

  useEffect(() => {
    return () => {
      // Clean up function
      if (inputAnimationIdRef.current) {
        cancelAnimationFrame(inputAnimationIdRef.current);
      }
      
      if (outputAnimationIdRef.current) {
        cancelAnimationFrame(outputAnimationIdRef.current);
      }
      
      if (inputStreamRef.current) {
        inputStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
      }
      
      if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
      }
    };
  }, []);

  return {
    inputAudioData,
    outputAudioData,
    isInputRecording,
    isOutputMonitoring,
    startVisualization,
    stopVisualization,
    startInputVisualization,
    stopInputVisualization,
    startOutputMonitoring,
    stopOutputMonitoring,
    connectAudioElement,
    connectRemoteStream,
    mediaStream
  };
}; 
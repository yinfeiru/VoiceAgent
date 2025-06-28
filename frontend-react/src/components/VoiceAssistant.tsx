import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import DualAudioVisualizer from './DualAudioVisualizer';

import { useDualAudioVisualization } from '../hooks/useDualAudioVisualization';

const AssistantContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const ContentArea = styled.main`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  align-items: start;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;



const ControlsSection = styled.section`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  @media (min-width: 1024px) {
    min-width: 300px;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
`;

const VisualizerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;



const CompactInfoSection = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;



const CompactInfoItem = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 8px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  font-size: 0.9rem;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  strong {
    display: block;
    font-size: 0.75rem;
    margin-bottom: 4px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  span {
    font-weight: 500;
    line-height: 1.2;
  }
`;





const VoiceAssistant: React.FC = () => {
  const { 
    inputAudioData, 
    outputAudioData, 
    startVisualization: startDualVisualization,
    connectRemoteStream 
  } = useDualAudioVisualization();
  
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    status: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error'
  });
  
  const [audioFeatures, setAudioFeatures] = useState({
    noiseSuppression: false,
    echoCancellation: false,
    autoGainControl: false
  });
  
  const [audioFilterStatus, setAudioFilterStatus] = useState({
    isValidVoice: false,
    volume: 0,
    humanVoiceRatio: 0
  });
  

  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const backendUrl = 'http://localhost:8000';
  const isConnectingRef = useRef(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Audio preprocessing function: volume filtering and voice frequency detection
  const createAudioProcessor = useCallback((inputStream: MediaStream): MediaStream => {
    try {
      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      // Create source node
      const sourceNode = audioContext.createMediaStreamSource(inputStream);
      sourceNodeRef.current = sourceNode;
      
      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Create destination node
      const destination = audioContext.createMediaStreamDestination();
      destinationNodeRef.current = destination;
      
      // Create audio processor node
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;
      
      // Audio processing logic
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);
        
        // 1. Calculate audio RMS volume
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = rms * 100; // Convert to percentage
        
        // 2. Frequency analysis - detect human voice frequency range
        analyser.getFloatFrequencyData(new Float32Array(analyser.frequencyBinCount));
        const frequencyData = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(frequencyData);
        
        // Human voice frequency range: 85Hz - 8000Hz (mainly 300Hz - 3400Hz)
        const sampleRate = audioContext.sampleRate;
        const binSize = sampleRate / analyser.fftSize;
        const humanVoiceStartBin = Math.floor(300 / binSize);  // 300Hz
        const humanVoiceEndBin = Math.floor(3400 / binSize);   // 3400Hz
        
        // Calculate average energy in human voice frequency band
        let humanVoiceEnergy = 0;
        let totalEnergy = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
          const energy = Math.pow(10, frequencyData[i] / 10); // Convert dB to linear energy
          totalEnergy += energy;
          
          if (i >= humanVoiceStartBin && i <= humanVoiceEndBin) {
            humanVoiceEnergy += energy;
          }
        }
        
        // Calculate energy ratio in human voice frequency band
        const humanVoiceRatio = totalEnergy > 0 ? humanVoiceEnergy / totalEnergy : 0;
        
        // 3. Audio filtering conditions - relax conditions to avoid false filtering
        const volumeThreshold = 2; // 2% volume threshold (reduced)
        const humanVoiceThreshold = 0.2; // 20% human voice frequency ratio threshold (reduced)
        
        const shouldPass = volume > volumeThreshold && humanVoiceRatio > humanVoiceThreshold;
        
        // Update audio filtering status
        setAudioFilterStatus(prev => {
          // Only update when status actually changes to avoid frequent rendering
          if (prev.isValidVoice !== shouldPass || 
              Math.abs(prev.volume - volume) > 1 || 
              Math.abs(prev.humanVoiceRatio - humanVoiceRatio) > 0.05) {
            return {
              isValidVoice: shouldPass,
              volume: Math.round(volume * 10) / 10,
              humanVoiceRatio: Math.round(humanVoiceRatio * 1000) / 1000
            };
          }
          return prev;
        });
        
        // If conditions are not met, apply silence
        if (shouldPass) {
          // Pass through audio
          for (let i = 0; i < inputData.length; i++) {
            outputData[i] = inputData[i];
          }
          if (volume > 5) { // Reduce log frequency but not too much
            console.log(`✅ Audio passed - Volume: ${volume.toFixed(1)}%, Voice ratio: ${(humanVoiceRatio * 100).toFixed(1)}%`);
          }
        } else {
          // Apply silence
          for (let i = 0; i < inputData.length; i++) {
            outputData[i] = 0;
          }
          if (volume > 1) { // Lower log threshold to easily detect filtering issues
            console.log(`⚠️ Audio filtered - Volume: ${volume.toFixed(1)}% (need >${volumeThreshold}%), Voice ratio: ${(humanVoiceRatio * 100).toFixed(1)}% (need >${humanVoiceThreshold * 100}%)`);
          }
        }
      };
      
      // Connect audio nodes
      sourceNode.connect(analyser);
      sourceNode.connect(processor);
      processor.connect(destination);
      
      console.log('✅ Audio preprocessor created - Volume threshold: 5%, Voice frequency detection enabled');
      
      // Return processed audio stream
      return destination.stream;
      
    } catch (error) {
      console.error('❌ Failed to create audio processor:', error);
      // If processor creation fails, return original stream
      return inputStream;
    }
  }, []);

  // FastRTC compatible connection function
  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (isConnectingRef.current || connectionStatus.connected) {
      console.log('⚠️ Connection already in progress or connected, skipping duplicate connection');
      return;
    }
    
    try {
      isConnectingRef.current = true;
      setConnectionStatus({ connected: false, status: 'connecting' });
      console.log('🔌 Starting WebRTC backend connection...');
      
      // Check if backend is available
      const response = await fetch(backendUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Backend service unavailable: ${backendUrl}`);
      }
      
      // Get user media - using FastRTC expected configuration + noise suppression
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,        // Echo cancellation
          noiseSuppression: true,        // 🔇 Noise suppression - filter background noise
          autoGainControl: true,         // Automatic gain control
          sampleRate: 24000,             // FastRTC default expects 24kHz
          sampleSize: 16,
          channelCount: 1
        },
        video: false
      });
      
      console.log('✅ Successfully obtained raw audio stream');
      
      // 🔍 Apply audio preprocessing: volume filtering + voice frequency detection
      const processedStream = createAudioProcessor(rawStream);
      
      localStreamRef.current = processedStream;
      console.log('✅ Audio preprocessing completed, volume and frequency filtering applied');
      
      // 🔇 Verify noise suppression settings - get settings from raw stream
              const audioTrack = rawStream.getAudioTracks()[0];
        if (audioTrack) {
          const settings = audioTrack.getSettings();
          console.log('🎤 Audio track settings:', {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
            sampleRate: settings.sampleRate
          });
          
          // Update audio features status
          setAudioFeatures({
            noiseSuppression: !!settings.noiseSuppression,
            echoCancellation: !!settings.echoCancellation,
            autoGainControl: !!settings.autoGainControl
          });
          
          if (settings.noiseSuppression) {
            console.log('✅ Noise suppression enabled - background noise will be filtered');
          } else {
            console.warn('⚠️ Noise suppression not enabled - may have background noise interference');
          }
        }
        
        // Create WebRTC connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerConnectionRef.current = pc;
      
      // Create data channel - required by FastRTC
      const dataChannel = pc.createDataChannel("text");
      dataChannelRef.current = dataChannel;
      
      dataChannel.onopen = () => {
        console.log('✅ Data channel opened');
        dataChannel.send("handshake"); // FastRTC handshake
      };
      
      dataChannel.onmessage = (event) => {
        console.log('📨 Received data channel message:', event.data);
        
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          console.log('📨 Received non-JSON message:', event.data);
          return;
        }
        
        // Handle FastRTC messages
        switch (message.type) {
          case 'log':
            console.log('🔔 FastRTC log:', message.data);
            if (message.data === 'pause_detected') {
              console.log('⏸️ Voice pause detected');
            } else if (message.data === 'response_starting') {
              console.log('🎙️ AI response starting');
            } else if (message.data === 'started_talking') {
              console.log('🗣️ Started talking');
            }
            break;
            
          case 'error':
            console.error('❌ FastRTC error:', message.data);
            break;
            
          case 'warning':
            console.warn('⚠️ FastRTC warning:', message.data);
            break;
            
          default:
            console.log('📨 Other FastRTC message:', message);
        }
      };
      
      // Add audio tracks - FastRTC style (using processed stream)
      processedStream.getTracks().forEach(async (track: MediaStreamTrack) => {
        console.log('🎤 Adding audio track:', track);
        const sender = pc.addTrack(track, processedStream);
        
        // Set sender parameters - this is key for FastRTC!
        try {
          const params = sender.getParameters();
          console.log('📤 Default sender parameters:', params);
          
          // Use parameters expected by FastRTC
          const newParams = {
            ...params,
            // Can add specific RTP parameters here
          };
          
          await sender.setParameters(newParams);
          console.log('📤 Sender parameters set:', sender.getParameters());
        } catch (error) {
          console.warn('⚠️ Failed to set sender parameters:', error);
        }
      });
      
      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state changed:', pc.connectionState);
        const isConnected = pc.connectionState === 'connected';
        setConnectionStatus(prev => ({
          connected: isConnected,
          status: isConnected ? 'connected' : prev.status
        }));
        
        if (isConnected) {
          console.log('✅ WebRTC connection established');
        }
      };
      
      // ICE candidate handling
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log('🧊 Sending ICE candidate:', candidate);
          // FastRTC will handle ICE candidates, we just log here
        }
      };

      // 🔊 Handle incoming audio tracks - key for playing AI responses!
      pc.ontrack = (event) => {
        console.log('🎵 Received audio track:', event.track.kind, event.track);
        
        if (event.track.kind === 'audio') {
          console.log('🔊 Starting AI response audio playback');
          
          // Connect remote stream to output visualization
          connectRemoteStream(event.streams[0]);
          
          // Create audio element to play received audio
          const audioElement = new Audio();
          audioElement.srcObject = event.streams[0];
          audioElement.autoplay = true;
          audioElement.volume = 1.0;
          
          // Listen to playback events
          audioElement.onplay = () => {
            console.log('✅ AI audio playback started - Output visualization active');
          };
          
          audioElement.onended = () => {
            console.log('✅ AI audio playback completed - Output visualization inactive');
          };
          
          audioElement.onerror = (error) => {
            console.error('❌ AI audio playback error:', error);
          };
          
          // Attempt to play
          audioElement.play().catch(error => {
            console.error('❌ Unable to play AI audio:', error);
          });
        }
      };
      
      // Create offer - FastRTC style
      console.log('📝 Creating WebRTC offer...');
      const offer = await pc.createOffer();
      console.log('📝 Offer created:', offer);
      await pc.setLocalDescription(offer);
      console.log('📝 Local description set');
      
      // Generate unique webrtc_id (required by FastRTC)
      const webrtc_id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Send offer to FastRTC backend
      const connectResponse = await fetch(`${backendUrl}/webrtc/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webrtc_id: webrtc_id,
          type: offer.type,
          sdp: offer.sdp
        })
      });
      
      if (!connectResponse.ok) {
        throw new Error('Backend connection failed');
      }
      
      const responseData = await connectResponse.json();
      console.log('Received backend response:', responseData);
      
      const answer = responseData.answer || responseData;
      console.log('Extracted answer:', answer);
      
      if (!answer || !answer.type || !answer.sdp) {
        throw new Error(`Invalid answer data: ${JSON.stringify(answer)}`);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('📡 SDP exchange completed, waiting for WebRTC connection...');
      
      // Connection successful, reset connection state
      isConnectingRef.current = false;
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setConnectionStatus({ connected: false, status: 'error' });
      // Connection failed, reset connection state
      isConnectingRef.current = false;
          }
    }, [connectionStatus.connected, connectRemoteStream, createAudioProcessor]);
  
  // Auto start audio visualization when component mounts
  useEffect(() => {
    startDualVisualization();
  }, [startDualVisualization]);
  
  // Auto connect - only execute on component first mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Clean up audio resources on component unmount
  useEffect(() => {
    return () => {
      // Clean up audio context and nodes
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (destinationNodeRef.current) {
        destinationNodeRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Monitor audio level to detect talking - based on audio filtering results
  const isTalking = useMemo(() => {
    // Only audio that passes volume and frequency detection counts as "talking"
    return audioFilterStatus.isValidVoice;
  }, [audioFilterStatus.isValidVoice]);

  const getInteractionStatus = () => {
    if (!connectionStatus.connected) {
      return {
        icon: '🔴',
        status: 'Disconnected',
        showTooltip: true
      };
    }
    
    if (isTalking) {
      return {
        icon: '🎤',
        status: 'Sending voice to backend',
        showTooltip: false
      };
    }
    
    // TODO: Add states for AI thinking, AI responding when backend integration is complete
    // For now, default to waiting state when connected
    return {
      icon: '👂',
      status: 'Waiting for voice input',
      showTooltip: false
    };
  };

  return (
    <AssistantContainer>
      <Header>
        <Title>🎤 AI Voice Assistant</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          <span style={{ 
            color: connectionStatus.connected ? '#48bb78' : '#f56565',
            fontSize: '0.9rem'
          }}>
            {connectionStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </Header>

      <ContentArea>
        <LeftPanel>
          <ControlsSection>
            <SectionTitle>
              🎵 Audio Monitoring
            </SectionTitle>
            <VisualizerContainer>
                          <DualAudioVisualizer
              inputAudioData={inputAudioData}
              outputAudioData={outputAudioData}
              width={500}
              height={80}
            />
            </VisualizerContainer>
          </ControlsSection>
        </LeftPanel>

        <RightPanel>
          <ControlsSection>
            <SectionTitle>
              🎯 Interaction Status
            </SectionTitle>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              fontSize: '1rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getInteractionStatus().icon}
              </span>
              <span style={{ 
                color: connectionStatus.connected ? '#48bb78' : '#f56565',
                fontWeight: '500'
              }}>
                {getInteractionStatus().status}
              </span>
              {getInteractionStatus().showTooltip && (
                <div 
                  style={{ 
                    position: 'relative', 
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '1';
                      tooltip.style.visibility = 'visible';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '0';
                      tooltip.style.visibility = 'hidden';
                    }
                  }}
                >
                  <span 
                    style={{ 
                      color: '#9ca3af', 
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1.5px solid #9ca3af',
                      fontWeight: 'bold',
                      fontFamily: 'serif'
                    }}
                  >
                    ?
                  </span>
                  <div 
                    className="tooltip"
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: '8px',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.9)',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      opacity: '0',
                      visibility: 'hidden',
                      transition: 'opacity 0.2s, visibility 0.2s',
                      zIndex: 1000,
                      pointerEvents: 'none'
                    }}
                  >
                    Start backend: cd backend && python fastrtc_server.py
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '0',
                      height: '0',
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: '5px solid rgba(0, 0, 0, 0.9)'
                    }} />
                  </div>
                </div>
              )}
            </div>
          </ControlsSection>

          <ControlsSection>
            <SectionTitle>
              🎛️ Audio Features
            </SectionTitle>
            <CompactInfoSection>
              <CompactInfoItem>
                <strong>🔇 Noise Suppression</strong> 
                <span style={{ 
                  color: audioFeatures.noiseSuppression ? '#48bb78' : '#f56565' 
                }}>
                  {audioFeatures.noiseSuppression ? 'ON' : 'OFF'}
                </span>
              </CompactInfoItem>
              <CompactInfoItem>
                <strong>🔄 Echo Cancellation</strong> 
                <span style={{ 
                  color: audioFeatures.echoCancellation ? '#48bb78' : '#f56565' 
                }}>
                  {audioFeatures.echoCancellation ? 'ON' : 'OFF'}
                </span>
              </CompactInfoItem>
              <CompactInfoItem>
                <strong>📶 Auto Gain Control</strong> 
                <span style={{ 
                  color: audioFeatures.autoGainControl ? '#48bb78' : '#f56565' 
                }}>
                  {audioFeatures.autoGainControl ? 'ON' : 'OFF'}
                </span>
              </CompactInfoItem>
            </CompactInfoSection>
          </ControlsSection>

          <ControlsSection>
            <SectionTitle>
              📈 Voice Detection
            </SectionTitle>
            <CompactInfoSection>
              <CompactInfoItem>
                <strong>🎤 Valid Voice</strong> 
                <span style={{ 
                  color: audioFilterStatus.isValidVoice ? '#48bb78' : '#f56565' 
                }}>
                  {audioFilterStatus.isValidVoice ? 'YES' : 'NO'}
                </span>
              </CompactInfoItem>
              <CompactInfoItem>
                <strong>🔊 Volume</strong> 
                <span style={{ 
                  color: audioFilterStatus.volume > 5 ? '#48bb78' : '#ffc107' 
                }}>
                  {audioFilterStatus.volume.toFixed(1)}%
                </span>
              </CompactInfoItem>
              <CompactInfoItem>
                <strong>🎵 Voice Ratio</strong> 
                <span style={{ 
                  color: audioFilterStatus.humanVoiceRatio > 0.3 ? '#48bb78' : '#ffc107' 
                }}>
                  {(audioFilterStatus.humanVoiceRatio * 100).toFixed(1)}%
                </span>
              </CompactInfoItem>
            </CompactInfoSection>
          </ControlsSection>
        </RightPanel>
      </ContentArea>

    </AssistantContainer>
  );
};

export default VoiceAssistant; 
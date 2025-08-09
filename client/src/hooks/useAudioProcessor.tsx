import { useState, useEffect, useRef, useCallback } from "react";

export function useAudioProcessor() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [timeData, setTimeData] = useState<Float32Array | null>(null);
  const [dominantFreq, setDominantFreq] = useState(0);
  const [sampleRate, setSampleRate] = useState(44100);
  const [peakFrequency, setPeakFrequency] = useState(0);
  const [peakMagnitude, setPeakMagnitude] = useState(0);
  const [frequencyResolution, setFrequencyResolution] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!audioContext) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      
      setAudioContext(ctx);
      setAnalyserNode(analyser);
      setSampleRate(ctx.sampleRate);
      setFrequencyResolution(ctx.sampleRate / analyser.fftSize);
    }
  }, [audioContext]);

  // Load audio file from URL with better M4A support
  const loadAudioFile = useCallback(async (url: string) => {
    await initializeAudioContext();
    if (!audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Try to decode audio data with comprehensive error handling
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer).catch((error) => {
        console.error('Audio decoding error:', error);
        console.error('Error details:', error.message);
        
        // More specific error messages based on common issues
        if (error.message.includes('WEBM') || error.message.includes('M4A') || error.message.includes('AAC')) {
          throw new Error('M4A/AAC format not fully supported. Please try MP3, WAV, or OGG format.');
        } else if (error.message.includes('DRM') || error.message.includes('protected')) {
          throw new Error('DRM-protected audio files are not supported.');
        } else {
          throw new Error('Audio file format not supported by browser. Please try MP3, WAV, or OGG format.');
        }
      });
      
      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      setCurrentTime(0);
      setPlaybackProgress(0);
      pauseTimeRef.current = 0;
    } catch (error) {
      console.error('Error loading audio file:', error);
      // Show user-friendly error for unsupported formats
      const errorMessage = error instanceof Error ? error.message : 'Could not load audio file. Please try MP3, WAV, or OGG format.';
      alert(errorMessage);
    }
  }, [audioContext, initializeAudioContext]);

  // Generate example audio programmatically for demonstration
  const loadExampleAudio = useCallback(async (exampleType: string) => {
    // Ensure audio context is initialized first, especially for mobile
    if (!audioContext) {
      await initializeAudioContext();
      return; // Return and let the effect handle the loading once context is ready
    }

    const sampleRate = audioContext.sampleRate;
    const duration = 3; // 3 seconds
    const frameCount = sampleRate * duration;
    
    // Create an audio buffer
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate different types of audio based on selection
    switch (exampleType) {
      case 'full_song':
        // Mix of frequencies for a "song-like" sound
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          channelData[i] = 
            0.3 * Math.sin(2 * Math.PI * 440 * t) +  // A4
            0.2 * Math.sin(2 * Math.PI * 554.37 * t) + // C#5
            0.1 * Math.sin(2 * Math.PI * 659.25 * t) +  // E5
            0.05 * Math.sin(2 * Math.PI * 220 * t);     // A3
        }
        break;
      case 'drums':
        // Percussive sound with noise bursts
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          const beat = Math.floor(t * 4) % 4;
          const beatTime = (t * 4) % 1;
          if (beatTime < 0.1) {
            channelData[i] = (Math.random() - 0.5) * Math.exp(-beatTime * 20) * 0.8;
          } else {
            channelData[i] = 0;
          }
        }
        break;
      case 'bass':
        // Low frequency bass line
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          channelData[i] = 0.6 * Math.sin(2 * Math.PI * 110 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 2 * t));
        }
        break;
      case 'synth':
        // Sawtooth wave for synth sound
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          const freq = 440 + 100 * Math.sin(2 * Math.PI * 0.5 * t); // Frequency modulation
          channelData[i] = 0.4 * ((2 * (t * freq - Math.floor(t * freq + 0.5))));
        }
        break;
      case 'piano':
        // Piano-like attack and decay
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          const noteTime = t % 0.5; // New note every 0.5 seconds
          const envelope = Math.exp(-noteTime * 3);
          channelData[i] = envelope * 0.5 * (
            Math.sin(2 * Math.PI * 440 * t) +
            0.5 * Math.sin(2 * Math.PI * 880 * t) +
            0.25 * Math.sin(2 * Math.PI * 1320 * t)
          );
        }
        break;
      default:
        // Simple sine wave
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          channelData[i] = 0.5 * Math.sin(2 * Math.PI * 440 * t);
        }
    }

    setAudioBuffer(buffer);
    setDuration(buffer.duration);
    setCurrentTime(0);
    setPlaybackProgress(0);
    pauseTimeRef.current = 0;
  }, [audioContext, initializeAudioContext]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    // Initialize audio context if needed (especially for mobile)
    if (!audioContext) {
      await initializeAudioContext();
      return;
    }
    
    if (!audioBuffer || !analyserNode) {
      console.log('Audio not ready - buffer:', !!audioBuffer, 'analyser:', !!analyserNode);
      return;
    }

    if (isPlaying) {
      // Pause
      if (sourceNode) {
        sourceNode.stop();
        setSourceNode(null);
      }
      pauseTimeRef.current = currentTime;
      setIsPlaying(false);
    } else {
      // Play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      
      const offset = pauseTimeRef.current;
      source.start(0, offset);
      startTimeRef.current = audioContext.currentTime - offset;
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        setPlaybackProgress(0);
      };
      
      setSourceNode(source);
      setIsPlaying(true);
    }
  }, [audioContext, audioBuffer, analyserNode, sourceNode, isPlaying, currentTime]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackProgress(0);
    pauseTimeRef.current = 0;
  }, [sourceNode]);

  // Update playback time and audio analysis
  useEffect(() => {
    if (!isPlaying || !audioContext || !analyserNode) return;

    const updateTime = () => {
      const elapsed = audioContext.currentTime - startTimeRef.current;
      setCurrentTime(elapsed);
      setPlaybackProgress((elapsed / duration) * 100);

      // Analyze audio for real-time data
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const freqArray = new Uint8Array(bufferLength);
      
      analyserNode.getFloatTimeDomainData(dataArray);
      analyserNode.getByteFrequencyData(freqArray);
      
      // Update time domain data for visualization
      setTimeData(dataArray);

      // Calculate RMS for amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const amplitude = 20 * Math.log10(rms + 1e-10); // Convert to dB
      setCurrentAmplitude(amplitude);

      // Find dominant frequency
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < freqArray.length; i++) {
        if (freqArray[i] > maxValue) {
          maxValue = freqArray[i];
          maxIndex = i;
        }
      }
      
      const nyquist = audioContext.sampleRate / 2;
      const dominantFrequency = (maxIndex / freqArray.length) * nyquist;
      setDominantFreq(dominantFrequency);
      setPeakFrequency(dominantFrequency);
      setPeakMagnitude(20 * Math.log10(maxValue / 255 + 1e-10));

      if (elapsed < duration) {
        requestAnimationFrame(updateTime);
      }
    };

    updateTime();
  }, [isPlaying, audioContext, analyserNode, duration]);

  return {
    audioContext,
    analyserNode,
    isPlaying,
    currentTime,
    duration,
    playbackProgress,
    currentAmplitude,
    timeData,
    dominantFreq,
    sampleRate,
    peakFrequency,
    peakMagnitude,
    frequencyResolution,
    loadAudioFile,
    loadExampleAudio,
    togglePlayPause,
    stopAudio,
  };
}

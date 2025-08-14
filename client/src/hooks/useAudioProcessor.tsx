import { useState, useEffect, useCallback, useRef } from 'react';

export function useAudioProcessor() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [pausedAt, setPausedAt] = useState(0);
  const [audioStartTime, setAudioStartTime] = useState(0);
  const [playbackOffset, setPlaybackOffset] = useState(0);
  
  // Audio analysis states
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [timeData, setTimeData] = useState<Float32Array | null>(null);
  const [dominantFreq, setDominantFreq] = useState(0);
  const [sampleRate, setSampleRate] = useState(44100);
  const [peakFrequency, setPeakFrequency] = useState(0);
  const [peakMagnitude, setPeakMagnitude] = useState(0);
  const [frequencyResolution, setFrequencyResolution] = useState(0);

  const animationRef = useRef<number>();

  const initializeAudioContext = useCallback(async () => {
    if (!audioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      setAudioContext(ctx);
      setSampleRate(ctx.sampleRate);
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      setAnalyserNode(analyser);
      setFrequencyResolution(ctx.sampleRate / analyser.fftSize);
    }
  }, [audioContext]);

  // Stop any existing audio
  const stopExistingAudio = useCallback(() => {
    if (sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
    }
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [sourceNode]);

  // Load audio file
  const loadAudioFile = useCallback(async (url: string) => {
    await initializeAudioContext();
    if (!audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer).catch((error) => {
        console.error('Audio decoding error:', error);
        if (error.message.includes('WEBM') || error.message.includes('M4A') || error.message.includes('AAC')) {
          throw new Error('M4A/AAC format not fully supported. Please try MP3, WAV, or OGG format.');
        } else if (error.message.includes('DRM') || error.message.includes('protected')) {
          throw new Error('DRM-protected audio files are not supported.');
        } else {
          throw new Error('Audio file format not supported by browser. Please try MP3, WAV, or OGG format.');
        }
      });
      
      stopExistingAudio();
      
      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      setCurrentTime(0);
      setPlaybackProgress(0);
      setPausedAt(0);
      setPlaybackOffset(0);
    } catch (error) {
      console.error('Error loading audio file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not load audio file. Please try MP3, WAV, or OGG format.';
      alert(errorMessage);
    }
  }, [audioContext, initializeAudioContext, stopExistingAudio]);

  // Load example audio (synthetic)
  const loadExampleAudio = useCallback(async (audioType: string) => {
    await initializeAudioContext();
    if (!audioContext) return;

    const duration = 5.0;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    
    // Generate different types of audio based on selection
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate;
      switch (audioType) {
        case 'full_song':
          channelData[i] = 0.3 * (Math.sin(2 * Math.PI * 440 * t) + 0.5 * Math.sin(2 * Math.PI * 880 * t) + 0.3 * Math.sin(2 * Math.PI * 220 * t));
          break;
        case 'drums':
          channelData[i] = 0.5 * (Math.random() - 0.5) * Math.exp(-t % 0.5 * 10);
          break;
        case 'vocal':
          channelData[i] = 0.4 * Math.sin(2 * Math.PI * (440 + 20 * Math.sin(2 * Math.PI * 5 * t)) * t);
          break;
        case 'bass':
          channelData[i] = 0.6 * Math.sin(2 * Math.PI * 110 * t);
          break;
        case 'synth':
          channelData[i] = 0.4 * Math.sin(2 * Math.PI * 523.25 * t) * (1 + Math.sin(2 * Math.PI * 3 * t)) / 2;
          break;
        case 'electric_guitar':
          channelData[i] = 0.5 * Math.tanh(3 * Math.sin(2 * Math.PI * 329.63 * t));
          break;
        case 'acoustic_guitar':
          channelData[i] = 0.4 * Math.sin(2 * Math.PI * 329.63 * t) * Math.exp(-t % 1.0 * 2);
          break;
        case 'piano':
        default:
          channelData[i] = 0.5 * Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t % 2.0 * 1.5);
          break;
      }
    }

    stopExistingAudio();
    
    setAudioBuffer(buffer);
    setDuration(buffer.duration);
    setCurrentTime(0);
    setPlaybackProgress(0);
    setPausedAt(0);
    setPlaybackOffset(0);
  }, [audioContext, initializeAudioContext, stopExistingAudio]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioBuffer || !audioContext || !analyserNode) {
      console.log('Audio not ready - buffer:', !!audioBuffer, 'analyser:', !!analyserNode);
      return;
    }

    if (isPlaying) {
      // Pause
      if (sourceNode) {
        sourceNode.stop();
        setSourceNode(null);
      }
      const currentPos = playbackOffset + (audioContext.currentTime - audioStartTime);
      setPausedAt(currentPos);
      setCurrentTime(currentPos);
      setPlaybackProgress((currentPos / duration) * 100);
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      
      const startPosition = pausedAt || 0;
      source.start(0, startPosition);
      
      setSourceNode(source);
      setPlaybackOffset(startPosition);
      setAudioStartTime(audioContext.currentTime);
      setIsPlaying(true);
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        setPausedAt(0);
        setPlaybackOffset(0);
        setCurrentTime(0);
        setPlaybackProgress(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [audioContext, audioBuffer, analyserNode, sourceNode, isPlaying, pausedAt, duration, playbackOffset, audioStartTime]);

  // Seek function
  const seekTo = useCallback((timePosition: number) => {
    if (!audioBuffer || !audioContext || !analyserNode) return;
    
    const clampedPosition = Math.max(0, Math.min(timePosition, audioBuffer.duration));
    
    if (isPlaying && sourceNode) {
      // Stop current playback
      sourceNode.stop();
      setSourceNode(null);
      
      // Start new source from sought position
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      source.start(0, clampedPosition);
      
      setSourceNode(source);
      setPlaybackOffset(clampedPosition);
      setAudioStartTime(audioContext.currentTime);
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        setPausedAt(0);
        setPlaybackOffset(0);
        setCurrentTime(0);
        setPlaybackProgress(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      // If paused, update pause position
      setPausedAt(clampedPosition);
      setCurrentTime(clampedPosition);
      setPlaybackProgress((clampedPosition / audioBuffer.duration) * 100);
    }
  }, [audioBuffer, audioContext, isPlaying, sourceNode, analyserNode]);

  // Stop audio
  const stopAudio = useCallback(() => {
    stopExistingAudio();
    setCurrentTime(0);
    setPlaybackProgress(0);
    setPausedAt(0);
    setPlaybackOffset(0);
  }, [stopExistingAudio]);

  // Update playback time and audio analysis
  useEffect(() => {
    if (!isPlaying || !audioContext || !analyserNode) return;

    const updateTime = () => {
      const elapsedFromStart = audioContext.currentTime - audioStartTime;
      const currentPos = playbackOffset + elapsedFromStart;
      
      setCurrentTime(currentPos);
      setPlaybackProgress((currentPos / duration) * 100);

      // Audio analysis
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const freqArray = new Uint8Array(bufferLength);
      
      analyserNode.getFloatTimeDomainData(dataArray);
      analyserNode.getByteFrequencyData(freqArray);
      
      setTimeData(dataArray);

      // Calculate RMS for amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const amplitude = 20 * Math.log10(rms + 1e-10);
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

      if (currentPos < duration && isPlaying) {
        animationRef.current = requestAnimationFrame(updateTime);
      } else if (currentPos >= duration) {
        // End of audio reached
        setIsPlaying(false);
        setSourceNode(null);
        setPausedAt(0);
        setPlaybackOffset(0);
        setCurrentTime(0);
        setPlaybackProgress(0);
      }
    };

    animationRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, audioContext, analyserNode, audioStartTime, playbackOffset, duration]);

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
    seekTo,
  };
}
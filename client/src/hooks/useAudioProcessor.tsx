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
  
  const [pausedAt, setPausedAt] = useState<number>(0);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [playbackOffset, setPlaybackOffset] = useState<number>(0);
  const [timerFrozen, setTimerFrozen] = useState<boolean>(false);
  const [frozenTime, setFrozenTime] = useState<number>(0);

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

  // Stop any existing audio before starting new audio
  const stopExistingAudio = useCallback(() => {
    if (sourceNode) {
      try {
        sourceNode.stop();
      } catch (error) {
        // Source might already be stopped, ignore error
      }
      setSourceNode(null);
    }
    setIsPlaying(false);
    setTimerFrozen(false);
  }, [sourceNode]);

  // Load audio file from URL with better M4A support
  const loadAudioFile = useCallback(async (url: string) => {
    await initializeAudioContext();
    if (!audioContext) return;

    // Stop any existing audio first, before starting new loading
    stopExistingAudio();

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
      // Reset all playback states when loading new audio
      setCurrentTime(0);
      setPlaybackProgress(0);
      setPausedAt(0);
      setPlaybackOffset(0);
      setTimerFrozen(false);
      setFrozenTime(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error loading audio file:', error);
      // Show user-friendly error for unsupported formats
      const errorMessage = error instanceof Error ? error.message : 'Could not load audio file. Please try MP3, WAV, or OGG format.';
      alert(errorMessage);
    }
  }, [audioContext, initializeAudioContext, stopExistingAudio]);

  // Generate example audio programmatically for demonstration
  const loadExampleAudio = useCallback(async (exampleType: string) => {
    // Ensure audio context is initialized first, especially for mobile
    if (!audioContext) {
      await initializeAudioContext();
      return; // Return and let the effect handle the loading once context is ready
    }

    // Remember current playback state
    const wasPlaying = isPlaying;
    const currentPosition = wasPlaying ? 
      playbackOffset + (audioContext.currentTime - audioStartTime) : 
      pausedAt;

    const sampleRate = audioContext.sampleRate;
    const duration = 3; // 3 seconds
    const frameCount = sampleRate * duration;
    
    // Create an audio buffer
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate different types of audio based on selection
    switch (exampleType) {
      case 'full_song':
        // Load uploaded full song MP3 file
        try {
          const fullSongUrl = new URL('@assets/fv_full_song_1755138764578.mp3', import.meta.url).href;
          await loadAudioFile(fullSongUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading full song file, falling back to synthetic:', error);
          // Fallback to synthetic song-like sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            channelData[i] = 
              0.3 * Math.sin(2 * Math.PI * 440 * t) +  // A4
              0.2 * Math.sin(2 * Math.PI * 554.37 * t) + // C#5
              0.1 * Math.sin(2 * Math.PI * 659.25 * t) +  // E5
              0.05 * Math.sin(2 * Math.PI * 220 * t);     // A3
          }
        }
        break;
      case 'drums':
        // Load uploaded drums MP3 file
        try {
          const drumsUrl = new URL('@assets/fv_drums_1755138718109.mp3', import.meta.url).href;
          await loadAudioFile(drumsUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading drums file, falling back to synthetic:', error);
          // Fallback to synthetic drums sound
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
        }
        break;
      case 'bass':
        // Load uploaded bass MP3 file
        try {
          const bassUrl = new URL('@assets/fv_bass_1755138681956.mp3', import.meta.url).href;
          await loadAudioFile(bassUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading bass file, falling back to synthetic:', error);
          // Fallback to synthetic bass sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            channelData[i] = 0.6 * Math.sin(2 * Math.PI * 110 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 2 * t));
          }
        }
        break;
      case 'synth':
        // Load uploaded synth MP3 file
        try {
          const synthUrl = new URL('@assets/fv_synth_1755138233942.mp3', import.meta.url).href;
          await loadAudioFile(synthUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading synth file, falling back to synthetic:', error);
          // Fallback to synthetic synth sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const freq = 440 + 100 * Math.sin(2 * Math.PI * 0.5 * t); // Frequency modulation
            channelData[i] = 0.4 * ((2 * (t * freq - Math.floor(t * freq + 0.5))));
          }
        }
        break;
      case 'piano':
        // Load uploaded piano MP3 file
        try {
          const pianoUrl = new URL('@assets/fv_piano_normalized_1755137880955.mp3', import.meta.url).href;
          await loadAudioFile(pianoUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading piano file, falling back to synthetic:', error);
          // Fallback to synthetic piano sound
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
        }
        break;
      case 'electric_guitar':
        // Load uploaded electric guitar MP3 file
        try {
          const guitarUrl = new URL('@assets/FV_ec_guitar_1755137041080.mp3', import.meta.url).href;
          await loadAudioFile(guitarUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading electric guitar file, falling back to synthetic:', error);
          // Fallback to synthetic electric guitar sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const fundamentalFreq = 82.41; // Low E string
            const distortion = 0.7;
            let signal = 0.6 * Math.sin(2 * Math.PI * fundamentalFreq * t);
            // Add harmonics for guitar-like timbre
            signal += 0.3 * Math.sin(2 * Math.PI * fundamentalFreq * 2 * t);
            signal += 0.2 * Math.sin(2 * Math.PI * fundamentalFreq * 3 * t);
            // Simple distortion effect
            signal = Math.tanh(signal * distortion);
            channelData[i] = signal * 0.5;
          }
        }
        break;
      case 'acoustic_guitar':
        // Load uploaded acoustic guitar MP3 file
        try {
          const acousticGuitarUrl = new URL('@assets/FV_ac_guitar_1755138282773.mp3', import.meta.url).href;
          await loadAudioFile(acousticGuitarUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading acoustic guitar file, falling back to synthetic:', error);
          // Fallback to synthetic acoustic guitar sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const fundamentalFreq = 196; // G string
            let signal = 0.5 * Math.sin(2 * Math.PI * fundamentalFreq * t);
            // Add harmonics for acoustic guitar timbre
            signal += 0.3 * Math.sin(2 * Math.PI * fundamentalFreq * 2 * t);
            signal += 0.15 * Math.sin(2 * Math.PI * fundamentalFreq * 3 * t);
            signal += 0.1 * Math.sin(2 * Math.PI * fundamentalFreq * 4 * t);
            // Apply gentle envelope
            const envelope = Math.exp(-t * 0.5);
            channelData[i] = signal * envelope * 0.6;
          }
        }
        break;
      case 'vocal':
        // Load uploaded vocal MP3 file
        try {
          const vocalUrl = new URL('@assets/fv_vocal_1755138621004.mp3', import.meta.url).href;
          await loadAudioFile(vocalUrl);
          return; // Return early since loadAudioFile handles the buffer setup
        } catch (error) {
          console.error('Error loading vocal file, falling back to synthetic:', error);
          // Fallback to synthetic vocal sound
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const fundamentalFreq = 220; // A3
            let signal = 0.4 * Math.sin(2 * Math.PI * fundamentalFreq * t);
            // Add formant frequencies typical of vowels
            signal += 0.2 * Math.sin(2 * Math.PI * 800 * t); // First formant
            signal += 0.1 * Math.sin(2 * Math.PI * 1200 * t); // Second formant
            channelData[i] = signal * 0.7;
          }
        }
        break;
      default:
        // Simple sine wave
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          channelData[i] = 0.5 * Math.sin(2 * Math.PI * 440 * t);
        }
    }

    // Stop any existing audio first
    stopExistingAudio();
    
    setAudioBuffer(buffer);
    setDuration(buffer.duration);
    
    // Always reset to beginning when changing audio sources for better UX
    setCurrentTime(0);
    setPlaybackProgress(0);
    setPausedAt(0);
    setPlaybackOffset(0);
    setTimerFrozen(false);
    setFrozenTime(0);
    setIsPlaying(false);
  }, [audioContext, initializeAudioContext, stopExistingAudio, isPlaying, playbackOffset, audioStartTime, pausedAt, analyserNode]);

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
      // Pause: simply stop the audio and keep current time
      if (sourceNode) {
        sourceNode.stop();
        setSourceNode(null);
      }
      setIsPlaying(false);
    } else {
      // Play: always start from current time index
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      
      // Always use currentTime as the authoritative position
      const startTime = Math.max(0, Math.min(currentTime, audioBuffer.duration));
      
      if (startTime >= audioBuffer.duration) {
        // If at end, restart from beginning
        setCurrentTime(0);
        setPlaybackProgress(0);
        source.start(0, 0);
        setPlaybackOffset(0);
      } else {
        source.start(0, startTime);
        setPlaybackOffset(startTime);
      }
      
      setAudioStartTime(audioContext.currentTime);
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        setCurrentTime(0);
        setPlaybackProgress(0);
        setPlaybackOffset(0);
      };
      
      setSourceNode(source);
      setIsPlaying(true);
    }
  }, [audioContext, audioBuffer, analyserNode, sourceNode, isPlaying, audioStartTime, playbackOffset, pausedAt, currentTime]);

  // Seek to a specific time position - simplified and time-index driven
  const seekTo = useCallback((timePosition: number) => {
    if (!audioBuffer) return;
    
    const clampedPosition = Math.max(0, Math.min(timePosition, audioBuffer.duration));
    console.log('Seeking to position:', clampedPosition, 'seconds');
    
    // Stop any playing audio
    if (sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
    }
    
    // Update time index - this is the single source of truth
    setCurrentTime(clampedPosition);
    setPlaybackProgress(audioBuffer.duration > 0 ? (clampedPosition / audioBuffer.duration) * 100 : 0);
    setPlaybackOffset(clampedPosition);
    
    // If currently playing, restart from new position
    if (isPlaying && audioContext && analyserNode) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      source.start(0, clampedPosition);
      
      setSourceNode(source);
      setAudioStartTime(audioContext.currentTime);
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        setCurrentTime(0);
        setPlaybackProgress(0);
        setPlaybackOffset(0);
      };
    }
  }, [audioBuffer, audioContext, analyserNode, sourceNode, isPlaying]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackProgress(0);
    setPausedAt(0);
    setPlaybackOffset(0);
    setTimerFrozen(false);
    setFrozenTime(0);
  }, [sourceNode]);

  // Update playback time and audio analysis - simplified
  useEffect(() => {
    if (!isPlaying || !audioContext || !analyserNode) return;

    const updateTime = () => {      
      // Only update time index when actually playing
      if (isPlaying) {
        const elapsedFromStart = audioContext.currentTime - audioStartTime;
        const currentPos = playbackOffset + elapsedFromStart;
        
        if (duration > 0) {
          const clampedPos = Math.max(0, Math.min(currentPos, duration));
          setCurrentTime(clampedPos);
          setPlaybackProgress((clampedPos / duration) * 100);
        }
      }

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
      
      // Continue animation if still playing
      if (isPlaying) {
        requestAnimationFrame(updateTime);
      }
    };

    updateTime();
  }, [isPlaying, audioContext, analyserNode, duration, audioStartTime, playbackOffset]);

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

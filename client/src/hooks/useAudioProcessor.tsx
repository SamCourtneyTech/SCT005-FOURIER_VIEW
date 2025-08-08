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

  // Load audio file from URL
  const loadAudioFile = useCallback(async (url: string) => {
    await initializeAudioContext();
    if (!audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      setCurrentTime(0);
      setPlaybackProgress(0);
      setPauseTimeRef(0);
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, [audioContext, initializeAudioContext]);

  // Load example audio
  const loadExampleAudio = useCallback(async (exampleType: string) => {
    // In a real implementation, these would be actual audio file URLs
    const exampleUrls: Record<string, string> = {
      full_song: '/public-objects/audio/full_song.mp3',
      drums: '/public-objects/audio/drums.mp3',
      electronic_drums: '/public-objects/audio/electronic_drums.mp3',
      vocal: '/public-objects/audio/vocal.mp3',
      bass: '/public-objects/audio/bass.mp3',
      synth: '/public-objects/audio/synth.mp3',
      electric_guitar: '/public-objects/audio/electric_guitar.mp3',
      piano: '/public-objects/audio/piano.mp3',
      acoustic_guitar: '/public-objects/audio/acoustic_guitar.mp3',
      edm_lead: '/public-objects/audio/edm_lead.mp3',
      edm_bass: '/public-objects/audio/edm_bass.mp3',
    };

    const url = exampleUrls[exampleType];
    if (url) {
      await loadAudioFile(url);
    }
  }, [loadAudioFile]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioContext || !audioBuffer || !analyserNode) return;

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

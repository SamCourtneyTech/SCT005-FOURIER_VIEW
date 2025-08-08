import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, OctagonMinus, Upload } from "lucide-react";
import { TimeDomainSection } from "./TimeDomainSection";
import { DFTCalculationSection } from "./DFTCalculationSection";
import { SummationSection } from "./SummationSection";
import { SpectrumAnalyzer } from "./SpectrumAnalyzer";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useDFTCalculation } from "@/hooks/useDFTCalculation";
import type { UploadResult } from "@uppy/core";

const EXAMPLE_AUDIO_OPTIONS = [
  { value: "full_song", label: "Full Song" },
  { value: "drums", label: "Drums" },
  { value: "electronic_drums", label: "Electronic Drums" },
  { value: "vocal", label: "Vocal" },
  { value: "bass", label: "Bass" },
  { value: "synth", label: "Synth" },
  { value: "electric_guitar", label: "Electric Guitar" },
  { value: "piano", label: "Piano" },
  { value: "acoustic_guitar", label: "Acoustic Guitar" },
  { value: "edm_lead", label: "EDM Lead" },
  { value: "edm_bass", label: "EDM Bass" },
];

export function DFTVisualizer() {
  const [sampleWindow, setSampleWindow] = useState(8);
  const [selectedFrequencyBin, setSelectedFrequencyBin] = useState(0);
  const [selectedExampleAudio, setSelectedExampleAudio] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useAudioProcessor();

  const {
    timeData,
    frequencyData,
    dftResults,
    twiddleFactors,
    currentSample,
  } = useDFTCalculation(analyserNode, sampleWindow, selectedFrequencyBin, isPlaying);

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        // Update audio file record in backend
        await fetch("/api/audio-files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioFileURL: uploadURL,
            name: result.successful[0].name,
            filename: result.successful[0].name,
            fileSize: result.successful[0].size?.toString(),
            mimeType: result.successful[0].type,
          }),
          credentials: "include",
        });
        
        // Load the uploaded audio
        await loadAudioFile(uploadURL);
      }
    }
  };

  const handleExampleAudioChange = async (value: string) => {
    setSelectedExampleAudio(value);
    if (value) {
      await loadExampleAudio(value);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-dark text-text-primary font-sans min-h-screen">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">

            <div className="flex items-center space-x-4 text-text-secondary text-sm">
              <div className="flex items-center space-x-2">
                <span>Sample Window:</span>
                <Input
                  type="number"
                  value={sampleWindow}
                  onChange={(e) => setSampleWindow(Number(e.target.value))}
                  min="4"
                  max="64"
                  className="bg-gray-800 border-gray-600 w-16 text-center text-white"
                />
                <span className="text-xs">(N={sampleWindow})</span>
              </div>
              

            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Audio Upload Section */}
            <div className="flex items-center space-x-3">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={50 * 1024 * 1024} // 50MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Audio</span>
                </div>
              </ObjectUploader>

              <div className="text-text-secondary">or</div>

              <Select value={selectedExampleAudio} onValueChange={handleExampleAudioChange}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm w-48">
                  <SelectValue placeholder="Choose Example Audio" />
                </SelectTrigger>
                <SelectContent>
                  {EXAMPLE_AUDIO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-success hover:text-green-400 text-xl p-2"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopAudio}
                className="text-text-secondary hover:text-white p-2"
              >
                <OctagonMinus className="w-5 h-5" />
              </Button>
              <div className="w-32 h-1 bg-gray-600 rounded-full mx-3 relative">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary font-mono min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Visualization Grid */}
      <main className="grid grid-cols-4 gap-1 h-[calc(100vh-80px)]">
        <TimeDomainSection
          analyserNode={analyserNode}
          currentAmplitude={currentAmplitude}
          dominantFreq={dominantFreq}
          sampleRate={sampleRate}
          isPlaying={isPlaying}
        />

        <DFTCalculationSection
          sampleWindow={sampleWindow}
          selectedFrequencyBin={selectedFrequencyBin}
          timeData={timeData}
          twiddleFactors={twiddleFactors}
          currentSample={currentSample}
          isPlaying={isPlaying}
        />

        <SummationSection
          dftResults={dftResults}
          selectedFrequencyBin={selectedFrequencyBin}
          onSelectFrequencyBin={setSelectedFrequencyBin}
          sampleWindow={sampleWindow}
          isPlaying={isPlaying}
        />

        <SpectrumAnalyzer
          analyserNode={analyserNode}
          peakFrequency={peakFrequency}
          peakMagnitude={peakMagnitude}
          frequencyResolution={frequencyResolution}
          isPlaying={isPlaying}
        />
      </main>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<"vector" | "projection">("vector");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [currentAudioSource, setCurrentAudioSource] = useState<"example" | "uploaded">("example");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    audioContext,
    analyserNode,
    isPlaying,
    currentTime,
    duration,
    playbackProgress,
    currentAmplitude,
    timeData: audioTimeData,
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
      const fileName = result.successful[0].name || "Uploaded Audio";
      
      if (uploadURL) {
        // Update audio file record in backend
        await fetch("/api/audio-files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioFileURL: uploadURL,
            name: fileName,
            filename: fileName,
            fileSize: result.successful[0].size?.toString(),
            mimeType: result.successful[0].type,
          }),
          credentials: "include",
        });
        
        // Set uploaded file info and switch to uploaded audio
        setUploadedFileName(fileName);
        setCurrentAudioSource("uploaded");
        setSelectedExampleAudio(""); // Clear example selection
        
        // Load the uploaded audio
        await loadAudioFile(uploadURL);
      }
    }
  };

  const handleExampleAudioChange = async (value: string) => {
    setSelectedExampleAudio(value);
    setCurrentAudioSource("example");
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
      <header className="bg-surface border-b border-gray-700 px-3 md:px-6 py-2 md:py-4 sticky top-0 z-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-text-secondary text-xs md:text-sm">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="whitespace-nowrap">Sample Window:</span>
                <Input
                  type="number"
                  value={sampleWindow}
                  onChange={(e) => setSampleWindow(Number(e.target.value))}
                  min="4"
                  max="64"
                  className="bg-gray-800 border-gray-600 w-12 md:w-16 text-center text-white text-xs md:text-sm"
                />
                <span className="text-xs whitespace-nowrap">(N={sampleWindow})</span>
              </div>
              
              <div className="flex items-center gap-1 md:gap-2">
                <span className="whitespace-nowrap">View:</span>
                <Select value={viewMode} onValueChange={(value: "vector" | "projection") => setViewMode(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs md:text-sm w-24 md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vector">Vector</SelectItem>
                    <SelectItem value="projection">Projection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            {/* Audio Upload Section */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
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

              {uploadedFileName && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={currentAudioSource === "uploaded" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentAudioSource("uploaded")}
                    className="text-xs px-3 py-1 max-w-[150px] truncate"
                    title={uploadedFileName}
                  >
                    {uploadedFileName.length > 20 ? `${uploadedFileName.substring(0, 17)}...` : uploadedFileName}
                  </Button>
                </div>
              )}

              <div className="text-text-secondary">or</div>

              <Select 
                value={currentAudioSource === "example" ? selectedExampleAudio : ""} 
                onValueChange={handleExampleAudioChange}
              >
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
      <main className="flex flex-col md:grid md:grid-cols-4 gap-1 md:gap-1 h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
        <div className="h-40 md:h-auto md:flex-none">
          <TimeDomainSection
            analyserNode={analyserNode}
            currentAmplitude={currentAmplitude}
            dominantFreq={dominantFreq}
            sampleRate={sampleRate}
            isPlaying={isPlaying}
            sampleWindow={sampleWindow}
            timeData={audioTimeData || timeData}
          />
        </div>

        {/* DFT Calculation section - mobile row 2 */}
        <div className="h-64 md:h-auto md:flex-none">
          <DFTCalculationSection
            sampleWindow={sampleWindow}
            selectedFrequencyBin={selectedFrequencyBin}
            timeData={timeData}
            twiddleFactors={twiddleFactors}
            currentSample={currentSample}
            isPlaying={isPlaying}
            viewMode={viewMode}
          />
        </div>

        {/* Sections 3 and 4 with horizontal scroll on mobile */}
        <div className="h-64 md:contents md:h-auto">
          <div className="flex md:contents overflow-x-auto md:overflow-x-visible gap-2 md:gap-0 h-full pb-1">
            <div className="w-80 md:w-auto md:min-w-0 flex-shrink-0 h-full">
              <SummationSection
                dftResults={dftResults}
                selectedFrequencyBin={selectedFrequencyBin}
                onSelectFrequencyBin={setSelectedFrequencyBin}
                sampleWindow={sampleWindow}
                isPlaying={isPlaying}
                viewMode={viewMode}
              />
            </div>
            <div className="w-80 md:w-auto md:min-w-0 flex-shrink-0 h-full">
              <SpectrumAnalyzer
                analyserNode={analyserNode}
                peakFrequency={peakFrequency}
                peakMagnitude={peakMagnitude}
                frequencyResolution={frequencyResolution}
                isPlaying={isPlaying}
                sampleWindow={sampleWindow}
                dftResults={dftResults}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

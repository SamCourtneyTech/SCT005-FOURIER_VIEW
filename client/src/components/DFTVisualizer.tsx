import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Upload } from "lucide-react";
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
  { value: "vocal", label: "Vocal" },
  { value: "bass", label: "Bass" },
  { value: "synth", label: "Synth" },
  { value: "electric_guitar", label: "Electric Guitar" },
  { value: "piano", label: "Piano" },
  { value: "acoustic_guitar", label: "Acoustic Guitar" },
];

export function DFTVisualizer() {
  const [sampleWindow, setSampleWindow] = useState(8);
  const [selectedFrequencyBin, setSelectedFrequencyBin] = useState(0);
  const [selectedExampleAudio, setSelectedExampleAudio] = useState<string>("full_song");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileURL, setUploadedFileURL] = useState<string>("");
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
    seekTo,
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
        
        // Extract object ID from the signed URL and create server endpoint
        let serverURL = uploadURL;
        if (uploadURL.includes('storage.googleapis.com')) {
          // Extract the path after the bucket name
          const urlObj = new URL(uploadURL);
          const pathParts = urlObj.pathname.split('/');
          if (pathParts.length >= 3) {
            // Format: /bucket_name/path_to_object -> /objects/path_after_private_dir
            const objectPath = pathParts.slice(2).join('/');
            // Check if it's in the private directory structure
            if (objectPath.includes('uploads/')) {
              const uploadId = objectPath.split('uploads/')[1];
              serverURL = `/objects/uploads/${uploadId}`;
            }
          }
        }
        
        // Set uploaded file info and switch to uploaded audio
        setUploadedFileName(fileName);
        setUploadedFileURL(serverURL);
        setCurrentAudioSource("uploaded");
        setSelectedExampleAudio(""); // Clear example selection
        
        // Load the uploaded audio through our server
        try {
          await loadAudioFile(serverURL);
          console.log('Successfully loaded uploaded audio:', serverURL);
        } catch (error) {
          console.error('Failed to load uploaded audio:', error);
          // Fallback to direct URL if server endpoint fails
          try {
            await loadAudioFile(uploadURL);
            setUploadedFileURL(uploadURL); // Update to working URL
            console.log('Fallback: loaded audio from signed URL');
          } catch (fallbackError) {
            console.error('Both server and direct URL failed:', fallbackError);
          }
        }
      }
    }
  };

  const handleExampleAudioChange = async (value: string) => {
    setSelectedExampleAudio(value);
    setCurrentAudioSource("example");
    // Don't clear uploaded filename, keep it available for reselection
    if (value) {
      await loadExampleAudio(value);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Use frozen data when paused, live data when playing
  const currentTimeData = isPlaying ? timeData : timeData;
  const currentDftResults = isPlaying ? dftResults : dftResults;
  const currentTwiddleFactors = isPlaying ? twiddleFactors : twiddleFactors;

  // Load default audio on startup with proper dependency tracking
  useEffect(() => {
    // Load the initially selected audio when audio context becomes available
    if (audioContext && selectedExampleAudio && currentAudioSource === "example" && duration === 0) {
      console.log('Loading initial audio:', selectedExampleAudio);
      loadExampleAudio(selectedExampleAudio);
    }
  }, [audioContext, selectedExampleAudio, currentAudioSource, duration, loadExampleAudio]);

  return (
    <div className="bg-dark text-text-primary font-sans min-h-screen flex flex-col">
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
                  max="2048"
                  className="bg-gray-800 border-gray-600 w-12 md:w-16 text-center text-white text-xs md:text-sm"
                />
                <span className="text-xs whitespace-nowrap">(N={sampleWindow})</span>
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
                  <span>{uploadedFileName ? "Replace Audio" : "Upload Audio"}</span>
                </div>
              </ObjectUploader>

              {uploadedFileName && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={currentAudioSource === "uploaded" ? "default" : "ghost"}
                    size="sm"
                    onMouseDown={async (e) => {
                      e.preventDefault();
                      setCurrentAudioSource("uploaded");
                      setSelectedExampleAudio(""); // Clear example selection
                      if (uploadedFileURL) {
                        await loadAudioFile(uploadedFileURL);
                      }
                    }}
                    className="text-xs px-3 py-1 max-w-[150px] truncate"
                    title={uploadedFileName}
                  >
                    📁 {uploadedFileName.length > 15 ? `${uploadedFileName.substring(0, 12)}...` : uploadedFileName}
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

              <div 
                className="w-32 h-1 bg-gray-600 rounded-full mx-3 relative cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                  const newTime = percentage * duration;
                  seekTo(newTime);
                }}
              >
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

      {/* Main Visualization Stack - Unified Vertical Layout */}
      <main className="flex flex-col gap-4 flex-1 overflow-y-auto pb-4 px-4">
        {/* 1. Time Domain Section (Amplitude over Time) */}
        <div className="h-80 flex-shrink-0">
          <TimeDomainSection
            analyserNode={analyserNode}
            currentAmplitude={currentAmplitude}
            dominantFreq={dominantFreq}
            sampleRate={sampleRate}
            isPlaying={isPlaying}
            sampleWindow={sampleWindow}
            timeData={timeData}
          />
        </div>

        {/* 2. DFT Calculation Section (Inner Functions) */}
        <div className="h-[500px] flex-shrink-0">
          <div className="bg-surface border border-gray-700 rounded-lg p-4 flex flex-col gap-4 overflow-hidden h-full">
            <DFTCalculationSection
              sampleWindow={sampleWindow}
              selectedFrequencyBin={selectedFrequencyBin}
              timeData={currentTimeData}
              twiddleFactors={currentTwiddleFactors}
              currentSample={currentSample}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* 3. X[k] Summation Section */}
        <div className="h-[500px] flex-shrink-0">
          <div className="bg-surface border border-gray-700 rounded-lg p-4 flex flex-col gap-4 overflow-hidden h-full">
            <SummationSection
              dftResults={currentDftResults}
              selectedFrequencyBin={selectedFrequencyBin}
              onSelectFrequencyBin={setSelectedFrequencyBin}
              sampleWindow={sampleWindow}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* 4. Frequency Domain Section (Bottom) */}
        <div className="h-80 flex-shrink-0">
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
      </main>
    </div>
  );
}

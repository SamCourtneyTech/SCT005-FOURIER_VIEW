import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Create a fresh Uppy instance each time modal opens
  const createUppyInstance = useCallback(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
        // Clean up files after completion
        uppyInstance.cancelAll();
      });
    
    return uppyInstance;
  }, [maxNumberOfFiles, maxFileSize, onGetUploadParameters, onComplete]);

  const handleModalOpen = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <div>
      <Button onClick={handleModalOpen} className={buttonClassName}>
        {children}
      </Button>

      {showModal && (
        <DashboardModal
          uppy={createUppyInstance()}
          open={showModal}
          onRequestClose={handleModalClose}
          proudlyDisplayPoweredByUppy={false}
          closeModalOnClickOutside
          animateOpenClose={false}
        />
      )}
    </div>
  );
}
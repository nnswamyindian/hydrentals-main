import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, MapPin, Loader2, RefreshCw } from 'lucide-react';

interface CapturedImage {
  id: string;
  url: string;
  file: File;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface CameraImageCaptureRef {
  uploadImages: () => Promise<string[]>;
  hasImages: () => boolean;
}

interface CameraImageCaptureProps {
  userId: string;
  maxImages?: number;
}

const CameraImageCapture = forwardRef<CameraImageCaptureRef, CameraImageCaptureProps>(
  ({ userId, maxImages = 5 }, ref) => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    // Attach stream to video element when camera opens and video renders
    useEffect(() => {
      if (isCameraOpen && streamRef.current && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => {
          console.error('Error playing video:', err);
        });
      }
    }, [isCameraOpen]);

    const getLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setCurrentLocation(location);
            setLocationError(null);
            resolve(location);
          },
          (error) => {
            let message = 'Unable to get location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable location access.';
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable';
                break;
              case error.TIMEOUT:
                message = 'Location request timed out';
                break;
            }
            setLocationError(message);
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    }, []);

    const startCamera = async () => {
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast({
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access. Please use a modern browser (Chrome, Firefox, Safari) and ensure you are on HTTPS.',
            variant: 'destructive',
          });
          return;
        }

        // Request camera stream FIRST (this is the user-gesture-gated call)
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback: try without facingMode constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;

        // FIRST set camera open so the <video> element renders
        setIsCameraOpen(true);

        // Then get location in the background (non-blocking)
        getLocation().catch((err) => {
          console.log('Location not available:', err.message);
        });
      } catch (error: any) {
        console.error('Error starting camera:', error);
        let errorMessage = 'Unable to access camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage += 'Please allow camera access in your browser settings and reload the page.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage += 'Camera is already in use by another application. Close other apps using the camera and try again.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Camera does not support the requested settings. Trying default settings...';
        } else {
          errorMessage += error.message || 'Please check permissions and try again.';
        }
        
        toast({
          title: 'Camera Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraOpen(false);
    };

    const switchCamera = async () => {
      stopCamera();
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      // Restart camera with new facing mode after state update
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: newMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setIsCameraOpen(true);
        } catch (error) {
          console.error('Error switching camera:', error);
        }
      }, 100);
    };

    const capturePhoto = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (capturedImages.length >= maxImages) {
        toast({
          title: 'Maximum images reached',
          description: `You can only upload up to ${maxImages} images.`,
          variant: 'destructive',
        });
        return;
      }

      setIsCapturing(true);

      try {
        // Get fresh location at capture time
        const location = await getLocation();

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add geo-tag watermark
        const timestamp = new Date().toLocaleString();
        const geoText = `📍 ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        const dateText = `📅 ${timestamp}`;

        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, canvas.height - 60, canvas.width, 60);

        context.fillStyle = '#ffffff';
        context.font = 'bold 16px Arial';
        context.fillText(geoText, 10, canvas.height - 35);
        context.fillText(dateText, 10, canvas.height - 12);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
        });

        const file = new File([blob], `property-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);

        const newImage: CapturedImage = {
          id: `temp-${Date.now()}`,
          url: imageUrl,
          file,
          latitude: location.lat,
          longitude: location.lng,
          timestamp,
        };

        setCapturedImages((prev) => [...prev, newImage]);

        toast({
          title: 'Photo captured!',
          description: `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
        });
      } catch (error: any) {
        toast({
          title: 'Capture failed',
          description: error.message || 'Unable to capture photo with location.',
          variant: 'destructive',
        });
      } finally {
        setIsCapturing(false);
      }
    };

    const removeImage = (id: string) => {
      setCapturedImages((prev) => prev.filter((img) => img.id !== id));
    };

    const uploadImages = async (): Promise<string[]> => {
      if (capturedImages.length === 0) return [];

      setIsUploading(true);
      const uploadedUrls: string[] = [];

      try {
        for (const image of capturedImages) {
          const filePath = `${userId}/${Date.now()}-${image.file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, image.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(urlData.publicUrl);
        }

        toast({
          title: 'Images uploaded!',
          description: `${uploadedUrls.length} image(s) uploaded successfully.`,
        });

        return uploadedUrls;
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload failed',
          description: error.message || 'Failed to upload images.',
          variant: 'destructive',
        });
        return [];
      } finally {
        setIsUploading(false);
      }
    };

    // Expose functions to parent
    useImperativeHandle(ref, () => ({
      uploadImages,
      hasImages: () => capturedImages.length > 0,
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Property Photos *
            </h3>
            <p className="text-sm text-muted-foreground">
              Capture photos with GPS location ({capturedImages.length}/{maxImages})
            </p>
          </div>
          {currentLocation && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              GPS Active
            </div>
          )}
        </div>

        {locationError && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {locationError}
          </div>
        )}

        {/* Camera View */}
        {isCameraOpen && (
          <Card className="relative overflow-hidden bg-muted">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Controls Overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-full"
                onClick={switchCamera}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                size="lg"
                className="rounded-full w-16 h-16 bg-background hover:bg-muted"
                onClick={capturePhoto}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <div className="w-12 h-12 rounded-full border-4 border-primary" />
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="rounded-full"
                onClick={stopCamera}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Location Indicator */}
            {currentLocation && (
              <div className="absolute top-4 left-4 bg-background/80 text-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </div>
            )}
          </Card>
        )}

        {/* Open Camera Button */}
        {!isCameraOpen && capturedImages.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-32 border-dashed flex flex-col gap-2"
            onClick={startCamera}
          >
            <Camera className="w-8 h-8" />
            <span>Open Camera to Capture Photos</span>
            <span className="text-xs text-muted-foreground">
              Photos will include GPS coordinates
            </span>
          </Button>
        )}

        {/* Captured Images Grid */}
        {capturedImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {capturedImages.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt="Captured property"
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(image.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-foreground text-xs p-1 rounded-b-lg">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {image.latitude?.toFixed(4)}, {image.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Status */}
        {isUploading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading images...
          </div>
        )}
      </div>
    );
  }
);

CameraImageCapture.displayName = 'CameraImageCapture';

export { CameraImageCapture };
export type { CapturedImage };

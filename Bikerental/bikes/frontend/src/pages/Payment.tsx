import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { getCurrentUser, paymentsAPI, documentsAPI, rentalsAPI } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Bike } from '@/types';
import { Camera, X, Upload, RefreshCw } from 'lucide-react';
import { calculateRentalPrice } from '@/utils/priceCalculator';
import { calculateSimplePrice } from '@/utils/simplePriceCalculator';

interface BookingDetails {
  bike: Bike;
  pickupTime: string;
  dropoffTime: string;
  durationHours: number;
  totalAmount: number;
  pricingType?: 'hourly' | 'daily' | 'weekly';
}

const MAX_IMAGES = 5;

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [extraImages, setExtraImages] = useState<(string | null)[]>(Array(MAX_IMAGES).fill(null));
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>(Array(MAX_IMAGES).fill(null));
  
  // Camera related state
  const [showCamera, setShowCamera] = useState(false);
  const [activeCameraIndex, setActiveCameraIndex] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const bookingDetails = location.state?.bookingDetails as BookingDetails;

  useEffect(() => {
    checkActiveRental();
    return () => {
      stopCamera();
    };
  }, []);

  const checkActiveRental = async () => {
    try {
      const rentals = await rentalsAPI.getAll();
      const currentUser = getCurrentUser();
      const active = rentals.find((r: any) => {
        const rentalUserId = r.userId || r.user?.id;
        return (
          String(rentalUserId || '') === String(currentUser?.id || '') &&
          ['confirmed', 'ongoing', 'active'].includes(r.status)
        );
      });

      if (active) {
        toast({
          title: 'Active Rental Found',
          description: 'You already have an active rental. Please complete it before booking another.',
          variant: 'destructive',
        });
        navigate('/'); // Redirect to home
      }
    } catch (error) {
      console.error('Failed to check active rental', error);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Check if video element still exists (dialog is open)
      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(true);
      toast({ 
        title: 'Camera Error', 
        description: 'Unable to access camera. Please try uploading a file instead.', 
        variant: 'destructive' 
      });
      // Do not close the dialog so user can choose upload file
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || activeCameraIndex === null) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFileProcess(activeCameraIndex, file);
          setShowCamera(false);
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const openCamera = (index: number) => {
    setActiveCameraIndex(index);
    setShowCamera(true);
    // Slight delay to ensure modal is open before starting camera
    setTimeout(startCamera, 100);
  };

  const handleFileUpload = () => {
    if (activeCameraIndex !== null) {
      fileInputRefs.current[activeCameraIndex]?.click();
      setShowCamera(false);
      stopCamera();
    }
  };


  useEffect(() => {
    if (!bookingDetails) {
      navigate('/garage');
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to continue payment.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    // Check if all documents are verified
    const checkDocuments = async () => {
      try {
        const userDocs = await documentsAPI.getAll();
        const hasDocuments = userDocs && userDocs.length > 0;
        const allApproved = hasDocuments && userDocs.every((doc: any) => doc.status === 'approved');
        
        if (!hasDocuments) {
          toast({ 
            title: 'Documents Required', 
            description: 'Please upload and verify all required documents before booking a ride.', 
            variant: 'destructive' 
          });
          navigate('/dashboard?tab=documents');
          return;
        }

        if (!allApproved) {
          const pendingCount = userDocs.filter((doc: any) => doc.status !== 'approved').length;
          toast({ 
            title: 'Documents Pending Verification', 
            description: `You have ${pendingCount} document(s) pending verification. Please wait for admin approval before booking.`, 
            variant: 'destructive' 
          });
          navigate('/dashboard?tab=documents');
          return;
        }
      } catch (error: any) {
        toast({ 
          title: 'Error', 
          description: 'Failed to verify documents. Please try again.', 
          variant: 'destructive' 
        });
        navigate('/garage');
      }
    };

    checkDocuments();
  }, [bookingDetails, navigate]);

  if (!bookingDetails) return null;

  const { bike, pickupTime, dropoffTime, durationHours, totalAmount, pricingType = 'hourly' } = bookingDetails;
  
  // Calculate price breakdown - use the same logic as Garage.tsx to ensure consistency
  const startDate = new Date(pickupTime);
  const endDate = new Date(dropoffTime);
  let priceInfo: any = null;
  try {
    // Use the same calculation logic as Garage.tsx to ensure consistency
    const hasIndividualRates = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].some(
      hour => bike[`pricePerHour${hour}` as keyof typeof bike] && Number(bike[`pricePerHour${hour}` as keyof typeof bike]) > 0
    );
    const hasTariff = bike.weekdayRate !== undefined || bike.weekendRate !== undefined;

    if (bike.price12Hours || hasIndividualRates || bike.pricePerWeek || hasTariff) {
      priceInfo = calculateSimplePrice(bike, startDate, endDate);
    } else {
      // Fallback to legacy pricing slabs
      priceInfo = calculateRentalPrice(bike, startDate, endDate, pricingType || 'hourly');
    }
    
    // Ensure priceInfo is valid
    if (!priceInfo || !priceInfo.total) {
      console.warn('Price calculation returned invalid result, using fallback');
      priceInfo = {
        basePrice: totalAmount / 1.18, // Reverse calculate base from total (assuming 18% GST)
        gstPercentage: bike.gstPercentage || 18.0,
        gstAmount: (totalAmount / 1.18) * ((bike.gstPercentage || 18.0) / 100),
        total: totalAmount,
        subtotal: totalAmount / 1.18
      };
    }
  } catch (error) {
    console.error('Price calculation error:', error);
    // Fallback calculation
    const gstPct = bike.gstPercentage || 18.0;
    const base = totalAmount / (1 + gstPct / 100);
    priceInfo = {
      basePrice: base,
      gstPercentage: gstPct,
      gstAmount: base * (gstPct / 100),
      total: totalAmount,
      subtotal: base
    };
  }

  const onPickFile = (index: number) => {
    openCamera(index);
  };

  const handleFileProcess = async (index: number, file: File) => {
    // Check if slot is already filled
    if (extraImages[index]) {
      toast({ title: 'Slot already filled', description: 'Please remove the existing image first', variant: 'destructive' });
      return;
    }

    try {
      setUploading(index);
      const res = await documentsAPI.uploadFile(file, file.name, 'rental_bike_image');
      const imageUrl = res?.fileUrl || res?.url;
      
      if (imageUrl) {
        setExtraImages((prev) => {
          const newImages = [...prev];
          newImages[index] = imageUrl;
          return newImages;
        });
        toast({ title: 'Image uploaded', description: 'Image added successfully' });
      } else {
        toast({ title: 'Upload failed', description: 'No file URL returned', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Upload error', description: err.message || 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(null);
      if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
    }
  };

  const onFileSelected = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileProcess(index, file);
  };

  const removeImage = (index: number) => {
    setExtraImages((prev) => {
      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  };

  const filledSlots = extraImages.filter(img => img !== null).length;
  const canAddMore = filledSlots < MAX_IMAGES;

  const handlePayment = async () => {
    try {
      if (filledSlots < MAX_IMAGES) {
        toast({
          title: 'Images Required',
          description: `Please upload all ${MAX_IMAGES} bike images before payment.`,
          variant: 'destructive',
        });
        return;
      }
      setLoading(true);
      const finalAmount = priceInfo ? Math.round(priceInfo.total) : totalAmount;
      const { keyId } = await paymentsAPI.getKey();
      const order = await paymentsAPI.createOrder(finalAmount);
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'RideFlow',
        description: `Rental for ${bike.name}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const selectedLocationId = localStorage.getItem('selectedLocation') || undefined;
            const finalAmount = priceInfo ? Math.round(priceInfo.total) : totalAmount;
            const result = await paymentsAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingDetails: {
                bikeId: bike.id,
                pickupTime,
                dropoffTime,
                totalAmount: finalAmount,
                pricingType,
                selectedLocationId,
                additionalImages: extraImages.filter((img): img is string => img !== null)
              }
            });
            
            if (result.success) {
              navigate('/payment-success', { state: { rental: result.rental, bike } });
            }
          } catch (error) {
            toast({
              title: 'Payment Verification Failed',
              description: 'Please contact support if money was deducted.',
              variant: 'destructive',
            });
          }
        },
        prefill: {
          name: 'RideFlow User',
          email: 'user@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#F97316'
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Complete Your Booking"
        description="Securely complete your bike rental booking on RideFlow. Upload necessary documents and proceed to payment."
        noindex={true}
      />
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Payment Summary</h1>
          <Card>
            <CardHeader>
              <CardTitle>{bike.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2">
                  <span className="font-medium">Bike Images</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                    const imageUrl = extraImages[index];
                    const isUploading = uploading === index;
                    return (
                      <div key={index} className="relative w-full aspect-square">
                        <input
                          ref={(el) => { fileInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onFileSelected(index, e)}
                          disabled={isUploading || !!imageUrl}
                        />
                        {imageUrl ? (
                          <div className="relative w-full h-full rounded-md border overflow-hidden group">
                            <img
                              src={imageUrl}
                              alt={`Bike condition photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              aria-label="Remove image"
                            >
                              <X className="h-5 w-5 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPickFile(index)}
                            disabled={isUploading}
                            className="w-full h-full rounded-md border border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Add image"
                          >
                            {isUploading ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            ) : (
                              <Camera className="h-6 w-6" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload all {MAX_IMAGES} bike images to proceed ({filledSlots}/{MAX_IMAGES} uploaded).
                </p>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup</span>
                <span className="font-medium">{new Date(pickupTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dropoff</span>
                <span className="font-medium">{new Date(dropoffTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{Math.round(durationHours)} hours</span>
              </div>
              {priceInfo && (
                <>
                  <hr />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Price</span>
                      <span className="font-medium">₹{priceInfo.basePrice.toFixed(2)}</span>
                    </div>
                    {priceInfo.hasWeekend && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weekend Surge ({((priceInfo.surgeMultiplier - 1) * 100).toFixed(0)}%)</span>
                        <span className="font-medium text-accent">+₹{(priceInfo.priceAfterSurge - priceInfo.basePrice).toFixed(2)}</span>
                      </div>
                    )}
                    {priceInfo.excessKm > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Excess KM ({priceInfo.excessKm} km)</span>
                        <span className="font-medium">+₹{priceInfo.excessKmCharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">₹{priceInfo.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({priceInfo.gstPercentage}%)</span>
                      <span className="font-medium">+₹{priceInfo.gstAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>₹{priceInfo ? priceInfo.total.toFixed(2) : (totalAmount || 0).toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handlePayment}
                disabled={loading || filledSlots < MAX_IMAGES}
              >
                {loading ? 'Processing...' : `Pay ₹${(priceInfo ? priceInfo.total : (totalAmount || 0)).toFixed(2)}`}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <Footer />
      <Dialog open={showCamera} onOpenChange={(open) => {
        if (!open) {
          setShowCamera(false);
          stopCamera();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {cameraError ? (
                <div className="text-white text-sm p-4 text-center">
                  <p className="font-bold mb-1">Camera Unavailable</p>
                  <p className="text-xs text-gray-400">Please use the "Upload File" button below.</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleFileUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <Button className="flex-1" onClick={capturePhoto}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bike,
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { rentalsAPI, bikesAPI, getCurrentUser } from '@/lib/api';
import { safeAsync } from '@/lib/errorHandler';
import { calculateSimplePrice } from '@/utils/simplePriceCalculator';
import { calculateRentalPrice } from '@/utils/priceCalculator';
import { SEO } from '@/components/SEO';

const statusStyles = {
  confirmed: { color: 'bg-primary/10 text-primary', icon: Clock },
  ongoing: { color: 'bg-accent/10 text-accent', icon: Bike },
  active: { color: 'bg-accent/10 text-accent', icon: Bike },
  completed: { color: 'bg-muted text-muted-foreground', icon: CheckCircle },
  cancelled: { color: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export default function ActiveRide() {
  const navigate = useNavigate();
  const [rental, setRental] = useState<any>(null);
  const [bike, setBike] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canEndRide, setCanEndRide] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [extendHours, setExtendHours] = useState(1);
  const [canExtend, setCanExtend] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    loadActiveRide(user);
  }, []);

  const loadActiveRide = async (currentUser: any) => {
    try {
      setIsLoading(true);
      const rentals = await rentalsAPI.getAll();
      // Only show active ride when ride is started (ongoing/active), not when just confirmed
      const active = rentals.find((r: any) => {
        const rentalUserId = r.userId || r.user?.id;
        return (
          String(rentalUserId || '') === String(currentUser?.id || '') &&
          (r.status === 'ongoing' || r.status === 'active')
        );
      });

      if (!active) {
        toast({
          title: "No Active Ride",
          description: "You don't have an active ride. Please wait for admin to start your ride.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setRental(active);
      
      // Calculate initial duration (ensure non-negative)
      const startTime = new Date(active.pickupTime || active.startTime);
      const now = new Date();
      const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      setCurrentDuration(elapsedHours);
      
      // Load bike details if not already populated
      if (active.bikeId && typeof active.bikeId === 'object') {
        setBike(active.bikeId);
      } else {
        const bikeData = await safeAsync(
          () => bikesAPI.getById(active.bikeId),
          undefined,
          'ActiveRide.loadBike'
        );
        if (bikeData) {
          setBike(bikeData);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load active ride",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCanEndRide = (rentalData: any) => {
    if (!rentalData) return;
    
    const startTime = new Date(rentalData.pickupTime || rentalData.startTime);
    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const oneHourInMs = 60 * 60 * 1000;
    
    // Update current duration (ensure non-negative)
    setCurrentDuration(elapsedHours);
    
    if (elapsedHours >= 1) {
      setCanEndRide(true);
      setTimeRemaining(0);
    } else {
      setCanEndRide(false);
      const remainingMs = oneHourInMs - elapsedMs;
      setTimeRemaining(Math.ceil(remainingMs / (1000 * 60))); // minutes remaining
    }
  };

  const checkCanExtend = (rentalData: any) => {
    if (!rentalData || !rentalData.dropoffTime) {
      setCanExtend(false);
      return;
    }
    
    const scheduledEndTime = new Date(rentalData.dropoffTime);
    const now = new Date();
    const timeUntilEnd = scheduledEndTime.getTime() - now.getTime();
    const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);
    
    // Can extend if more than 1 hour remaining before scheduled end
    setCanExtend(hoursUntilEnd > 1);
  };

  const calculatePrice = () => {
    if (!bike || !rental) return 0;
    
    const startTime = new Date(rental.pickupTime || rental.startTime);
    const endTime = rental.dropoffTime || rental.endTime 
      ? new Date(rental.dropoffTime || rental.endTime)
      : new Date();
    
    try {
      // Use the same calculation logic as booking to ensure consistency
      const hasIndividualRates = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].some(
        hour => bike[`pricePerHour${hour}` as keyof typeof bike] && Number(bike[`pricePerHour${hour}` as keyof typeof bike]) > 0
      );
      const hasTariff = bike.weekdayRate !== undefined || bike.weekendRate !== undefined;

      let priceInfo: any = null;
      if (bike.price12Hours || hasIndividualRates || bike.pricePerWeek || hasTariff) {
        priceInfo = calculateSimplePrice(bike, startTime, endTime);
      } else {
        // Fallback to legacy pricing slabs
        priceInfo = calculateRentalPrice(bike, startTime, endTime, 'hourly');
      }
      
      return priceInfo ? priceInfo.total : 0;
    } catch (error) {
      console.error('Price calculation error:', error);
      // Fallback to simple calculation
      const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      const basePrice = hours * (bike.pricePerHour || 0);
      const gstPercentage = bike.gstPercentage || 18.0;
      return basePrice * (1 + gstPercentage / 100);
    }
  };


  useEffect(() => {
    if (!rental || (rental.status !== 'ongoing' && rental.status !== 'active')) return;
    
    // Check immediately
    checkCanEndRide(rental);
    checkCanExtend(rental);
    
    // Update duration every 30 seconds for smoother display
    const durationInterval = setInterval(() => {
      if (rental) {
        const startTime = new Date(rental.pickupTime || rental.startTime);
        const now = new Date();
        const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        setCurrentDuration(elapsedHours);
      }
    }, 30000); // Update every 30 seconds
    
    // Check can end/extend every minute
    const checkInterval = setInterval(() => {
      checkCanEndRide(rental);
      checkCanExtend(rental);
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(durationInterval);
      clearInterval(checkInterval);
    };
  }, [rental]);

  const handleExtendRide = async () => {
    if (!rental || !canExtend) return;
    
    try {
      const scheduledEndTime = new Date(rental.dropoffTime);
      const newEndTime = new Date(scheduledEndTime.getTime() + (extendHours * 60 * 60 * 1000));
      
      // Update the rental's dropoffTime
      await rentalsAPI.update(rental.id, { dropoffTime: newEndTime.toISOString() });
      
      // Reload the rental data
      const user = getCurrentUser();
      if (user) {
        await loadActiveRide(user);
      }
      
      toast({
        title: "Ride Extended",
        description: `Your ride has been extended by ${extendHours} hour${extendHours !== 1 ? 's' : ''}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to extend ride",
        variant: "destructive",
      });
    }
  };

  const handleEndRide = async () => {
    if (!rental || !canEndRide) return;
    
    try {
      await rentalsAPI.completeRide(rental.id);
      toast({
        title: "Ride Ended",
        description: "Your ride has been completed successfully.",
      });
      // Refresh the page to update navbar
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to end ride";
      toast({
        title: "Error",
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 pb-24">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading ride details...</p>
              </div>
              </div>
            </div>
          </main>
        <Footer />
      </div>
    );
  }

  if (!rental) {
    return null;
  }

  const StatusIcon = statusStyles[rental.status as keyof typeof statusStyles]?.icon || Clock;
  const startTime = new Date(rental.pickupTime || rental.startTime);
  const endTime = rental.dropoffTime || rental.endTime 
    ? new Date(rental.dropoffTime || rental.endTime)
    : null;
  const currentPrice = calculatePrice();
  
  // Format duration for display
  const formatDuration = (hours: number) => {
    // Ensure non-negative
    const safeHours = Math.max(0, hours);
    const wholeHours = Math.floor(safeHours);
    const minutes = Math.floor((safeHours - wholeHours) * 60);
    if (wholeHours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    }
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title={bike ? `Active Ride: ${bike.name}` : "Active Ride"}
        description="Track your current bike rental, check remaining time, and manage your active ride on RideFlow."
        keywords="active bike rental, track ride, rental duration, bike rental management"
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-24">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl shadow-card p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-display font-bold mb-2">Active Ride</h1>
                  <p className="text-muted-foreground">Your current ride details</p>
                </div>
                <Badge className={statusStyles[rental.status as keyof typeof statusStyles]?.color || 'bg-muted'}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                </Badge>
              </div>

              {/* Bike Details */}
              {bike && (
                <div className="bg-muted/50 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    {bike.image && (
                      <img
                        src={bike.image}
                        alt={`Active ride bike: ${bike.name}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-display font-bold">{bike.name}</h2>
                      {bike.brand && (
                        <p className="text-muted-foreground">Brand: {bike.brand}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">
                        {bike.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-muted/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Booking Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p className="font-mono font-medium">{rental.bookingId || rental.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Time</p>
                      <p className="font-medium">{startTime.toLocaleString()}</p>
                    </div>
                    {endTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">Dropoff Time</p>
                        <p className="font-medium">{endTime.toLocaleString()}</p>
                      </div>
                    )}
                    {!endTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">Scheduled Dropoff</p>
                        <p className="font-medium">
                          {rental.dropoffTime 
                            ? new Date(rental.dropoffTime).toLocaleString()
                            : 'Not set'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Pricing</h3>
                  </div>
                  <div className="space-y-3">
                    {bike && (
                      <div>
                        <p className="text-sm text-muted-foreground">Rate per Hour</p>
                        <p className="font-medium">₹{bike.pricePerHour}/hr</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Current Duration</p>
                      <p className="font-medium">
                        {formatDuration(currentDuration)}
                      </p>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Current Total</p>
                      <p className="text-2xl font-display font-bold text-primary">
                        ₹{currentPrice.toFixed(2)}
                      </p>
                    </div>
                    {rental.totalAmount && (
                      <div>
                        <p className="text-sm text-muted-foreground">Paid Amount</p>
                        <p className="font-medium">₹{rental.totalAmount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {(rental.status === 'ongoing' || rental.status === 'active') && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {canExtend && (
                    <div className="flex-1 flex items-center gap-4">
                      <label className="text-sm font-medium">Extend by:</label>
                      <select
                        value={extendHours}
                        onChange={(e) => setExtendHours(Number(e.target.value))}
                        className="px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={3}>3 hours</option>
                        <option value={4}>4 hours</option>
                        <option value={5}>5 hours</option>
                      </select>
                      <Button 
                        onClick={handleExtendRide} 
                        variant="outline"
                        disabled={!canExtend}
                        className={!canExtend ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Extend Ride
                      </Button>
                    </div>
                  )}
                  {!canExtend && rental.dropoffTime && (
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Extension window closed. You can only extend rides more than 1 hour before the scheduled end time.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    <Button 
                      onClick={handleEndRide} 
                      variant="destructive" 
                      size="lg"
                      disabled={!canEndRide}
                      className={!canEndRide ? 'opacity-50 cursor-not-allowed' : ''}
                      title={!canEndRide ? `Please wait ${timeRemaining} more minute${timeRemaining !== 1 ? 's' : ''} before ending the ride` : 'End your ride'}
                    >
                      End Ride
                    </Button>
                    {!canEndRide && timeRemaining > 0 && (
                      <p className="text-xs text-muted-foreground text-right">
                        Minimum 1 hour required. {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>
      <Footer />
    </div>
  );
}


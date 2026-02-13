import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BikeCard } from '@/components/BikeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bike } from '@/types';
import { Search, Zap, Gauge, Bike as BikeIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { bikesAPI, rentalsAPI, getCurrentUser, documentsAPI, authAPI, locationsAPI } from '@/lib/api';
import { calculateRentalPrice, getAvailablePricingSlabs } from '@/utils/priceCalculator';
import { calculateSimplePrice } from '@/utils/simplePriceCalculator';
import { SEO } from '@/components/SEO';

const bikeTypes = [
  { value: 'all', label: 'All Models', icon: null },
  { value: 'fuel', label: 'Fuel', icon: Gauge },
  { value: 'electric', label: 'Electric', icon: Zap },
  { value: 'scooter', label: 'Scooter', icon: BikeIcon },
];

export default function Garage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');
  const [timeFilterApplied, setTimeFilterApplied] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBookingConfirmationOpen, setIsBookingConfirmationOpen] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [selectedPricingType, setSelectedPricingType] = useState<'hourly' | 'daily' | 'weekly'>('hourly');
  const [sortBy, setSortBy] = useState<'relevance' | 'priceLow' | 'priceHigh'>('relevance');

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    try {
      setIsLoading(true);
      const savedLocation = localStorage.getItem('selectedLocation') || undefined;
      const data = await bikesAPI.getAll(savedLocation);
      setBikes(data);

      if (savedLocation) {
        try {
          const loc = await locationsAPI.getById(savedLocation);
          if (loc) setLocationName(loc.city || loc.name);
        } catch (e) {
          console.error('Failed to load location for SEO', e);
        }
      }

      const rent = searchParams.get('rent');
      const bikeIdParam = searchParams.get('bikeId');
      if (rent === '1') {
        setIsSearchDialogOpen(true);
        if (bikeIdParam) {
          const found = data.find((b: any) => b.id === bikeIdParam);
          if (found) setSelectedBike(found);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bikes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBikes = useMemo(() => {
    return bikes.filter((bike) => {
      const matchesSearch = bike.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || bike.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [bikes, searchQuery, selectedType]);

  const getSortPrice = (bike: Bike) => {
    if (bike.weekdayRate) return bike.weekdayRate;
    if (bike.price12Hours) return bike.price12Hours / 12;
    return bike.pricePerHour || 0;
  };

  const bikesToShow = useMemo(() => {
    return sortBy === 'relevance'
      ? filteredBikes
      : [...filteredBikes].sort((a, b) =>
          sortBy === 'priceLow' ? getSortPrice(a) - getSortPrice(b) : getSortPrice(b) - getSortPrice(a)
        );
  }, [filteredBikes, sortBy]);

  const getDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    return new Date(`${dateStr}T${timeStr}`);
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const nowHHMM = toHHMM(now);
  
  const pickupTimeMin = useMemo(() => {
    return pickupDate === todayStr ? nowHHMM : '00:00';
  }, [pickupDate, todayStr, nowHHMM]);

  // Dropoff must be at least now or pickup + 30m if same day
  const pickupDT = useMemo(() => getDateTime(pickupDate, pickupTime), [pickupDate, pickupTime]);
  
  const dropoffTimeMin = useMemo(() => {
    const baseDropMinDate = dropoffDate === todayStr ? nowHHMM : '00:00';
    return dropoffDate && pickupDT && dropoffDate === pickupDate
      ? toHHMM(new Date(pickupDT.getTime() + 30 * 60000))
      : baseDropMinDate;
  }, [dropoffDate, todayStr, nowHHMM, pickupDT, pickupDate]);

  const dropoffDT = useMemo(() => getDateTime(dropoffDate, dropoffTime), [dropoffDate, dropoffTime]);
  
  const durationMinutes = useMemo(() => {
    return pickupDT && dropoffDT ? Math.max(0, Math.round((dropoffDT.getTime() - pickupDT.getTime()) / 60000)) : 0;
  }, [pickupDT, dropoffDT]);
  
  // Calculate max pickup date (7 days from today) - use useMemo to ensure it updates
  const maxPickupDate = useMemo(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7); // 7 days from today
    return maxDate.toISOString().slice(0, 10);
  }, []);
  
  // Calculate max dropoff date (up to 7 days window)
  const maxDropoffDate = useMemo(() => {
    if (!pickupDate || !pickupTime) {
      // If no pickup selected, allow up to 7 days from today
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      return maxDate.toISOString().slice(0, 10);
    }
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const maxFromPickup = new Date(pickup);
    maxFromPickup.setDate(maxFromPickup.getDate() + 7); // Maximum 7 days from pickup
    
    const maxFromToday = new Date();
    maxFromToday.setDate(maxFromToday.getDate() + 7); // 7 days from today
    
    // Return the earlier of the two dates
    const maxDate = maxFromPickup < maxFromToday ? maxFromPickup : maxFromToday;
    return maxDate.toISOString().slice(0, 10);
  }, [pickupDate, pickupTime]);

  const minutesToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  
  const format12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const generateTimes = useCallback((minHHMM: string) => {
    const [hStr, mStr] = minHHMM.split(':');
    let startMin = (parseInt(hStr || '0', 10) * 60) + parseInt(mStr || '0', 10);
    startMin = Math.min(24 * 60 - 30, Math.max(0, Math.ceil(startMin / 30) * 30));
    const opts: string[] = [];
    for (let m = startMin; m <= 23 * 60 + 30; m += 30) {
      opts.push(minutesToHHMM(m));
    }
    return opts;
  }, []);

  const pickupOptions = useMemo(() => generateTimes(pickupTimeMin), [generateTimes, pickupTimeMin]);
  const dropoffOptions = useMemo(() => generateTimes(dropoffTimeMin), [generateTimes, dropoffTimeMin]);

  const applyTimeFilter = () => {
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      return;
    }
    const sameDay = pickupDate === dropoffDate;
    if (pickupDT && dropoffDT && dropoffDT.getTime() <= pickupDT.getTime()) {
      const adjusted = new Date(pickupDT.getTime() + 30 * 60000);
      setDropoffDate(adjusted.toISOString().slice(0, 10));
      setDropoffTime(adjusted.toTimeString().slice(0, 5));
      setTimeFilterApplied(true);
      return;
    }
    if (sameDay && durationMinutes < 30 && pickupDT) {
      const adjusted = new Date(pickupDT.getTime() + 30 * 60000);
      setDropoffTime(adjusted.toTimeString().slice(0, 5));
      setTimeFilterApplied(true);
      return;
    }
    setTimeFilterApplied(true);
  };

  const searchAvailable = async () => {
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      toast({ title: 'Select Date & Time', description: 'Please choose pickup and dropoff.', variant: 'destructive' });
      return;
    }
    const start = new Date(`${pickupDate}T${pickupTime}`);
    const end = new Date(`${dropoffDate}T${dropoffTime}`);
    try {
      setIsLoading(true);
      const savedLocation = localStorage.getItem('selectedLocation') || undefined;
      const available = await bikesAPI.getAvailable(start, end, savedLocation);
      setBikes(available);
      setTimeFilterApplied(true);
      setIsSearchDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to fetch availability', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRent = async (bike: Bike, pricingType?: 'hourly' | 'daily' | 'weekly') => {
    const user = getCurrentUser();
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to book a ride.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    // Set pricing type if provided
    if (pricingType) {
      setSelectedPricingType(pricingType);
    }

    // Check if all documents are verified
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
      return;
    }

    setSelectedBike(bike);
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      setIsBookingConfirmationOpen(true);
    } else {
      setIsSearchDialogOpen(true);
    }
  };

  const handleBookingConfirm = async () => {
    if (!selectedBike || !pickupDate || !pickupTime || !dropoffDate || !dropoffTime) return;

    const user = getCurrentUser();
    if (!user) {
      setIsBookingConfirmationOpen(false);
      toast({ title: 'Login Required', description: 'Please login to confirm your booking.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    // Check for active rental
    try {
      const rentals = await rentalsAPI.getAll();
      const active = rentals.find((r: any) => {
        const rentalUserId = r.userId || r.user?.id;
        return (
          String(rentalUserId || '') === String(user.id) &&
          ['confirmed', 'ongoing', 'active'].includes(r.status)
        );
      });

      if (active) {
        toast({
          title: 'Active Rental Found',
          description: 'You already have an active rental. Please complete it before booking another.',
          variant: 'destructive',
        });
        setIsBookingConfirmationOpen(false);
        return;
      }
    } catch (error) {
      console.error('Failed to check active rental', error);
    }
    
    // Validate bike is in selected location
    const selectedLocationId = localStorage.getItem('selectedLocation');
    if (selectedLocationId) {
      const rawBikeLocationId: unknown = (selectedBike as any).locationId;
      const bikeLocationId =
        typeof rawBikeLocationId === 'object' && rawBikeLocationId
          ? (rawBikeLocationId as any).id || (rawBikeLocationId as any)._id || (rawBikeLocationId as any).toString?.()
          : typeof rawBikeLocationId === 'string'
            ? rawBikeLocationId
            : null;
      
      if (bikeLocationId !== selectedLocationId) {
        toast({
          title: 'Location Mismatch',
          description: 'This bike is not available in your selected location. Please select a bike from your location.',
          variant: 'destructive',
        });
        setIsBookingConfirmationOpen(false);
        return;
      }
    }
    
    try {
      const profile = await authAPI.getCurrentUser();
      const userLocId = profile?.currentLocationId ? String(profile.currentLocationId) : '';
      const navLocId = selectedLocationId || '';
      if (userLocId && navLocId && userLocId !== navLocId) {
        toast({
          title: 'Location Mismatch',
          description: 'Navbar location and your current location must be the same to book.',
          variant: 'destructive',
        });
        setIsBookingConfirmationOpen(false);
        return;
      }
    } catch {}
    
    // Calculate duration and amount using new simple pricing model or legacy
    const start = new Date(`${pickupDate}T${pickupTime}`);
    const end = new Date(`${dropoffDate}T${dropoffTime}`);
    const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    let totalAmount = 0;
    try {
      // Try new simple pricing model first
      const hasIndividualRates = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].some(
        hour => selectedBike[`pricePerHour${hour}` as keyof typeof selectedBike] && Number(selectedBike[`pricePerHour${hour}` as keyof typeof selectedBike]) > 0
      );
      const hasTariff = selectedBike.weekdayRate !== undefined || selectedBike.weekendRate !== undefined;

      if (selectedBike.price12Hours || hasIndividualRates || selectedBike.pricePerWeek || hasTariff) {
        const priceInfo = calculateSimplePrice(selectedBike, start, end);
        totalAmount = Math.round(priceInfo.total);
      } else {
        // Fallback to legacy pricing slabs
        const priceInfo = calculateRentalPrice(selectedBike, start, end, selectedPricingType);
        totalAmount = Math.round(priceInfo.total);
      }
    } catch (error: any) {
      // Fallback to legacy calculation
      totalAmount = Math.round((selectedBike.pricePerHour || 0) * hours);
      toast({
        title: 'Pricing Warning',
        description: error.message || 'Using default pricing calculation',
        variant: 'default',
      });
    }

    setIsBookingConfirmationOpen(false);
    navigate('/payment', {
      state: {
        bookingDetails: {
          bike: selectedBike,
          pickupTime: start.toISOString(),
          dropoffTime: end.toISOString(),
          durationHours: hours,
          totalAmount,
          pricingType: selectedPricingType
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={locationName ? `Rent a Bike in ${locationName} - Best Prices & Wide Selection` : "Ride Finder - Available Bikes for Rent"}
        description={locationName ? `Book the perfect bike for your next ride in ${locationName}. Choose from electric bikes, mountain bikes, and scooters. Flexible rental plans starting at ₹10/hr in ${locationName}.` : "Find and book the perfect bike for your next ride. Browse our extensive garage of electric bikes, mountain bikes, and scooters available for rent."}
        keywords={locationName ? `bike rental ${locationName}, rent motorcycle ${locationName}, scooter hire ${locationName}, RideFlow ${locationName}` : "find bike rental, book motorcycle online, electric bike finder, scooter rental search, RideFlow garage"}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": locationName ? `Available Bikes for Rent in ${locationName}` : "Available Bikes for Rent",
            "description": locationName ? `List of motorcycles and scooters available for rent in ${locationName} at RideFlow.` : "List of premium motorcycles and scooters available for rent at RideFlow.",
            "itemListElement": bikes.slice(0, 10).map((bike, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": bike.name,
                "image": bike.image?.startsWith('http') ? bike.image : "https://rideflow.com" + (bike.image?.startsWith('/') ? '' : '/') + bike.image,
                "description": `${bike.brand} ${bike.type} bike available for rent in ${locationName || 'your city'}. Flexible hourly and daily plans.`,
                "brand": {
                  "@type": "Brand",
                  "name": bike.brand
                },
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "INR",
                  "price": bike.weekdayRate || bike.pricePerHour || 0,
                  "availability": "https://schema.org/InStock",
                  "url": `https://rideflow.com/garage?bikeId=${bike.id}`
                }
              }
            }))
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://rideflow.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Ride Finder",
                "item": "https://rideflow.com/garage"
              }
            ]
          }
        ]}
      />
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {locationName ? `Bikes for Rent in ${locationName}` : "Ride Finder"}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {locationName 
                ? `Explore the best bike rental options in ${locationName}. Our garage features top-rated motorcycles and scooters, all inclusive of insurance and roadside assistance.`
                : "Browse our collection of premium bikes. Each bike comes with full insurance, a helmet, and 24/7 roadside assistance."
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <aside className="hidden md:block md:col-span-4 lg:col-span-3">
              <div className="sticky top-28 space-y-4">
                <div className="bg-card rounded-2xl p-4 shadow-card space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search bikes..."
                      className="pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Pickup</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        min={todayStr}
                        max={maxPickupDate}
                        value={pickupDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minVal = todayStr;
                          const maxVal = maxPickupDate;
                          let finalVal = val;
                          if (val < minVal) finalVal = minVal;
                          if (val > maxVal) {
                            finalVal = maxVal;
                            toast({
                              title: 'Maximum Date',
                              description: 'Pickup date cannot be more than 7 days from today',
                              variant: 'default',
                            });
                          }
                          setPickupDate(finalVal);
                          // If dropoff exceeds 7 days from new pickup date, cap to 7 days
                          if (finalVal && pickupTime) {
                            const pickup = getDateTime(finalVal, pickupTime);
                            if (pickup) {
                              const maxDrop = new Date(pickup.getTime() + 7 * 24 * 60 * 60000); // 7 days max
                              const currentDrop = getDateTime(dropoffDate, dropoffTime);
                              if (currentDrop && currentDrop > maxDrop) {
                                setDropoffDate(maxDrop.toISOString().slice(0, 10));
                                setDropoffTime(toHHMM(maxDrop));
                                toast({
                                  title: 'Maximum Duration',
                                  description: 'Booking duration cannot exceed 7 days',
                                  variant: 'default',
                                });
                              }
                            }
                          }
                          if (dropoffDate === finalVal && pickupTime) {
                            const p = getDateTime(finalVal, pickupTime);
                            if (p) {
                              const minDrop = new Date(p.getTime() + 30 * 60000);
                              const maxDrop = new Date(p.getTime() + 7 * 24 * 60 * 60000); // 7 days max
                              const currentDrop = getDateTime(dropoffDate, dropoffTime);
                              if (!currentDrop || currentDrop.getTime() < minDrop.getTime()) {
                                setDropoffDate(finalVal);
                                setDropoffTime(toHHMM(minDrop));
                              } else if (currentDrop.getTime() > maxDrop.getTime()) {
                                setDropoffDate(finalVal);
                                setDropoffTime(toHHMM(maxDrop));
                                toast({
                                  title: 'Maximum Duration',
                                  description: 'Booking duration cannot exceed 7 days',
                                  variant: 'default',
                                });
                              }
                            }
                          }
                        }}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Select
                        value={pickupTime || undefined}
                        onValueChange={(val) => {
                          let t = val;
                          const proposed = getDateTime(pickupDate, t);
                          if (pickupDate === todayStr && proposed && proposed.getTime() < now.getTime()) {
                            t = nowHHMM;
                          }
                          setPickupTime(t);
                          const p = getDateTime(pickupDate, t);
                          if (p && dropoffDate === pickupDate) {
                            const minDrop = new Date(p.getTime() + 30 * 60000);
                            const maxDrop = new Date(p.getTime() + 12 * 60 * 60000); // 12 hours max
                            const currentDrop = getDateTime(dropoffDate, dropoffTime);
                            if (!currentDrop || currentDrop.getTime() < minDrop.getTime()) {
                              setDropoffDate(pickupDate);
                              setDropoffTime(toHHMM(minDrop));
                            } else if (currentDrop.getTime() > maxDrop.getTime()) {
                              setDropoffDate(pickupDate);
                              setDropoffTime(toHHMM(maxDrop));
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 12 hours',
                                variant: 'default',
                              });
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickupOptions.map((t) => (
                            <SelectItem key={t} value={t}>{format12h(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Dropoff</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        min={todayStr}
                        max={maxDropoffDate || undefined}
                        value={dropoffDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minVal = todayStr;
                          let finalVal = val;
                          if (val < minVal) finalVal = minVal;
                          
                          // Check if duration exceeds 7 days
                          if (pickupDate && pickupTime) {
                            const pickup = new Date(`${pickupDate}T${pickupTime}`);
                            const dropoff = new Date(`${val}T${dropoffTime || '23:59'}`);
                            const hours = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
                            
                            if (hours > 24 * 7) {
                              const maxDrop = new Date(pickup);
                              maxDrop.setDate(maxDrop.getDate() + 7);
                              finalVal = maxDrop.toISOString().slice(0, 10);
                              const maxTime = toHHMM(maxDrop);
                              setDropoffTime(maxTime);
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 7 days',
                                variant: 'default',
                              });
                            }
                          }
                          
                          setDropoffDate(finalVal);
                        }}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Select
                        value={dropoffTime || undefined}
                        onValueChange={(val) => {
                          let t = val;
                          const proposed = getDateTime(dropoffDate, t);
                          if (dropoffDate === todayStr && proposed && proposed.getTime() < now.getTime()) {
                            t = nowHHMM;
                          }
                          if (pickupDT && dropoffDate === pickupDate) {
                            const minDrop = new Date(pickupDT.getTime() + 30 * 60000);
                            if (proposed && proposed.getTime() < minDrop.getTime()) {
                              t = toHHMM(minDrop);
                            }
                          }
                          if (pickupDT && proposed) {
                            const maxDrop = new Date(pickupDT.getTime() + 7 * 24 * 60 * 60000);
                            if (proposed.getTime() > maxDrop.getTime()) {
                              t = toHHMM(maxDrop);
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 7 days',
                                variant: 'default',
                              });
                            }
                          }
                          setDropoffTime(t);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {dropoffOptions.map((t) => (
                            <SelectItem key={t} value={t}>{format12h(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" className="flex-1" onClick={applyTimeFilter}>Apply filter</Button>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {durationMinutes ? `${durationMinutes} Minutes` : '0 Minutes'}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <section className="md:col-span-8 lg:col-span-9">
              <div className="bg-card rounded-2xl p-3 md:p-4 shadow-card mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Sort by</span>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val as typeof sortBy)}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="priceLow">Price - Low to High</SelectItem>
                        <SelectItem value="priceHigh">Price - High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mobile Search - Only visible on mobile */}
                  <div className="relative w-full md:hidden">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search bikes..."
                      className="pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Model</span>
                    <div className="relative -mx-2 w-full md:w-auto">
                      <div className="overflow-x-auto whitespace-nowrap px-2">
                        <ToggleGroup
                          type="single"
                          value={selectedType}
                          onValueChange={(val) => setSelectedType(val || 'all')}
                          className="inline-flex gap-2"
                        >
                          {bikeTypes.map((t) => (
                            <ToggleGroupItem
                              key={t.value}
                              value={t.value}
                              variant="default"
                              size="sm"
                              className="min-w-max rounded-full h-9 px-4 bg-muted text-foreground border border-input data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                            >
                              {t.label}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{bikesToShow.length}</span> bikes
                </p>
              </div>

              {/* Bike Grid */}
              {isLoading ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">Loading bikes...</p>
                </div>
              ) : bikesToShow.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bikesToShow.map((bike, index) => {
                    const durationHours = (() => {
                      if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
                        const start = new Date(`${pickupDate}T${pickupTime}`);
                        const end = new Date(`${dropoffDate}T${dropoffTime}`);
                        return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
                      }
                      return 0;
                    })();

                    return (
                      <div
                        key={bike.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <BikeCard 
                          bike={bike} 
                          onRent={handleRent}
                          pickupDateTime={pickupDate && pickupTime ? new Date(`${pickupDate}T${pickupTime}`) : undefined}
                          dropoffDateTime={dropoffDate && dropoffTime ? new Date(`${dropoffDate}T${dropoffTime}`) : undefined}
                          durationHours={durationHours}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">No bikes found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Mobile bottom bar */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
            <div className="bg-card rounded-2xl shadow-card flex items-center justify-between px-4 py-3">
              <Button variant="ghost" size="sm" onClick={() => setIsSearchDialogOpen(true)}>FILTER</Button>
              <div className="text-xs text-muted-foreground">{durationMinutes ? `${durationMinutes} Minutes` : '0 Minutes'}</div>
            </div>
          </div>

          {/* Rent Search Modal */}
          <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Search your next ride</DialogTitle>
                <DialogDescription>
                  Select pickup and dropoff to see available bikes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">

                <div>
                  <Label className="text-sm">Pickup</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="date" 
                      min={todayStr}
                      max={maxPickupDate}
                      value={pickupDate} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const minVal = todayStr;
                        const maxVal = maxPickupDate;
                        let finalVal = val;
                        if (val < minVal) finalVal = minVal;
                        if (val > maxVal) {
                          finalVal = maxVal;
                          toast({
                            title: 'Maximum Date',
                            description: 'Pickup date cannot be more than 7 days from today',
                            variant: 'default',
                          });
                        }
                        setPickupDate(finalVal);
                        // If dropoff exceeds 7 days from new pickup date, cap to 7 days
                        if (finalVal && pickupTime) {
                          const pickup = getDateTime(finalVal, pickupTime);
                          if (pickup) {
                            const maxDrop = new Date(pickup.getTime() + 7 * 24 * 60 * 60000); // 7 days max
                            const currentDrop = getDateTime(dropoffDate, dropoffTime);
                            if (currentDrop && currentDrop > maxDrop) {
                              setDropoffDate(maxDrop.toISOString().slice(0, 10));
                              setDropoffTime(toHHMM(maxDrop));
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 7 days',
                                variant: 'default',
                              });
                            }
                          }
                        }
                      }}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Select
                      value={pickupTime || undefined}
                      onValueChange={(val) => {
                        setPickupTime(val);
                        // Update dropoff time if needed to stay within 7 days
                        if (pickupDate && val && dropoffDate && dropoffTime) {
                          const pickup = getDateTime(pickupDate, val);
                          if (pickup) {
                            const maxDrop = new Date(pickup.getTime() + 7 * 24 * 60 * 60000);
                            const currentDrop = getDateTime(dropoffDate, dropoffTime);
                            if (currentDrop && currentDrop > maxDrop) {
                              setDropoffDate(maxDrop.toISOString().slice(0, 10));
                              setDropoffTime(toHHMM(maxDrop));
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 7 days',
                                variant: 'default',
                              });
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickupOptions.map((t) => (
                          <SelectItem key={t} value={t}>{format12h(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Dropoff</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="date" 
                      min={todayStr}
                      max={maxDropoffDate || undefined}
                      value={dropoffDate} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const minVal = todayStr;
                          let finalVal = val;
                          if (val < minVal) finalVal = minVal;
                          
                          // Check if duration exceeds 7 days
                          if (pickupDate && pickupTime) {
                            const pickup = new Date(`${pickupDate}T${pickupTime}`);
                            const dropoff = new Date(`${val}T${dropoffTime || '23:59'}`);
                            const hours = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
                            
                            if (hours > 24 * 7) {
                              const maxDrop = new Date(pickup);
                              maxDrop.setDate(maxDrop.getDate() + 7);
                              finalVal = maxDrop.toISOString().slice(0, 10);
                              const maxTime = toHHMM(maxDrop);
                              setDropoffTime(maxTime);
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 7 days',
                                variant: 'default',
                              });
                            }
                          }
                          
                          setDropoffDate(finalVal);
                        }}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Select
                      value={dropoffTime || undefined}
                      onValueChange={(val) => {
                        let t = val;
                        if (pickupDate && pickupTime) {
                          const pickup = getDateTime(pickupDate, pickupTime);
                          const proposed = getDateTime(dropoffDate, t);
                          if (pickup && proposed) {
                            const hours = (proposed.getTime() - pickup.getTime()) / (1000 * 60 * 60);
                            if (hours > 12) {
                              const maxDrop = new Date(pickup.getTime() + 12 * 60 * 60000);
                              t = toHHMM(maxDrop);
                              toast({
                                title: 'Maximum Duration',
                                description: 'Booking duration cannot exceed 12 hours',
                                variant: 'default',
                              });
                            }
                          }
                        }
                        setDropoffTime(t);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {dropoffOptions.map((t) => (
                          <SelectItem key={t} value={t}>{format12h(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={searchAvailable}>Search</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Booking Confirmation Modal */}
          <Dialog open={isBookingConfirmationOpen} onOpenChange={setIsBookingConfirmationOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Booking</DialogTitle>
                <DialogDescription>
                  Please review your booking details below.
                </DialogDescription>
              </DialogHeader>
              {selectedBike && (() => {
                const availableSlabs = getAvailablePricingSlabs(selectedBike);
                const start = new Date(`${pickupDate}T${pickupTime}`);
                const end = new Date(`${dropoffDate}T${dropoffTime}`);
                const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
                
                let priceInfo: any = null;
                try {
                  // Try new simple pricing model first (same logic as BikeCard)
                  const hasIndividualRates = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].some(
                    hour => selectedBike[`pricePerHour${hour}` as keyof typeof selectedBike] && Number(selectedBike[`pricePerHour${hour}` as keyof typeof selectedBike]) > 0
                  );
                  const hasTariff = selectedBike.weekdayRate !== undefined || selectedBike.weekendRate !== undefined;
                  
                  if (selectedBike.price12Hours || hasIndividualRates || selectedBike.pricePerWeek || hasTariff) {
                    priceInfo = calculateSimplePrice(selectedBike, start, end);
                  } else {
                    priceInfo = calculateRentalPrice(selectedBike, start, end, selectedPricingType);
                  }
                } catch (error) {
                  console.error('Price calculation error:', error);
                }
                const currentSlab = selectedBike.pricingSlabs?.[selectedPricingType];
                const displayPrice = currentSlab?.price || selectedBike.pricePerHour || 0;
                // Display static kmLimit value (not calculated includedKm) for user visibility
                const displayKmLimit = selectedBike.kmLimit || currentSlab?.included_km || 0;

                return (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-4">
                        {selectedBike.image ? (
                           <img src={selectedBike.image} alt={selectedBike.name} className="w-16 h-16 object-cover rounded-md" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                            <BikeIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{selectedBike.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{selectedBike.type} Bike</p>
                        </div>
                      </div>
                      
                      {/* Pricing Type Selection */}
                      {availableSlabs.length > 1 && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-2">Pricing Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlabs.map((slab) => (
                              <Button
                                key={slab}
                                type="button"
                                variant={selectedPricingType === slab ? 'default' : 'outline'}
                                size="sm"
                                className="text-xs capitalize"
                                onClick={() => setSelectedPricingType(slab)}
                              >
                                {slab}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground block">Pickup</span>
                          <span className="font-medium">{new Date(pickupDate).toLocaleDateString()} {format12h(pickupTime)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Dropoff</span>
                          <span className="font-medium">{new Date(dropoffDate).toLocaleDateString()} {format12h(dropoffTime)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Duration</span>
                          <span className="font-medium">{Math.round(hours)} hours ({durationMinutes} mins)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">KM Limit</span>
                          <span className="font-medium">{displayKmLimit} km</span>
                        </div>
                        {priceInfo && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block">Pricing Breakdown</span>
                            <div className="text-sm font-medium space-y-1">
                              <div>{priceInfo.breakdown || `Base: ₹${priceInfo.basePrice?.toFixed(2) || 0}`}</div>
                              {priceInfo.gstAmount && priceInfo.gstAmount > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  GST ({priceInfo.gstPercentage || 18}%): +₹{priceInfo.gstAmount.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {priceInfo && (
                          <div className="col-span-2 pt-2 border-t">
                            <span className="text-muted-foreground block">Total Amount</span>
                            <span className="font-bold text-xl text-primary">₹{Math.round(priceInfo.total)}</span>
                            {priceInfo.hasWeekend && (
                              <span className="text-xs text-accent block">(Weekend surge applied)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" className="w-full" onClick={() => setIsBookingConfirmationOpen(false)}>Cancel</Button>
                      <Button className="w-full" onClick={handleBookingConfirm}>Confirm Booking</Button>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

        </div>
      </main>

      <Footer />
    </div>
  );
}

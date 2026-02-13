import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { bikesAPI, locationsAPI } from '@/lib/api';
import { Bike } from '@/types';
import { BikeCard } from '@/components/BikeCard';
import { SEO } from '@/components/SEO';

export default function Tariff() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [cityName, setCityName] = useState<string>('Your City');

  useEffect(() => {
    const load = async () => {
      try {
        const selectedLocation = localStorage.getItem('selectedLocation') || undefined;
        const data = await bikesAPI.getAll(selectedLocation);
        setBikes(data || []);
        if (selectedLocation) {
          const loc = await locationsAPI.getById(selectedLocation);
          setCityName(loc?.city || loc?.name || 'Your City');
        }
      } catch {
        setBikes([]);
      }
    };
    load();
  }, []);

  const formatPrice = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`Bike Rental Tariffs in ${cityName} - Affordable Rental Plans`}
        description={`Check out our competitive bike rental prices and tariffs in ${cityName}. We offer a wide range of motorcycles, scooters, and electric bikes for rent starting at ₹10/hr.`}
        keywords={`bike rental tariffs ${cityName}, motorcycle rental prices ${cityName}, scooter rental cost ${cityName}, electric bike rental rates ${cityName}`}
        schema={{
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
              "name": "Tariffs",
              "item": "https://rideflow.com/tariff"
            }
          ]
        }}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Bike rental tariffs in {cityName}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual color may vary.
              Prices may vary subject to availability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike, index) => (
              <div
                key={bike.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <BikeCard
                  bike={bike}
                  onRent={(b) => navigate(`/garage?rent=1&bikeId=${encodeURIComponent(b.id)}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

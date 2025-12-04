'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    google: any;
  }
}

interface LocationInputProps {
  value: string;
  onChange: (
    location: string,
    coordinates?: { latitude: number; longitude: number }
  ) => void;
  label?: string;
  placeholder?: string;
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  placeholder = 'City, Country',
}: LocationInputProps) {
  const [geolocating, setGeolocating] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const autocompleteTokenRef = useRef<any>(null);
  const placesClientRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<any>(null);

  // --- 1. Try browser geolocation first ---
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          if (data.address) {
            const locationName =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              data.display_name.split(',')[0];

            const fullLocation = `${locationName}, ${
              data.address.country ?? ''
            }`.trim();

            onChange(fullLocation, { latitude, longitude });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        }
        setGeolocating(false);
      },
      () => setGeolocating(false),
      { timeout: 5000 }
    );
  }, [onChange]);

  // --- 2. Load NEW Google Places API ---
  // Load Google Maps (new API)
  useEffect(() => {
    if (geolocating) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      // NEW API — Autocomplete uses google.maps.places.Autocomplete
      const input = inputRef.current;

      if (!input) return;

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        fields: ['formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place) return;

        const formatted = place.formatted_address ?? value;

        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        onChange(
          formatted,
          lat && lng ? { latitude: lat, longitude: lng } : undefined
        );
      });

      autocompleteRef.current = autocomplete;
    });
  }, [geolocating]);

  // --- 3. Handle input changes w/ new Autocomplete Predictions API ---
  const handleInputChange = useCallback(
    (inputValue: string) => {
      onChange(inputValue);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (!inputValue || inputValue.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceTimerRef.current = setTimeout(async () => {
        if (!placesClientRef.current || !autocompleteTokenRef.current) return;

        const { predictions } =
          await placesClientRef.current.findAutocompletePredictions({
            input: inputValue,
            types: ['(cities)'],
            sessionToken: autocompleteTokenRef.current,
          });

        setSuggestions(predictions ?? []);
        setShowSuggestions(true);
      }, 250);
    },
    [onChange]
  );

  // --- 4. Handle suggestion click using new Place Details API ---
  const handleSuggestionSelect = useCallback(
    async (suggestion: any) => {
      setShowSuggestions(false);
      setSuggestions([]);
      onChange(suggestion.description);

      if (!placesClientRef.current) return;

      const { place } = await placesClientRef.current.getDetails({
        placeId: suggestion.place_id,
        fields: ['formattedAddress', 'location'],
      });

      if (place?.formattedAddress && place?.location) {
        onChange(place.formattedAddress, {
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        });
      }
    },
    [onChange]
  );

  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <div className='relative'>
        {geolocating ? (
          <div className='flex items-center gap-2 p-3 border rounded-lg bg-muted/50'>
            <Loader2 className='w-4 h-4 animate-spin text-primary' />
            <span className='text-sm text-muted-foreground'>
              Detecting your location...
            </span>
          </div>
        ) : (
          <div className='relative'>
            <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10' />

            <Input
              ref={inputRef}
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className='pl-9'
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className='absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto'>
                {suggestions.map((item: any) => (
                  <button
                    key={item.place_id}
                    type='button'
                    onClick={() => handleSuggestionSelect(item)}
                    className='w-full text-left px-4 py-2 hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg'
                  >
                    {item.description}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

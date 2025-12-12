'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import type {
  GoogleMapsAutocomplete,
  GoogleMapsPlacesService,
  GoogleMapsAutocompletePrediction,
  GoogleMapsPlaceDetails,
  NominatimResponse,
} from '@/types';

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options: { types: string[]; fields: string[] }
          ) => GoogleMapsAutocomplete;
          PlacesService: new (element: HTMLElement) => GoogleMapsPlacesService;
        };
      };
    };
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
  onGeolocationTrigger?: (triggerFn: () => void) => void; // Callback to receive trigger function
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  placeholder = 'City, Country',
  onGeolocationTrigger,
}: LocationInputProps) {
  const [geolocating, setGeolocating] = useState(false);
  const [suggestions, setSuggestions] = useState<
    GoogleMapsAutocompletePrediction[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geolocationTrigger, setGeolocationTrigger] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const lastTriggerRef = useRef(0);
  const isGeolocatingRef = useRef(false);

  const autocompleteTokenRef = useRef<unknown>(null);
  const placesClientRef = useRef<GoogleMapsPlacesService | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<GoogleMapsAutocomplete | null>(null);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Function to trigger geolocation
  const triggerGeolocation = useCallback(() => {
    setGeolocationTrigger((prev) => prev + 1);
  }, []);

  // Expose trigger function to parent component
  useEffect(() => {
    if (onGeolocationTrigger) {
      onGeolocationTrigger(triggerGeolocation);
    }
  }, [onGeolocationTrigger, triggerGeolocation]);

  // --- 1. Handle geolocation when manually triggered ---
  useEffect(() => {
    if (!navigator.geolocation || geolocationTrigger === 0) {
      return;
    }

    // Prevent duplicate triggers
    if (
      geolocationTrigger === lastTriggerRef.current ||
      isGeolocatingRef.current
    ) {
      return;
    }

    lastTriggerRef.current = geolocationTrigger;
    isGeolocatingRef.current = true;
    setGeolocating(true);

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

            onChangeRef.current(fullLocation, { latitude, longitude });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        } finally {
          setGeolocating(false);
          isGeolocatingRef.current = false;
        }
      },
      () => {
        setGeolocating(false);
        isGeolocatingRef.current = false;
      },
      { timeout: 5000 }
    );
  }, [geolocationTrigger]);

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
  }, [geolocating, value, onChange]);

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
    async (suggestion: GoogleMapsAutocompletePrediction) => {
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
                {suggestions.map((item) => (
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

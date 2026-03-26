import { useState, useCallback } from 'react';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

export interface UseUserLocationResult {
  coords: UserCoords | null;
  locationError: string | null;
  hasLocation: boolean;
  requesting: boolean;
  requestLocation: () => void;
  geocodeZip: (zip: string) => Promise<void>;
}

/**
 * Lazy location hook.
 * Supports two input methods:
 *   1. requestLocation() — browser GPS prompt
 *   2. geocodeZip(zip)   — Nominatim reverse-geocode a US zip code (no API key needed)
 * Neither method auto-runs on mount.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setRequesting(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setRequesting(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied. Enable it in your browser settings.',
          2: 'Location information is unavailable.',
          3: 'Location request timed out.',
        };
        setLocationError(messages[err.code] ?? 'Unable to retrieve your location.');
        setRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const geocodeZip = useCallback(async (zip: string) => {
    const cleaned = zip.trim().replace(/\D/g, '');
    if (cleaned.length !== 5) {
      setLocationError('Please enter a valid 5-digit zip code.');
      return;
    }
    setRequesting(true);
    setLocationError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${cleaned}&countrycodes=us&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en-US', 'User-Agent': 'UpliftTechquity/1.0' },
      });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setLocationError('Zip code not found. Try a different one.');
        return;
      }
      setCoords({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
    } catch {
      setLocationError('Could not look up that zip code. Please try again.');
    } finally {
      setRequesting(false);
    }
  }, []);

  return { coords, locationError, hasLocation: coords !== null, requesting, requestLocation, geocodeZip };
}

/**
 * Haversine formula — returns distance in miles between two lat/lng points.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

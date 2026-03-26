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
}

/**
 * Lazy browser geolocation hook.
 * Does NOT auto-prompt on mount — call requestLocation() when the user
 * explicitly wants distance-based features (e.g. selects "Sort by distance").
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
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setRequesting(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied. Enable it in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('Unable to retrieve your location.');
        }
        setRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return {
    coords,
    locationError,
    hasLocation: coords !== null,
    requesting,
    requestLocation,
  };
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

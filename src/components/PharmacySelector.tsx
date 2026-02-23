"use client";

import { useEffect, useState, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Star, ShoppingBag } from "lucide-react";

interface Pharmacy {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: any[];
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    isOpen?: () => boolean;
  } | any;
  distance?: number;
  formatted_phone_number?: string;
}

interface PharmacySelectorProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: Pharmacy) => void;
  onLocationDetected?: (location: { lat: number; lng: number }) => void; // NEW: callback for detected location
  placeholder?: string;
  className?: string;
  highlighted?: boolean;
}

export default function PharmacySelector({
  value,
  onChange,
  onPlaceSelect,
  onLocationDetected, // NEW
  placeholder = "Preferred Pharmacy",
  className = "",
  highlighted = false,
}: PharmacySelectorProps) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          
          // NEW: Call the callback to pass location to parent
          if (onLocationDetected) {
            onLocationDetected(location);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      setTimeout(() => {
        setLocationError("Geolocation is not supported by your browser.");
      }, 0);
    }
  }, [onLocationDetected]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const searchPharmacies = async (query: string = "") => {
    if (!userLocation) {
      if (!locationError) setLocationError("Getting your location...");
      return;
    }
    setIsLoading(true);
    try {
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", v: "weekly" });
      const placesLib = await importLibrary("places") as any;
      const service = new placesLib.PlacesService(document.createElement("div"));
      const request = {
        location: new (window as any).google.maps.LatLng(userLocation.lat, userLocation.lng),
        radius: 8000,
        type: "pharmacy",
        keyword: query || undefined,
      };
      service.nearbySearch(request, (results: any[], status: string) => {
        if (status === "OK" && results) {
          const detailedRequests = results.slice(0, 10).map((place: any) => {
            return new Promise<Pharmacy>((resolve) => {
              service.getDetails(
                { placeId: place.place_id, fields: ["place_id", "name", "formatted_address", "rating", "user_ratings_total", "photos", "geometry", "opening_hours", "formatted_phone_number"] },
                (placeDetails: any, detailsStatus: string) => {
                  if (detailsStatus === "OK" && placeDetails) {
                    const pharmacyLat = placeDetails.geometry.location.lat();
                    const pharmacyLng = placeDetails.geometry.location.lng();
                    resolve({
                      place_id: placeDetails.place_id,
                      name: placeDetails.name,
                      formatted_address: placeDetails.formatted_address,
                      rating: placeDetails.rating,
                      user_ratings_total: placeDetails.user_ratings_total,
                      photos: placeDetails.photos,
                      geometry: placeDetails.geometry,
                      opening_hours: placeDetails.opening_hours,
                      distance: calculateDistance(userLocation.lat, userLocation.lng, pharmacyLat, pharmacyLng),
                      formatted_phone_number: placeDetails.formatted_phone_number,
                    });
                  } else {
                    const pharmacyLat = place.geometry?.location?.lat() || 0;
                    const pharmacyLng = place.geometry?.location?.lng() || 0;
                    resolve({
                      place_id: place.place_id,
                      name: place.name,
                      formatted_address: place.vicinity || "",
                      rating: place.rating,
                      user_ratings_total: place.user_ratings_total,
                      photos: place.photos,
                      geometry: place.geometry,
                      distance: pharmacyLat && pharmacyLng ? calculateDistance(userLocation.lat, userLocation.lng, pharmacyLat, pharmacyLng) : 0,
                    });
                  }
                }
              );
            });
          });
          Promise.all(detailedRequests).then((pharmacyList) => {
            pharmacyList.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            setPharmacies(pharmacyList);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Error searching pharmacies:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userLocation) {
      const timeoutId = setTimeout(() => searchPharmacies(value), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, userLocation, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (pharmacy: Pharmacy) => {
    const photoUrl = pharmacy.photos && pharmacy.photos.length > 0 ? getPhotoUrl(pharmacy.photos[0], 200) : "";
    let isOpenNow: boolean | undefined;
    if (pharmacy.opening_hours) {
      if (typeof (pharmacy.opening_hours as any).isOpen === 'function') {
        isOpenNow = (pharmacy.opening_hours as any).isOpen();
      } else if ('open_now' in pharmacy.opening_hours) {
        isOpenNow = (pharmacy.opening_hours as any).open_now;
      }
    }
    const info = {
      name: pharmacy.name,
      address: pharmacy.formatted_address,
      formatted_address: pharmacy.formatted_address,
      photo: photoUrl,
      photoUrl: photoUrl,
      rating: pharmacy.rating,
      reviewCount: pharmacy.user_ratings_total,
      user_ratings_total: pharmacy.user_ratings_total,
      isOpen: isOpenNow,
      opening_hours: pharmacy.opening_hours,
      phone: pharmacy.formatted_phone_number,
      place_id: pharmacy.place_id,
      distance: pharmacy.distance,
    };
    (onChange as any)(pharmacy.name, info);
    if (onPlaceSelect) onPlaceSelect(pharmacy);
    setIsOpen(false);
  };

  const getPhotoUrl = (photo: any, maxWidth: number = 100) => {
    if (photo && typeof photo.getUrl === "function") return photo.getUrl({ maxWidth });
    return "";
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input ref={inputRef} type="text" value={value} onChange={(e) => { onChange(e.target.value); setIsOpen(true); }} onFocus={() => { setIsOpen(true); if (userLocation && pharmacies.length === 0) searchPharmacies(value); }} placeholder={placeholder} className={className} />
      {locationError && <div className="text-red-400 text-[10px] mt-0.5 px-1">{locationError}</div>}
      {isOpen && (
        <div className="absolute z-50 w-full left-0 mt-1 bg-[#0d1218] border border-white/10 rounded-lg shadow-2xl max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-white"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-teal mx-auto"></div><p className="mt-1.5 text-xs text-gray-400">Searching nearby pharmacies...</p></div>
          ) : pharmacies.length > 0 ? (
            <div className="p-1">
              {pharmacies.map((pharmacy) => (
                <div key={pharmacy.place_id} onClick={() => handleSelect(pharmacy)} className="p-1.5 hover:bg-[#11161c] active:bg-[#11161c] rounded-lg transition-colors border-b border-white/5 last:border-0 cursor-pointer">
                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-[#11161c]">
                      {pharmacy.photos && pharmacy.photos.length > 0 ? <img src={getPhotoUrl(pharmacy.photos[0], 80)} alt={pharmacy.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[#11161c]"><ShoppingBag className="w-5 h-5 text-gray-500" /></div>}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-white font-semibold text-xs mb-0.5 truncate leading-tight">{pharmacy.name}</h3>
                      {pharmacy.distance !== undefined && <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5 leading-tight"><span className="whitespace-nowrap">{pharmacy.distance} mi</span><span>·</span><span className="truncate text-[10px]">{pharmacy.formatted_address.split(",").slice(0, 2).join(",").trim()}</span></div>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pharmacy.rating && <div className="flex items-center gap-0.5 text-[10px] leading-tight"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" /><span className="text-yellow-400 whitespace-nowrap">{pharmacy.rating}</span>{pharmacy.user_ratings_total && <span className="text-gray-400 whitespace-nowrap">({pharmacy.user_ratings_total})</span>}</div>}
                        {pharmacy.opening_hours && (() => {
                          let isOpen = false;
                          if (pharmacy.opening_hours && typeof (pharmacy.opening_hours as any).isOpen === 'function') {
                            isOpen = (pharmacy.opening_hours as any).isOpen();
                          } else if (pharmacy.opening_hours && 'open_now' in pharmacy.opening_hours) {
                            isOpen = (pharmacy.opening_hours as any).open_now ?? false;
                          }
                          return (
                            <div className={`text-[10px] whitespace-nowrap leading-tight ${isOpen ? "text-green-400" : "text-red-400"}`}>
                              {isOpen ? "Open Now" : "Closed Now"}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : value && !isLoading ? <div className="p-3 text-center text-gray-400 text-xs">No pharmacies found. Try a different search term.</div> : null}
        </div>
      )}
    </div>
  );
}

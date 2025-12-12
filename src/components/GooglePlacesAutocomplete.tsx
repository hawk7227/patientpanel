"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  types?: string[];
  className?: string;
  componentRestrictions?: { country: string | string[] };
  disabled?: boolean;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  types = [],
  className,
  componentRestrictions,
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        setOptions({
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
          v: "weekly",
        });

        const placesLib = await importLibrary("places") as google.maps.places.PlacesLibrary;
        
        if (!inputRef.current) return;

        const options: google.maps.places.AutocompleteOptions = {
          fields: ["formatted_address", "address_components", "geometry", "name", "place_id"],
          types: types,
          componentRestrictions: componentRestrictions,
        };

        const newAutocomplete = new placesLib.Autocomplete(inputRef.current, options);
        
        newAutocomplete.addListener("place_changed", () => {
          const place = newAutocomplete.getPlace();
          
          // Update the input value with the formatted address or name
          const newValue = place.formatted_address || place.name || "";
          onChange(newValue);
          
          if (onPlaceSelect) {
            onPlaceSelect(place);
          }
        });

        setAutocomplete(newAutocomplete);
      } catch (error) {
        console.error("Failed to load Google Maps API", error);
      }
    };

    initAutocomplete();
  }, [types, componentRestrictions]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

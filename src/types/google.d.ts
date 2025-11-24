// src/types/google.d.ts

interface Window {
    google: typeof google;
}

declare namespace google {
    namespace maps {
        namespace places {
            class Autocomplete {
                constructor(inputField: HTMLInputElement, options?: AutocompleteOptions);
                addListener(event: string, handler: () => void): void;
                getPlace(): google.maps.places.PlaceResult;
            }
            interface AutocompleteOptions {
                types?: string[];
                fields?: string[];
                componentRestrictions?: ComponentRestrictions;
            }
            interface ComponentRestrictions {
                country: string | string[];
            }
            interface PlaceResult {
                name?: string;
                formatted_address?: string;
                place_id?: string;
                geometry?: {
                    location: {
                        lat: () => number;
                        lng: () => number;
                    };
                };
            }
            interface PlacesLibrary {
                Autocomplete: typeof Autocomplete;
            }
        }
    }
}

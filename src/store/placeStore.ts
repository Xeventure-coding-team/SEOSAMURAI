import { create } from 'zustand';

export interface PlaceDetails {
  name: string;
  formatted_address: string;
  place_id: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number | string;
}

interface PlaceState {
  data: PlaceDetails | null;
  loading: boolean;
  error: string | null;
  setPlace: (place: PlaceDetails) => void;
  clearPlace: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlaceStore = create<PlaceState>((set) => ({
  data: null,
  loading: false,
  error: null,
  setPlace: (place) => set({ data: place }),
  clearPlace: () => set({ data: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

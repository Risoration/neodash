// Re-export types from lib/db.ts
export type {
  User,
  CryptoCoin,
  CryptoData,
  ProductivityData,
  WeatherData,
  FinancialAccount,
  FinancialData,
  UserData,
  ProductivityGoals,
  UserConfig,
  FocusSession,
  SpendingCategory,
} from '@/lib/db';

// Google Maps API Types
export interface GoogleMapsPlace {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
}

export interface GoogleMapsAutocompletePrediction {
  place_id: string;
  description: string;
}

export interface GoogleMapsPlaceDetails {
  formattedAddress?: string;
  location?: {
    lat: () => number;
    lng: () => number;
  };
}

export interface GoogleMapsAutocomplete {
  getPlace: () => GoogleMapsPlace;
  addListener: (event: string, callback: () => void) => void;
}

export interface GoogleMapsPlacesService {
  findAutocompletePredictions: (request: {
    input: string;
    types: string[];
    sessionToken: unknown;
  }) => Promise<{ predictions: GoogleMapsAutocompletePrediction[] }>;
  getDetails: (request: {
    placeId: string;
    fields: string[];
  }) => Promise<{ place: GoogleMapsPlaceDetails }>;
}

// Simplified type for Google Maps window object
export type GoogleMapsWindow = {
  google: {
    maps: {
      places: {
        Autocomplete: new (
          input: HTMLInputElement,
          options: { types: string[]; fields: string[] }
        ) => GoogleMapsAutocomplete;
      };
    };
  };
};

// Chart Data Types
export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  date: string;
  value: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
}

// Budget Types
export interface BudgetData {
  budgets: Array<{ category: string; monthlyBudget: number }>;
  dailyGoal: number;
  monthlyGoal: number;
  todaySpending?: number;
  monthlySpending?: number;
}

// Nominatim Reverse Geocoding Response
export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  country?: string;
}

export interface NominatimResponse {
  address: NominatimAddress;
  display_name: string;
}

// Plaid Types
export interface PlaidAccountMetadata {
  account_id: string;
  name: string;
  type: string;
  subtype?: string;
}

export interface PlaidLinkMetadata {
  institution: {
    name: string;
    institution_id: string;
  };
  accounts: PlaidAccountMetadata[];
}

// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// API Response Types
export interface ApiError {
  error: string;
}

export interface ApiSuccess<T = unknown> {
  message?: string;
  data?: T;
}


import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

export const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => {
  googleProvider.addScope(scope);
});
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// In-memory access token cache
let cachedAccessToken: string | null = null;

/**
 * Initialize Auth state listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached yet or user reloaded page
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Haikuweza kupata Google Access Token. Tafadhali jaribu tena.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out
 */
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Google Calendar API Types & Helper methods
export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  status?: string;
  htmlLink?: string;
}

/**
 * List events from primary calendar
 */
export const fetchGoogleCalendarEvents = async (
  token: string,
  timeMin?: string
): Promise<GoogleCalendarEventItem[]> => {
  const minTime = timeMin || new Date(Date.now() - 7 * 86400000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    minTime
  )}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.items || [];
};

/**
 * Create a new event in Google Calendar
 */
export const insertGoogleCalendarEvent = async (
  token: string,
  eventData: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
  }
): Promise<GoogleCalendarEventItem> => {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  const body = {
    summary: eventData.summary,
    description: eventData.description,
    location: eventData.location || 'Dar es Salaam, Tanzania',
    start: {
      dateTime: eventData.startDateTime,
      timeZone: 'Africa/Dar_es_Salaam'
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: 'Africa/Dar_es_Salaam'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 120 }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kushindwa kuhifadhi kwenye Google Calendar: ${errText}`);
  }

  return await response.json();
};

/**
 * Delete an event from Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  token: string,
  eventId: string
): Promise<boolean> => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Kushindwa kufuta tukio: ${errText}`);
  }

  return true;
};

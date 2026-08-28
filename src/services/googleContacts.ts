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
import { ImportedContact } from '../utils/contactUtils';

// Scopes for Google Contacts & People API
export const GOOGLE_CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly'
];

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_CONTACTS_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory cache for OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Sign in with Google Popup and obtain OAuth token with People API scopes
export const signInWithGoogleContacts = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro ao conectar com Google Contatos:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedGoogleToken = (): string | null => cachedAccessToken;

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface GoogleContactPerson {
  resourceName?: string;
  etag?: string;
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  phoneNumbers?: Array<{ value?: string; type?: string; canonicalForm?: string }>;
  emailAddresses?: Array<{ value?: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
}

// Fetch user's Google Contacts via People API
export const fetchGoogleContacts = async (accessToken?: string): Promise<ImportedContact[]> => {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('Conta Google não conectada. Faça o login com sua conta Google primeiro.');
  }

  const url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,organizations&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING';
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão do Google expirada. Por favor, conecte sua conta Google novamente.');
    }
    throw new Error(`Falha ao consultar o Google Contatos (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const connections: GoogleContactPerson[] = data.connections || [];

  const formatted: ImportedContact[] = [];

  for (const person of connections) {
    const displayName = person.names?.[0]?.displayName || 
      [person.names?.[0]?.givenName, person.names?.[0]?.familyName].filter(Boolean).join(' ') || 
      'Contato Sem Nome';

    const phones = person.phoneNumbers || [];
    const emails = person.emailAddresses || [];
    const org = person.organizations?.[0]?.name || '';

    // If contact has at least one phone number, take the primary or first one
    if (phones.length > 0) {
      for (const ph of phones) {
        if (ph.value) {
          formatted.push({
            nome: displayName,
            telefone: ph.value,
            protocolo: org || 'Pilates clássico',
            origem: 'Google Contatos'
          });
        }
      }
    } else if (emails.length > 0) {
      // If no phone but has email, still add with email note
      formatted.push({
        nome: displayName,
        telefone: emails[0].value || '',
        protocolo: 'Pilates clássico',
        origem: 'Google Contatos'
      });
    }
  }

  return formatted;
};

// Export or sync a CRM Lead to Google Contacts
export const createContactInGoogle = async (
  contact: { nome: string; telefone: string; email?: string; notes?: string },
  accessToken?: string
): Promise<any> => {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('Conta Google não conectada.');
  }

  const nameParts = contact.nome.trim().split(' ');
  const givenName = nameParts[0] || 'Contato';
  const familyName = nameParts.slice(1).join(' ') || 'Fisiolys';

  const payload: any = {
    names: [
      {
        givenName,
        familyName,
        displayName: contact.nome
      }
    ],
    phoneNumbers: [
      {
        value: contact.telefone,
        type: 'mobile'
      }
    ],
    userDefined: [
      {
        key: 'Origem',
        value: 'Fisiolys CRM'
      }
    ]
  };

  if (contact.email) {
    payload.emailAddresses = [{ value: contact.email, type: 'work' }];
  }

  if (contact.notes) {
    payload.biographies = [{ value: contact.notes, contentType: 'TEXT_PLAIN' }];
  }

  const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro ao salvar no Google Contatos: ${err}`);
  }

  return await response.json();
};

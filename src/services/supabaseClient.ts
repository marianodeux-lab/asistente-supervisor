import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local storage keys for runtime configuration overrides (e.g. from UI)
const RUNTIME_URL_KEY = 'stp_supabase_url_override';
const RUNTIME_KEY_KEY = 'stp_supabase_anon_override';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean; source: 'env' | 'runtime' | 'none' } {
  // 1. Check runtime override in localStorage (useful if user enters keys in the web UI directly)
  const runtimeUrl = localStorage.getItem(RUNTIME_URL_KEY)?.trim() || '';
  const runtimeKey = localStorage.getItem(RUNTIME_KEY_KEY)?.trim() || '';

  if (runtimeUrl && runtimeKey && runtimeUrl.startsWith('https://')) {
    return { url: runtimeUrl, anonKey: runtimeKey, isConfigured: true, source: 'runtime' };
  }

  // 2. Check environment variables
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && envUrl.startsWith('https://') && !envUrl.includes('tu-proyecto.supabase.co')) {
    return { url: envUrl, anonKey: envKey, isConfigured: true, source: 'env' };
  }

  return { url: '', anonKey: '', isConfigured: false, source: 'none' };
}

let clientInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  const key = `${config.url}::${config.anonKey}`;
  if (clientInstance && currentConfigKey === key) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    currentConfigKey = key;
    return clientInstance;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

export function saveRuntimeSupabaseConfig(url: string, anonKey: string): void {
  if (url && anonKey) {
    localStorage.setItem(RUNTIME_URL_KEY, url.trim());
    localStorage.setItem(RUNTIME_KEY_KEY, anonKey.trim());
    clientInstance = null; // force re-instantiation
  }
}

export function clearRuntimeSupabaseConfig(): void {
  localStorage.removeItem(RUNTIME_URL_KEY);
  localStorage.removeItem(RUNTIME_KEY_KEY);
  clientInstance = null;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tableReady?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase no está configurado. Añade la URL y Anon Key en .env.local o en la configuración.'
    };
  }

  try {
    const { data, error } = await client
      .from('operaciones_flowpro')
      .select('id, updated_at')
      .limit(1);

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: false,
          tableReady: false,
          message: 'Conexión a Supabase exitosa, pero la tabla "operaciones_flowpro" no existe. Ejecuta el script SQL en Supabase.'
        };
      }
      return {
        success: false,
        message: `Error de Supabase: ${error.message} (Código ${error.code})`
      };
    }

    return {
      success: true,
      tableReady: true,
      message: '¡Conexión exitosa a Supabase y tablas listas!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red o conexión: ${err?.message || 'No se pudo contactar el servidor de Supabase'}`
    };
  }
}

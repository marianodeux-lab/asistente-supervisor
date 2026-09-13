import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';

export interface StoredDataset<T = any> {
  id: string;
  updated_at: string;
  updated_by: string;
  archivos_origen: string[];
  total_registros: number;
  payload: T;
}

export interface UploadHistoryItem {
  id: string;
  dataset_id: string;
  nombre_archivo: string;
  tamaño_kb: number;
  total_registros: number;
  subido_por: string;
  created_at: string;
}

const LOCAL_STORAGE_PREFIX = 'stp_dataset_cache_';
const LOCAL_HISTORY_KEY = 'stp_upload_history_cache';

export class ReportSyncService {
  /**
   * Obtiene el dataset activo desde Supabase con fallback transparente a caché local.
   */
  static async fetchActiveDataset<T = any>(datasetId: string): Promise<{ data: StoredDataset<T> | null; source: 'supabase' | 'cache' | 'none' }> {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('operaciones_flowpro')
          .select('*')
          .eq('id', datasetId)
          .maybeSingle();

        if (!error && data) {
          const dataset: StoredDataset<T> = {
            id: data.id,
            updated_at: data.updated_at,
            updated_by: data.updated_by || 'mariano',
            archivos_origen: data.archivos_origen || [],
            total_registros: data.total_registros || 0,
            payload: data.payload as T
          };

          // Update local cache
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${datasetId}`, JSON.stringify(dataset));
          } catch (e) {
            console.warn('LocalStorage full, skipped caching', e);
          }

          return { data: dataset, source: 'supabase' };
        }
      } catch (err) {
        console.warn('Error fetching dataset from Supabase, attempting local cache fallback', err);
      }
    }

    // Fallback: Check local cache
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${datasetId}`);
      if (cached) {
        return { data: JSON.parse(cached), source: 'cache' };
      }
    } catch (e) {
      console.warn('Error reading from local cache', e);
    }

    return { data: null, source: 'none' };
  }

  /**
   * Guarda un nuevo snapshot en Supabase y registra el historial.
   */
  static async upsertReportDataset<T = any>(
    datasetId: string,
    payload: T,
    metadata: {
      updated_by: string;
      archivos_origen: string[];
      total_registros: number;
      tamaño_kb?: number;
    }
  ): Promise<{ success: boolean; error?: string; savedToCloud: boolean }> {
    const client = getSupabaseClient();
    const nowIso = new Date().toISOString();

    const record: StoredDataset<T> = {
      id: datasetId,
      updated_at: nowIso,
      updated_by: metadata.updated_by,
      archivos_origen: metadata.archivos_origen,
      total_registros: metadata.total_registros,
      payload
    };

    // 1. Always save to local cache so the current device has instant update
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${datasetId}`, JSON.stringify(record));
    } catch (e) {
      console.warn('Could not store in local cache', e);
    }

    // 2. Save to Supabase if client is ready
    if (!client) {
      // Record in local history
      this.saveLocalHistoryItem({
        id: `local_${Date.now()}`,
        dataset_id: datasetId,
        nombre_archivo: metadata.archivos_origen.join(', '),
        tamaño_kb: metadata.tamaño_kb || 0,
        total_registros: metadata.total_registros,
        subido_por: metadata.updated_by,
        created_at: nowIso
      });

      return {
        success: true,
        savedToCloud: false,
        error: 'Guardado localmente. Para sincronizar con la nube, configura las credenciales de Supabase.'
      };
    }

    try {
      // Upsert into operaciones_flowpro
      const { error: upsertError } = await client
        .from('operaciones_flowpro')
        .upsert({
          id: datasetId,
          updated_at: nowIso,
          updated_by: metadata.updated_by,
          archivos_origen: metadata.archivos_origen,
          total_registros: metadata.total_registros,
          payload: payload
        });

      if (upsertError) {
        throw upsertError;
      }

      // Log to historial_cargas
      const { error: histError } = await client
        .from('historial_cargas')
        .insert({
          dataset_id: datasetId,
          nombre_archivo: metadata.archivos_origen.join(' + '),
          tamaño_kb: metadata.tamaño_kb || 0,
          total_registros: metadata.total_registros,
          subido_por: metadata.updated_by,
          created_at: nowIso
        });

      if (histError) {
        console.warn('Warning: snapshot saved but history log failed', histError);
      }

      return { success: true, savedToCloud: true };
    } catch (err: any) {
      console.error('Error saving dataset to Supabase:', err);
      return {
        success: true,
        savedToCloud: false,
        error: `Guardado en caché local, pero falló la subida a Supabase: ${err?.message || 'Error de conexión'}`
      };
    }
  }

  /**
   * Obtiene el historial de cargas realizadas (de Supabase o de caché local).
   */
  static async fetchUploadHistory(datasetId?: string): Promise<UploadHistoryItem[]> {
    const client = getSupabaseClient();

    if (client) {
      try {
        let query = client
          .from('historial_cargas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (datasetId) {
          query = query.eq('dataset_id', datasetId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as UploadHistoryItem[];
        }
      } catch (e) {
        console.warn('Failed to fetch history from Supabase, using local fallback', e);
      }
    }

    // Fallback to local history
    try {
      const stored = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (stored) {
        const list: UploadHistoryItem[] = JSON.parse(stored);
        return datasetId ? list.filter(item => item.dataset_id === datasetId) : list;
      }
    } catch (e) {
      console.warn('Error reading local history', e);
    }

    return [];
  }

  private static saveLocalHistoryItem(item: UploadHistoryItem): void {
    try {
      const stored = localStorage.getItem(LOCAL_HISTORY_KEY);
      const list: UploadHistoryItem[] = stored ? JSON.parse(stored) : [];
      list.unshift(item);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (e) {
      console.warn('Error writing local history', e);
    }
  }
}

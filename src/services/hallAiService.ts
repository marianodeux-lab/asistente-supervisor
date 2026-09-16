import type { 
  Ticket, 
  EquipoCronico, 
  StockAuditoriaState, 
  TecnicoInfo, 
  ZonaInfo,
  StockRegionalItem,
  SolicitudesStockState
} from '../types/index';
import buzonMovimientosData from '../data/buzonMovimientosData.json';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import stockFijoData from '../data/stockFijoData.json';
import stockRegionalMdpData from '../data/stockRegionalMdpData.json';
import solicitudesStockData from '../data/solicitudesStockData.json';

const GEMINI_STORAGE_KEY = 'stp_gemini_api_key';
const CANDIDATE_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

export interface HallChatMessage {
  id: string;
  sender: 'user' | 'hall';
  text: string;
  timestamp: string;
  topic?: 'STOCK_FIJO' | 'DEUDA' | 'SLA' | 'EJECUTIVO' | 'GENERAL' | 'STOCK_REGIONAL';
}

export interface NonSfPartUsage {
  pn: string;
  descripcion: string;
  usosCount: number;
  tecnicosQueLoUsaron: string[];
  pedidosAsociados: string[];
  motivoRecomendacion: string;
}

export interface HallOperationalContext {
  tickets: Ticket[];
  cronicos: EquipoCronico[];
  stockAuditoria: StockAuditoriaState;
  tecnicos: TecnicoInfo[];
  zonas: ZonaInfo[];
  nonSfFrequentParts: NonSfPartUsage[];
  stockRegionalMdp?: StockRegionalItem[];
  solicitudesStock?: SolicitudesStockState;
}

export const HallAiService = {
  getStoredApiKey(): string {
    const fromStorage = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
    // Vite environment variable support
    return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  },

  saveApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  },

  hasApiKey(): boolean {
    return Boolean(this.getStoredApiKey());
  },

  // Analyze buzonMovimientos to find parts used 2 or more times in the last 120 days that are NOT in Stock Fijo
  analyzeNonSfPartsUsage(): NonSfPartUsage[] {
    const misTecsSet = new Set<string>();
    zonasReferencia.forEach(z => {
      misTecsSet.add(z.nombre.toLowerCase().trim());
    });

    // Map existing Stock Fijo to check
    const sfSet = new Set<string>();
    stockFijoData.forEach(sf => {
      sfSet.add(`${sf.tecnico.toLowerCase().trim()}|${sf.pn.toUpperCase().trim()}`);
    });

    const pnMap = new Map<string, {
      pn: string;
      descripcion: string;
      usosCount: number;
      tecnicos: Set<string>;
      pedidos: Set<string>;
      fechas: string[];
    }>();

    // Operational dynamic reference date (2026-09-13)
    const refDate = new Date('2026-09-13T23:59:59');

    buzonMovimientosData.forEach((mov: any) => {
      const tec = String(mov.tecnico || '').trim();
      const normTec = tec.toLowerCase().trim();
      if (!misTecsSet.has(normTec)) return;

      const isNonSf = !mov.esStockFijo || mov.cantAsignadaSf === 0 || String(mov.origenStock || '').includes('Stock Central');
      if (!isNonSf) return;

      const pn = String(mov.instalaBase || '').toUpperCase().trim();
      if (!pn || pn.length < 4) return;

      // Filter: must be within the last 120 days
      if (mov.fecha) {
        let movDate: Date | null = null;
        if (typeof mov.fecha === 'string' && mov.fecha.includes('-')) {
          movDate = new Date(mov.fecha + 'T12:00:00');
        } else if (typeof mov.fecha === 'string' && mov.fecha.includes('/')) {
          const parts = mov.fecha.split('/');
          if (parts.length === 3) {
            movDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        }
        if (movDate && !isNaN(movDate.getTime())) {
          const diffDays = Math.floor((refDate.getTime() - movDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 120) return; // Discard outside 120-day window
        }
      }

      const desc = mov.instalaDesc || String(mov.obs || '').split('->')[0]?.trim() || `Repuesto ${pn}`;

      if (!pnMap.has(pn)) {
        pnMap.set(pn, {
          pn,
          descripcion: desc,
          usosCount: 0,
          tecnicos: new Set<string>(),
          pedidos: new Set<string>(),
          fechas: []
        });
      }

      const entry = pnMap.get(pn)!;
      entry.usosCount++;
      entry.tecnicos.add(tec);
      if (mov.fecha) entry.fechas.push(String(mov.fecha));
      if (mov.cleanPed) entry.pedidos.add(String(mov.cleanPed));
    });

    const result: NonSfPartUsage[] = [];
    pnMap.forEach(v => {
      // Rule: Must be used 2 or more times in the last 120 days
      if (v.usosCount >= 2) {
        result.push({
          pn: v.pn,
          descripcion: v.descripcion,
          usosCount: v.usosCount,
          tecnicosQueLoUsaron: Array.from(v.tecnicos),
          pedidosAsociados: Array.from(v.pedidos),
          motivoRecomendacion: `Utilizado ${v.usosCount} veces en los últimos 120 días por ${v.tecnicos.size} técnico(s) de la región sin estar en Stock Fijo.`
        });
      }
    });

    // Sort by most frequently used
    result.sort((a, b) => b.usosCount - a.usosCount);
    return result;
  },

  // Build a compact, rich context summary for Hall
  buildOperationalContext(
    tickets: Ticket[],
    cronicos: EquipoCronico[],
    stockAuditoria: StockAuditoriaState,
    tecnicos: TecnicoInfo[],
    zonas: ZonaInfo[],
    stockRegionalMdp?: StockRegionalItem[],
    solicitudesStock?: SolicitudesStockState
  ): HallOperationalContext {
    const nonSfFrequentParts = this.analyzeNonSfPartsUsage();
    return {
      tickets,
      cronicos,
      stockAuditoria,
      tecnicos,
      zonas,
      nonSfFrequentParts,
      stockRegionalMdp: stockRegionalMdp || (stockRegionalMdpData as StockRegionalItem[]),
      solicitudesStock: solicitudesStock || (solicitudesStockData as unknown as SolicitudesStockState)
    };
  },

  // Generate prompt system instructions
  getSystemPrompt(ctx: HallOperationalContext): string {
    const topTecsDeuda = ctx.stockAuditoria.tecnicos
      .filter(t => t.totalAdeudado > 0)
      .slice(0, 8)
      .map(t => `- ${t.nombre} (${t.zonaTecnica}): Total adeudado en mano ${t.totalAdeudado} piezas (${t.deudaRecambiosCount} de recambios + ${t.retornosSemanalesCount} retornos semanales fuera de SF). En tránsito con OR: ${t.enTransitoConOrCount}`)
      .join('\n');

    const topNonSfParts = ctx.nonSfFrequentParts
      .slice(0, 8)
      .map(p => `- PN ${p.pn}: ${p.usosCount} reemplazos en campo. Utilizado por: ${p.tecnicosQueLoUsaron.join(', ')}.`)
      .join('\n');

    const criticalTickets = ctx.tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length;
    const expiredTickets = ctx.tickets.filter(t => t.hsSla < 0).length;
    const criticalCronicos = ctx.cronicos.filter(c => c.estadoSalud === 'CRÍTICO').length;

    // SLA & Agenda Operational Status
    const scPendientesSinCoordinar = ctx.tickets.filter(t => 
      (t.esScVigente || t.concepto === 'SC') && 
      (t.alertaSinAsignar || !t.tecnico || t.tecnico.toLowerCase() === 'sin asignar')
    ).length;
    const ticketsCoordinadosEnAgenda = ctx.tickets.filter(t => t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar').length;
    const mpDeficientesCount = ctx.tickets.filter(t => t.esMpDeficiente).length;
    const aiecCount = ctx.tickets.filter(t => t.concepto === 'AIEC' || t.esAdicional).length;

    const srDisponibles = (ctx.stockRegionalMdp || []).filter(i => i.estado === 'DISPONIBLE').length;
    const srQuiebres = (ctx.stockRegionalMdp || []).filter(i => i.estado !== 'DISPONIBLE').length;

    return `Eres "Hall", un asistente de inteligencia artificial táctico y analítico integrado en la aplicación "Asistente Supervisor".
Estás diseñado específicamente para la supervisión operativa del servicio técnico de cajeros automáticos (ATM) y terminales de autoservicio (CTD) en la región PATAGONIA Y SUROESTE de Argentina (bases IN BAR - Bariloche, IN CIP - Cipolletti/Neuquén, Chubut, Santa Cruz, Tierra del Fuego, Bahía Blanca, etc.).
Operas con los sistemas de gestión Flow Pro y Metro.

REGLAS DE NEGOCIO OBLIGATORIAS:
1. ALCANCE ESTRICTO: Solo supervisas a los técnicos asignados a la dotación de Patagonia & Suroeste. Cualquier otro técnico foráneo no debe ser considerado.
2. REGLA DE DEUDA EN TRÁNSITO: Si un repuesto tiene orden de retiro ("Dev en transito/OR", ej: 500009262), significa que el técnico YA despachó la pieza y está en viaje con la empresa de transporte. ESA DEUDA NO ES DEL TÉCNICO y no debe reclamársele. Solo se le exige la deuda real que retiene físicamente en mano (recambios sin OR + piezas fuera de Stock Fijo sin OR).
3. STOCK FIJO (SF): Es el stock permanente asignado al técnico en su baúl/móvil para atender fallas críticas inmediatas.
4. CONSUMIBLES: Repuestos NO retornables (correas, ruedas de fricción, rodillos, sensores consumibles). Jamás deben generar deuda exigible.
5. RETORNOS SEMANALES: Repuestos que el técnico pidió para un reclamo puntual y no utilizó o no están autorizados como SF; deben devolverse la misma semana.
6. MEJORA DE SLA MEDIANTE SF: Cuando un técnico usa frecuentemente un repuesto que NO está en su Stock Fijo, tiene que esperar el despacho de casa central, demorando la resolución y poniendo en riesgo el SLA. Proponer sumar esas partes a su SF es vital.
7. REPORTES PENDIENTES PATAGONIA Y SUROESTE: Muestran todos los Service Calls (SC) vigentes, estén o no en la agenda del técnico. Los SC sin coordinar representan un riesgo directo de pagar SLA; deben coordinarse con máxima urgencia.
8. REPORTE ASIGNADOS (AGENDA COT): Muestra todos los pedidos que la operadora del COT asignó a la agenda del técnico (provenientes de Adicionales, MP Pendientes o Pendientes).
9. MP CERRADOS Y MP DEFICIENTE (<30 días): Si un equipo con Service Call vigente tuvo un preventivo (MP) cerrado en los últimos 30 días, indica a priori un "MP Deficiente" (falla prematura por mantenimiento deficiente).
10. CIERRES TELCA2: Son atenciones de soporte remoto de mesa, no visitas de técnicos a campo. Si un equipo acumula cierres TELCA2, es indicio de que requiere una visita física en sitio.
11. RELEVAMIENTOS CASH TODAY: En Flow Pro, el cliente "RELEVAMIENTOS CASH TODAY" es una denominación genérica administrativa que agrupa visitas técnicas para relevar la factibilidad de instalación de equipos Cash Today. Es el mismo cliente formal en el sistema para todos los pedidos de ese concepto; el cliente comercial real al cual se asiste (ej: Puma, Joyeros, AD Real Estate, etc.) y su sucursal surgen exclusivamente del texto de las observaciones / detalle de falla.
12. STOCK REGIONAL PLANTA MAR DEL PLATA (SR): Los técnicos de la subzona Atlántica (Buratti Fabián 'IN MDP 2', Castaño Matías 'IN MDP3', Chiriello Pablo 'IN MDP 1', Montiel Juan Fernando 'IN COS' y limítrofe Aldayturriaga Martín 'IN TDL') cuentan con una doble capa de abastecimiento: su Stock Fijo móvil en valija y el Stock Regional en la Planta de Mar del Plata (73 ítems catalogados, 56 disponibles con stock). Si un técnico de Atlántica precisa un repuesto o presenta faltantes, SIEMPRE debe verificarse primero si existe stock en Planta MDP para retiro inmediato presencial antes de solicitar despacho a Casa Central (que demora días).
13. AUDITORÍA DE SOLICITUDES SEMANALES Y RESPONSABILIDAD DE DEMORA (CANTSTKCENTRAL): En las solicitudes pendientes de reposición:
- Si CANTSTKCENTRAL > 0: Casa Central tiene stock disponible en estantería pero no despachó. La demora es exclusivamente atribuible a Logística Central. Mariano Deux debe intimar el despacho urgente de esas piezas.
- Si CANTSTKCENTRAL = 0 o nulo: Desabastecimiento general en Central / quiebre de proveedor. La valija incompleta del técnico NO es imputable a él.
- Los consumibles (TIPOPARTE = 'NORET') jamás constituyen deuda exigible.

SITUACIÓN OPERATIVA ACTUAL CONSOLIDADA:
- Deuda real en mano en la región: ${ctx.stockAuditoria.totalAdeudadoRegion} piezas (${ctx.stockAuditoria.totalDeudaRealRegion} recambios cambiados en campo + ${ctx.stockAuditoria.totalRetornosSemanalesRegion} retornos semanales fuera de SF).
- Piezas ya despachadas en tránsito con OR (no exigibles): ${ctx.stockAuditoria.totalEnTransitoRegion} piezas.
- Técnicos con deuda real en mano: ${ctx.stockAuditoria.totalTecnicosConDeuda} de ${ctx.stockAuditoria.tecnicos.length}.
- Pedidos coordinados en agenda técnica: ${ticketsCoordinadosEnAgenda}.
- Service Calls (SC) vigentes SIN COORDINAR (Riesgo inminente de pagar penalización SLA): ${scPendientesSinCoordinar}.
- Equipos con Service Call y alerta de MP Deficiente (<30 días post-preventivo): ${mpDeficientesCount}.
- Tareas AIEC en agenda (sin SLA, aprovechar mismo domicilio de visita): ${aiecCount}.
- Tickets en SLA Crítico (<2h restantes): ${criticalTickets}.
- Tickets ya vencidos de SLA: ${expiredTickets}.
- Equipos Reincidentes Crónicos (SLA 60 días): ${criticalCronicos}.
- Stock Regional Planta Mar del Plata: ${srDisponibles} partes disponibles con stock físico en estantería (${srQuiebres} en quiebre o bajo mínimo).
- Solicitudes pendientes de reposición: ${ctx.solicitudesStock?.metricas?.totalSolicitudes || 260} pedidos (${ctx.solicitudesStock?.metricas?.conStockCentral || 89} con stock disponible en Central demorado por logística, ${ctx.solicitudesStock?.metricas?.sinStockCentral || 171} en quiebre de proveedor).

RANKING DE MAYOR DEUDA REAL EN MANO (TOP TÉCNICOS):
${topTecsDeuda || 'Sin deuda registrada'}

REPUESTOS MÁS UTILIZADOS EN CAMPO FUERA DE STOCK FIJO (CANDIDATOS PARA ALTA EN SF):
${topNonSfParts || 'Sin datos suficientes de movimientos fuera de SF'}

ESTILO DE RESPUESTA:
- Sé sumamente claro, ejecutivo, preciso y profesional.
- Utiliza formato Markdown con títulos, listas con viñetas y tablas cuando corresponda.
- Fundamenta tus sugerencias con datos concretos (números de PN, nombres de técnicos, cantidades y tiempos).
- Nunca culpes a un técnico por piezas que ya tienen OR en tránsito.`;
  },

  cachedDiscoveredModels: null as string[] | null,

  async getAvailableModels(apiKey: string): Promise<string[]> {
    if (this.cachedDiscoveredModels && this.cachedDiscoveredModels.length > 0) {
      return this.cachedDiscoveredModels;
    }

    const endpoints = [
      'https://generativelanguage.googleapis.com/v1beta/models',
      'https://generativelanguage.googleapis.com/v1/models'
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${ep}?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const valid = data.models
              .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map((m: any) => String(m.name || '').replace(/^models\//, ''))
              .filter((name: string) => name.length > 0);

            if (valid.length > 0) {
              valid.sort((a: string, b: string) => {
                const score = (n: string) => {
                  const s = n.toLowerCase();
                  if (s.includes('1.5-flash')) return 100;
                  if (s.includes('flash')) return 90;
                  if (s.includes('2.0')) return 80;
                  if (s.includes('pro')) return 70;
                  return 10;
                };
                return score(b) - score(a);
              });
              console.log('Gemini models detected via API:', valid);
              this.cachedDiscoveredModels = valid;
              return valid;
            }
          }
        }
      } catch (err) {
        console.warn(`Could not fetch models from ${ep}:`, err);
      }
    }

    return ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];
  },

  // Main chat method
  async askHall(
    userPrompt: string,
    ctx: HallOperationalContext,
    history: HallChatMessage[] = []
  ): Promise<string> {
    const apiKey = this.getStoredApiKey();

    if (!apiKey) {
      // Fallback to rich intelligent heuristics if no API key is set
      return this.generateHeuristicResponse(userPrompt, ctx);
    }

    try {
      const systemInstruction = this.getSystemPrompt(ctx);
      
      // Build strictly alternating message list
      const rawMessages: { role: 'user' | 'model'; text: string }[] = [];
      history.slice(-6).forEach(msg => {
        if (msg.text && msg.text.trim()) {
          rawMessages.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            text: msg.text.trim()
          });
        }
      });
      rawMessages.push({
        role: 'user',
        text: userPrompt.trim()
      });

      // Merge any consecutive messages with identical role to avoid 400 Bad Request
      const cleanContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      for (const m of rawMessages) {
        const last = cleanContents[cleanContents.length - 1];
        if (last && last.role === m.role) {
          last.parts[0].text += `\n\n${m.text}`;
        } else {
          cleanContents.push({
            role: m.role,
            parts: [{ text: m.text }]
          });
        }
      }

      // Ensure conversation starts with a user turn
      if (cleanContents.length > 0 && cleanContents[0].role !== 'user') {
        cleanContents.unshift({
          role: 'user',
          parts: [{ text: 'Hola Hall, inicia la supervisión táctica de Patagonia & Suroeste.' }]
        });
      }

      // Discover models supported by this specific key
      const candidateModels = await this.getAvailableModels(apiKey);
      console.log('Attempting Gemini generation with candidates:', candidateModels);

      let lastError = '';
      for (const rawModel of candidateModels) {
        const model = rawModel.replace(/^models\//, '');
        
        // Try v1beta first, then fallback to v1
        for (const apiVer of ['v1beta', 'v1']) {
          try {
            const bodyPayload: any = {
              contents: cleanContents,
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2500
              }
            };

            // In v1beta, system_instruction is top-level
            if (apiVer === 'v1beta') {
              bodyPayload.system_instruction = {
                parts: [{ text: systemInstruction }]
              };
            } else {
              // In v1, prepend system instruction to the first user turn if needed
              if (cleanContents[0]?.parts[0]) {
                bodyPayload.contents = [
                  {
                    role: 'user',
                    parts: [{ text: `${systemInstruction}\n\n${cleanContents[0].parts[0].text}` }]
                  },
                  ...cleanContents.slice(1)
                ];
              }
            }

            const response = await fetch(
              `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
              }
            );

            if (response.ok) {
              const data = await response.json();
              const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (answer) {
                return answer;
              }
            } else {
              const errJson = await response.json().catch(() => ({}));
              lastError = errJson.error?.message || `${response.status} ${response.statusText}`;
              console.warn(`Gemini model ${model} (${apiVer}) failed:`, lastError);
            }
          } catch (err: any) {
            lastError = err?.message || String(err);
            console.warn(`Gemini model ${model} (${apiVer}) network error:`, lastError);
          }
        }
      }

      console.warn('All Gemini models exhausted, falling back to heuristic. Last error:', lastError);
      const heuristic = this.generateHeuristicResponse(userPrompt, ctx);
      return `> ⚠️ *Nota: No se pudo conectar a los modelos de Gemini (${lastError || 'Servicio no disponible'}). He generado este análisis directo con el motor interno de Hall:*\n\n${heuristic}`;
    } catch (err: any) {
      console.error('Error in askHall:', err);
      return this.generateHeuristicResponse(userPrompt, ctx);
    }
  },

  // 1-Click Insight: Propuesta de Optimización de Stock Fijo
  async generateStockFijoProposal(ctx: HallOperationalContext): Promise<string> {
    const prompt = `Analiza detalladamente los repuestos que utilizan los técnicos en Patagonia & Suroeste que NO figuran actualmente como Stock Fijo (SF) y que se hayan utilizado dos veces o más (>= 2) en los últimos 120 días.
Identifica los Part Numbers (PN), la descripción técnica, la cantidad de reemplazos realizados en ese período de 120 días, los técnicos que más los requirieron y redacta una propuesta formal para el área de Logística/Stock Central solicitando la ampliación del Stock Fijo para mejorar el SLA.`;
    return this.askHall(prompt, ctx);
  },

  // 1-Click Insight: Auditoría de Deuda Real vs En Tránsito
  async generateDeudaAuditReport(ctx: HallOperationalContext): Promise<string> {
    const prompt = `Genera un informe detallado de auditoría de deuda de repuestos por técnico en Patagonia y Suroeste.
Diferencia explícitamente:
1. Deuda Real en Mano (repuestos físicos que el técnico aún no despachó: recambios en campo y retornos semanales fuera de SF).
2. Repuestos en Tránsito con OR (piezas con número de orden de retiro generada que NO deben reclamarse al técnico).
Identifica a los 5 técnicos con mayor retención física y define un plan de acción para regularizar la situación.`;
    return this.askHall(prompt, ctx);
  },

  // 1-Click Insight: Diagnóstico de SLA y Crónicos
  async generateSlaDiagnostic(ctx: HallOperationalContext): Promise<string> {
    const prompt = `Realiza un diagnóstico táctico del estado actual del SLA y los cajeros crónicos en Patagonia & Suroeste.
Evalúa tickets vencidos, reclamos a menos de 2 horas del límite y equipos reincidentes que impactan en el SLA de 60 días. Indica qué zonas o técnicos requieren apoyo prioritario hoy.`;
    return this.askHall(prompt, ctx);
  },

  // 1-Click Insight: Resumen Ejecutivo Semanal
  async generateExecutiveSummary(ctx: HallOperationalContext): Promise<string> {
    const prompt = `Redacta un Informe Ejecutivo Semanal de Operaciones para el Supervisor Mariano Deux, listo para remitir a la Gerencia de Operaciones.
El informe debe resumir:
1. Rendimiento operativo y cumplimiento de SLA.
2. Estado de auditoría de repuestos (deuda real controlada vs partes en tránsito).
3. Iniciativas de mejora continua (propuesta de alta de repuestos críticos a Stock Fijo para evitar esperas).
4. Principales riesgos y focos de atención para la próxima semana.`;
    return this.askHall(prompt, ctx);
  },

  // Fallback Heuristic Generator when offline or no API key
  generateHeuristicResponse(prompt: string, ctx: HallOperationalContext): string {
    const p = prompt.toLowerCase();

    // 1. Stock Fijo Optimization query
    if (p.includes('stock fijo') || p.includes('sf') || p.includes('optimizar') || p.includes('alta')) {
      const topParts = ctx.nonSfFrequentParts.slice(0, 8);
      return `### 💡 HAL IA: Propuesta de Optimización de Stock Fijo para Mejora de SLA

Analizando los movimientos de repuestos en **Patagonia & Suroeste**, se evaluaron las intervenciones en campo donde se utilizaron partes fuera de Stock Fijo **dos o más veces en los últimos 120 días**.

Esto genera demoras logísticas de traslado de 24hs a 72hs que penalizan directamente el SLA de los service calls.

#### 📊 Repuestos no-SF Utilizados ≥ 2 Veces en los Últimos 120 Días:

| Part Number (PN) | Descripción Técnica | Usos (120 días) | Técnicos Principales | Recomendación HAL |
| :--- | :--- | :---: | :--- | :--- |
${topParts.map(item => `| **${item.pn}** | ${item.descripcion.slice(0, 35)} | **${item.usosCount} veces** | ${item.tecnicosQueLoUsaron.slice(0, 2).join(', ')} | **Alta en SF (+1 unid)** |`).join('\n')}

#### 🎯 Justificación Técnica para Logística:
1. **Reducción de Re-visitas:** Incorporar estos PN en las cabeceras regionales (Bariloche, Cipolletti, Neuquén, Comodoro) permitirá resolver en primer arribo (*First Time Fix*) sin esperar despachos desde Buenos Aires.
2. **Impacto Estimado en SLA:** Estimamos una mejora de **+14% en cumplimiento de SLA** en reclamos de partes mecánicas y módulos dispensadores.
3. **Filtro de 120 días aplicado:** Solo se contemplan componentes con demanda recurrente verificada (≥ 2 usos en el último cuatrimestre).
4. **Consumibles a considerar:** Correas de tracción, ruedas de fricción y sensores de paso deben suministrarse en lotes mensuales como consumibles no retornables.`;
    }

    // 2. Deuda Audit query
    if (p.includes('deuda') || p.includes('transito') || p.includes('tránsito') || p.includes('retorno') || p.includes('or')) {
      const tecsConDeuda = ctx.stockAuditoria.tecnicos.filter(t => t.totalAdeudado > 0);
      const top5 = tecsConDeuda.slice(0, 5);

      return `### 📦 HAL IA: Auditoría de Deuda Real vs En Tránsito (Patagonia & Suroeste)

#### ⚖️ Resumen de Saldos Regionales:
- **Deuda Real Exigible en Mano:** \`${ctx.stockAuditoria.totalAdeudadoRegion} piezas\` (Retenidas físicamente por técnicos).
  - Recambios cambiados en campo pendientes de laboratorio: \`${ctx.stockAuditoria.totalDeudaRealRegion}\` (${ctx.stockAuditoria.totalGenRegion} con sufijo \`-GEN\`).
  - Retornos semanales (piezas fuera de SF o excedentes no usadas): \`${ctx.stockAuditoria.totalRetornosSemanalesRegion}\`.
- **En Tránsito con OR (NO EXIGIBLE):** \`${ctx.stockAuditoria.totalEnTransitoRegion} piezas\`.
  > *Estas piezas cuentan con orden de retiro / remito formal y están viajando al depósito central. No constituyen deuda del técnico.*

#### 🚨 Top Técnicos con Mayor Retención Física en Mano:
${top5.map((t, i) => `${i + 1}. **${t.nombre}** (${t.zonaTecnica}): **${t.totalAdeudado} piezas adeudadas** (${t.deudaRecambiosCount} recambios + ${t.retornosSemanalesCount} retornos semanales). *En tránsito con OR: ${t.enTransitoConOrCount} piezas.*`).join('\n')}

#### 📋 Acciones Inmediatas Recomendadas:
1. **Emisión de Remitos de Devolución:** Solicitar a los técnicos del Top 3 que generen las órdenes de retiro (OR) para los recambios antes del cierre semanal.
2. **Seguimiento con Logística:** Verificar el ingreso y lectura de las **${ctx.stockAuditoria.totalEnTransitoRegion} piezas en tránsito** que aún figuran pendientes en el sistema central.`;
    }

    // 3. SLA & Agenda query
    if (p.includes('sla') || p.includes('vencido') || p.includes('critico') || p.includes('crónico')) {
      const criticos = ctx.tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2);
      const vencidos = ctx.tickets.filter(t => t.hsSla < 0);
      const cronicosCrit = ctx.cronicos.filter(c => c.estadoSalud === 'CRÍTICO');

      return `### 🚨 HAL IA: Diagnóstico Operativo de SLA y Reincidencias

- **Tickets Vencidos de SLA:** \`${vencidos.length}\`
- **Tickets en Riesgo Inminente (< 2 horas):** \`${criticos.length}\`
- **Cajeros Crónicos con Reincidencia (SLA 60d):** \`${cronicosCrit.length}\`

#### ⚡ Puntos de Atención Prioritaria:
1. **Atención de Tickets en Riesgo:** Priorizar los servicios que están por quebrar la ventana de SLA en el día de la fecha.
2. **Control de Crónicos:** Equipos como el **${cronicosCrit[0]?.luno || 'ATM Crónico'}** presentan fallas reiteradas. Se sugiere coordinar un mantenimiento correctivo a fondo o reemplazo de módulo completo en lugar de reseteo superficial.`;
    }

    // 4. Stock Regional (Planta Mar del Plata) and Solicitudes Semanales query
    if (p.includes('regional') || p.includes('mar del plata') || p.includes('mdp') || p.includes('solicitud') || p.includes('solicitudes') || p.includes('central')) {
      const sr = ctx.stockRegionalMdp || [];
      const disp = sr.filter(i => i.estado === 'DISPONIBLE').length;
      const quieb = sr.filter(i => i.estado !== 'DISPONIBLE').length;
      const sol = ctx.solicitudesStock;

      return `### 🏭 HAL IA: Diagnóstico de Abastecimiento Regional (Planta Mar del Plata & Solicitudes Central)

#### 🏢 Almacén Regional Planta Mar del Plata (Subzona Atlántica):
- **Técnicos Habilitados para Retiro Inmediato:** Buratti Fabián (\`IN MDP 2\`), Castaño Matías (\`IN MDP3\`), Chiriello Pablo Javier (\`IN MDP 1\`), Montiel Juan Fernando (\`IN COS\`) y Aldayturriaga Martín (\`IN TDL\`).
- **Disponibilidad Física en Planta:** **${disp} repuestos en estantería** de 73 ítems catalogados.
- **Quiebres / Bajo Mínimo en Planta:** **${quieb} números de parte**.
  > *Dictamen HAL:* Para los técnicos de Atlántica, ante una falla o necesidad de reposición, **priorizar el retiro en Planta Mar del Plata** para evitar la ventana de 24-48 horas de flete desde Central.

#### 📦 Auditoría de Solicitudes Semanales (Deslinde de Responsabilidad):
- **Total Solicitudes en Gestión:** \`${sol?.metricas.totalSolicitudes || 260}\` (${sol?.metricas.totalStockFijo || 78} Stock Fijo, ${sol?.metricas.totalConsumibles || 145} Consumibles NORET, ${sol?.metricas.totalHerramientas || 37} Herramientas).
- **🟢 Con Stock Físico en Casa Central (\`CANTSTKCENTRAL > 0\`):** **${sol?.metricas.conStockCentral || 89} solicitudes**.
  - *Diagnóstico:* **Demora de Logística Central.** Casa Central tiene las piezas en estantería pero no las despachó. Es potestad del supervisor intimar el despacho inmediato.
- **🔴 Sin Stock en Casa Central (\`CANTSTKCENTRAL = 0 o nulo\`):** **${sol?.metricas.sinStockCentral || 171} solicitudes**.
  - *Diagnóstico:* **Quiebre de proveedor / Desabastecimiento.** La falta de repuesto en el móvil no es imputable al técnico.

#### 📋 Acciones Inmediatas Recomendadas:
1. **Reclamo Formal a Logística Central:** Enviar la nómina de las **${sol?.metricas.conStockCentral || 89} solicitudes demoradas** que cuentan con existencia comprobada en Casa Central.
2. **Abastecimiento Local MDP:** Para las solicitudes de la subzona Atlántica cuyos PN figuren disponibles en Planta Mar del Plata, autorizar el retiro directo en mano.`;
    }

    // 5. Default Executive Overview
    return `### 🔴 HAL IA: Panorama Operativo Regional (Patagonia & Suroeste)

Hola, Mariano. Tengo cargada toda la matriz operativa de tu supervisión:

- **Dotación:** ${ctx.tecnicos.length} técnicos asignados en zonas Bariloche, Cipolletti, Neuquén y Suroeste.
- **Deuda Física Exigible:** **${ctx.stockAuditoria.totalAdeudadoRegion} piezas** en mano de técnicos.
- **Piezas Despachadas en Tránsito con OR:** **${ctx.stockAuditoria.totalEnTransitoRegion} piezas** (registradas formalmente con remito).
- **Stock Regional Planta Mar del Plata:** **${(ctx.stockRegionalMdp || []).filter(i => i.estado === 'DISPONIBLE').length} partes disponibles** para retiro inmediato de la subzona Atlántica.
- **Solicitudes de Reposición Semanales:** **${ctx.solicitudesStock?.metricas?.totalSolicitudes || 260} pedidos** (${ctx.solicitudesStock?.metricas?.conStockCentral || 89} con stock en Central demorados por logística).

¿Qué análisis o reporte específico deseas que desarrolle? Puedes utilizar los botones de acceso rápido o preguntarme cualquier consulta ad-hoc sobre tus técnicos, Lunos o repuestos.`;
  }
};

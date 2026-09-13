import type { Ticket, EquipoCronico, StockAuditoriaState, TecnicoInfo, ZonaInfo } from '../types/index';
import buzonMovimientosData from '../data/buzonMovimientosData.json';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import stockFijoData from '../data/stockFijoData.json';

const GEMINI_STORAGE_KEY = 'stp_gemini_api_key';
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface HallChatMessage {
  id: string;
  sender: 'user' | 'hall';
  text: string;
  timestamp: string;
  topic?: 'STOCK_FIJO' | 'DEUDA' | 'SLA' | 'EJECUTIVO' | 'GENERAL';
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

  // Analyze buzonMovimientos to find parts used by our technicians that are NOT in Stock Fijo
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
    }>();

    buzonMovimientosData.forEach((mov: any) => {
      const tec = String(mov.tecnico || '').trim();
      const normTec = tec.toLowerCase().trim();
      if (!misTecsSet.has(normTec)) return;

      const isNonSf = !mov.esStockFijo || mov.cantAsignadaSf === 0 || String(mov.origenStock || '').includes('Stock Central');
      if (!isNonSf) return;

      const pn = String(mov.instalaBase || '').toUpperCase().trim();
      if (!pn || pn.length < 4) return;

      if (!pnMap.has(pn)) {
        pnMap.set(pn, {
          pn,
          descripcion: String(mov.obs || '').split('->')[0]?.trim() || `Repuesto ${pn}`,
          usosCount: 0,
          tecnicos: new Set<string>(),
          pedidos: new Set<string>()
        });
      }

      const entry = pnMap.get(pn)!;
      entry.usosCount++;
      entry.tecnicos.add(tec);
      if (mov.cleanPed) entry.pedidos.add(String(mov.cleanPed));
    });

    const result: NonSfPartUsage[] = [];
    pnMap.forEach(v => {
      result.push({
        pn: v.pn,
        descripcion: v.descripcion,
        usosCount: v.usosCount,
        tecnicosQueLoUsaron: Array.from(v.tecnicos),
        pedidosAsociados: Array.from(v.pedidos),
        motivoRecomendacion: `Utilizado ${v.usosCount} veces en service calls sin estar en Stock Fijo, requiriendo despacho centralizado y demorando el SLA.`
      });
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
    zonas: ZonaInfo[]
  ): HallOperationalContext {
    const nonSfFrequentParts = this.analyzeNonSfPartsUsage();
    return {
      tickets,
      cronicos,
      stockAuditoria,
      tecnicos,
      zonas,
      nonSfFrequentParts
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

    return `Eres "Hall", un asistente de inteligencia artificial táctico y analítico integrado en la aplicación "Asistente Supervisor".
Estás diseñado específicamente para la supervisión operativa del servicio técnico de cajeros automáticos (ATM) y terminales de autoservicio (CTD) en la región PATAGONIA Y SUROESTE de Argentina (bases IN BAR - Bariloche, IN CIP - Cipolletti/Neuquén, Chubut, Santa Cruz, Tierra del Fuego, Bahía Blanca, etc.).
Operas con los sistemas de gestión Flow Pro y Metro.

REGLAS DE NEGOCIO OBLIGATORIAS:
1. ALCANCE ESTRICTO: Solo supervisas a los técnicos asignados a la dotación de Patagonia & Suroeste. Cualquier otro técnico foráneo no debe ser considerado.
2. REGLA DE DEUDA EN TRÁNSITO: Si un repuesto tiene orden de retiro ("Dev en transito/OR", ej: 500009262), significa que el técnico YA despachó la pieza y está en viaje con la empresa de transporte. ESA DEUDA NO ES DEL TÉCNICO y no debe reclamársele. Solo se le exige la deuda real que retiene físicamente en mano (recambios sin OR + piezas fuera de Stock Fijo sin OR).
3. STOCK FIJO (SF): Es el stock permanente asignado al técnico en su baúl/móvil para atender fallas críticas inmediatas.
4. CONSUMIBLES: Repuestos NO retornables (correas, ruedas de fricción, rodillos, sensores consumibles).
5. RETORNOS SEMANALES: Repuestos que el técnico pidió para un reclamo puntual y no utilizó o no están autorizados como SF; deben devolverse la misma semana.
6. MEJORA DE SLA MEDIANTE SF: Cuando un técnico usa frecuentemente un repuesto que NO está en su Stock Fijo, tiene que esperar el despacho de casa central, demorando la resolución y poniendo en riesgo el SLA. Proponer sumar esas partes a su SF es vital.
7. REPORTES PENDIENTES PATAGONIA Y SUROESTE: Muestran todos los Service Calls (SC) vigentes, estén o no en la agenda del técnico. Los SC sin coordinar representan un riesgo directo de pagar SLA; deben coordinarse con máxima urgencia.
8. REPORTE ASIGNADOS (AGENDA COT): Muestra todos los pedidos que la operadora del COT asignó a la agenda del técnico (provenientes de Adicionales, MP Pendientes o Pendientes).
9. MP CERRADOS Y MP DEFICIENTE (<30 días): Si un equipo con Service Call vigente tuvo un preventivo (MP) cerrado en los últimos 30 días, indica a priori un "MP Deficiente" (falla prematura por mantenimiento deficiente).
10. CIERRES TELCA2: Son atenciones de soporte remoto de mesa, no visitas de técnicos a campo. Si un equipo acumula cierres TELCA2, es indicio de que requiere una visita física en sitio.
11. RELEVAMIENTOS CASH TODAY: En Flow Pro, el cliente "RELEVAMIENTOS CASH TODAY" es una denominación genérica administrativa que agrupa visitas técnicas para relevar la factibilidad de instalación de equipos Cash Today. Es el mismo cliente formal en el sistema para todos los pedidos de ese concepto; el cliente comercial real al cual se asiste (ej: Puma, Joyeros, AD Real Estate, etc.) y su sucursal surgen exclusivamente del texto de las observaciones / detalle de falla.

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
      
      const contents: any[] = [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n--- INICIO DE LA CONVERSACIÓN CON EL SUPERVISOR ---` }]
        },
        {
          role: 'model',
          parts: [{ text: 'Entendido. Soy Hall, tu asistente de supervisión operativa para Patagonia & Suroeste. Tengo cargados todos los datos de tickets, SLA, reincidencias y auditoría de stock. ¿En qué puedo ayudarte hoy?' }]
        }
      ];

      // Add recent history (up to last 6 messages)
      history.slice(-6).forEach(msg => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });

      // Add current user prompt
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2500
            }
          })
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Gemini API Error, falling back to heuristic:', errJson);
        const heuristic = this.generateHeuristicResponse(userPrompt, ctx);
        return `> ⚠️ *Nota: No se pudo conectar a la API de Gemini (${errJson.error?.message || response.statusText}). He generado este análisis directo con el motor interno de Hall:*\n\n${heuristic}`;
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        return answer;
      }

      return this.generateHeuristicResponse(userPrompt, ctx);
    } catch (err: any) {
      console.error('Error calling Gemini:', err);
      return this.generateHeuristicResponse(userPrompt, ctx);
    }
  },

  // 1-Click Insight: Propuesta de Optimización de Stock Fijo
  async generateStockFijoProposal(ctx: HallOperationalContext): Promise<string> {
    const prompt = `Analiza detalladamente los repuestos que utilizan los técnicos en Patagonia & Suroeste que NO figuran actualmente como Stock Fijo (SF) y que debieran sumarse formalmente en ese carácter en pos de mejorar el SLA.
Identifica los Part Numbers (PN), la cantidad de reemplazos realizados, los técnicos que más los requirieron y redacta una propuesta formal para el área de Logística/Stock Central solicitando la ampliación del Stock Fijo.`;
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
      const topParts = ctx.nonSfFrequentParts.slice(0, 6);
      return `### 💡 Hall AI: Propuesta de Optimización de Stock Fijo para Mejora de SLA

Analizando los movimientos de repuestos en **Patagonia & Suroeste**, se detectó que los técnicos realizaron múltiples intervenciones utilizando partes solicitadas a Stock Central que **no están autorizadas en sus valijas como Stock Fijo**.

Esto genera demoras de traslado de 24hs a 72hs que penalizan directamente el SLA de los service calls.

#### 📊 Repuestos no-SF Más Utilizados en la Región:

| Part Number (PN) | Usos en Reclamos | Técnicos Principales | Recomendación Hall |
| :--- | :---: | :--- | :--- |
${topParts.map(item => `| **${item.pn}** | ${item.usosCount} veces | ${item.tecnicosQueLoUsaron.slice(0, 2).join(', ')} | **Alta en SF (+1 unid)** |`).join('\n')}

#### 🎯 Justificación Técnica para Logística:
1. **Reducción de Re-visitas:** Incorporar estos PN en las cabeceras regionales (Bariloche, Cipolletti, Neuquén, Comodoro) permitirá resolver en primer arribo (*First Time Fix*) sin esperar despachos desde Buenos Aires.
2. **Impacto Estimado en SLA:** Estimamos una mejora de **+14% en cumplimiento de SLA** en reclamos de partes mecánicas y módulos dispensadores.
3. **Consumibles a considerar:** Correas de tracción, ruedas de fricción y sensores de paso deben suministrarse en lotes mensuales como consumibles no retornables.`;
    }

    // 2. Deuda Audit query
    if (p.includes('deuda') || p.includes('transito') || p.includes('tránsito') || p.includes('retorno') || p.includes('or')) {
      const tecsConDeuda = ctx.stockAuditoria.tecnicos.filter(t => t.totalAdeudado > 0);
      const top5 = tecsConDeuda.slice(0, 5);

      return `### 📦 Hall AI: Auditoría de Deuda Real vs En Tránsito (Patagonia & Suroeste)

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

      return `### 🚨 Hall AI: Diagnóstico Operativo de SLA y Reincidencias

- **Tickets Vencidos de SLA:** \`${vencidos.length}\`
- **Tickets en Riesgo Inminente (< 2 horas):** \`${criticos.length}\`
- **Cajeros Crónicos con Reincidencia (SLA 60d):** \`${cronicosCrit.length}\`

#### ⚡ Puntos de Atención Prioritaria:
1. **Atención de Tickets en Riesgo:** Priorizar los servicios que están por quebrar la ventana de SLA en el día de la fecha.
2. **Control de Crónicos:** Equipos como el **${cronicosCrit[0]?.luno || 'ATM Crónico'}** presentan fallas reiteradas. Se sugiere coordinar un mantenimiento correctivo a fondo o reemplazo de módulo completo en lugar de reseteo superficial.`;
    }

    // 4. Default Executive Overview
    return `### 🤖 Hall AI: Panorama Operativo Regional (Patagonia & Suroeste)

Hola, Mariano. Tengo cargada toda la matriz operativa de tu supervisión:

- **Dotación:** ${ctx.tecnicos.length} técnicos asignados en zonas Bariloche, Cipolletti, Neuquén y Suroeste.
- **Deuda Física Exigible:** **${ctx.stockAuditoria.totalAdeudadoRegion} piezas** en mano de técnicos.
- **Piezas Despachadas en Tránsito con OR:** **${ctx.stockAuditoria.totalEnTransitoRegion} piezas** (registradas formalmente con remito).
- **Repuestos no-SF analizados:** Identificamos **${ctx.nonSfFrequentParts.length} piezas** utilizadas frecuentemente en reclamos que no están en el Stock Fijo autorizado.

¿Qué análisis o reporte específico deseas que desarrolle? Puedes utilizar los botones de acceso rápido o preguntarme cualquier consulta ad-hoc sobre tus técnicos, Lunos o repuestos.`;
  }
};

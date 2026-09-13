import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Key, 
  Settings, 
  RefreshCw, 
  Lightbulb, 
  Package, 
  Flame, 
  FileText, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  HallAiService, 
  HallChatMessage, 
  HallOperationalContext 
} from '../services/hallAiService';
import { 
  Ticket, 
  EquipoCronico, 
  StockAuditoriaState, 
  TecnicoInfo, 
  ZonaInfo 
} from '../types';

interface HallAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  cronicos: EquipoCronico[];
  stockAuditoria: StockAuditoriaState;
  tecnicos: TecnicoInfo[];
  zonas: ZonaInfo[];
}

export const HallAiAssistantModal: React.FC<HallAiAssistantModalProps> = ({
  isOpen,
  onClose,
  tickets,
  cronicos,
  stockAuditoria,
  tecnicos,
  zonas
}) => {
  const [messages, setMessages] = useState<HallChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Settings / API Key modal toggle
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [keySavedAlert, setKeySavedAlert] = useState(false);

  // Fullscreen expansion
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build operational context memo
  const operationalContext: HallOperationalContext = React.useMemo(() => {
    return HallAiService.buildOperationalContext(tickets, cronicos, stockAuditoria, tecnicos, zonas);
  }, [tickets, cronicos, stockAuditoria, tecnicos, zonas]);

  useEffect(() => {
    const currentKey = HallAiService.getStoredApiKey();
    setApiKeyInput(currentKey);
    setHasCustomKey(Boolean(currentKey));

    // Welcome message if history empty
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome_1',
          sender: 'hall',
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          text: `### 🤖 Hola Mariano, soy Hall.
Asistente de inteligencia artificial para la supervisión operativa de **Patagonia & Suroeste**.

He sincronizado los datos en vivo de tus **${operationalContext.tecnicos.length} técnicos**, tickets de SLA, reincidencias de cajeros automáticos y la **auditoría de stock de repuestos** (con **${operationalContext.stockAuditoria.totalAdeudadoRegion} piezas** en deuda real exigible y **${operationalContext.stockAuditoria.totalEnTransitoRegion} piezas** despachadas en tránsito con OR).

Puedes hacerme cualquier pregunta o seleccionar uno de los análisis rápidos a continuación:`
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    HallAiService.saveApiKey(apiKeyInput);
    setHasCustomKey(Boolean(apiKeyInput.trim()));
    setKeySavedAlert(true);
    setTimeout(() => {
      setKeySavedAlert(false);
      setShowSettings(false);
    }, 1200);
  };

  const handleSendMessage = async (textToSend?: string, topic?: HallChatMessage['topic']) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: HallChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      topic
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      let answer = '';
      if (topic === 'STOCK_FIJO') {
        answer = await HallAiService.generateStockFijoProposal(operationalContext);
      } else if (topic === 'DEUDA') {
        answer = await HallAiService.generateDeudaAuditReport(operationalContext);
      } else if (topic === 'SLA') {
        answer = await HallAiService.generateSlaDiagnostic(operationalContext);
      } else if (topic === 'EJECUTIVO') {
        answer = await HallAiService.generateExecutiveSummary(operationalContext);
      } else {
        answer = await HallAiService.askHall(query, operationalContext, messages);
      }

      const hallMsg: HallChatMessage = {
        id: `hall_${Date.now()}`,
        sender: 'hall',
        text: answer,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        topic
      };

      setMessages(prev => [...prev, hallMsg]);
    } catch (err: any) {
      const errorMsg: HallChatMessage = {
        id: `hall_err_${Date.now()}`,
        sender: 'hall',
        text: `Lo siento Mariano, ocurrió un error al procesar la respuesta: ${err?.message || 'Error desconocido'}.`,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      
      <div className={`bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isExpanded ? 'w-full h-full max-w-none' : 'w-full max-w-4xl h-[90vh] max-h-[820px]'
      }`}>
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/50 border-b border-slate-800 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 relative">
              <Bot className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  Hall IA
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Operaciones Flash 2.5
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Supervisión Táctica de Servicio Técnico • Patagonia & Suroeste
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Settings / API Key Button */}
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                hasCustomKey
                  ? 'bg-slate-900 text-emerald-400 border-emerald-500/40 hover:bg-slate-850'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
              }`}
              title="Configurar Clave de Gemini API"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasCustomKey ? 'Gemini Activo' : 'Conectar API Key'}</span>
            </button>

            {/* Expand / Minimize */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              title={isExpanded ? 'Restaurar tamaño' : 'Pantalla completa'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition"
              title="Cerrar asistente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* API Key Settings Drawer (Collapsible) */}
        {showSettings && (
          <div className="bg-slate-900/95 border-b border-slate-800 p-4 animate-fadeIn space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Configurar Google Gemini API Key
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Para habilitar razonamiento avanzado sin restricciones de red corporativa, ingresa tu clave gratuita de Google AI Studio. Se guarda de forma segura en este navegador.
                </p>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold underline"
              >
                <span>Obtener API Key gratis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-cyan-500/20"
              >
                {keySavedAlert ? '¡Guardada!' : 'Guardar Clave'}
              </button>
            </div>
          </div>
        )}

        {/* 1-Click Insight Buttons Bar */}
        <div className="px-6 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
            Consultas Rápidas:
          </span>

          <button
            onClick={() => handleSendMessage('Analiza qué repuestos no-SF utilizan los técnicos para proponer su alta en Stock Fijo y mejorar el SLA', 'STOCK_FIJO')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex-shrink-0 font-semibold disabled:opacity-50"
          >
            <Lightbulb className="w-3 h-3 text-amber-400" />
            <span>💡 Optimizar Stock Fijo (Altas SF)</span>
          </button>

          <button
            onClick={() => handleSendMessage('Genera la auditoría de repuestos separando deuda física en mano vs piezas despachadas en tránsito con OR', 'DEUDA')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition flex-shrink-0 font-semibold disabled:opacity-50"
          >
            <Package className="w-3 h-3 text-blue-400" />
            <span>📦 Deuda Real vs En Tránsito</span>
          </button>

          <button
            onClick={() => handleSendMessage('Diagnostica los tickets en riesgo de SLA y cajeros crónicos prioritarios de hoy', 'SLA')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition flex-shrink-0 font-semibold disabled:opacity-50"
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>🚨 Diagnóstico de SLA & Crónicos</span>
          </button>

          <button
            onClick={() => handleSendMessage('Redacta un informe ejecutivo semanal formal para la Gerencia de Operaciones', 'EJECUTIVO')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition flex-shrink-0 font-semibold disabled:opacity-50"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span>📝 Informe Ejecutivo Semanal</span>
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-950">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`relative max-w-[85%] rounded-2xl p-4 space-y-2 ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none shadow-xl'
                }`}>
                  
                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-4 pb-1 border-b border-white/10 text-[11px]">
                    <span className={`font-bold ${isUser ? 'text-slate-950' : 'text-cyan-400'}`}>
                      {isUser ? 'Mariano Deux (Supervisor)' : 'Hall IA'}
                    </span>
                    <span className={isUser ? 'text-slate-800' : 'text-slate-500'}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Content (Formatted Markdown-like) */}
                  <div className={`leading-relaxed text-xs sm:text-sm whitespace-pre-wrap font-sans ${
                    isUser ? 'text-slate-950' : 'text-slate-200'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Copy button for Hall's responses */}
                  {!isUser && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                        title="Copiar texto"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0 border border-amber-500/30">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Hall está analizando la matriz de datos y sintetizando respuesta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregúntale a Hall sobre repuestos, deuda, SLAs, técnicos, Lunos o zonas..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-40 disabled:hover:from-purple-600 disabled:hover:to-cyan-500 text-white rounded-2xl transition shadow-lg shadow-cyan-500/20 flex-shrink-0"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Contexto: Solo dotación Patagonia & Suroeste • Deuda con OR excluida automáticamente</span>
            <button
              onClick={() => setMessages([messages[0]])}
              className="hover:text-slate-400 transition underline"
            >
              Limpiar conversación
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

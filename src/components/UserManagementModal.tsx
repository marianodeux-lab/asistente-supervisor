import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  MapPin, 
  RefreshCw,
  Copy,
  Clock,
  Sparkles
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { AuthService } from '../services/authService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onSwitchUser: (user: UserAccount) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser
}) => {
  if (!isOpen) return null;

  const [users, setUsers] = useState<UserAccount[]>(AuthService.getUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; code?: string } | null>(null);

  // New user form state
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('SUPERVISOR');
  const [newCargo, setNewCargo] = useState('Supervisor Técnico de Zona');
  const [newZona, setNewZona] = useState('IN MDP 1 / Atlántica');
  const [newRegion, setNewRegion] = useState('PATAGONIA');

  const refreshUsersList = () => {
    setUsers(AuthService.getUsers());
  };

  const handleResetPassword = (user: UserAccount) => {
    const res = AuthService.adminResetUserPassword(user.email);
    refreshUsersList();
    if (res.success) {
      setFeedback({
        type: 'success',
        text: `Se habilitó el reseteo de clave para ${user.nombre}. Código de activación temporal generado.`,
        code: res.tempCode
      });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const res = AuthService.addUser({
      nombre: newNombre,
      email: newEmail,
      rol: newRol,
      cargo: newCargo,
      zona: newZona,
      region: newRegion,
      estado: 'PENDIENTE_PRIMER_INGRESO',
      requiereCambioClave: true
    });

    if (!res.success) {
      setFeedback({ type: 'error', text: res.message });
      return;
    }

    refreshUsersList();
    setShowAddForm(false);
    setNewNombre('');
    setNewEmail('');
    setFeedback({
      type: 'success',
      text: res.message
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Gestión de Usuarios & Accesos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Panel Administrador
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control de credenciales, activación de primer ingreso y recuperación de cuentas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className={`p-4 border-b text-xs flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/70 border-red-500/40 text-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">{feedback.text}</p>
                {feedback.code && (
                  <p className="mt-1 font-mono text-amber-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block">
                    Código Temporal: {feedback.code}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Usuarios registrados: <strong className="text-white">{users.length}</strong>
          </span>

          <button
            onClick={() => setShowAddForm(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/10"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancelar' : 'Agregar Nuevo Usuario'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">

          {/* New user creation form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" /> Registrar Nuevo Acceso
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej. Juan Manuel Pérez"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Email / Usuario</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Rol</label>
                  <select
                    value={newRol}
                    onChange={(e: any) => setNewRol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="SUPERVISOR">Supervisor de Zona</option>
                    <option value="SUPERVISOR_LIDER">Supervisor Líder / Referente</option>
                    <option value="ADMIN">Administrador General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Zona / Sector</label>
                  <input
                    type="text"
                    value={newZona}
                    onChange={(e) => setNewZona(e.target.value)}
                    placeholder="Ej. IN SRO / La Pampa"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  Guardar y Habilitar Primer Ingreso
                </button>
              </div>
            </form>
          )}

          {/* Users List Table */}
          <div className="space-y-3">
            {users.map((user) => {
              const isCurrent = currentUser.email.toLowerCase() === user.email.toLowerCase();
              const isPending = user.estado === 'PENDIENTE_PRIMER_INGRESO' || user.requiereCambioClave;

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-slate-950 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* User info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{user.nombre}</span>
                        
                        {/* Role pill */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.rol === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {user.rol === 'ADMIN' ? 'Administrador' : user.rol === 'SUPERVISOR_LIDER' ? 'Supervisor Líder' : 'Supervisor'}
                        </span>

                        {/* Status pill */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isPending
                            ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700 animate-pulse'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                        }`}>
                          {isPending ? '✨ Pendiente Primer Ingreso' : '✓ Activo'}
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                            (Sesión Actual)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="font-mono text-slate-200">{user.email}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{user.cargo}</span>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-500" /> {user.zona || 'Patagonia'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" /> Último acceso: {user.ultimoAcceso || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            onSwitchUser(user);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                          title="Cambiar la sesión activa a este usuario"
                        >
                          Usar Perfil
                        </button>
                      )}

                      <button
                        onClick={() => handleResetPassword(user)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Restablecer clave y habilitar código de recuperación"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Resetear Clave</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};

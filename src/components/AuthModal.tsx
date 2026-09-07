import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  UserCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { UserAccount } from '../types';
import { AuthService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserAuthenticated: (user: UserAccount) => void;
  initialMode?: 'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserAuthenticated,
  initialMode = 'LOGIN'
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD'>(initialMode);
  
  // Login fields
  const [email, setEmail] = useState<string>(currentUser.email || '');
  const [password, setPassword] = useState<string>('');
  
  // First login / Password setup fields
  const [firstLoginEmail, setFirstLoginEmail] = useState<string>(
    currentUser.email === 'marcosalbertoh@gmail.com' ? 'marcosalbertoh@gmail.com' : 'marcosalbertoh@gmail.com'
  );
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Recovery fields
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [recoveryNewPass, setRecoveryNewPass] = useState<string>('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);

  // Status and feedback
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Quick switch between demo accounts
  const handleSelectPredefined = (targetEmail: string) => {
    setEmail(targetEmail);
    setErrorMsg('');
    setSuccessMsg('');
    const users = AuthService.getUsers();
    const u = users.find(x => x.email.toLowerCase() === targetEmail.toLowerCase());
    if (u && (u.estado === 'PENDIENTE_PRIMER_INGRESO' || u.requiereCambioClave)) {
      setFirstLoginEmail(targetEmail);
      setMode('FIRST_LOGIN');
    } else {
      setMode('LOGIN');
      if (targetEmail === 'marianodeux@gmail.com') {
        setPassword('Mariano2026!');
      } else {
        setPassword('');
      }
    }
  };

  // Handle Login Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const res = AuthService.login(email, password);
      setIsLoading(false);

      if (res.requireSetup) {
        setFirstLoginEmail(email);
        setMode('FIRST_LOGIN');
        setErrorMsg(res.message);
        return;
      }

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      if (res.user) {
        setSuccessMsg(`¡Bienvenido ${res.user.nombre}!`);
        setTimeout(() => {
          onUserAuthenticated(res.user!);
          onClose();
        }, 600);
      }
    }, 400);
  };

  // Handle First Password Setup Submit (for Marcos or new users)
  const handleFirstLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = AuthService.registerFirstPassword(firstLoginEmail, newPassword);
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      setSuccessMsg('¡Contraseña generada con éxito! Tu cuenta está activada.');
      setTimeout(() => {
        if (res.user) {
          onUserAuthenticated(res.user);
        }
        onClose();
      }, 1000);
    }, 500);
  };

  // Handle Password Recovery Request
  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = recoveryEmail.trim().toLowerCase();
    const users = AuthService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === clean);

    if (!user) {
      setErrorMsg('No encontramos ningún usuario con ese correo.');
      return;
    }

    // Generate code
    const res = AuthService.adminResetUserPassword(clean);
    setRecoveryCode(res.tempCode);
    setRecoveryStep(2);
    setSuccessMsg(`Se generó el código de restablecimiento: ${res.tempCode}`);
  };

  // Handle Password Reset Confirm
  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (recoveryNewPass.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const res = AuthService.resetPasswordWithCode(recoveryEmail, recoveryCode, recoveryNewPass);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    setTimeout(() => {
      setEmail(recoveryEmail);
      setPassword(recoveryNewPass);
      setMode('LOGIN');
      setRecoveryStep(1);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Acceso al Sistema</h3>
              <p className="text-xs text-slate-400">Portal Asistente Supervisor • STP</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
          <button
            onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 font-bold rounded-lg transition ${
              mode === 'LOGIN' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setMode('FIRST_LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 font-bold rounded-lg transition ${
              mode === 'FIRST_LOGIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✨ Primer Ingreso
          </button>
          <button
            onClick={() => { setMode('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 font-bold rounded-lg transition ${
              mode === 'FORGOT_PASSWORD' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Recuperar Clave
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Predefined supervisor pill switches */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Seleccionar usuario rápido:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPredefined('marianodeux@gmail.com')}
                    className={`p-2 rounded-lg text-left border text-xs transition ${
                      email === 'marianodeux@gmail.com'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-bold text-white text-[11px]">Mariano Deux</p>
                    <p className="text-[10px] opacity-75">Admin General</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPredefined('marcosalbertoh@gmail.com')}
                    className={`p-2 rounded-lg text-left border text-xs transition ${
                      email === 'marcosalbertoh@gmail.com'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-bold text-white text-[11px]">Marcos Hernández</p>
                    <p className="text-[10px] text-amber-400">Primer Ingreso</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setRecoveryEmail(email); setMode('FORGOT_PASSWORD'); }}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Ingresar al Portal</span>
              </button>
            </form>
          )}

          {/* 2. FIRST LOGIN / PASSWORD SETUP MODE (FOR MARCOS) */}
          {mode === 'FIRST_LOGIN' && (
            <form onSubmit={handleFirstLoginSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Activación de Cuenta para Marcos Hernández
                </p>
                <p className="text-[11px] text-slate-300">
                  Bienvenido al Asistente Supervisor. En tu primer ingreso debes definir tu contraseña personal y secreta para acceder.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Correo Registrado
                </label>
                <input
                  type="email"
                  required
                  value={firstLoginEmail}
                  onChange={(e) => setFirstLoginEmail(e.target.value)}
                  placeholder="marcosalbertoh@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Crear Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Activar Cuenta y Guardar Contraseña</span>
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD / RECOVERY MODE */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              {recoveryStep === 1 ? (
                <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Ingresa tu correo para generar un código de recuperación y restablecer tu clave.
                  </p>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" /> Correo Registrado
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="marcosalbertoh@gmail.com o marianodeux@gmail.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Generar Código de Recuperación</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <p className="text-slate-400">Correo: <strong className="text-white">{recoveryEmail}</strong></p>
                    <p className="text-slate-400 mt-1">Código Temporal Generado: <strong className="text-amber-400 font-mono text-sm">{recoveryCode}</strong></p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Código de Recuperación
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={recoveryNewPass}
                      onChange={(e) => setRecoveryNewPass(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    Guardar Nueva Contraseña e Iniciar Sesión
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

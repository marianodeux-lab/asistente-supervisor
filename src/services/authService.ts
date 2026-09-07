import { UserAccount } from '../types';

const USERS_STORAGE_KEY = 'stp_users_db_v1';
const CURRENT_USER_KEY = 'stp_active_user_v1';
const PASSWORDS_STORAGE_KEY = 'stp_users_passwords_v1';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user_mariano',
    email: 'marianodeux@gmail.com',
    nombre: 'Mariano Deux',
    rol: 'ADMIN',
    cargo: 'Administrador General • Supervisor Regional',
    region: 'PATAGONIA & SUROESTE',
    zona: 'Todas las Zonas',
    estado: 'ACTIVO',
    requiereCambioClave: false,
    ultimoAcceso: '07/09/2026 16:30',
    fechaCreacion: '01/01/2026'
  },
  {
    id: 'user_marcos',
    email: 'marcosalbertoh@gmail.com',
    nombre: 'Marcos Alberto Hernández',
    rol: 'SUPERVISOR_LIDER',
    cargo: 'Supervisor Líder • Zona La Pampa & Referente Regional',
    region: 'PATAGONIA',
    zona: 'IN PCO / IN PCO1 (La Pampa)',
    estado: 'PENDIENTE_PRIMER_INGRESO',
    requiereCambioClave: true,
    ultimoAcceso: 'Pendiente primer acceso',
    fechaCreacion: '07/09/2026'
  }
];

// Initialize passwords map (Mariano has default pass; Marcos must create on first entry)
const INITIAL_PASSWORDS: Record<string, string> = {
  'marianodeux@gmail.com': 'Mariano2026!',
  // Marcos does not have an active password until first access
};

export class AuthService {
  static getUsers(): UserAccount[] {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading users from localStorage', e);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }

  static saveUsers(users: UserAccount[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage', e);
    }
  }

  static getPasswords(): Record<string, string> {
    try {
      const stored = localStorage.getItem(PASSWORDS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading passwords from localStorage', e);
    }
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(INITIAL_PASSWORDS));
    return INITIAL_PASSWORDS;
  }

  static savePasswords(passwords: Record<string, string>): void {
    try {
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
    } catch (e) {
      console.error('Error saving passwords to localStorage', e);
    }
  }

  static getCurrentUser(): UserAccount {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading current user', e);
    }
    const defaultUser = INITIAL_USERS[0];
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  }

  static setCurrentUser(user: UserAccount): void {
    try {
      const updatedUser = {
        ...user,
        ultimoAcceso: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      
      // Update in users table too
      const users = this.getUsers().map(u => u.email.toLowerCase() === user.email.toLowerCase() ? updatedUser : u);
      this.saveUsers(users);
    } catch (e) {
      console.error('Error setting current user', e);
    }
  }

  static login(email: string, password: string): { success: boolean; message: string; user?: UserAccount; requireSetup?: boolean } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Usuario no registrado en el sistema.' };
    }

    if (user.estado === 'BLOQUEADO') {
      return { success: false, message: 'La cuenta se encuentra bloqueada. Contacte al Administrador.' };
    }

    if (user.estado === 'PENDIENTE_PRIMER_INGRESO' || user.requiereCambioClave) {
      return { 
        success: false, 
        message: 'Primer ingreso detectado. Debe definir su contraseña personal para activar su cuenta.',
        user,
        requireSetup: true
      };
    }

    const passwords = this.getPasswords();
    const storedPass = passwords[cleanEmail];

    if (!storedPass || storedPass !== password) {
      return { success: false, message: 'Contraseña incorrecta. Si la olvidó, utilice "¿Olvidaste tu contraseña?".' };
    }

    this.setCurrentUser(user);
    return { success: true, message: 'Ingreso exitoso', user };
  }

  static registerFirstPassword(email: string, newPassword: string): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const passwords = this.getPasswords();
    passwords[cleanEmail] = newPassword;
    this.savePasswords(passwords);

    const updatedUser: UserAccount = {
      ...users[userIndex],
      estado: 'ACTIVO',
      requiereCambioClave: false,
      ultimoAcceso: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    users[userIndex] = updatedUser;
    this.saveUsers(users);
    this.setCurrentUser(updatedUser);

    return { success: true, message: 'Contraseña generada y cuenta activada con éxito.', user: updatedUser };
  }

  static resetPasswordWithCode(email: string, recoveryCode: string, newPassword: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No existe ningún usuario registrado con ese correo.' };
    }

    // Accept master supervisor reset code or generated code
    if (recoveryCode.trim() !== 'STP-2026' && recoveryCode.trim() !== 'RESET-MARCOS' && recoveryCode.length < 4) {
      return { success: false, message: 'Código de recuperación inválido.' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    const passwords = this.getPasswords();
    passwords[cleanEmail] = newPassword;
    this.savePasswords(passwords);

    const updatedUsers = users.map(u => {
      if (u.email.toLowerCase() === cleanEmail) {
        return { ...u, estado: 'ACTIVO' as const, requiereCambioClave: false };
      }
      return u;
    });
    this.saveUsers(updatedUsers);

    return { success: true, message: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.' };
  }

  static adminResetUserPassword(targetEmail: string): { success: boolean; tempCode: string; message: string } {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return { success: false, tempCode: '', message: 'Usuario no encontrado.' };
    }

    const tempCode = 'STP-' + Math.floor(100000 + Math.random() * 900000);

    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      estado: 'PENDIENTE_PRIMER_INGRESO',
      requiereCambioClave: true
    };
    this.saveUsers(updatedUsers);

    return { 
      success: true, 
      tempCode, 
      message: `Enlace de restablecimiento generado para ${cleanEmail}. Código temporal: ${tempCode}` 
    };
  }

  static addUser(newUser: Omit<UserAccount, 'id' | 'fechaCreacion'>): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = newUser.email.trim().toLowerCase();
    const users = this.getUsers();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Ya existe un usuario con ese correo electrónico.' };
    }

    const user: UserAccount = {
      ...newUser,
      id: 'user_' + Date.now(),
      email: cleanEmail,
      estado: 'PENDIENTE_PRIMER_INGRESO',
      requiereCambioClave: true,
      fechaCreacion: new Date().toLocaleDateString('es-AR')
    };

    users.push(user);
    this.saveUsers(users);

    return { success: true, message: `Usuario ${user.nombre} creado exitosamente con acceso pendiente de primer ingreso.`, user };
  }
}

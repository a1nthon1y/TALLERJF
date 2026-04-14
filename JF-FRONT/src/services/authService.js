import environment from '@/config/environment';

export const authService = {
  setToken(token) {
    if (!token) return;
    // Guardar la fecha de expiración (8 horas desde ahora)
    const expiresAt = new Date().getTime() + (8 * 60 * 60 * 1000);
    localStorage.setItem('token', token);
    localStorage.setItem('token_expires_at', expiresAt.toString());
  },

  getToken() {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token || !expiresAt) return null;
    
    // Verificar si el token ha expirado
    const now = new Date().getTime();
    if (now > parseInt(expiresAt)) {
      this.removeToken();
      return null;
    }
    
    return token;
  },

  removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
  },

  setUser(user) {
    if (!user) return;
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  removeUser() {
    localStorage.removeItem('user');
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  },

  async login(credentials) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || environment.url_backend;
      if (!backendUrl) {
        throw new Error('La URL del backend no está configurada');
      }

      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error en el servidor: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.token) {
        this.setToken(data.token);
        this.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error("Error en login:", error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor esté en ejecución.');
      }
      throw new Error(error.message || 'Error en el login');
    }
  },

  logout() {
    this.removeToken();
    this.removeUser();
    window.location.href = '/login';
  }
};

export default authService;
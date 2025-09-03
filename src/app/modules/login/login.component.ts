import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2 class="login-title">Sistema de Retroexcavadoras y Áridos</h2>
        <p class="login-subtitle">Panel del Operario</p>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="username">Usuario</label>
            <input
              type="text"
              id="username"
              formControlName="username"
              class="form-control"
              [class.is-invalid]="submitted && f['username'].errors"
              placeholder="Ingrese su email o usuario"
            />
            <div *ngIf="submitted && f['username'].errors" class="invalid-feedback">
              <div *ngIf="f['username'].errors['required']">
                Usuario es requerido
              </div>
              <div *ngIf="f['username'].errors['minlength']">
                Usuario debe tener al menos 3 caracteres
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input
              type="password"
              id="password"
              formControlName="password"
              class="form-control"
              [class.is-invalid]="submitted && f['password'].errors"
              placeholder="Ingrese su contraseña"
            />
            <div *ngIf="submitted && f['password'].errors" class="invalid-feedback">
              <div *ngIf="f['password'].errors['required']">
                Contraseña es requerida
              </div>
              <div *ngIf="f['password'].errors['minlength']">
                Contraseña debe tener al menos 3 caracteres
              </div>
            </div>
          </div>

          <!-- Estado de conexión -->
          <div class="connection-status mb-3">
            <small class="text-muted">
              Estado: 
              <span [class]="getConnectionStatusClass()">
                {{ getConnectionStatusText() }}
              </span>
              <button 
                *ngIf="connectionStatus === 'disconnected'" 
                type="button" 
                class="btn btn-sm btn-outline-secondary ms-2" 
                (click)="retryConnection()">
                Reintentar
              </button>
            </small>
          </div>

          <div class="form-group">
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="loading || connectionStatus === 'disconnected'">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Iniciando sesión...' : 'Ingresar' }}
            </button>
          </div>

          <div *ngIf="error" class="alert alert-danger mt-3">{{ error }}</div>
          
          <div *ngIf="success" class="alert alert-success mt-3">{{ successMessage }}</div>
          
          <div class="mt-3 text-center">
            <p><small class="text-muted">Usuarios de prueba:</small></p>
            <div class="d-flex gap-2 justify-content-center">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-info" 
                (click)="fillTestCredentials('operario')"
                [disabled]="loading">
                Operario
              </button>
              <button 
                type="button" 
                class="btn btn-sm btn-outline-warning" 
                (click)="fillTestCredentials('admin')"
                [disabled]="loading">
                Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .login-title {
      text-align: center;
      margin-bottom: 0.5rem;
      color: #333;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .login-subtitle {
      text-align: center;
      margin-bottom: 2rem;
      color: #666;
      font-size: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .is-invalid {
      border-color: #dc3545;
    }

    .invalid-feedback {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .btn {
      display: inline-block;
      font-weight: 500;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      border: 1px solid transparent;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
    }

    .btn-primary {
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-sm {
      padding: 0.4rem 0.8rem;
      font-size: 0.875rem;
    }

    .btn-outline-info {
      color: #17a2b8;
      border-color: #17a2b8;
      background: transparent;
    }

    .btn-outline-warning {
      color: #ffc107;
      border-color: #ffc107;
      background: transparent;
    }

    .alert {
      position: relative;
      padding: 0.75rem 1.25rem;
      margin-bottom: 1rem;
      border: 1px solid transparent;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .alert-danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }

    .alert-success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }

    .connection-status {
      text-align: center;
      margin-bottom: 1rem;
    }

    .text-success { color: #28a745 !important; }
    .text-warning { color: #ffc107 !important; }
    .text-danger { color: #dc3545 !important; }
    .text-muted { color: #6c757d !important; }

    .spinner-border {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      vertical-align: text-bottom;
      border: 0.15em solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spinner-border 0.75s linear infinite;
    }

    @keyframes spinner-border {
      to { transform: rotate(360deg); }
    }

    .d-flex {
      display: flex !important;
    }

    .gap-2 {
      gap: 0.5rem !important;
    }

    .justify-content-center {
      justify-content: center !important;
    }

    .mt-3 {
      margin-top: 1rem !important;
    }

    .mb-3 {
      margin-bottom: 1rem !important;
    }

    .me-2 {
      margin-right: 0.5rem !important;
    }

    .ms-2 {
      margin-left: 0.5rem !important;
    }

    .text-center {
      text-align: center !important;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = false;
  successMessage = '';
  connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    // Verificar si ya está autenticado
    if (this.authService.estaAutenticado()) {
      this.redirectToUserDashboard();
      return;
    }

    // Verificar conectividad con el backend
    this.checkBackendConnection();
  }

  get f() {
    return this.loginForm.controls;
  }

  private async checkBackendConnection(): Promise<void> {
    this.connectionStatus = 'connecting';
    
    try {
      // ✅ Verificar usando un endpoint simple del backend
      const response = await fetch(`${environment.apiUrl}/usuarios`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // ✅ 401 o 200 significa que el backend responde
      if (response.status === 401 || response.ok) {
        this.connectionStatus = 'connected';
        console.log('✅ Backend conectado');
      } else {
        this.connectionStatus = 'disconnected';
        console.warn('⚠️ Backend no responde correctamente');
      }
    } catch (error) {
      console.error('❌ Backend no disponible:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  getConnectionStatusText(): string {
    switch (this.connectionStatus) {
      case 'connected':
        return 'Conectado al servidor';
      case 'connecting':
        return 'Verificando conexión...';
      case 'disconnected':
        return 'Sin conexión al servidor';
      default:
        return 'Estado desconocido';
    }
  }

  getConnectionStatusClass(): string {
    switch (this.connectionStatus) {
      case 'connected':
        return 'text-success';
      case 'connecting':
        return 'text-warning';
      case 'disconnected':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = false;

    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    if (this.connectionStatus === 'disconnected') {
      this.error = 'No hay conexión con el servidor. Verifique su conexión a internet.';
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    console.log('🔐 Intentando autenticar usuario:', username);

    // ✅ Login directo sin codificación base64
    this.authService.login(username, password).subscribe({
      next: (usuario: Usuario) => {
        this.loading = false;
        this.success = true;
        this.successMessage = `¡Bienvenido, ${usuario.nombre}!`;
        
        console.log('✅ Login exitoso para:', usuario.nombre, '- Rol:', usuario.roles);

        // Pequeña pausa para mostrar el mensaje de éxito
        setTimeout(() => {
          this.redirectToUserDashboard();
        }, 1500);
      },
      error: (error: any) => {
        this.loading = false;
        this.success = false;
        
        console.error('❌ Error en login:', error);

        // ✅ Manejo específico de errores mejorado
        if (error.message) {
          this.error = error.message;
        } else if (error.status === 401) {
          this.error = 'Usuario o contraseña incorrectos. Verifique sus credenciales.';
        } else if (error.status === 0) {
          this.error = 'Error de conexión. Verifique que el servidor esté disponible.';
          this.connectionStatus = 'disconnected';
        } else if (error.status >= 500) {
          this.error = 'Error en el servidor. Intente nuevamente en unos momentos.';
        } else if (error.status === 422) {
          this.error = 'Datos de login inválidos. Verifique el formato de sus credenciales.';
        } else {
          this.error = 'Error de autenticación. Intente nuevamente.';
        }

        // Si hay error, limpiar el formulario de contraseña
        this.loginForm.patchValue({ password: '' });
        this.submitted = false;
      },
    });
  }

  private redirectToUserDashboard(): void {
    const user = this.authService.obtenerUsuarioActual();
    
    if (!user) {
      console.warn('⚠️ No hay usuario después del login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('🎯 Redirigiendo usuario:', user.nombre, 'con rol:', user.roles);

    // ✅ Redirigir según el rol del usuario
    if (this.authService.esAdministrador()) {
      console.log('✅ Redirigiendo administrador al dashboard');
      this.router.navigate(['/operator/dashboard']); // Por ahora al mismo dashboard
    } else if (this.authService.esOperario()) {
      console.log('✅ Redirigiendo operario al dashboard');
      this.router.navigate(['/operator/dashboard']);
    } else {
      console.log('✅ Redirigiendo usuario sin rol específico al dashboard');
      this.router.navigate(['/operator/dashboard']);
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // ✅ Credenciales de prueba actualizadas
  fillTestCredentials(type: 'operario' | 'admin'): void {
    if (type === 'operario') {
      this.loginForm.patchValue({
        username: 'admin@kedikian.com', // ✅ Usar email como username
        password: 'admin123'
      });
    } else if (type === 'admin') {
      this.loginForm.patchValue({
        username: 'admin@kedikian.com', // ✅ Usar email como username
        password: 'admin123'
      });
    }
  }

  // Método para reintentar conexión
  retryConnection(): void {
    this.checkBackendConnection();
  }

  // ✅ Método para probar la conexión manualmente
  testConnection(): void {
    this.checkBackendConnection();
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h2 class="login-title">Sistema de Retroexcavadoras y Áridos</h2>
          <p class="login-subtitle">Acceso al panel de gestión</p>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="username">Usuario o Email</label>
            <input 
              type="text" 
              id="username"
              formControlName="username"
              class="form-control"
              [ngClass]="{'is-invalid': submitted && f['username'].errors}"
              placeholder="Ingrese su usuario o email"
              autocomplete="username"
            />
            <div *ngIf="submitted && f['username'].errors" class="error-message">
              <div *ngIf="f['username'].errors['required']">El usuario es requerido</div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password"
              formControlName="password"
              class="form-control"
              [ngClass]="{'is-invalid': submitted && f['password'].errors}"
              placeholder="Ingrese su contraseña"
              autocomplete="current-password"
            />
            <div *ngIf="submitted && f['password'].errors" class="error-message">
              <div *ngIf="f['password'].errors['required']">La contraseña es requerida</div>
              <div *ngIf="f['password'].errors['minlength']">La contraseña debe tener al menos 4 caracteres</div>
            </div>
          </div>
          
          <div class="form-group">
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              <span *ngIf="loading" class="loading-spinner">⏳</span>
              <span *ngIf="!loading">🔑</span>
              {{ loading ? 'Verificando...' : 'Iniciar Sesión' }}
            </button>
          </div>
          
          <div *ngIf="error" class="alert alert-danger">
            <span class="alert-icon">❌</span>
            <span class="alert-text">{{ error }}</span>
          </div>
          
          <div *ngIf="success" class="alert alert-success">
            <span class="alert-icon">✅</span>
            <span class="alert-text">¡Acceso concedido! Redirigiendo...</span>
          </div>
        </form>
        
        <!-- Información de usuarios de prueba -->
        <div class="demo-info">
          <h4>👨‍💼 Usuarios de Prueba</h4>
          <div class="demo-users">
            <div class="demo-user">
              <strong>Operario:</strong>
              <span>Usuario: <code>operario</code> | Contraseña: <code>1234</code></span>
            </div>
            <div class="demo-user">
              <strong>Admin:</strong>
              <span>Usuario: <code>admin</code> | Contraseña: <code>1234</code></span>
            </div>
          </div>
        </div>
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
      padding: 1rem;
    }
    
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.6s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .login-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.4rem;
      color: #333;
      font-weight: 700;
    }
    
    .login-subtitle {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
      font-size: 0.9rem;
    }
    
    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .form-control.is-invalid {
      border-color: #dc3545;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }
    
    .btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 600;
      text-align: center;
      border: none;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-height: 48px;
    }
    
    .btn-primary {
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
    
    .btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none !important;
    }
    
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      border: 1px solid transparent;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .alert-success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }
    
    .alert-danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }
    
    .alert-icon {
      font-size: 1rem;
    }
    
    .alert-text {
      flex: 1;
    }
    
    .demo-info {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    
    .demo-info h4 {
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
      color: #495057;
      text-align: center;
    }
    
    .demo-users {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .demo-user {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
    }
    
    .demo-user strong {
      color: #495057;
    }
    
    .demo-user code {
      background: #e9ecef;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
    }
    
    /* Responsive */
    @media (max-width: 480px) {
      .login-container {
        padding: 0.5rem;
      }
      
      .login-card {
        padding: 1.5rem;
      }
      
      .login-title {
        font-size: 1.2rem;
      }
      
      .form-control {
        padding: 0.65rem 0.85rem;
        font-size: 0.9rem;
      }
      
      .btn {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }
      
      .demo-users {
        gap: 0.5rem;
      }
      
      .demo-user {
        font-size: 0.75rem;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = false;
  returnUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    // Obtener URL de retorno de los query parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/operator/dashboard';
    
    // Si ya está autenticado, redirigir
    if (this.authService.isLoggedIn()) {
      this.redirectUser();
    }
  }

  // Getter para acceder más fácilmente a los campos del formulario
  get f() { 
    return this.loginForm.controls; 
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = false;

    // Detener si el formulario es inválido
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    
    const credentials = {
      username: this.f['username'].value.trim(),
      password: this.f['password'].value
    };

    this.authService.login(credentials.username, credentials.password)
      .subscribe({
        next: (user) => {
          this.loading = false;
          this.success = true;
          
          console.log('Login exitoso:', user.nombre, '-', user.roles);
          
          // Pequeño delay para mostrar el mensaje de éxito
          setTimeout(() => {
            this.redirectUser(user.roles);
          }, 1000);
        },
        error: (error) => {
          this.loading = false;
          this.success = false;
          
          // Manejar diferentes tipos de errores
          if (error.message.includes('Credenciales inválidas')) {
            this.error = 'Usuario o contraseña incorrectos. Verifique sus datos e intente nuevamente.';
          } else if (error.message.includes('Error al iniciar sesión')) {
            this.error = 'Error de conexión. Verifique su conexión a internet e intente nuevamente.';
          } else {
            this.error = 'Ha ocurrido un error inesperado. Intente nuevamente en unos momentos.';
          }
          
          console.error('Error de login:', error);
        }
      });
  }

  /**
   * Redirigir usuario según su rol
   */
  private redirectUser(userRole?: string): void {
    const currentUser = this.authService.getCurrentUser();
    const role = userRole || currentUser?.roles;
    
    if (role === 'operario' || role === 'administrador') {
      // Si hay una URL de retorno específica, usarla
      if (this.returnUrl && this.returnUrl !== '/operator/dashboard') {
        this.router.navigate([this.returnUrl]);
      } else {
        this.router.navigate(['/operator/dashboard']);
      }
    } else {
      // Rol desconocido, redirigir al dashboard por defecto
      this.router.navigate(['/operator/dashboard']);
    }
  }

  /**
   * Limpiar formulario
   */
  clearForm(): void {
    this.loginForm.reset();
    this.submitted = false;
    this.error = '';
    this.success = false;
  }

  /**
   * Llenar formulario con credenciales de prueba
   */
  fillTestCredentials(userType: 'operario' | 'admin'): void {
    if (userType === 'operario') {
      this.loginForm.patchValue({
        username: 'operario',
        password: '1234'
      });
    } else {
      this.loginForm.patchValue({
        username: 'admin',
        password: '1234'
      });
    }
  }

  /**
   * Verificar si el campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  /**
   * Obtener mensaje de error específico del campo
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
    }
    
    return '';
  }

  /**
   * Obtener etiqueta del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'username': 'El usuario',
      'password': 'La contraseña'
    };
    
    return labels[fieldName] || fieldName;
  }
}
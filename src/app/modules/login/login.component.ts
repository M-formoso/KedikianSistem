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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
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
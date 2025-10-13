// src/app/modules/login/login.component.ts - CON MANEJO DE MENSAJES

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  info = ''; // ✅ NUEVO: Para mensajes informativos

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute, // ✅ NUEVO
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // ✅ NUEVO: Verificar si hay mensajes en los query params
    this.route.queryParams.subscribe(params => {
      if (params['reason'] && params['message']) {
        this.info = params['message'];
        
        // Limpiar mensaje después de 10 segundos
        setTimeout(() => {
          this.info = '';
        }, 10000);
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.info = ''; // Limpiar mensaje informativo

    const usernameFromForm = this.f['username'].value;
    const passwordFromForm = this.f['password'].value;

    console.log('🚀 Intentando login...');

    this.authService.login(usernameFromForm, passwordFromForm).subscribe({
      next: (response) => {
        console.log('✅ Respuesta de login recibida:', response);
        
        setTimeout(() => {
          const usuario = this.authService.obtenerUsuarioActual();
          
          if (!usuario) {
            console.error('❌ No se pudo obtener el usuario después del login');
            this.error = 'Error al cargar información del usuario';
            this.loading = false;
            return;
          }

          console.log('✅ Login exitoso');
          console.log('👤 Usuario:', usuario.nombre);
          console.log('📧 Email:', usuario.email);
          console.log('🎯 Roles desde backend:', usuario.roles);

          const mappedRoles = usuario.roles.map((rol: string) => {
            if (rol.toLowerCase() === 'user') return 'operario';
            if (rol.toLowerCase() === 'admin') return 'administrador';
            return rol.toLowerCase();
          });

          console.log('🎯 Roles mapeados:', mappedRoles);

          this.loading = false;

          // Redirigir según el rol
          if (mappedRoles.includes('administrador') || mappedRoles.includes('admin')) {
            console.log('✅ Administrador detectado, redirigiendo...');
            this.router.navigate(['/operator/dashboard']);
          } else if (mappedRoles.includes('operario')) {
            console.log('✅ Operario detectado, redirigiendo...');
            this.router.navigate(['/operator/dashboard']);
          } else {
            console.error('❌ Rol no reconocido:', mappedRoles);
            this.error = 'Usuario sin rol válido.';
          }
        }, 500);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        console.error('❌ Error en login - Status:', error.status);
        console.error('❌ Error completo:', error);

        if (error.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.error = 'Error de conexión. Verifique su conexión a internet.';
        } else if (error.status >= 500) {
          this.error = 'Error en el servidor. Intente nuevamente.';
        } else {
          this.error = error.error?.detail || 'Error de autenticación. Intente nuevamente.';
        }
      },
    });
  }
}
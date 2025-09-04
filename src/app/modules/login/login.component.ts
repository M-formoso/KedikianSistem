import { Component } from '@angular/core';
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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
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

    const usernameFromForm = this.f['username'].value;
    const passwordFromForm = this.f['password'].value;

    this.authService.login(usernameFromForm, passwordFromForm).subscribe({
      next: (usuario: Usuario) => {
        this.loading = false;
        console.log('✅ Login exitoso');
        console.log('👤 Usuario:', usuario.nombreUsuario);
        console.log('🎯 Roles desde backend:', usuario.roles);

        // 🔹 Mapear roles del backend a los de Angular
        const mappedRoles = usuario.roles.map((rol) => {
          if (rol.toLowerCase() === 'user') return 'operario';
          if (rol.toLowerCase() === 'admin') return 'administrador';
          return rol.toLowerCase();
        });

        console.log('🎯 Roles mapeados:', mappedRoles);

        if (mappedRoles.includes('administrador')) {
          console.log('✅ Administrador detectado, redirigiendo...');
          this.router.navigate(['/operator/dashboard']);
        } else if (mappedRoles.includes('operario')) {
          console.log('✅ Operario detectado, redirigiendo...');
          this.router.navigate(['/operator/dashboard']);
        } else {
          console.error('❌ Rol no reconocido:', mappedRoles);
          this.error = 'Usuario sin rol válido.';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        console.error('❌ Error en login - Status:', error.status);

        if (error.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.error = 'Error de conexión. Verifique su conexión a internet.';
        } else if (error.status >= 500) {
          this.error = 'Error en el servidor. Intente nuevamente.';
        } else {
          this.error = 'Error de autenticación. Intente nuevamente.';
        }
      },
    });
  }
}
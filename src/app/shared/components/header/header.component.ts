import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, Usuario } from '../../../core/auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-content">
        <div class="header-title">
          <h1>Sistema de Retroexcavadoras y Áridos</h1>
        </div>
        <div class="user-info" *ngIf="currentUser">
          <span class="username">{{ currentUser.nombreUsuario }}</span>
          <span class="user-role">{{ currentUser.rol === 'operario' ? 'Operario' : 'Administrador' }}</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 60px;
      background-color: #ffffff;
      border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      position: fixed;
      top: 0;
      left: 250px; /* Ancho del sidebar */
      right: 0;
      z-index: 100;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 0 2rem;
    }
    .header-title h1 {
      margin: 0;
      font-size: 1.25rem;
      color: #333;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .username {
      font-weight: 500;
      color: #333;
    }
    .user-role {
      font-size: 0.85rem;
      color: #6c757d;
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: Usuario | null = null;
  private subscription: Subscription = new Subscription();
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }
  
  ngOnDestroy(): void {
    // Limpieza de suscripciones para evitar memory leaks
    this.subscription.unsubscribe();
  }
}
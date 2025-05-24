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
      right: 0;
      z-index: 100;
      transition: left 0.3s ease;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 0 1rem;
    }
    
    .header-title h1 {
      margin: 0;
      font-size: 1.25rem;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-left: 1rem;
    }
    
    .username {
      font-weight: 500;
      color: #333;
    }
    
    .user-role {
      font-size: 0.85rem;
      color: #6c757d;
    }
    
    /* Estilos responsive */
    @media (min-width: 769px) {
      .header {
        left: 250px; /* Ancho del sidebar en desktop */
      }
      
      .header-content {
        padding: 0 2rem;
      }
    }
    
    @media (max-width: 768px) {
      .header {
        left: 0; /* Sin sidebar en móvil */
        padding-left: 4rem; /* Espacio para el botón hamburguesa */
      }
      
      .header-title h1 {
        font-size: 1rem;
      }
      
      .user-info {
        max-width: 120px;
      }
      
      .username, .user-role {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
    }
    
    @media (max-width: 480px) {
      .header-content {
        padding: 0 0.5rem;
      }
      
      .user-info {
        max-width: 100px;
      }
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
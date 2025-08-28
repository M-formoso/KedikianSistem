import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, Usuario } from '../../../core/services/auth.service';
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
          <div class="user-details">
            <span class="username">{{ currentUser.nombre }}</span>
            <span class="user-role">{{ getRoleName(currentUser.roles) }}</span>
          </div>
          <div class="user-actions">
            <button class="logout-btn" (click)="logout()" title="Cerrar sesión">
              🚪
            </button>
          </div>
        </div>
        <div class="loading-info" *ngIf="!currentUser && !isLoaded">
          <span class="loading-text">Cargando...</span>
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
      font-weight: 600;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-left: 1rem;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .username {
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }
    
    .user-role {
      font-size: 0.8rem;
      color: #6c757d;
      text-transform: uppercase;
      font-weight: 500;
    }
    
    .user-actions {
      display: flex;
      align-items: center;
    }
    
    .logout-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: all 0.2s ease;
      color: #6c757d;
    }
    
    .logout-btn:hover {
      background-color: #f8f9fa;
      color: #dc3545;
      transform: scale(1.1);
    }
    
    .loading-info {
      display: flex;
      align-items: center;
      margin-left: 1rem;
    }
    
    .loading-text {
      font-size: 0.9rem;
      color: #6c757d;
      font-style: italic;
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
        max-width: 140px;
        gap: 0.5rem;
      }
      
      .user-details {
        max-width: 100px;
      }
      
      .username, .user-role {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      
      .username {
        font-size: 0.85rem;
      }
      
      .user-role {
        font-size: 0.75rem;
      }
      
      .logout-btn {
        font-size: 1rem;
        padding: 0.25rem;
      }
    }
    
    @media (max-width: 480px) {
      .header-content {
        padding: 0 0.5rem;
      }
      
      .header-title h1 {
        font-size: 0.9rem;
        max-width: 150px;
      }
      
      .user-info {
        max-width: 120px;
        gap: 0.25rem;
      }
      
      .user-details {
        max-width: 80px;
      }
      
      .username {
        font-size: 0.8rem;
      }
      
      .user-role {
        font-size: 0.7rem;
      }
      
      .logout-btn {
        font-size: 0.9rem;
        padding: 0.2rem;
      }
    }
    
    /* Animaciones */
    .user-info {
      animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    /* Estados adicionales */
    .header.no-user .header-title h1 {
      text-align: center;
      width: 100%;
    }
    
    /* Mejorar accesibilidad */
    .logout-btn:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: Usuario | null = null;
  isLoaded = false;
  private subscription: Subscription = new Subscription();
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(user => {
        this.currentUser = user;
        this.isLoaded = true;
        
        if (user) {
          console.log('Usuario cargado en header:', user.nombre, '-', user.roles);
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  /**
   * Obtener nombre del rol en español
   */
  getRoleName(roles: string[] | string): string {
    if (!roles || (Array.isArray(roles) && roles.length === 0)) {
      return 'Sin rol';
    }
    const rol = Array.isArray(roles) ? roles[0] : roles;

    const rolesMap: { [key: string]: string } = {
      'operario': 'Operario',
      'administrador': 'Administrador',
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'gerente': 'Gerente'
    };
    
    return rolesMap[rol.toLowerCase()] || rol;
  }
  
  logout(): void {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
      this.authService.cerrarSesion();
    }
  }
  
  getUserInitials(): string {
    if (!this.currentUser || !this.currentUser.nombre) {
      return 'U';
    }
    const names = this.currentUser.nombre.split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : this.currentUser.nombre[0].toUpperCase();
  }
  
  getUserTooltip(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.nombre}\n${this.currentUser.email}\n${this.getRoleName(this.currentUser.roles)}`;
  }
  
  isAdmin(): boolean {
    return this.authService.esAdministrador();
  }
  
  isOperator(): boolean {
    return this.authService.esOperario();
  }
  
  getRoleClass(): string {
    if (!this.currentUser || !this.currentUser.roles || this.currentUser.roles.length === 0) {
      return 'role-default';
    }
    const rol = Array.isArray(this.currentUser.roles) ? this.currentUser.roles[0] : this.currentUser.roles;
    
    const roleClasses: { [key: string]: string } = {
      'operario': 'role-operator',
      'administrador': 'role-admin',
      'admin': 'role-admin',
      'supervisor': 'role-supervisor'
    };
    
    return roleClasses[rol.toLowerCase()] || 'role-default';
  }
  
  onUserClick(): void {
    console.log('User clicked:', this.currentUser);
  }
}

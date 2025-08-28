import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Botón hamburguesa - solo visible en móviles -->
    <button class="hamburger-button" (click)="toggleSidebar()" *ngIf="isMobile">
      <span class="hamburger-icon">☰</span>
    </button>
    
    <!-- Overlay para cuando el sidebar está abierto en móviles -->
    <div class="sidebar-overlay" *ngIf="isMobile && isMenuOpen" (click)="closeSidebar()"></div>
    
    <div class="sidebar" [class.mobile-sidebar]="isMobile" [class.open]="!isMobile || isMenuOpen">
      <div class="sidebar-header">
        <h3>Panel de Operario</h3>
        <button class="close-button" *ngIf="isMobile" (click)="closeSidebar()">✕</button>
      </div>
      <nav class="sidebar-nav">
        <ul>
          <li>
            <a routerLink="/operator/dashboard" routerLinkActive="active" (click)="handleNavClick()">
              <span class="icon">📊</span>Inicio
            </a>
          </li>
          <li>
            <a routerLink="/operator/work-hours" routerLinkActive="active" (click)="handleNavClick()">
              <span class="icon">⏱️</span>Registro Jornada Laboral
            </a>
          </li>
          <li>
            <a routerLink="/operator/machine-hours" routerLinkActive="active" (click)="handleNavClick()">
              <span class="icon">🚜</span>Registro Horas Máquina
            </a>
          </li>
          <li>
            <a routerLink="/operator/entrega-aridos" routerLinkActive="active" (click)="handleNavClick()">
              <span class="icon">🏗️</span>Registro Entrega de Áridos
            </a>
          </li>
          <li>
            <a routerLink="/operator/registro-gastos" routerLinkActive="active" (click)="handleNavClick()">
              <span class="icon">💰</span>Registro de Gastos
            </a>
          </li>
          <li class="logout-item">
            <a (click)="logout()" class="logout-link">
              <span class="icon">🚪</span>Cerrar Sesión
            </a>
          </li>
        </ul>
      </nav>
    </div>
  `,
  styles: [`
    /* Estilos compartidos para desktop y móvil */
    .sidebar {
      width: 250px;
      height: 100vh;
      background-color: #343a40;
      color: #fff;
      position: fixed;
      left: 0;
      top: 0;
      overflow-y: auto;
      z-index: 1000;
      transition: transform 0.3s ease;
    }

    .sidebar-header {
      padding: 1.5rem 1rem;
      border-bottom: 1px solid #495057;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    .sidebar-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar-nav li {
      margin: 0;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      padding: 1rem;
      color: #ced4da;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .sidebar-nav a:hover {
      background-color: #495057;
      color: #fff;
    }

    .sidebar-nav a.active {
      background-color: #007bff;
      color: #fff;
    }

    .icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }

    .logout-item {
      margin-top: auto;
      border-top: 1px solid #495057;
    }

    .logout-link {
      cursor: pointer;
    }

    /* Estilos para la versión móvil */
    .hamburger-button {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 999;
      background-color: #343a40;
      color: #fff;
      border: none;
      border-radius: 5px;
      padding: 8px 12px;
      font-size: 1.5rem;
      cursor: pointer;
      display: none;
    }

    .close-button {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 5px;
      display: none;
    }

    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    /* Estilos para la versión móvil */
    .mobile-sidebar {
      transform: translateX(-100%);
      width: 80%;
      max-width: 300px;
    }

    .mobile-sidebar.open {
      transform: translateX(0);
    }

    /* Solo mostrar botones en versión móvil */
    @media (max-width: 768px) {
      .hamburger-button {
        display: block;
      }

      .close-button {
        display: block;
      }
    }
  `]
})
export class SidebarComponent {
  isMenuOpen: boolean = false;
  isMobile: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Comprobar el tamaño inicial de la pantalla
    this.checkScreenSize();
  }

  // Detectar cambios en el tamaño de la pantalla
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  // Comprobar si estamos en móvil o desktop
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    // Si pasamos de móvil a desktop, asegurarse de que el menú esté abierto
    if (!this.isMobile) {
      this.isMenuOpen = true;
    } else {
      this.isMenuOpen = false;
    }
  }

  // Alternar la visibilidad del sidebar
  toggleSidebar(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // Cerrar el sidebar
  closeSidebar(): void {
    if (this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  // Manejar el clic de navegación (cerrar el sidebar en móviles)
  handleNavClick(): void {
    if (this.isMobile) {
      this.closeSidebar();
    }
  }

  logout(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
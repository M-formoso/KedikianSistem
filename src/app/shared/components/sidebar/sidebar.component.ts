import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Panel de Operario</h3>
      </div>
      <nav class="sidebar-nav">
        <ul>
          <li>
            <a routerLink="/operator/dashboard" routerLinkActive="active">
              <span class="icon">📊</span>Dashboard
            </a>
          </li>
          <li>
            <a routerLink="/operator/work-hours" routerLinkActive="active">
              <span class="icon">⏱️</span>Registro Jornada Laboral
            </a>
          </li>
          <li>
            <a routerLink="/operator/machine-hours" routerLinkActive="active">
              <span class="icon">🚜</span>Registro Horas Máquina
            </a>
          </li>
          <li>
            <a routerLink="/operator/aggregates" routerLinkActive="active">
              <span class="icon">🏗️</span>Registro Entrega de Áridos
            </a>
          </li>
          <li>
            <a routerLink="/operator/expenses" routerLinkActive="active">
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
    .sidebar {
      width: 250px;
      height: 100vh;
      background-color: #343a40;
      color: #fff;
      position: fixed;
      left: 0;
      top: 0;
      overflow-y: auto;
    }
    .sidebar-header {
      padding: 1.5rem 1rem;
      border-bottom: 1px solid #495057;
    }
    .sidebar-header h3 {
      margin: 0;
      font-size: 1.25rem;
      text-align: center;
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
  `]
})
export class SidebarComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
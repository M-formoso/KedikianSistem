import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './modules/auth/login.component';
import { operatorRoutes } from './modules/operator/operator.routes'; // ✅ importar rutas hijas

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'operator',
    children: operatorRoutes, // ✅ usar las rutas importadas
  }
];

export const appRouterProviders = provideRouter(routes);

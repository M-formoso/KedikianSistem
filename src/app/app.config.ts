import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRouterProviders } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { DebugService } from './core/services/debug.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([AuthInterceptor])), // ✅ Interceptor corregido
    appRouterProviders,
    DebugService, // ✅ Servicio de debug añadido
  ]
};
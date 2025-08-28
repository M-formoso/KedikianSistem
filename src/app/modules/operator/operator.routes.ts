import { Routes } from '@angular/router';
import { OperatorLayoutComponent } from './operator-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { WorkHoursComponent } from './work-hours/work-hours.component';
import { MachineHoursComponent} from './machine-hours/machine-hours.component';  
import { EntregaAridosComponent } from './entrega-aridos/entrega-aridos.component';
import { RegistroGastosComponent } from './registro-gastos/registro-gastos.component';
import { AuthRoleGuard } from '../../core/guards/auth-role.guard';
export const operatorRoutes: Routes = [
  {
    path: '',
    component: OperatorLayoutComponent,
    canActivate: [AuthRoleGuard]
, // ✅ Proteger todas las rutas del operario
    data: { role: 'operario' }, // ✅ Especificar que requiere rol de operario
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { 
          title: 'Panel Principal',
          description: 'Resumen de actividades y accesos rápidos'
        }
      },
      {
        path: 'work-hours',
        component: WorkHoursComponent,
        data: { 
          title: 'Registro Jornada Laboral',
          description: 'Fichar entrada y salida, gestionar horas de trabajo'
        }
      },
      {
        path: 'machine-hours',
        component: MachineHoursComponent,
        data: { 
          title: 'Registro Horas Máquina',
          description: 'Controlar horas de uso de maquinaria pesada'
        }
      },
      {
        path: 'entrega-aridos',
        component: EntregaAridosComponent,
        data: { 
          title: 'Entrega de Áridos',
          description: 'Registrar entregas de materiales de construcción'
        }
      },
      {
        path: 'registro-gastos',
        component: RegistroGastosComponent,
        data: { 
          title: 'Registro de Gastos',
          description: 'Documentar gastos operativos y administrativos'
        }
      },
      // ✅ Ruta de fallback para rutas no encontradas dentro del módulo operario
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];
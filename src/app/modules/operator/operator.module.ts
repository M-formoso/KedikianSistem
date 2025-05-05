import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorLayoutComponent } from './operator-layout.component';
import { WorkHoursComponent } from './work-hours/work-hours.component';
import { OperatorRoutingModule } from './operator-routing.module';

@NgModule({
  declarations: [
    OperatorLayoutComponent
  ],
  imports: [
    CommonModule,
    OperatorRoutingModule,
    WorkHoursComponent  // ✅ se importa aquí, no en declarations
  ]
})
export class OperatorModule {}

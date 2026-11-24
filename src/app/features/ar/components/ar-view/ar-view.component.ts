import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ArViewComponent — RA-PBI-03
 *
 * ESTADO: Placeholder — pendiente de migración validada.
 * Ver: docs/pbi-03-auditoria-migracion.md para el plan completo.
 *
 * Problema documentado: A-Frame + AR.js no se integra directamente en
 * un componente Angular standalone sin romper responsive, cámara o
 * el render loop de WebGL. Se requiere una de las estrategias
 * documentadas en la auditoría antes de implementar.
 */
@Component({
  selector: 'app-ar-view',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="ar-placeholder">
      <p>⚠️ Integración AR pendiente — ver auditoría</p>
      <small>RA-PBI-03 · docs/pbi-03-auditoria-migracion.md</small>
    </div>
  `,
  styles: [`
    .ar-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #fff;
      font-family: sans-serif;
      gap: 8px;
      background: #1a1a1a;
    }
  `]
})
export class ArViewComponent {}

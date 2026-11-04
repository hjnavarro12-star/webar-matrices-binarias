import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ArViewComponent — RA-PBI-03 (Yeison)
 * Placeholder hasta que Yeison implemente la integración A-Frame + AR.js.
 * El POC HTML puro está en: src/app/features/ar/poc/index.html
 */
@Component({
  selector: 'app-ar-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ar-placeholder">
      <p>🎯 Vista AR — próximamente</p>
      <small>RA-PBI-03 · Yeison</small>
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
    }
  `],
})
export class ArViewComponent {}

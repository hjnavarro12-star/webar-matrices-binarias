import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * ArViewComponent — RA-PBI-03
 * Wrapper mínimo de Angular para la escena AR.js que funciona en el POC.
 * No interfiere con A-Frame, solo lo contiene.
 */
@Component({
  selector: 'app-ar-view',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div id="info">Apunta al marcador de un salon</div>
    
    <a-scene embedded arjs vr-mode-ui="enabled: false">
      <!-- Piso 1 -->
      <a-marker type="pattern" url="assets/markers/pattern-101.patt">
        <a-text value="Salon 101" position="0 0.5 0" align="center" color="#0a709c" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-102.patt">
        <a-text value="Salon 102" position="0 0.5 0" align="center" color="#0a709c" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-103.patt">
        <a-text value="Salon 103" position="0 0.5 0" align="center" color="#0a709c" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-104.patt">
        <a-text value="Salon 104" position="0 0.5 0" align="center" color="#0a709c" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-105.patt">
        <a-text value="Salon 105" position="0 0.5 0" align="center" color="#0a709c" scale="2 2 2"></a-text>
      </a-marker>
      
      <!-- Piso 2 -->
      <a-marker type="pattern" url="assets/markers/pattern-201.patt">
        <a-text value="Salon 201" position="0 0.5 0" align="center" color="#e8c843" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-202.patt">
        <a-text value="Salon 202" position="0 0.5 0" align="center" color="#e8c843" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-203.patt">
        <a-text value="Salon 203" position="0 0.5 0" align="center" color="#e8c843" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-204.patt">
        <a-text value="Salon 204" position="0 0.5 0" align="center" color="#e8c843" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-205.patt">
        <a-text value="Salon 205" position="0 0.5 0" align="center" color="#e8c843" scale="2 2 2"></a-text>
      </a-marker>
      
      <!-- Piso 3 -->
      <a-marker type="pattern" url="assets/markers/pattern-301.patt">
        <a-text value="Salon 301" position="0 0.5 0" align="center" color="#ffffff" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-302.patt">
        <a-text value="Salon 302" position="0 0.5 0" align="center" color="#ffffff" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-303.patt">
        <a-text value="Salon 303" position="0 0.5 0" align="center" color="#ffffff" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-304.patt">
        <a-text value="Salon 304" position="0 0.5 0" align="center" color="#ffffff" scale="2 2 2"></a-text>
      </a-marker>
      <a-marker type="pattern" url="assets/markers/pattern-305.patt">
        <a-text value="Salon 305" position="0 0.5 0" align="center" color="#ffffff" scale="2 2 2"></a-text>
      </a-marker>
      
      <a-entity camera></a-entity>
    </a-scene>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
    }
    
    #info {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 16px;
      z-index: 9999;
      text-align: center;
      max-width: 90vw;
    }
  `]
})
export class ArViewComponent {}

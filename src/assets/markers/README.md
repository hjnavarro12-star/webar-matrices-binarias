# Marcadores Barcode para impresión

Este directorio almacena los SVG/PNG de los marcadores Barcode que se pegarán en las puertas de los salones.

## Fuente

Descargar de: https://github.com/nicolocarpignoli/artoolkit-barcode-markers-collection

Carpeta a usar: `3x3_HAMMING63/`

## Marcadores asignados (a definir en Sprint RA-2)

| Archivo | Valor Barcode | Salón | Bloque |
|---------|--------------|-------|--------|
| marker-1.svg | 1 | — | — |
| marker-2.svg | 2 | — | — |
| marker-3.svg | 3 | — | — |
| marker-4.svg | 4 | — | — |
| marker-5.svg | 5 | — | — |

> Completar esta tabla en RA-PBI-11 (seed de salones en BD) cuando se asignen los salones del bloque demo.

## Instrucciones de impresión

- Tamaño: 15×15 cm mínimo (para detectar hasta 2.5 m de distancia)
- Papel: bond o fotográfico
- Color: blanco/negro, sin escala de grises
- Protección: laminar con plástico adhesivo transparente
- Respaldo: imprimir 2 copias de cada marcador

## Configuración AR.js

```javascript
arjs="detectionMode: mono_and_matrix; matrixCodeType: 3x3_HAMMING63;"
```

```html
<a-marker type="barcode" value="1">
  <!-- contenido 3D aquí -->
</a-marker>
```

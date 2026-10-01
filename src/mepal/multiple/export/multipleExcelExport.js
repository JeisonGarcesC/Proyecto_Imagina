import { createMultipleCommercialSummary } from '../quotation/multipleCommercialSummary.js';

export function createMultipleExcelData(product) {
  const summary = createMultipleCommercialSummary(product);
  return { filename: `MULTIPLE_${summary.configuration.width}x${summary.configuration.height}.xlsx`, sheets: [
    { name: 'Resumen', rows: [
      ['Producto', summary.product], ['Ancho (cm)', summary.configuration.width], ['Altura (cm)', summary.configuration.height],
      ['Espesor (cm)', summary.configuration.thickness], ['Subtotal', summary.totals.subtotal], ['Total', summary.totals.total], ['Moneda', summary.totals.currency],
    ] },
    { name: 'Componentes', columns: ['Código', 'Referencia', 'Descripción', 'Material', 'Acabado', 'Cantidad', 'Precio', 'Subtotal'],
      rows: summary.components.map((item) => [item.codigoPT, item.referencia, item.descripcion, item.material, item.acabado, item.cantidad, item.precio, item.subtotal]) },
  ], status: summary.status };
}

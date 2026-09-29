import { createMultipleCommercialSummary } from '../quotation/multipleCommercialSummary.js';
import MultiplePreviewPanel from './MultiplePreviewPanel.jsx';

const money = (value, currency) => value == null ? 'Pendiente' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency || 'COP', maximumFractionDigits: 0 }).format(value);
export default function MultipleQuotationPanel({ product, mode = 'SUMMARY' }) {
  if (!product) return <div>La configuración actual no es válida.</div>;
  const summary = createMultipleCommercialSummary(product);
  return <div style={{ display: 'grid', gap: 10 }}><h4 style={{ margin: 0 }}>{mode === 'QUOTATION' ? 'Cotización MULTIPLE' : 'Resumen comercial'}</h4>
    <div style={{ fontSize: 12 }}>Panel {summary.configuration.width} × {summary.configuration.height} × {summary.configuration.thickness} cm</div>
    <MultiplePreviewPanel product={product}/>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}><thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Precio</th></tr></thead><tbody>{summary.components.map((item, index) => <tr key={`${item.codigoPT || 'pending'}-${index}`}><td>{item.codigoPT || 'Pendiente'}</td><td>{item.descripcion}</td><td>{item.cantidad}</td><td>{money(item.precio, summary.totals.currency)}</td></tr>)}</tbody></table></div>
    <div><b>Subtotal:</b> {money(summary.totals.subtotal, summary.totals.currency)}<br/><b>Total:</b> {money(summary.totals.total, summary.totals.currency)}</div>
    <div style={{ color: summary.status.complete ? '#18794e' : '#9a6700', fontSize: 12 }}>{summary.status.complete ? '✓ Lista para cotizar' : `⚠ Información incompleta · ${summary.status.reasons.join(' · ')}`}</div>
  </div>;
}

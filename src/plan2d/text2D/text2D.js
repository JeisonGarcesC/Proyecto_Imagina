export const TEXT_2D_DEFAULT_STYLE = Object.freeze({
  color: '#000000',
  fontSize: 0.2,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  align: 'left',
});

const FONT_FAMILIES = new Set(['Arial', 'Helvetica', 'sans-serif', 'monospace']);
const ALIGNMENTS = new Set(['left', 'center', 'right']);

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} debe ser un número finito.`);
  return number;
}

export function normalizeTextStyle2D(style = {}) {
  const fontSize = finite(style.fontSize ?? TEXT_2D_DEFAULT_STYLE.fontSize, 'style.fontSize');
  if (fontSize <= 0) throw new RangeError('style.fontSize debe ser mayor que cero.');
  return {
    color: /^#[0-9a-f]{6}$/i.test(style.color || '')
      ? style.color.toUpperCase()
      : TEXT_2D_DEFAULT_STYLE.color,
    fontSize,
    fontFamily: FONT_FAMILIES.has(style.fontFamily)
      ? style.fontFamily
      : TEXT_2D_DEFAULT_STYLE.fontFamily,
    fontWeight: style.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
    align: ALIGNMENTS.has(style.align) ? style.align : TEXT_2D_DEFAULT_STYLE.align,
  };
}

export function createText2D({ id, geometry, text = 'Texto', style, visible = true } = {}) {
  return {
    id,
    type: 'text',
    semanticType: 'text',
    geometry: {
      x: finite(geometry?.x, 'geometry.x'),
      y: finite(geometry?.y, 'geometry.y'),
      rotation: finite(geometry?.rotation ?? 0, 'geometry.rotation'),
    },
    text: String(text),
    style: normalizeTextStyle2D(style),
    visible: visible !== false,
  };
}


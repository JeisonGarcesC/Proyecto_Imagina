import { VETRO_PANEL_WIDTHS, VETRO_PANEL_HEIGHTS_CM } from '../catalog/panelCatalog.js';

export function resolveVetroPanelSize(config = {}) {
  const specialWidthMm = config.specialWidthMm == null ? null : Number(config.specialWidthMm);
  const specialHeightMm = config.specialHeightMm == null ? null : Number(config.specialHeightMm);
  const special = specialWidthMm != null || specialHeightMm != null;
  const width = specialWidthMm == null
    ? VETRO_PANEL_WIDTHS.find((item) => item.nominalCm === Number(config.nominalWidthCm))
    : VETRO_PANEL_WIDTHS.find((item) => item.realCm * 10 >= specialWidthMm);
  const nominalHeightCm = specialHeightMm == null
    ? Number(config.nominalHeightCm)
    : VETRO_PANEL_HEIGHTS_CM.find((value) => value * 10 >= specialHeightMm);
  const realWidthMm = specialWidthMm ?? (width?.realCm ?? NaN) * 10;
  const projectHeightMm = specialHeightMm ?? nominalHeightCm * 10;
  const valid = (!special || config.material === 'TEMPERED_GLASS_10MM') &&
    !!width && VETRO_PANEL_HEIGHTS_CM.includes(nominalHeightCm) &&
    Number.isFinite(realWidthMm) && realWidthMm >= 297 &&
    Number.isFinite(projectHeightMm) && projectHeightMm >= 2040 && projectHeightMm <= 3180;
  return {
    valid, special, specialWidth: specialWidthMm != null, specialHeight: specialHeightMm != null,
    nominalWidthCm: width?.nominalCm ?? null, nominalHeightCm: valid ? nominalHeightCm : null,
    realWidthMm: valid ? realWidthMm : null, projectHeightMm: valid ? projectHeightMm : null,
    billingBasis: special ? 'NEXT_COMMERCIAL_NOMINAL' : 'EXACT_COMMERCIAL',
  };
}

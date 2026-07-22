import { useEffect, useMemo, useState } from 'react';
import { loadTipologiasDetalle } from '../services/tipologiasDetalle';
import {
  loadChairsPriceList,
  loadChairsCategoryMap,
  loadCategoriasSillas,
} from '../services/chairsLoader';
import { loadAresItems } from '../services/aresLoader';
import { loadPlantsItems } from '../services/plantsLoader';
import { loadOfficeAccessoriesItems } from '../services/officeAccessoriesLoader';
import { loadMepalSaludItems } from '../services/mepalSaludLoader';
import { loadMepalTekSocialItems } from '../services/mepalTekSocialLoader';
import { loadClakItems } from '../services/clakLoader';
import { loadEdukItems } from '../services/edukLoader';
import './LeftPanel.css';

import KoncisaPlusPanel from './KoncisaPlusPanel';
import { createKoncisaPlusInstance } from '../koncisaPlus/createKoncisaPlusInstance';
import {
  getClakVariantOptionsByCode,
  normalizeClakPuffCode,
  getSeatVariantByCode,
  getModuleVariantByCode,
} from './properties/clakPuffVariants';

const TYPOLOGY_IMAGE_EXTENSIONS = ['png', 'jpeg', 'jpg', 'webp'];
const typologyImageCache = new Map();

function buildCardImageCandidates(assetName) {
  const code = String(assetName || '').trim();
  if (!code) return [];
  return TYPOLOGY_IMAGE_EXTENSIONS.map((ext) => `/assets/imagen/${code}.${ext}`);
}

function CardImage({
  assetName,
  title,
  imageFit = 'cover',
  imageHeight = 96,
  imagePadding = 0,
  imageBackground = '#ffffff',
}) {
  const cacheKey = String(assetName || '').trim();
  const candidates = useMemo(() => buildCardImageCandidates(assetName), [assetName]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [resolvedImage, setResolvedImage] = useState(() => {
    if (!cacheKey) return null;
    return typologyImageCache.has(cacheKey)
      ? typologyImageCache.get(cacheKey)
      : candidates[0] || null;
  });

  if (!resolvedImage) return null;

  const handleLoad = () => {
    if (cacheKey) typologyImageCache.set(cacheKey, resolvedImage);
  };

  const handleError = () => {
    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
      setResolvedImage(candidates[nextIndex]);
      return;
    }

    if (cacheKey) typologyImageCache.set(cacheKey, null);
    setResolvedImage(null);
  };

  return (
    <div
      style={{
        width: '100%',
        height: imageHeight,
        overflow: 'hidden',
        borderRadius: 8,
        marginBottom: 6,
        background: imageBackground,
        padding: imagePadding,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={resolvedImage}
        alt={title || assetName}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: imageFit,
          objectPosition: 'center',
          display: 'block',
        }}
      />
    </div>
  );
}

function TypologyCardImage({ codigoPT, title }) {
  return <CardImage assetName={codigoPT} title={title} />;
}

function ChairCardImage({ codigoPT, title }) {
  return (
    <CardImage
      assetName={codigoPT}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function PlantCardImage({ plantName, title }) {
  return (
    <CardImage
      assetName={plantName}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function OfficeAccessoryCardImage({ accessoryName, title }) {
  return (
    <CardImage
      assetName={accessoryName}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function MepalSaludCardImage({ codigo, title }) {
  return (
    <CardImage
      assetName={codigo}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function MepalTekSocialCardImage({ codigo, title }) {
  return (
    <CardImage
      assetName={codigo}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function ClakCardImage({ codigo, title }) {
  return (
    <CardImage
      assetName={codigo}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function StorageCardImage({ codeBase, title }) {
  return (
    <CardImage
      assetName={codeBase}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function EdukCardImage({ codigo, title }) {
  return (
    <CardImage
      assetName={codigo}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

export default function LeftPanel({
  section,
  threeApiRef,
  readOnly,
  // datos
  catalogItems,
  country,
  categoriaTipologiaId,
  profundidadFilter,
  setProfundidadFilter,
  longitudFilter,
  setLongitudFilter,
  espesorFilter,
  setEspesorFilter,
  materials, // 👈 nuevo
  selectedPart,
  onApplyGlobalMaterial,
  onAddCatalogItem,
  onAddTypology,
  onAddChair,
  onAddAres,
  onAddPlant,
  onAddOfficeAccessory,
  onAddMepalSalud,
  onAddMepalTekSocial,
  onAddClak,
  onAddEduk,
  onToggleSnap,
  // muros
  wallMode,
  setWallMode,
  wallHeight,
  setWallHeight,
  wallThickness,
  setWallThickness,
  onClearWalls,
  onUndoLastWall,
  // otros
  Plan2DUploader,
  handleLoadPlan2D,
  plan2DVisible,
  setPlan2DVisible,
  setSurfaceOpen,
}) {
  const [qCatalog, setQCatalog] = useState('');
  const [qTyp, setQTyp] = useState('');
  const [tipologias, setTipologias] = useState([]);

  const [qChairs, setQChairs] = useState('');
  const [chairs, setChairs] = useState([]);
  const [categoriasSillas, setCategoriasSillas] = useState([]);
  const [categoriaSillaFilter, setCategoriaSillaFilter] = useState('');
  const [subcategoriaSillaFilter, setSubcategoriaSillaFilter] = useState('');
  const [subcategoriasSillasByCategoria, setSubcategoriasSillasByCategoria] = useState({});
  const [subcategoriasSillasGlobalCountByCategoria, setSubcategoriasSillasGlobalCountByCategoria] =
    useState({});

  // Ares states
  const [qAres, setQAres] = useState('');
  const [aresItems, setAresItems] = useState([]);
  const [aresReady, setAresReady] = useState(false);

  // PLANTS AND FLOWERS states
  const [qPlants, setQPlants] = useState('');
  const [plantsItems, setPlantsItems] = useState([]);
  const [plantsReady, setPlantsReady] = useState(false);

  // OFFICE ACCESORIES states
  const [qOfficeAccesories, setQOfficeAccesories] = useState('');
  const [officeAccessoriesItems, setOfficeAccessoriesItems] = useState([]);
  const [officeAccessoriesReady, setOfficeAccessoriesReady] = useState(false);

  // MEPAL SALUD states
  const [qMepalSalud, setQMepalSalud] = useState('');
  const [mepalSaludItems, setMepalSaludItems] = useState([]);
  const [mepalSaludReady, setMepalSaludReady] = useState(false);

  // MEPAL TEK SOCIAL states
  const [qMepalTekSocial, setQMepalTekSocial] = useState('');
  const [mepalTekSocialItems, setMepalTekSocialItems] = useState([]);
  const [mepalTekSocialReady, setMepalTekSocialReady] = useState(false);

  // CLAK states
  const [qClak, setQClak] = useState('');
  const [clakItems, setClakItems] = useState([]);
  const [clakReady, setClakReady] = useState(false);
  const [showClakVariants, setShowClakVariants] = useState(false);

  // EDUK states
  const [qEduk, setQEduk] = useState('');
  const [edukItems, setEdukItems] = useState([]);
  const [edukReady, setEdukReady] = useState(false);

  // ZEN ALMACENAMIENTO states
  const [qAlmacen, setQAlmacen] = useState('');
  const [almacenItems, setAlmacenItems] = useState([]);
  const [almacenReady, setAlmacenReady] = useState(false);
  const [almacenCategoryFilter, setAlmacenCategoryFilter] = useState('');
  const [almacenVariantsMap, setAlmacenVariantsMap] = useState(new Map());

  //Materiales genericos
  const [qMaterials, setQMaterials] = useState('');
  const [applyScope, setApplyScope] = useState('PART');

  const materialsFiltered = useMemo(() => {
    const q = String(qMaterials || '')
      .trim()
      .toLowerCase();
    if (!q) return materials || [];

    return (materials || []).filter((m) => {
      const code = String(m?.code ?? '').toLowerCase();
      const name = String(m?.name ?? '').toLowerCase();
      const shortName = String(m?.shortName ?? '').toLowerCase();
      const groupCode = String(m?.groupCode ?? '').toLowerCase();
      const groupName = String(m?.groupName ?? '').toLowerCase();

      return (
        code.includes(q) ||
        name.includes(q) ||
        shortName.includes(q) ||
        groupCode.includes(q) ||
        groupName.includes(q)
      );
    });
  }, [materials, qMaterials]);

  function onApplyMaterialToPart(materialCode) {
    if (!selectedPart) {
      alert('Por favor, selecciona una pieza o una parte en el visor primero.');
      return;
    }

    onApplyGlobalMaterial?.(materialCode, 'PART');
  }

  // ================================
  // Filtrado de Catálogo
  // ================================
  const catalogFiltered = useMemo(() => {
    const q = String(qCatalog || '')
      .trim()
      .toLowerCase();
    if (!q) return catalogItems || [];
    return (catalogItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';
      return code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);
    });
  }, [catalogItems, qCatalog]);

  // ================================
  // Cargar Tipologías
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = await loadTipologiasDetalle(country);

        const arr = Array.from(map.values()).map((t) => {
          const hijos = t?.hijos || [];
          const total = Number(hijos.reduce((acc, h) => acc + Number(h?.precio_acumulado || 0), 0));
          const totalQty = hijos.reduce((acc, h) => acc + Number(h?.cantidad || 0), 0) || 1;
          const unitPrice = totalQty ? total / totalQty : 0;

          return {
            codigoPT: String(t.codigo),
            ui: {
              title: t.descripcion || String(t.codigo),
              subtitle: 'Tipología',
            },
            prices: {
              [country]: Math.round(unitPrice),
              CO: Math.round(unitPrice),
            },
            model: { kind: 'TYPOLOGY' },
            raw: t,
            __total: total,
            categoriaTipologiaId: t?.categoria_tipologia_id,
          };
        });

        if (alive) {
          setTipologias(arr);
        }
      } catch (err) {
        console.error('Error cargando tipologias-detalle:', err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar MEPAL TEK SOCIAL
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadMepalTekSocialItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'MEPAL TEK SOCIAL',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'MEPAL_TEK_SOCIAL' },
          raw: c,
        }));
        setMepalTekSocialItems(arr);
        setMepalTekSocialReady(true);
      } catch (err) {
        console.error('Error cargando Mepal TekSocial:', err);
        if (alive) setMepalTekSocialReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar CLAK
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadClakItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'CLAK',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'CLAK' },
          raw: c,
        }));
        setClakItems(arr);
        setClakReady(true);
      } catch (err) {
        console.error('Error cargando Clak:', err);
        if (alive) setClakReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar EDUK
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadEdukItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'EDUK',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'EDUK' },
          raw: c,
        }));
        setEdukItems(arr);
        setEdukReady(true);
      } catch (err) {
        console.error('Error cargando Eduk:', err);
        if (alive) setEdukReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar Sillas
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Cargamos en paralelo: precios del XML, mapa de categorías, y lista de categorías
        const [priceMap, categoryMap, categoriasArr] = await Promise.all([
          loadChairsPriceList(country),
          loadChairsCategoryMap(),
          loadCategoriasSillas(),
        ]);

        if (!alive) return;

        // Solo incluimos sillas que tienen categoría en SILLAS Y MESAS (vienen del JSON de categorías)
        // o que al menos coincida su código con algo del XML
        const arr = Array.from(priceMap.values())
          .map((c) => {
            const cat = categoryMap.get(String(c.codigo));
            return {
              codigoPT: String(c.codigo),
              ui: {
                title: c.descripcion || String(c.codigo),
                subtitle: cat?.nivel2 || 'Silla',
              },
              prices: {
                [country]: Number(c.precio || 0),
                CO: Number(c.precio || 0),
              },
              model: { kind: 'CHAIR' },
              raw: c,
              categoriaNivel2: cat?.nivel2 || '', // ej: "SILLAS DE COLECTIVIDAD INTERIORES"
              categoriaNivel3: cat?.nivel3 || '', // ej: "OFIPARTES"
              categoriaSlug: cat?.slug || '',
            };
          })
          // Solo mostramos las que tienen categoría bajo "SILLAS Y MESAS"
          .filter((c) => c.categoriaSlug.startsWith('SILLAS Y MESAS'));
        // Detectar sillas que provienen de la carpeta sillas_ecuador
        const ECUADOR_NAME = 'ECUADOR';
        const ECUADOR_SLUG = 'SILLAS Y MESAS.ECUADOR';

        // Añadir la categoría ECUADOR al listado si no existe
        const hasEcuadorCat = (categoriasArr || []).some(
          (c) =>
            String(c.nombre || '')
              .trim()
              .toUpperCase() === ECUADOR_NAME
        );
        if (!hasEcuadorCat) {
          (categoriasArr || []).push({
            id: 999999,
            nombre: ECUADOR_NAME,
            slug: ECUADOR_SLUG,
            imagen_id: null,
            imagen: null,
            padre_id: 11910,
          });
        }

        // Cargar índice estático de archivos presentes en sillas_ecuador
        let ecuadorSet = new Set();
        try {
          const resIdx = await fetch('/assets/models/Sillas/sillas_ecuador_index.json');
          if (resIdx && resIdx.ok) {
            const arrIdx = await resIdx.json();
            ecuadorSet = new Set((arrIdx || []).map((v) => String(v).trim()));
          }
        } catch {
          // si falla, dejamos el set vacío
        }

        const arrWithEcuador = arr.map((it) => {
          try {
            const code = String(it.codigoPT || '').trim();
            if (code && ecuadorSet.has(code)) {
              return {
                ...it,
                categoriaNivel2: ECUADOR_NAME,
                categoriaNivel3: '',
                categoriaSlug: ECUADOR_SLUG,
                ui: { ...(it.ui || {}), subtitle: ECUADOR_NAME },
              };
            }
          } catch {
            // ignore
          }
          return it;
        });

        // Añadir códigos que están en el índice de sillas_ecuador pero no vienen en el PriceList
        try {
          const existingCodes = new Set(
            (arrWithEcuador || []).map((i) => String(i.codigoPT).trim())
          );
          const missing = Array.from(ecuadorSet).filter(
            (c) => !existingCodes.has(String(c).trim())
          );
          if (missing.length) {
            const extras = missing.map((code) => ({
              codigoPT: String(code),
              ui: { title: String(code), subtitle: ECUADOR_NAME },
              prices: { [country]: 0, CO: 0 },
              model: { kind: 'CHAIR' },
              raw: {},
              categoriaNivel2: ECUADOR_NAME,
              categoriaNivel3: '',
              categoriaSlug: ECUADOR_SLUG,
            }));
            arrWithEcuador.push(...extras);
          }
        } catch {
          // ignore
        }

        // Construir estructuras de subcategorías y conteos, incorporando ECUADOR
        const byCategoria = {};
        const byCategoriaCounts = {};

        for (const cat of categoryMap.values()) {
          const nivel2 = String(cat?.nivel2 || '').trim();
          const nivel3 = String(cat?.nivel3 || '').trim();
          if (!nivel2 || !nivel3) continue;

          if (!byCategoria[nivel2]) byCategoria[nivel2] = new Set();
          byCategoria[nivel2].add(nivel3);

          if (!byCategoriaCounts[nivel2]) byCategoriaCounts[nivel2] = {};
          byCategoriaCounts[nivel2][nivel3] = (byCategoriaCounts[nivel2][nivel3] || 0) + 1;
        }

        // Añadir bucket ECUADOR si corresponde
        const ecuadorItems = arrWithEcuador.filter((i) => i.categoriaNivel2 === ECUADOR_NAME);
        if (ecuadorItems.length) {
          if (!byCategoria[ECUADOR_NAME]) byCategoria[ECUADOR_NAME] = new Set();
          if (!byCategoriaCounts[ECUADOR_NAME]) byCategoriaCounts[ECUADOR_NAME] = {};
          for (const it of ecuadorItems) {
            const sub = String(it.categoriaNivel3 || '').trim();
            if (sub) {
              byCategoria[ECUADOR_NAME].add(sub);
              byCategoriaCounts[ECUADOR_NAME][sub] =
                (byCategoriaCounts[ECUADOR_NAME][sub] || 0) + 1;
            }
          }
        }

        const byCategoriaNormalized = Object.fromEntries(
          Object.entries(byCategoria).map(([key, set]) => [
            key,
            Array.from(set).sort((a, b) => a.localeCompare(b)),
          ])
        );

        // Debug logs: listar códigos cargados y el índice de sillas_ecuador
        try {
          //console.log('[LeftPanel] sillas_ecuador_index:', Array.from(ecuadorSet).sort());
          //console.log('[LeftPanel] chairs (count):',arrWithEcuador.length,Array.from(arrWithEcuador || []).map((c) => String(c.codigoPT)) );
          console.log('[LeftPanel] categoriasSillas (count):', (categoriasArr || []).length);
        } catch {
          // ignore
        }

        setCategoriasSillas(categoriasArr);
        setSubcategoriasSillasByCategoria(byCategoriaNormalized);
        setSubcategoriasSillasGlobalCountByCategoria(byCategoriaCounts);
        setChairs(arrWithEcuador);
      } catch (err) {
        console.error('Error cargando sillas:', err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar Ares
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadAresItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'ARES',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'ARES' },
          raw: c,
        }));
        setAresItems(arr);
        setAresReady(true);
      } catch (err) {
        console.error('Error cargando Ares:', err);
        if (alive) setAresReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar PLANTS AND FLOWERS
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadPlantsItems(country);
        if (!alive) return;
        const arr = items.map((p) => ({
          codigoPT: p.name,
          ui: {
            title: p.descripcion || p.name,
            subtitle: p.found ? `${country}` : 'Sin precio',
          },
          prices: {
            [country]: Number(p.precio || 0),
            CO: Number(p.precio || 0),
          },
          model: { kind: 'PLANT' },
          raw: p,
        }));
        setPlantsItems(arr);
        setPlantsReady(true);
      } catch (err) {
        console.error('Error cargando Plants and Flowers:', err);
        if (alive) setPlantsReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar OFFICE ACCESORIES
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadOfficeAccessoriesItems(country);
        if (!alive) return;
        const arr = items.map((acc) => ({
          codigoPT: acc.name,
          ui: {
            title: acc.descripcion || acc.name,
            subtitle: acc.found ? `${country}` : 'Sin precio',
          },
          prices: {
            [country]: Number(acc.precio || 0),
            CO: Number(acc.precio || 0),
          },
          model: { kind: 'OFFICE_ACCESSORY' },
          raw: acc,
        }));
        setOfficeAccessoriesItems(arr);
        setOfficeAccessoriesReady(true);
      } catch (err) {
        console.error('Error cargando Office Accesories:', err);
        if (alive) setOfficeAccessoriesReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar MEPAL SALUD
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadMepalSaludItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'MEPAL SALUD',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'MEPAL_SALUD' },
          raw: c,
        }));
        setMepalSaludItems(arr);
        setMepalSaludReady(true);
      } catch (err) {
        console.error('Error cargando MepalSalud:', err);
        if (alive) setMepalSaludReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Filtrado de Tipologías
  // ================================
  const typologiesFiltered = useMemo(() => {
    const q = String(qTyp || '')
      .trim()
      .toLowerCase();

    return (tipologias || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';

      const matchesSearch =
        !q || code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);

      const matchesCategory =
        !categoriaTipologiaId ||
        categoriaTipologiaId.includes(Number(it.raw?.categoria_tipologia_id));

      const matchesProfundidad =
        !profundidadFilter || String(it?.raw?.profundidad ?? '') === String(profundidadFilter);

      const matchesLongitud =
        !longitudFilter || String(it?.raw?.longitud ?? '') === String(longitudFilter);

      const matchesEspesor =
        !espesorFilter ||
        String(it?.raw?.espesor ?? '').replace(',', '.') ===
          String(espesorFilter).replace(',', '.');

      return (
        matchesSearch && matchesCategory && matchesProfundidad && matchesLongitud && matchesEspesor
      );
    });
  }, [tipologias, qTyp, categoriaTipologiaId, profundidadFilter, longitudFilter, espesorFilter]);

  const profundidades = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.profundidad;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  const longitudes = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.longitud;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  const espesores = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.espesor;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v).replace(',', '.'));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  // ================================
  // Filtrado de Sillas
  // ================================
  const chairsFiltered = useMemo(() => {
    const q = String(qChairs || '')
      .trim()
      .toLowerCase();

    return (chairs || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';

      const matchesSearch =
        !q || code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);

      const matchesCategoria = !categoriaSillaFilter || it.categoriaNivel2 === categoriaSillaFilter;

      const matchesSubcategoria =
        !subcategoriaSillaFilter || it.categoriaNivel3 === subcategoriaSillaFilter;

      return matchesSearch && matchesCategoria && matchesSubcategoria;
    });
  }, [chairs, qChairs, categoriaSillaFilter, subcategoriaSillaFilter]);

  const chairCategoryCounts = useMemo(() => {
    const counts = new Map();

    (chairs || []).forEach((it) => {
      const key = String(it?.categoriaNivel2 || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [chairs]);

  const chairSubcategoryCounts = useMemo(() => {
    const counts = new Map();

    (chairs || []).forEach((it) => {
      if (categoriaSillaFilter && it?.categoriaNivel2 !== categoriaSillaFilter) return;

      const key = String(it?.categoriaNivel3 || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [chairs, categoriaSillaFilter]);

  const chairSubcategories = useMemo(() => {
    if (categoriaSillaFilter) {
      return subcategoriasSillasByCategoria[categoriaSillaFilter] || [];
    }

    const all = new Set();
    Object.values(subcategoriasSillasByCategoria || {}).forEach((arr) => {
      (arr || []).forEach((value) => all.add(value));
    });

    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [categoriaSillaFilter, subcategoriasSillasByCategoria]);

  const chairSubcategoryGlobalCounts = useMemo(() => {
    const counts = new Map();

    if (categoriaSillaFilter) {
      const bySubcat = subcategoriasSillasGlobalCountByCategoria[categoriaSillaFilter] || {};
      Object.entries(bySubcat).forEach(([subcat, count]) => {
        counts.set(subcat, Number(count || 0));
      });
      return counts;
    }

    Object.values(subcategoriasSillasGlobalCountByCategoria || {}).forEach((bySubcat) => {
      Object.entries(bySubcat || {}).forEach(([subcat, count]) => {
        counts.set(subcat, (counts.get(subcat) || 0) + Number(count || 0));
      });
    });

    return counts;
  }, [categoriaSillaFilter, subcategoriasSillasGlobalCountByCategoria]);

  // ================================
  // Filtrado de Ares
  // ================================
  const aresFiltered = useMemo(() => {
    const q = String(qAres || '')
      .trim()
      .toLowerCase();
    if (!q) return aresItems || [];
    return (aresItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [aresItems, qAres]);

  // ================================
  // Filtrado de PLANTS AND FLOWERS
  // ================================
  const plantsFiltered = useMemo(() => {
    const q = String(qPlants || '')
      .trim()
      .toLowerCase();
    if (!q) return plantsItems || [];
    return (plantsItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [plantsItems, qPlants]);

  // ================================
  // Filtrado de OFFICE ACCESORIES
  // ================================
  const officeAccessoriesFiltered = useMemo(() => {
    const q = String(qOfficeAccesories || '')
      .trim()
      .toLowerCase();
    if (!q) return officeAccessoriesItems || [];
    return (officeAccessoriesItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [officeAccessoriesItems, qOfficeAccesories]);

  // ================================
  // Filtrado de MEPAL SALUD
  // ================================
  const mepalSaludFiltered = useMemo(() => {
    const q = String(qMepalSalud || '')
      .trim()
      .toLowerCase();
    if (!q) return mepalSaludItems || [];
    return (mepalSaludItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [mepalSaludItems, qMepalSalud]);

  // ================================
  // Filtrado de MEPAL TEK SOCIAL
  // ================================
  const mepalTekSocialFiltered = useMemo(() => {
    const q = String(qMepalTekSocial || '')
      .trim()
      .toLowerCase();
    if (!q) return mepalTekSocialItems || [];
    return (mepalTekSocialItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [mepalTekSocialItems, qMepalTekSocial]);

  // ================================
  // Filtrado de CLAK
  // ================================
  const clakFiltered = useMemo(() => {
    const q = String(qClak || '')
      .trim()
      .toLowerCase();

    // If user is searching, show matching items (including variants)
    if (q) {
      return (clakItems || []).filter((it) => {
        const code = String(it?.codigoPT ?? '').toLowerCase();
        const title = String(it?.ui?.title ?? '').toLowerCase();
        return code.includes(q) || title.includes(q);
      });
    }

    // When not searching, build a simple group-key and take first per key
    if (!showClakVariants) {
      const seen = new Set();
      const out = [];
      const groupingMap = new Map();

      for (const it of clakItems || []) {
        const codeNorm = normalizeClakPuffCode(it?.codigoPT);

        // determine group key
        let key = codeNorm;

        const group = getClakVariantOptionsByCode(codeNorm);
        if (group && Array.isArray(group) && group.length) {
          key = `group_${normalizeClakPuffCode(group[0].code)}`;
        } else {
          const seat = getSeatVariantByCode(codeNorm);
          if (seat) {
            key = `seat_${String(seat.size)}`; // group by size only
          } else {
            const mod = getModuleVariantByCode(codeNorm);
            if (mod) {
              // Group module variants by width only so modules with same width
              // (e.g., 174cm and 200cm) show as a single reference each by default.
              key = `mod_${String(mod.width)}`;
            }
          }
        }

        if (!groupingMap.has(key)) groupingMap.set(key, []);
        groupingMap.get(key).push(codeNorm);

        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
      }

      // Debug output to help diagnose why modules aren't being collapsed
      try {
        console.debug(
          '[LeftPanel] clak grouping map:',
          Array.from(groupingMap.entries()).map(([k, arr]) => ({ key: k, codes: arr }))
        );
      } catch {
        /* ignore */
      }

      return out;
    }

    // show all when user requested variants
    return clakItems || [];
  }, [clakItems, qClak, showClakVariants]);

  // ================================
  // Filtrado de EDUK
  // ================================
  const edukFiltered = useMemo(() => {
    const q = String(qEduk || '')
      .trim()
      .toLowerCase();
    if (!q) return edukItems || [];
    return (edukItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [edukItems, qEduk]);

  // ================================
  // Filtrado ZEN ALMACENAMIENTO
  // ================================
  const almacenFiltered = useMemo(() => {
    const q = String(qAlmacen || '')
      .trim()
      .toLowerCase();
    if (!q) return almacenItems || [];
    return (almacenItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const cat = String(it?.raw?.category ?? '').toLowerCase();
      return code.includes(q) || title.includes(q) || cat.includes(q);
    });
  }, [almacenItems, qAlmacen]);

  const almacenByCategory = useMemo(() => {
    const out = {};
    const seenByCategoryCode = new Set();
    (almacenFiltered || []).forEach((it) => {
      const cat = it?.raw?.category || 'General';
      const key = `${cat}__${String(it?.codigoPT || '')}`;
      if (seenByCategoryCode.has(key)) return;
      seenByCategoryCode.add(key);
      if (!out[cat]) out[cat] = [];
      out[cat].push(it);
    });
    return out;
  }, [almacenFiltered]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/assets/models/Almacenamiento/manifest.json');
        if (!res.ok) {
          if (alive) setAlmacenReady(true);
          return;
        }
        const arr = await res.json();
        if (!alive) return;

        // Cargar mapa de precios (reutiliza loader existente)
        let priceMap = null;
        try {
          priceMap = await loadChairsPriceList(country);
        } catch {
          priceMap = null;
        }

        const mapped = (arr || []).map((it) => {
          const codeBase = String(it.codeBase || it.filename || '').replace(/\.glb$/i, '');
          const priceEntry = priceMap ? priceMap.get(String(codeBase)) : null;

          return {
            codigoPT: codeBase,
            ui: {
              title:
                (priceEntry?.descripcion || it.codeBase || it.filename) +
                (it.variant ? ` - ${it.variant}` : ''),
              subtitle: 'Zen Almacenamiento',
            },
            prices: {
              [country]: priceEntry?.precio || 0,
            },
            model: { kind: 'glb', src: it.url, category: it.category, variant: it.variant },
            raw: Object.assign({}, it, { found: !!priceEntry }),
          };
        });

        const activeItems = mapped.filter((it) => !it?.raw?.disabled);
        const displayItems = activeItems.filter((it) => !it?.raw?.variant);

        // construir mapa de variantes por codeBase
        const vmap = new Map();
        for (const it of activeItems) {
          const key = it.codigoPT;
          const entry = {
            variant: it.raw?.variant || null,
            src: it.model?.src,
            category: it.model?.category || it.raw?.category,
          };
          if (!vmap.has(key)) vmap.set(key, []);
          vmap.get(key).push(entry);
        }

        setAlmacenVariantsMap(vmap);

        setAlmacenItems(displayItems);
        setAlmacenReady(true);
      } catch (err) {
        console.error('Error cargando manifest Almacenamiento:', err);
        if (alive) setAlmacenReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [country]);

  return (
    <div
      className="left-panel-shell"
      style={{
        flex: 1,
        padding: 12,
        overflow: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* ======================= CATALOGO ======================= */}
      {section === 'catalog' && (
        <>
          <h3 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Catálogo
          </h3>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button disabled={readOnly} onClick={() => !readOnly && setSurfaceOpen(true)}>
              + Superficie
            </button>
            <button disabled={readOnly} onClick={() => !readOnly && onToggleSnap?.()}>
              Snap
            </button>
          </div>

          <input
            value={qCatalog}
            onChange={(e) => setQCatalog(e.target.value)}
            placeholder="Buscar catálogo 22000032439 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Mostrando <b>{catalogFiltered.length}</b> items
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {catalogFiltered.slice(0, 150).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddCatalogItem(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{country}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{it.ui?.title}</div>
                {it.ui?.subtitle ? (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{it.ui.subtitle}</div>
                ) : null}
              </button>
            ))}
          </div>

          {catalogFiltered.length > 150 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 150 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {/* ======================= TIPOLOGÍAS ======================= */}
      {section === 'typologies' && (
        <>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            <select
              value={profundidadFilter}
              onChange={(e) => setProfundidadFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las profundidades</option>
              {profundidades.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={longitudFilter}
              onChange={(e) => setLongitudFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las longitudes</option>
              {longitudes.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={espesorFilter}
              onChange={(e) => setEspesorFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todos los espesores</option>
              {espesores.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <h3 style={{ margin: '0 0 12px 0' }}>Tipologías</h3>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Busca y selecciona una tipología para agregarla al proyecto.
          </div>

          <input
            value={qTyp}
            onChange={(e) => setQTyp(e.target.value)}
            placeholder="Tipologías 131997 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Tipologías encontradas: <b>{typologiesFiltered.length}</b>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {typologiesFiltered.slice(0, 120).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddTypology(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <TypologyCardImage codigoPT={it.codigoPT} title={it.ui?.title || it.codigoPT} />

                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>

                {it.raw?.lista ? (
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{it.raw.lista}</div>
                ) : null}

                {it.ui?.subtitle ? (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{it.ui.subtitle}</div>
                ) : null}
              </button>
            ))}
          </div>

          {typologiesFiltered.length > 120 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 120 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {section === 'koncisaPlus' && (
        <KoncisaPlusPanel
          onCreate={async (config) => {
            const api = threeApiRef.current;
            if (!api) {
              alert('El visor 3D aún no está listo.');
              return;
            }

            await createKoncisaPlusInstance({ api, config });
          }}
        />
      )}

      {/* ======================= MUROS ======================= */}
      {section === 'walls' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Muros</h3>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Modo</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setWallMode('NONE')}
                  style={btnMini(wallMode === 'NONE')}
                >
                  Ninguno
                </button>
                <button
                  type="button"
                  onClick={() => setWallMode('DRAW')}
                  style={btnMini(wallMode === 'DRAW')}
                >
                  Dibujar
                </button>
                <button
                  type="button"
                  onClick={() => setWallMode('EDIT')}
                  style={btnMini(wallMode === 'EDIT')}
                >
                  Editar
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                En “Dibujar”: clic para puntos, doble clic para terminar.
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: '#666', lineHeight: 1.35 }}>
                <div>
                  <b>Cómo trazar:</b> activa “Modo muros”, luego haz click para poner puntos.
                </div>
                <div>
                  <b>Terminar muro:</b> doble click.
                </div>
                <div>
                  <b>Cancelar trazo:</b> tecla Esc.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={lab}>
                Alto (m)
                <input
                  type="number"
                  step="0.05"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(Number(e.target.value))}
                  style={inp}
                />
              </label>

              <label style={lab}>
                Espesor (m)
                <input
                  type="number"
                  step="0.01"
                  value={wallThickness}
                  onChange={(e) => setWallThickness(Number(e.target.value))}
                  style={inp}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onUndoLastWall}>Deshacer</button>
              <button onClick={onClearWalls}>Borrar muros</button>
            </div>
          </div>
        </>
      )}

      {/* ======================= PUERTAS/VENTANAS ======================= */}
      {section === 'openings' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Puertas y Ventanas</h3>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Próximo: librería de aperturas para insertar en muros.
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <button disabled style={disabledCard}>
              🚪 Puerta estándar (próximo)
            </button>
            <button disabled style={disabledCard}>
              🪟 Ventana estándar (próximo)
            </button>
          </div>
        </>
      )}

      {/* ======================= MATERIALES (placeholder) ======================= */}
      {section === 'materials' && (
        <>
          <h3 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Materiales
          </h3>

          {/* Texto indicando qué parte estamos editando */}
          {selectedPart?.subName && (
            <div className="lp-wrap" style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
              Editando parte: <b>{selectedPart.subName}</b>
            </div>
          )}

          {!selectedPart?.subName && selectedPart?.code && (
            <div className="lp-wrap" style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
              Editando objeto: <b>{selectedPart.code}</b>
            </div>
          )}

          {!selectedPart && (
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
              Selecciona primero una pieza en el visor.
            </div>
          )}

          {/* Filtro de búsqueda */}
          <input
            value={qMaterials}
            onChange={(e) => setQMaterials(e.target.value)}
            placeholder="Código o nombre"
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
              fontSize: 13,
            }}
          />

          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
            Mostrando {materialsFiltered.length} materiales
          </div>

          {/* Opciones para aplicar el material */}
          {selectedPart && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setApplyScope('PART')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 6px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: applyScope === 'PART' ? '#2d2d2d' : '#fff',
                  color: applyScope === 'PART' ? '#fff' : '#444',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Parte
              </button>

              <button
                type="button"
                onClick={() => setApplyScope('ALL')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 6px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: applyScope === 'ALL' ? '#2d2d2d' : '#fff',
                  color: applyScope === 'ALL' ? '#fff' : '#444',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Objeto
              </button>
            </div>
          )}

          {/* Lista de materiales */}
          <div style={{ display: 'grid', gap: 10 }}>
            {materialsFiltered.slice(0, 150).map((m) => (
              <div
                key={String(m.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  minWidth: 0,
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                  width: '100%',
                }}
              >
                {/* Color */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: `rgb(${m.rgbValue?.replaceAll('_', ',') || '200,200,200'})`,
                    flexShrink: 0,
                  }}
                />

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="lp-wrap"
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.2,
                    }}
                    title={m.shortName || m.name}
                  >
                    {m.shortName || m.name}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>{m.code}</div>

                  {(m.groupCode || m.groupName) && (
                    <div
                      className="lp-wrap"
                      style={{
                        fontSize: 12,
                        opacity: 0.6,
                        marginTop: 2,
                      }}
                      title={`${m.groupCode || ''}${m.groupCode && m.groupName ? ' — ' : ''}${m.groupName || ''}`}
                    >
                      {m.groupCode}
                      {m.groupCode && m.groupName ? ' — ' : ''}
                      {m.groupName}
                    </div>
                  )}
                </div>

                {/* BOTÓN APLICAR */}
                <button
                  disabled={readOnly || !selectedPart}
                  onClick={() => {
                    if (readOnly) return;

                    if (applyScope === 'PART') {
                      onApplyMaterialToPart(m.code);
                    } else {
                      onApplyGlobalMaterial?.(m.code, 'ALL');
                    }
                  }}
                  style={{
                    marginTop: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    background: '#2d2d2d',
                    color: '#fff',
                    cursor: readOnly || !selectedPart ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  Aplicar
                </button>
              </div>
            ))}
          </div>

          {materialsFiltered.length > 150 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 150 resultados. Refina la búsqueda.
            </div>
          )}
        </>
      )}

      {/* ======================= PLANOS ======================= */}
      {section === 'plans' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Planos</h3>

          {Plan2DUploader ? <Plan2DUploader onLoadFile={handleLoadPlan2D} /> : null}

          <button
            onClick={() => setPlan2DVisible((v) => !v)}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {plan2DVisible ? 'Ocultar plano' : 'Mostrar plano'}
          </button>
        </>
      )}

      {/* ======================= SILLAS ======================= */}
      {section === 'sillas' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Sillas
          </h1>

          <h3 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Bases y Mesas
          </h3>

          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            <select
              value={categoriaSillaFilter}
              onChange={(e) => {
                setCategoriaSillaFilter(e.target.value);
                setSubcategoriaSillaFilter('');
              }}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las categorías</option>
              {categoriasSillas.map((cat) => (
                <option key={cat.id} value={cat.nombre}>
                  {cat.nombre} ({chairCategoryCounts.get(cat.nombre) || 0})
                </option>
              ))}
            </select>

            <select
              value={subcategoriaSillaFilter}
              onChange={(e) => setSubcategoriaSillaFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las subcategorías</option>
              {chairSubcategories.map((subcat) => (
                <option key={subcat} value={subcat}>
                  {subcat} ({chairSubcategoryCounts.get(subcat) || 0}/
                  {chairSubcategoryGlobalCounts.get(subcat) || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="lp-wrap" style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>
            Subcategoría: <b>actual/global</b> (códigos en la lista del país / códigos únicos en
            JSON).
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Busca y selecciona una silla para agregarla al proyecto.
          </div>

          <input
            value={qChairs}
            onChange={(e) => setQChairs(e.target.value)}
            placeholder="Sillas 22000116019 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Sillas encontradas: <b>{chairsFiltered.length}</b>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {chairsFiltered.slice(0, 120).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddChair(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <ChairCardImage codigoPT={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>

                <div style={{ fontSize: 11, opacity: 0.65 }}>{it.categoriaNivel2 || 'Silla'}</div>
              </button>
            ))}
          </div>

          {chairsFiltered.length > 120 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 120 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {/* ======================= ARES ======================= */}
      {section === 'ares' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Ares
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto Ares para agregarlo al proyecto.
          </div>

          <input
            value={qAres}
            onChange={(e) => setQAres(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!aresReady && <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Ares...</div>}

          <div style={{ display: 'grid', gap: 8 }}>
            {aresFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddAres(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <CardImage
                  assetName={it.codigoPT}
                  title={it.ui?.title || it.codigoPT}
                  imageFit="contain"
                  imageHeight={110}
                  imagePadding={6}
                  imageBackground="#f9f9f9"
                />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ======================= PLANTS AND FLOWERS ======================= */}
      {section === 'plants' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Plants and Flowers
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona una planta para agregarla al proyecto.
          </div>

          <input
            value={qPlants}
            onChange={(e) => setQPlants(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!plantsReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Plants and Flowers...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {plantsFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddPlant(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <PlantCardImage plantName={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
                {it.raw?.found && (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    Precio: ${it.prices?.[country] || 0}
                  </div>
                )}
              </button>
            ))}
          </div>

          {plantsReady && plantsFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay plantas disponibles. Agrega entradas a plantas.json
            </div>
          )}
        </>
      )}

      {/* ======================= ZEN ALMACENAMIENTO ======================= */}
      {section === 'zenAlmacenamiento' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0', lineHeight: 1.1 }}>
            Zen Almacenamiento
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un elemento de almacenamiento (Biblioteca o Pedestal).
          </div>

          <input
            value={qAlmacen}
            onChange={(e) => setQAlmacen(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 8,
              outline: 'none',
            }}
          />

          <select
            value={almacenCategoryFilter}
            onChange={(e) => setAlmacenCategoryFilter(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              background: '#fff',
            }}
          >
            <option value="">Todas</option>
            <option value="Biblioteca">Biblioteca</option>
            <option value="Pedestal">Pedestal</option>
          </select>

          {!almacenReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Zen Almacenamiento...</div>
          )}

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Mostrando <b>{almacenFiltered.length}</b> productos
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {Object.keys(almacenByCategory)
              .filter((cat) => (almacenCategoryFilter ? cat === almacenCategoryFilter : true))
              .map((cat) => (
                <div key={cat}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>{cat}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {almacenByCategory[cat].map((it) => (
                      <button
                        key={String(it.codigoPT) + (it.raw?.variant || '')}
                        disabled={readOnly}
                        onClick={() => {
                          if (readOnly) return;
                          const codeBase = it.codigoPT;
                          const variants = almacenVariantsMap.get(codeBase) || [];
                          const baseVariant =
                            variants.find((v) => !v?.variant) || variants[0] || null;
                          const src = baseVariant?.src || it.model?.src;
                          const itemFor3D = {
                            codigoPT: codeBase,
                            ui: it.ui,
                            model: { kind: 'glb', src, variant: baseVariant?.variant || null },
                            raw: it.raw,
                            variants,
                          };
                          if (threeApiRef?.current?.addPartFromGlb) {
                            threeApiRef.current.addPartFromGlb(itemFor3D);
                          } else {
                            onAddCatalogItem?.(it.codigoPT);
                          }
                        }}
                        style={cardBtn(readOnly)}
                      >
                        <StorageCardImage
                          codeBase={it.codigoPT}
                          title={it.ui?.title || it.codigoPT}
                        />
                        <div
                          style={{
                            fontWeight: 900,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                          }}
                        >
                          {it.codigoPT}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.85,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                          }}
                        >
                          {it.ui?.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {almacenReady && almacenFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay productos disponibles en Zen Almacenamiento.
            </div>
          )}
        </>
      )}

      {/* ======================= OFFICE ACCESORIES ======================= */}
      {section === 'officeAccesories' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0' }}>
            Office Accesories
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un accesorio de oficina para agregarlo al proyecto.
          </div>

          <input
            value={qOfficeAccesories}
            onChange={(e) => setQOfficeAccesories(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!officeAccessoriesReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Office Accesories...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {officeAccessoriesFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddOfficeAccessory(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <OfficeAccessoryCardImage
                  accessoryName={it.codigoPT}
                  title={it.ui?.title || it.codigoPT}
                />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
                {it.raw?.found && (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    Precio: ${it.prices?.[country] || 0}
                  </div>
                )}
              </button>
            ))}
          </div>

          {officeAccessoriesReady && officeAccessoriesFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay accesorios disponibles. Agrega entradas a officeAccessories.json
            </div>
          )}
        </>
      )}

      {/* ======================= MEPAL SALUD ======================= */}
      {section === 'mepalSalud' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0', lineHeight: 1.1 }}>
            <span style={{ display: 'block' }}>Salud</span>
            <span style={{ display: 'block' }}>Mepal</span>
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto MepalSalud para agregarlo al proyecto.
          </div>

          <input
            value={qMepalSalud}
            onChange={(e) => setQMepalSalud(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!mepalSaludReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando MepalSalud...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {mepalSaludFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddMepalSalud(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <MepalSaludCardImage codigo={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {it.codigoPT}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {it.ui?.title}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ======================= MEPAL TEK SOCIAL ======================= */}
      {section === 'mepalTekSocial' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0', lineHeight: 1.1 }}>
            <span style={{ display: 'block' }}>Mepal</span>
            <span style={{ display: 'block' }}>TekSocial</span>
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto Mepal TekSocial para agregarlo al proyecto.
          </div>

          <input
            value={qMepalTekSocial}
            onChange={(e) => setQMepalTekSocial(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!mepalTekSocialReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Mepal TekSocial...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {mepalTekSocialFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddMepalTekSocial(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <MepalTekSocialCardImage codigo={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {it.codigoPT}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {it.ui?.title}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ======================= CLAK ======================= */}
      {section === 'clak' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0', lineHeight: 1.1 }}>
            Clak
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto Clak para agregarlo al proyecto.
          </div>

          <input
            value={qClak}
            onChange={(e) => setQClak(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setShowClakVariants((s) => !s)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: showClakVariants ? '#111827' : '#ffffff',
                color: showClakVariants ? '#fff' : '#111827',
                cursor: 'pointer',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  display: 'inline-block',
                  background: showClakVariants ? '#34d399' : '#d1d5db',
                }}
              />
              {showClakVariants ? 'Variantes: ON' : 'Variantes: OFF'}
            </button>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Mostrar todas las variantes</div>
          </div>

          {!clakReady && <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Clak...</div>}

          <div style={{ display: 'grid', gap: 8 }}>
            {clakFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddClak(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <ClakCardImage codigo={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {it.codigoPT}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {it.ui?.title}
                </div>
              </button>
            ))}
          </div>

          {clakReady && clakFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay productos disponibles. Agrega entradas a clak.json
            </div>
          )}
        </>
      )}

      {/* ======================= EDUK ======================= */}
      {section === 'eduk' && (
        <>
          <h1 className="lp-wrap" style={{ margin: '0 0 12px 0', lineHeight: 1.1 }}>
            Eduk
          </h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto Eduk para agregarlo al proyecto.
          </div>

          <input
            value={qEduk}
            onChange={(e) => setQEduk(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!edukReady && <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Eduk...</div>}

          <div style={{ display: 'grid', gap: 8 }}>
            {edukFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddEduk(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <EdukCardImage codigo={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {it.codigoPT}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {it.ui?.title}
                </div>
              </button>
            ))}
          </div>

          {edukReady && edukFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay productos disponibles. Agrega entradas a eduk.json
            </div>
          )}
        </>
      )}
    </div>
  );
}

function cardBtn(readOnly) {
  return {
    textAlign: 'left',
    padding: '12px',
    borderRadius: 12,
    border: '1px solid #dfdfdf',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    cursor: readOnly ? 'not-allowed' : 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 12px rgba(15, 23, 42, 0.05)',
  };
}

function btnMini(active) {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d8d8d8',
    background: active
      ? 'linear-gradient(180deg, #464646 0%, #2e2e2e 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
    color: active ? '#fff' : '#444',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: active
      ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(15, 23, 42, 0.04)',
  };
}

const lab = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#555' };
const inp = {
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid #d8d8d8',
  background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
  color: '#333',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(15, 23, 42, 0.04)',
};
const disabledCard = {
  textAlign: 'left',
  padding: '12px',
  borderRadius: 12,
  border: '1px solid #e0e0e0',
  background: 'linear-gradient(180deg, #fafafa 0%, #f1f1f1 100%)',
  cursor: 'not-allowed',
  opacity: 0.7,
};

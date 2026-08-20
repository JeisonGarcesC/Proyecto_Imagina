// src/components/LeftRail.jsx
export default function LeftRail({ active, onChange }) {
  const items = [
    { id: 'catalog', label: 'Catálogo', icon: '📦' },
    { id: 'typologies', label: 'Tipologías', icon: '🧩' },
    { id: 'walls', label: 'Muros', icon: '🧱' },
    { id: 'columns', label: 'Columnas', icon: '▣' },
    { id: 'openings', label: 'Puertas/Ventanas', icon: '🚪' },
    { id: 'materials', label: 'Materiales', icon: '🎨' },
    { id: 'plans', label: 'Planos', icon: '🗺️' },
    { id: 'sillas', label: 'Sillas', icon: '🪑' },
    {
      id: 'plants',
      label: 'Plants and Flowers',
      image: '/assets/iconos_imagen/Flores.png',
    },
    {
      id: 'ares',
      label: 'Ares',
      image: '/assets/iconos_imagen/Ares.png',
    },
    {
      id: 'officeAccesories',
      label: 'Office Accesories',
      image: '/assets/iconos_imagen/Accesorios.png',
    },
    {
      id: 'mepalSalud',
      label: 'MepalSalud',
      image: '/assets/iconos_imagen/Salud.png',
    },
    {
      id: 'mepalTekSocial',
      label: 'Mepal TekSocial',
      image: '/assets/iconos_imagen/MepalTekSocial.png',
    },
    {
      id: 'clak',
      label: 'Clak',
      image: '/assets/iconos_imagen/Clak.png',
    },
    {
      id: 'zenAlmacenamiento',
      label: 'Zen Almacenamiento',
      image: '/assets/iconos_imagen/Almacenamiento.png',
    },
    {
      id: 'koncisaPlus',
      label: 'Koncisa Plus',
      image: '/assets/iconos_imagen/koncisa2PlussLibrary.png',
    },
    {
      id: 'eduk',
      label: 'Eduk',
      image: '/assets/iconos_imagen/Eduk.png',
    },
    {
      id: 'kuoAlturaVariable',
      label: 'Kuo altura Variable',
      image: '/assets/iconos_imagen/KuoAlturaVariable.png',
    },
    {
      id: 'kuoGo',
      label: 'Kuo Go',
      image: '/assets/iconos_imagen/KuoGo.png',
    },
    {
      id: 'link',
      label: 'Link',
      image: '/assets/iconos_imagen/link.png',
    },
    { id: 'critterium8', label: 'Critterium 8', icon: '▒' },
    {
      id: 'morea',
      label: 'Morea',
      image: '/assets/iconos_imagen/MepalMorea.png',
    },
    {
      id: 'mila',
      label: 'Mila',
      image: '/assets/iconos_imagen/MepalMila.png',
    },
  ];

  return (
    <div
      style={{
        width: 56,
        borderRight: '1px solid #e5e5e5',
        background: 'linear-gradient(180deg, #f8f8f8 0%, #efefef 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 8,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.65)',
      }}
    >
      {items.map((it) => {
        const isActive = active === it.id;

        return (
          <button
            key={it.id}
            type="button"
            title={it.label}
            onClick={() => onChange(it.id)}
            style={{
              width: '100%',
              height: 42,
              flexShrink: 0,
              padding: 0,
              borderRadius: 10,
              border: isActive ? '1px solid #2d2d2d' : '1px solid #d8d8d8',
              background: isActive
                ? 'linear-gradient(180deg, #454545 0%, #2e2e2e 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
              color: isActive ? '#fff' : '#444',
              cursor: 'pointer',
              fontSize: 16,
              boxShadow: isActive
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)'
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 2px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              transition: 'background-color 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease',
            }}
          >
            {it.image ? (
              <img
                src={it.image}
                alt={it.label}
                style={{
                  width: 34,
                  height: 34,
                  objectFit: 'contain',
                  filter: isActive ? 'none' : 'grayscale(12%)',
                }}
              />
            ) : (
              it.icon
            )}
          </button>
        );
      })}
    </div>
  );
}

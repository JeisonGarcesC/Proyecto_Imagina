# AGENTS.md

# Proyecto

Proyecto_Imagina es un configurador CAD 3D/2D desarrollado en React + Three.js.

El sistema combina:

- Editor 3D basado en Three.js.
- Editor 2D tipo CAD basado en Canvas.
- Assemblies complejos.
- BOM.
- Sistema de selección.
- Historial Undo/Redo.
- Clipboard interno.
- Herramientas CAD (snap, cotas, medición).

El objetivo principal es agregar funcionalidades nuevas sin romper comportamientos existentes.

Antes de modificar código:

- entender el flujo actual.
- identificar dependencias.
- respetar arquitecturas existentes.

---

# Tecnologías

- React
- Vite
- Electron
- JavaScript ES6+
- Three.js
- Git
- GitHub

---

# Principios generales

## No duplicar lógica

Antes de crear una función nueva:

- Buscar si ya existe una función equivalente.
- Reutilizar APIs existentes.
- Extender comportamiento actual.

No crear:

- estados paralelos.
- motores alternativos.
- sistemas duplicados.

---

# Arquitectura general

## Estado principal

La aplicación mantiene una separación:

## 3D

Responsabilidad:

- Objetos Three.js.
- Assemblies.
- Transformaciones.
- Render.
- Selección física.
- BOM.

Principalmente:

ThreeCanvas.jsx

## 2D CAD

Responsabilidad:

- Visualización plana.
- Herramientas CAD.
- Cotas.
- Snap.
- Medición.

Principalmente:

Plan2DOverlay.jsx

## Comunicación

La comunicación entre sistemas debe pasar por APIs existentes.

No acceder directamente desde un módulo a estados internos de otro.

---

# Three.js

## Reglas críticas

No modificar:

- cámara.
- OrbitControls.
- renderer.
- escalas existentes.
- offsets de modelos.
- jerarquías de assemblies.

salvo solicitud explícita.

---

# Assemblies

El proyecto utiliza assemblies complejos.

Ejemplo:

Koncisa Plus:

KONCISA_PLUS_ASSEMBLY

├── superficie
├── costados
├── vigas
├── ductos
└── accesorios

Reglas:

- No tratar assemblies como piezas individuales.
- Mantener parentAssemblyId.
- Mantener groupId.
- Mantener instanceId.

Cuando se agreguen funciones sobre selección, movimiento, rotación o eliminación:

Resolver primero si corresponde:

- pieza física.
- grupo.
- assembly completo.

---

# APIs expuestas por ThreeCanvas

IMPORTANTE:

Las APIs expuestas mediante onApiReady / threeApiRef son contratos internos.

Nunca reemplazar una función existente.

Selección

El proyecto utiliza una selección compartida:

selectedIds

y:

selectedIds3D

Reglas:

No crear otro sistema de selección.
Mantener activePart como referencia del último objeto pulsado.
La selección múltiple debe usar IDs físicos existentes.
No crear IDs adicionales para selección.
Transformaciones

Las operaciones:

MOVE
ROTATE
DELETE

deben trabajar sobre objetivos resueltos.

Antes de transformar:

resolver:

pieza individual.
grupo.
assembly.

No aplicar transformaciones directamente sobre meshes internos.

Historial Undo / Redo

El historial es global.

No crear historiales independientes.

Acciones actuales:

MOVE
ROTATE
DELETE
CREATE_OBJECTS

Futuras:

CREATE_DIMENSION
UPDATE_DIMENSION
DELETE_DIMENSION

Reglas:

Una acción debe representar una operación completa.

Incorrecto:

Registrar durante cada pointermove.

Correcto:

Inicio operación:

capturar before.

Final operación:

capturar after.

Clipboard

Ctrl+C / Ctrl+V utiliza datos serializables.

Nunca almacenar:

Object3D.
Mesh.
geometrías.
materiales.

El clipboard debe almacenar:

configuración.
transform.
metadata.
relaciones.

La creación debe reutilizar constructores existentes.

No duplicar lógica de creación.

CAD 2D

Plan2DOverlay no utiliza cámara ortográfica Three.js.

Utiliza:

Mundo (x,z)

↓

transformación manual

↓

Canvas
Snap 2D

No crear sistemas paralelos.

Utilizar:

geometrySnap2D.js

Funciones principales:

resolveSnapPoint()
resolvePlacementSnap()
Dimension2D

Las cotas son entidades CAD independientes.

Modelo:

Dimension2D

id
type
startPoint
endPoint
value
unit
label
offset
references

Reglas:

value es calculado.
No modificar value directamente.
Las entidades son inmutables.
Editar mediante updateDimension2D().
Cambios en archivos

Antes de modificar:

Analizar:

quién usa la función.
dependencias.
efectos secundarios.
compatibilidad.

Para cambios grandes:

explicar plan.
listar archivos.
modificar.
validar.
Validación obligatoria

Después de cambios:

Ejecutar:

git diff --check
npm run build

Si no es posible ejecutar:

indicar claramente el motivo.

Git

Nunca:

commit.
push.
cambiar ramas.

El control de versiones lo realiza el usuario.

Bugs

Nunca corregir por prueba y error.

Proceso obligatorio:

reproducir.
encontrar causa.
explicar impacto.
modificar.
validar.
Comunicación

Siempre informar:

qué cambió.
por qué cambió.
archivos modificados.
riesgos.
validaciones realizadas.

Si existe incertidumbre:

no asumir.
preguntar primero.

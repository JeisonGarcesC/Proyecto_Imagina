# ANALISIS_PROYECTO

Fecha de analisis: 2026-08-06

## 1. Objetivo del proyecto

Proyecto_Imagina es un configurador CAD 3D/2D para composicion de espacios y mobiliario (especialmente lineas tipo Koncisa Plus y familias Mepal), con capacidades de:

- Insercion de productos desde catalogo y tipologias.
- Edicion geometrica (mover, rotar, eliminar, variaciones por producto).
- Gestion de acabados/materiales por pieza y subpieza.
- Visualizacion 2D tipo planta con herramientas CAD (snap, seleccion por ventana, cotas, medicion).
- Generacion de BOM (Bill of Materials) con precios por pais/lista.
- Exportacion a GLB, DXF, SVG/PNG/PDF y PowerPoint.
- Ejecucion tanto web (Vite) como desktop (Electron).

Evidencia principal:

- src/App.jsx
- src/components/ThreeCanvas.jsx
- src/components/Plan2DOverlay.jsx
- src/components/BOMView.jsx
- src/exports/exportPPT.js

## 2. Tecnologias utilizadas

### Frontend

- React 19
- ReactDOM 19
- Vite 7
- JavaScript ES Modules

### 3D / CAD / Render

- three
- three-stdlib (OrbitControls, GLTFLoader, GLTFExporter)
- Canvas 2D nativo para overlay CAD

### Desktop

- Electron 39

### Datos / documentos / export

- XML parsing via DOMParser (nativo navegador)
- dxf-writer (DXF)
- pptxgenjs (PowerPoint)
- pdfjs-dist (render PDF a imagen en el flujo 2D)
- xlsx / xlsx-js-style / exceljs (dependencias presentes para manejo tabular)

### Calidad / tooling

- ESLint 9
- @vitejs/plugin-react

Evidencia principal:

- package.json
- vite.config.js
- electron/main.js

## 3. Arquitectura

Arquitectura orientada a componente orquestador + motor 3D + overlay 2D + modulos de dominio.

### Capa de entrada y autenticacion

- src/main.jsx monta React y AuthProvider.
- src/AppRoot.jsx decide Login vs App segun sesion.
- src/auth/AuthContext.jsx contiene autenticacion local (localStorage) y permisos por rol.

### Capa de orquestacion UI

- src/App.jsx coordina estado global de la experiencia:
  - Permisos y modo readOnly.
  - Integracion menu superior, panel izquierdo, canvas 3D, overlay 2D, propiedades, BOM y exportes.
  - Enlace de eventos de teclado globales (copiar/pegar, undo/redo).

### Motor 3D (nucleo de dominio operativo)

- src/components/ThreeCanvas.jsx concentra:
  - Inicializacion de escena/camara/renderer/controles.
  - Registro de partes y pickables.
  - Seleccion, drag 3D, rotacion, snapping, borrado.
  - Historial global (MOVE/ROTATE/DELETE/CREATE_OBJECTS + dimensiones 2D).
  - Generacion y emision de BOM.
  - Carga/guardado de proyecto.
  - API interna expuesta por onApiReady para todo el resto de la app.

### Overlay CAD 2D

- src/components/Plan2DOverlay.jsx implementa:
  - Vista planta con transformacion mundo (x,z) a canvas.
  - Seleccion por click/ventana.
  - Medicion y cotas 2D.
  - Integracion con historial global via historyApi.
  - Edicion 2D conectada al motor 3D (mover/rotar por API).
- Logica matematica separada en src/plan2d/*.js.

### Catalogo y datos

- src/catalog/buildCatalogFromXml.js construye catalogo dinamico desde XML.
- src/data/*.js carga XML de productos, precios y materiales.
- src/services/*.js y src/mepal/* proveen loaders/fabricas/reglas por familia de producto.

### Dominios de producto (Mepal/Koncisa)

- Estructura por subdominios:
  - src/mepal/ares
  - src/mepal/clak
  - src/mepal/eduk
  - src/mepal/salud
  - src/mepal/tekSocial
  - src/mepal/zen
  - src/mepal/koncisaPlus (el mas extenso)
- Patron predominante: catalog -> productDefinition -> factory -> rules/parts/builders.

### Historial y clipboard

- Historial unificado en src/history/historyManager.js.
- Clipboard serializable en src/clipboard/clipboardManager.js.
- Fabrica de pegado por constructores en src/clipboard/clipboardPasteFactory.js.

## 4. Flujo principal

1. Inicio de app:
- main.jsx renderiza AppRoot dentro de AuthProvider.

2. Autenticacion:
- AppRoot muestra Login o App segun usuario.
- Permisos de rol activan modo editable o solo lectura.

3. Carga de datos iniciales:
- App.jsx carga:
  - Catalogo (ptsinbom + precios por pais).
  - Materiales (gen-esp + pisos).
  - Categorias/tipologias.

4. Inicializacion de motor 3D:
- ThreeCanvas crea escena y expone API via onApiReady.
- App guarda esa API en threeApiRef.

5. Edicion de proyecto:
- Usuario agrega items desde LeftPanel/Catalogo.
- ThreeCanvas resuelve si agrega GLB, procedural o ensamblajes (tipologias, Mepal, Koncisa).
- Seleccion y transformaciones se sincronizan entre 3D y 2D.

6. Vista 2D y CAD:
- Plan2DOverlay consume snapshot 2D desde ThreeCanvas.
- Cambios de movimiento/rotacion en 2D aplican sobre objetos 3D por API.

7. BOM y propiedades:
- Cada cambio dispara recalculo BOM en ThreeCanvas.
- App muestra BOMWindow/BOMView y panel de propiedades.

8. Persistencia y salida:
- Guardar/cargar proyecto JSON.
- Exportar GLB, DXF, SVG/PNG/PDF y PPT.

## 5. Punto de entrada

### Entrada web

- src/main.jsx

### Entrada desktop

- electron/main.js
- Electron abre BrowserWindow y carga http://localhost:5173 (depende de Vite en ejecucion).

## 6. Modulos principales

### Nucleo aplicacion

- src/App.jsx
- src/AppRoot.jsx
- src/auth/AuthContext.jsx

### Render y edicion 3D

- src/components/ThreeCanvas.jsx
- src/materials/*
- src/factories/*
- src/rules/*

### CAD 2D

- src/components/Plan2DOverlay.jsx
- src/plan2d/*
- src/constraints/*

### Catalogo y carga de datos

- src/catalog/*
- src/data/*
- src/services/*

### Familias de producto

- src/mepal/*
- src/mepal/koncisaPlus/*

### Historial / clipboard

- src/history/*
- src/clipboard/*

### Exportaciones

- src/utils/exportGLTF.js
- src/utils/exportDXF.js
- src/utils/planExport.js
- src/exports/exportPPT.js

### Shell desktop

- electron/main.js
- electron/preload.js

## 7. Dependencias

Dependencias runtime declaradas:

- dxf-writer
- exceljs
- pdfjs-dist
- pptxgenjs
- react
- react-dom
- three-stdlib
- xlsx
- xlsx-js-style

Dependencias de desarrollo declaradas:

- @eslint/js
- @types/react
- @types/react-dom
- @vitejs/plugin-react
- electron
- eslint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- globals
- vite

Observacion importante:

- El codigo importa tambien three de forma directa en multiples archivos (ej. ThreeCanvas.jsx, exportGLTF.js), pero three no aparece listado explicitamente en dependencies del package.json observado. Si three no llega transitivamente desde otra dependencia, esto puede romper instalacion/build en entorno limpio.

## 8. Como compila

Script de build:

- npm run build -> vite build

Estado verificado en este workspace:

- El comando falla actualmente porque vite no esta disponible en el entorno (dependencias no instaladas localmente en esta sesion):
  - mensaje: "vite no se reconoce como un comando interno o externo..."

Interpretacion:

- La cadena de compilacion esperada es correcta (Vite), pero requiere instalacion previa de dependencias (npm install).

## 9. Como se ejecuta

### Modo web (desarrollo)

- npm run dev
- Abre servidor Vite en localhost:5173

### Modo desktop (Electron)

- npm run electron
- electron/main.js intenta cargar directamente http://localhost:5173

Implicacion operativa:

- Para ejecutar desktop en desarrollo, primero debe estar levantado Vite.
- No existe script combinado tipo "electron:dev" que inicie ambos procesos automaticamente.

### Modo preview de build

- npm run build
- npm run preview

## 10. Riesgos tecnicos

### Riesgo alto: concentracion excesiva de logica critica en ThreeCanvas

- src/components/ThreeCanvas.jsx tiene ~8377 lineas.
- Agrupa rendering, reglas de negocio, historial, BOM, clipboard, import/export, seleccion y dominio Koncisa/Mepal.
- Impacto: alta complejidad ciclomatica, baja testabilidad, alto riesgo de regresiones por cambios cruzados.

### Riesgo alto: acoplamiento fuerte App <-> ThreeCanvas API interna

- App depende de un contrato muy extenso de metodos expuestos por onApiReady.
- No hay tipado formal del contrato (JS plano), por lo que errores por renombre/cambio de firma se detectan tarde.

### Riesgo alto: cobertura de tests no visible

- No se observaron suites de pruebas automatizadas en la estructura revisada.
- En un sistema con undo/redo, ensamblajes y BOM, la ausencia de pruebas de regresion es critica.

### Riesgo medio-alto: flujo Electron dependiente de servidor dev

- electron/main.js carga URL fija de Vite localhost.
- No se observa manejo de carga de build empaquetado para produccion desktop.
- Riesgo de friccion en despliegue/ejecucion fuera del entorno dev.

### Riesgo medio: dependencias y entorno no reproducible automaticamente

- Build fallo por falta de vite ejecutable (dependencias no instaladas en sesion).
- No hay evidencia en README de instrucciones propias del proyecto (README parece plantilla Vite).

### Riesgo medio: fuentes de datos heterogeneas y fragiles

- Mezcla XML, JSON, rutas estaticas y convenciones de nombres de archivos GLB.
- Cambios en naming/rutas de assets pueden romper carga en runtime.

### Riesgo medio: logica de negocio de producto embebida en UI/runtime

- Muchas reglas de Koncisa/ductos/integraciones estan invocadas desde ThreeCanvas y dependen de userData mutable.
- Puede dificultar evolucion de reglas y pruebas unitarias aisladas.

### Riesgo medio: uso de autenticacion local de demostracion

- src/auth/AuthContext.jsx usa usuarios hardcodeados y localStorage.
- Adecuado para demo interna, no para seguridad real.

### Riesgo medio-bajo: performance en escenas grandes

- Recalculo frecuente de helpers, bounds, floor/grid y BOM ante interacciones.
- Sin virtualizacion/segmentacion explicita, puede degradar con muchos objetos.

## Conclusiones ejecutivas

- El proyecto ya resuelve un problema de alto valor: configuracion espacial CAD 3D/2D con salida comercial (BOM y exportes).
- La arquitectura funcional existe y es rica en capacidades, pero esta muy centralizada en pocos componentes grandes.
- El principal desafio tecnico no es falta de funcionalidad, sino sostenibilidad y control de regresiones en evolucion futura.

## Archivos revisados (muestra principal)

- package.json
- vite.config.js
- electron/main.js
- electron/preload.js
- src/main.jsx
- src/AppRoot.jsx
- src/App.jsx
- src/auth/AuthContext.jsx
- src/components/ThreeCanvas.jsx
- src/components/Plan2DOverlay.jsx
- src/components/TopMenuBar.jsx
- src/components/LeftPanel.jsx
- src/components/CatalogPanel.jsx
- src/history/historyManager.js
- src/clipboard/clipboardManager.js
- src/clipboard/clipboardPasteFactory.js
- src/clipboard/pasteClipboard.js
- src/catalog/buildCatalogFromXml.js
- src/catalog/catalogData.js
- src/catalog/modelRegistry.js
- src/data/xmlLoader.js
- src/data/ptsLoader.js
- src/data/priceListLoader.js
- src/services/tipologiasDetalle.js
- src/services/chairsLoader.js
- src/services/plantsLoader.js
- src/services/officeAccessoriesLoader.js
- src/utils/exportGLTF.js
- src/utils/exportDXF.js
- src/utils/planExport.js
- src/exports/exportPPT.js

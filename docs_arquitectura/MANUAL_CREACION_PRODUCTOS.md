# Manual simple para crear productos

Fecha: 2026-08-06

## Que hace este manual

Este documento explica, en lenguaje simple, como se crea un producto nuevo en la aplicacion.

La idea es que puedas entender el proceso aunque no programes, y que sepas que pedir o revisar para no dañar lo que ya funciona.

Este manual sirve para:

- Productos simples.
- Productos con varias piezas.
- Productos con variantes, acabados o reglas especiales.

## La idea mas importante

En este proyecto hay 3 capas:

1. La pantalla donde el usuario llena datos.
2. La logica que decide que piezas debe tener el producto.
3. El visor 3D que dibuja esas piezas en pantalla.

No se debe mezclar todo en un solo sitio.

## Como funciona un producto

Cuando se crea un producto, pasa esto:

1. El usuario llena un formulario.
2. El sistema toma esos datos.
3. Una logica interna decide que piezas hacen parte del producto.
4. El visor 3D crea esas piezas.
5. El sistema calcula el inventario/BOM.
6. El usuario puede mover, rotar, borrar, copiar y exportar.

## Ejemplo real: Koncisa Plus

Koncisa Plus es el mejor ejemplo para seguir porque ya usa la estructura correcta.

### Donde se define la pantalla

- [src/components/KoncisaPlusPanel.jsx](src/components/KoncisaPlusPanel.jsx)

Aqui el usuario elige cosas como:

- Cantidad de puestos.
- Tipo de puesto.
- Medidas.
- Acabados.
- Ductos.
- Pantallas.
- Opciones especiales.

### Donde se activa desde la interfaz general

- [src/components/LeftPanel.jsx](src/components/LeftPanel.jsx#L1419)

Aqui la aplicacion toma lo que el usuario lleno y llama la creacion del producto.

### Donde se arma el producto

- [src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js](src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js)

Esta pieza es la que “monta” el producto completo.

### Donde se decide que piezas lleva

- [src/mepal/koncisaPlus/builders/KoncisaPlusBuilder.js](src/mepal/koncisaPlus/builders/KoncisaPlusBuilder.js)
- [src/mepal/koncisaPlus/rules/koncisaRules.js](src/mepal/koncisaPlus/rules/koncisaRules.js)

Aqui se definen las reglas:

- Que piezas lleva.
- Donde van ubicadas.
- Como se llaman.
- Que codigo tienen.

## Que debes tener claro antes de crear un producto nuevo

Antes de empezar, responde estas preguntas:

- El producto es una sola pieza o varias piezas?
- Tiene medidas fijas o varias opciones?
- Tiene lados, variantes o versiones?
- Debe aparecer en BOM?
- Debe poder copiarse y pegarse?
- Debe poder moverse como grupo?
- Debe exportarse a GLB, DXF o PDF?

Si no sabes la respuesta, primero hay que definirla con negocio o diseño.

## Como crear un producto nuevo sin dañar el sistema

### Paso 1. Define el producto en papel

Antes de tocar archivos, escribe algo simple como esto:

- Nombre del producto.
- Cuantas piezas tiene.
- Cuales son sus medidas.
- Que variantes tiene.
- Que piezas son obligatorias.
- Que piezas son opcionales.

### Paso 2. Crea una carpeta propia

No mezcles tu producto con otros.

La idea es crear una carpeta parecida a Koncisa Plus, por ejemplo:

- src/mepal/nuevoProducto/

Dentro puedes organizar:

- rules/
- parts/
- builders/
- factories/
- serialization/ (si hace falta)

### Paso 3. Define las reglas

Aqui se decide la logica del producto.

Ejemplo de preguntas que deben responder las reglas:

- Si mide 1000, que pieza usa?
- Si mide 1200, que codigo corresponde?
- Si es lado izquierdo o derecho, cambia algo?
- Si lleva accesorio, se agrega o no?

Importante:

- Esta parte no debe dibujar nada.
- Esta parte solo decide.

### Paso 4. Define las piezas

Cada pieza del producto debe tener una descripcion clara.

Por ejemplo:

- Costado.
- Superficie.
- Ducto.
- Grommet.
- Pasacable.
- Accesorio.

Cada pieza debe saber:

- Como se llama.
- Que codigo tiene.
- Que medidas tiene.
- A que grupo pertenece.
- Si es fija o intercambiable.

### Paso 5. Construye el producto completo

Aqui se arma el producto final.

La logica debe:

- Leer los datos de entrada.
- Decidir las piezas.
- Ordenar las piezas.
- Mandar todo al visor 3D.

En Koncisa Plus, esta parte hace el trabajo de ensamblar el puesto completo.

### Paso 6. Conecta la pantalla con la logica

La pantalla solo debe recoger datos y mandar la orden de crear.

No debe tener reglas complejas.

La pantalla debe decir algo como:

- “Crear producto con estas medidas y opciones”.

No debe decidir por si sola que pieza usar.

### Paso 7. Conecta el producto al visor 3D

El visor 3D es el que dibuja realmente el producto.

Para no romper el sistema, las piezas deben entrar al visor por los metodos ya existentes.

No se deben meter objetos manualmente por fuera del flujo.

## Reglas de oro para no romper nada

### 1. No hagas un sistema nuevo de seleccion

Ya existe uno.

### 2. No hagas un historial nuevo

Ya existe uno.

### 3. No hagas un clipboard nuevo

Ya existe uno.

### 4. No hagas otro BOM

Ya existe uno.

### 5. No mezcles unidades

- En las reglas y datos usa milimetros.
- En el visor 3D se convierte a metros.

### 6. Cada pieza debe tener identidad

Cada pieza debe conservar:

- Un id unico.
- Un grupo.
- Un padre si pertenece a un ensamblaje.

Si esto se pierde, empiezan los problemas con mover, borrar, copiar y exportar.

## Como se ve la logica de Koncisa Plus en palabras simples

Koncisa Plus funciona asi:

1. El usuario configura el puesto.
2. El sistema convierte esa configuracion en piezas.
3. Las piezas se crean en el visor 3D.
4. El sistema guarda la relacion entre las piezas.
5. El usuario puede editar el puesto como un todo.

Por eso Koncisa Plus no es solo un modelo 3D.

Es un conjunto de reglas + piezas + visor.

## Si el producto es parecido a Koncisa Plus

Si quieres hacer otro producto con la misma logica, sigue este orden:

1. Copia el patron de estructura, no el codigo entero.
2. Crea tu carpeta propia.
3. Define tus reglas.
4. Define tus piezas.
5. Crea la fabrica del producto.
6. Conecta el formulario de la pantalla.
7. Prueba que funcione en el visor 3D.
8. Verifica BOM, copiar/pegar, borrar y exportar.

## Que revisar siempre antes de darlo por terminado

Checklist simple:

- El producto aparece bien en pantalla.
- Las piezas se ven donde deben ir.
- Se puede seleccionar sin errores.
- Se puede mover y rotar.
- Se puede borrar.
- Se puede copiar y pegar.
- El BOM sale correcto.
- El proyecto se puede guardar y abrir.
- Los exportes funcionan.

## Errores comunes

- Meter piezas directo al visor sin pasar por la logica del producto.
- Olvidar el grupo del ensamblaje.
- Usar medidas mezcladas entre milimetros y metros.
- Guardar cosas que no se pueden copiar o guardar.
- Repetir reglas que ya existen.
- Cambiar la seleccion o el historial por fuera del sistema actual.

## Resumen corto

Si quieres crear un producto nuevo sin dañar el sistema:

- Primero define el producto.
- Luego define sus reglas.
- Luego define sus piezas.
- Luego conectalo al visor 3D.
- Finalmente prueba todo el flujo.

Si el producto debe parecerse a Koncisa Plus, usa la misma estructura de:

- Panel de usuario.
- Reglas.
- Builder.
- Factory.
- Visor 3D.

Eso es lo mas seguro para que todo siga funcionando.

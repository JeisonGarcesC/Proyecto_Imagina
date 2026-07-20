# AGENTS.md

# Proyecto

Este proyecto corresponde al configurador 3D Proyecto_Imagina desarrollado en React.

El objetivo es implementar nuevas funcionalidades sin romper la compatibilidad existente.

Antes de modificar código, entender siempre el flujo actual.

---

# Tecnologías

- React
- Vite
- Electron
- JavaScript ES6
- Three.js
- Git
- GitHub

---

# Convenciones

Siempre reutilizar componentes existentes antes de crear nuevos.

No duplicar lógica.

No crear funciones innecesarias.

Mantener nombres consistentes con el proyecto.

No cambiar nombres de archivos salvo que sea solicitado.

---

# Estilo

Preferir funciones pequeñas.

Comentar únicamente cuando sea necesario.

Mantener imports ordenados.

No dejar código muerto.

---

# Antes de modificar

Siempre analizar:

- No poner o usar nombres que ya se esten usando
- quién usa esa función
- qué archivos dependen de ella
- efectos secundarios
- La prioridad siempre es mantener compatibilidad con el comportamiento actual.
- Si existe una solución que requiera menos cambios, preferir esa.

Explicar brevemente el impacto antes de modificar.

---

# Cambios grandes

Para cambios que afecten múltiples archivos:

1. explicar el plan
2. listar archivos
3. realizar cambios
4. si existe ambigüedad en el requerimiento:

- NO asumir.
- Preguntar primero.

---

# React

Usar Hooks.

No introducir librerías nuevas sin autorización.

Mantener la estructura existente.

No mover componentes entre carpetas sin justificación.

---

# ThreeJS

Respetar la estructura actual.

No modificar escalas ni offsets existentes salvo solicitud.

Mantener compatibilidad con los modelos GLB actuales.

---

# Git

Nunca hacer commit.

Nunca hacer push.

Nunca cambiar ramas.

El usuario realiza todo el control de versiones mediante GitHub Desktop.

---

# Cuando exista un bug

Primero identificar la causa.

Después proponer solución.

Luego implementarla.

No hacer cambios por prueba y error.

---

# Comunicación

Explicar siempre:

- qué cambió
- por qué cambió
- archivos modificados
- posibles riesgos

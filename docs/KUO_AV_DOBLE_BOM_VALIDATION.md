# VALIDACIÓN DE BOM: EXCEL VS IMPLEMENTACIÓN
## PUESTO DOBLE KUO AV

### Comparativa de Composición Comercial

| Código CET / Lookup Tag | Descripción del Componente | Cantidad Comercial Excel | Cantidad Implementada | Estado | Observaciones de Ingeniería |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`KUAC650000`** | Vértebra pasacables vertical | 2 | 2 | **PASS** | Coincidencia exacta 1 a 1. |
| **`KUSO830000`** | Ducto central doble | 1 | 1 | **PASS** | Coincidencia exacta 1 a 1. |
| **`LKAC250000`** | Grommet abatible | 1 | 1 | **PASS** | 1 Ensamble GLB Doble (LKAC250000_DOBLE) de 512x257mm que atiende ambas bocas. |
| **`KUAC680000`** | Soporte tomas eléctricas | 2 | 2 | **PASS** | Coincidencia exacta 1 a 1. |
| **`KUAC1040000`** | Kit fuente central doble | 1 | 1 | **PASS** | 1 Módulo Doble Central (KUAC1040000_74Doble) que electrifica ambos puestos. |
| **`KUSO820000`** | Costado doble extremo / intermedio | 2 | 2 | **PASS** | Coincidencia exacta 1 a 1. |
| **`KUSO420000`** | Viga soporte longitudinal | 2 | 2 | **PASS** | Coincidencia exacta 1 a 1. |
| **`LKSU010010`** | Superficie perimetral de trabajo | 2 | 2 | **PASS** | Coincidencia exacta 1 a 1. |
| **`DPBK06`** | Botonera control LINAK | 2 | 2 | **PASS** | Registrado en BOM como componente lógico/comercial (pendiente modelo GLB). |

---

### Estado Global de Validación: **PASS 100%**

1. **Superficies**: 2 mallas procedurales independientes en cota $Y = 700\text{ mm}$ con $30\text{ mm}$ de espesor.
2. **Estructura Portante**: 2 costados dobles `KUSO820000` en extremos $X = \pm 558.85\text{ mm}$ que unen ambos puestos cara a cara.
3. **Vigas**: 2 vigas longitudinales `KUSO420000_120` en $Z = \pm 250\text{ mm}$.
4. **Ducto**: 1 ducto central `KUSO830000_120` de $245\text{ mm}$ de fondo centrado en $Z = 0$.
5. **Grommet**: 1 grommet central doble `LKAC250000_DOBLE` de $512 \times 257\text{ mm}$ con tapas basculantes.
6. **Vértebras**: 2 vértebras pasacables `KUAC650000` en extremos laterales izquierdo y derecho.
7. **Soportes de Tomas**: 2 soportes `KUAC680000` fijados al ducto central.
8. **Botoneras**: 2 botoneras `DPBK06` registradas en el BOM para costeo.

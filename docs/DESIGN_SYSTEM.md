# TenderOps Liquid Design System

## Identidad

Azul corporativo, cristal translúcido y orden operativo. La interfaz debe sentirse precisa, no genérica.

## Paleta

| Uso | Token | Valor |
|---|---|---|
| Azul profundo | `--to-deep` | `#0B2347` |
| Azul corporativo | `--to-corporate` | `#175CD3` |
| Azul eléctrico | `--to-electric` | `#3267F5` |
| Azul brillante | `--to-bright` | `#4A90FF` |
| Azul cian | `--to-cyan` | `#65CDF5` |
| Azul claro | `--to-mist` | `#EDF5FF` |
| Fondo | `--to-canvas` | `#F7FAFF` |
| Blanco cristal | `--to-crystal` | `#FFFFFF` |
| Texto | `--to-ink` | `#142B4F` |
| Texto secundario | `--to-muted` | `#7486A3` |

Tipografía: Segoe UI (con Tahoma y sans-serif de sistema como respaldo).

## Liquid Glass

- Superficies `.glass-panel` con desenfoque 18px y borde luminoso.
- El menú derecho usa cristal oscuro sobre `#0B2347`.
- Las tablas usan `.table-surface` casi opaco para no perder legibilidad.
- El tema oscuro, el menú expandido y el restablecimiento de la demo viven en el flotante de accesibilidad.
- Las tablas usan filas enriquecidas (`.table-surface` + `DataTable`): jerarquía primaria/secundaria, cebras blanco/azul muy claro y sin columnas estrechas.

## Componentes de identidad

- `RightSidebar`: flotante, compacto 84px, expandido 268px, activo en cápsula azul.
- `FlowDrawer`: 420 / 560 / 760 px, nunca cubre el menú.
- `SelectionChip` y el resto del sistema de etiquetas: cápsula azul suave, aspa accesible.

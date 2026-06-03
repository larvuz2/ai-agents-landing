# agentesPRO — Landing

Landing page estática oficial de **agentesPRO** para vender instalación de agentes de AI en empresas.

**Dominio principal:** https://agentespro.app  
**Repo/proyecto local:** `/root/ai-agents-landing`  
**Nombre anterior de trabajo:** Larvuz AI Ops / Agentes de AI para Empresas

## Qué incluye

- Hero high-converting con CTA.
- Sección de “Ingresa tu página aquí” para test rápido.
- Cards de agentes: propuestas, seguimiento, reportes.
- Sección AI Mission Control.
- Proceso en 3 pasos.
- Paquetes comerciales.
- Casos de éxito / testimonios con placeholders para imágenes.
- Formulario temporal de interesados vía `mailto:`.
- Diseño responsive mobile-first.

## Configurar email de leads

En `index.html`, cambia:

```js
const CONFIG = {
  contactEmail: 'gus@metazooie.com',
  subjectPrefix: 'Interesado en agentes de AI'
};
```

Para producción conviene conectar Formspree, HubSpot, Airtable, Supabase o un endpoint propio para guardar leads sin depender de mailto.

## GitHub Pages

Este repo está listo para publicarse desde la rama `main`, carpeta raíz `/`.

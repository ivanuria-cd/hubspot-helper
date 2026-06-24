# Configurar e cambiar entre Produción e Sandbox

**Prerrequisitos:** ter o conector HubSpot configurado en polo menos un contorno (ver *Conectar a app con HubSpot*).
**Tempo estimado:** 3 minutos.

Cada proxecto admite dous contornos independentes de HubSpot: **Produción** e **Sandbox**, cada un co seu propio token e portal. O contorno activo é o destino de todas as operacións de escritura.

## Pasos

### Configurar o contorno sandbox

1. Abre o teu proxecto → **Configuración → Conectores → HubSpot**.
2. Selecciona a lapela **Sandbox**.
3. Pega o token do teu portal sandbox e preme **Gardar**.

### Cambiar o contorno activo

1. Na mesma pantalla, selecciona a lapela do contorno que queres activar.
2. Se está conectado e non é o activo, preme **Usar como contorno activo**.

O contorno activo móstrase de forma permanente como unha etiqueta na barra superior (**PROD** ou **SANDBOX**), visible desde calquera pantalla.

## Resultado esperado

- A etiqueta da barra superior reflicte o contorno activo.
- As operacións de lectura poden executarse contra calquera contorno configurado.
- As operacións de escritura usan sempre o contorno activo e mostran confirmación indicando o destino.

## Preguntas frecuentes

**Para que serve o sandbox?** Para probar automatizacións e cambios sen tocar datos reais. Configura primeiro en sandbox, valida, e logo replica en produción.

**Podo ter só produción?** Si. O contorno sandbox é opcional; se non o configuras, a app traballa unicamente con produción.

**Cambiei de contorno por erro.** Volve á pantalla do conector, selecciona o contorno correcto e preme **Usar como contorno activo**. O cambio é inmediato.

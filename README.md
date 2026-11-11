# PIB Insight — Red neuronal cloud y frontend local

**Asignatura:** Inteligencia Artificial — Universidad Manuela Beltrán  
**Objetivo:** entrenar una red neuronal con el archivo del docente, publicar una API cloud gratuita y mostrar resultados en un frontend web local.

## Precisión metodológica

Se leyó el archivo original `BASE DE CONOCIMIENTO PIB 2001 - 2011-1.xls` (hoja `Cuadro 2 Var. % Anual`). Su fila de encabezados identifica **8 variables de entrada**, `x1` a `x8`, y la variable `Y=Producto Interno Bruto`. Se preservaron las **11 observaciones anuales, de 2001 a 2011**, en `backend/datos/pib_2001_2011.csv`.

La variable Y está en una hoja titulada **variación porcentual anual**. La API devuelve **porcentaje de variación anual del PIB**; **NO** devuelve PIB en pesos, dólares ni una proyección independiente del PIB futuro. Todos los indicadores de entrada también son porcentajes del **mismo periodo**.

| Campo | Variable de la base |
|---|---|
| x1 | Importaciones Totales |
| x2 | Consumo Total |
| x3 | Consumo de Hogares |
| x4 | Consumo Final del Gobierno |
| x5 | Formación bruta de capital |
| x6 | Formación bruta de capital fijo |
| x7 | Demanda final interna |
| x8 | Exportaciones Totales |
| Y | Producto Interno Bruto (variación anual %) |

> **Límite crítico:** el dataset solo tiene 11 filas para 8 predictores. La red es una demostración académica, no un pronosticador económico validado para uso real. La evaluación usa 2001–2008 para entrenar y 2009–2011 para probar, y compara contra la media histórica. Luego se reentrena el artefacto final usando las 11 filas.

## Arquitectura

```text
Excel original (.xls)
        ↓ conversión fiel a CSV
Google Colab Free — entrenamiento en nube
        ↓ modelo_pib.joblib
GitHub — repositorio del proyecto
        ↓ despliegue
Render Free — FastAPI /predict (red neuronal servida en la nube)
        ↑ petición HTTP de predicción
Frontend local — HTML + CSS + JavaScript en localhost:5500
```

**Modelo:** `MLPRegressor` de scikit-learn, perceptrón multicapa de regresión, arquitectura **8→4→1**, activación `tanh`, normalización `StandardScaler`, optimizador `L-BFGS`, regularización L2, semilla fija 42. Es una red neuronal artificial auténtica, no una fórmula inventada.

## Paso 1 — Crear cuenta cloud y entrenar (Google Colab Free)

1. Ve a https://colab.research.google.com/ e inicia sesión con tu cuenta Google.
2. Elige **Archivo → Subir cuaderno** y selecciona `entrenamiento/Entrenamiento_PIB_Google_Colab.ipynb`.
3. Ejecuta la celda 1, luego **Entorno de ejecución → Reiniciar sesión**, y ejecuta el resto. Cuando lo solicite, sube `backend/datos/pib_2001_2011.csv`.
4. Captura para el video el código de la red, arquitectura, cantidad de datos, resultados reales/predichos y MAE.
5. Descarga el archivo generado **`modelo_pib.joblib`** y **reemplaza** `backend/modelo_pib.joblib` con el modelo exportado desde Colab. Puedes descargar también `reporte_entrenamiento.json`.

Nota: este ZIP trae un modelo **precargado de prueba generado fuera de Colab** para permitir ensayar la aplicación desde el primer día. Ese modelo *no cuenta como evidencia de entrenamiento en cloud*. Debes realizar el paso 1 antes de grabar tu entrega.

## Paso 2 — Probar todo localmente (opcional, recomendado)

Con Python instalado, abre dos terminales:

**Terminal A — API:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Prueba http://127.0.0.1:8000/docs o http://127.0.0.1:8000/health. En `/docs`, haz una prueba POST `/predict` con **8 valores numéricos**.

**Terminal B — web local:**

```bash
cd frontend
python -m http.server 5500
```

Abre http://127.0.0.1:5500 y usa `http://127.0.0.1:8000` como URL de servicio.

## Paso 3 — Desplegar API en Render Free

1. Crea un repositorio GitHub y carga las carpetas `backend`, `frontend` y `entrenamiento`.
2. Abre https://dashboard.render.com, regístrate y elige **New → Web Service**.
3. Conecta el repositorio GitHub. Configura:

| Campo Render | Valor |
|---|---|
| Servicio | Web Service |
| Plan | **Free** (no seleccionar servicio pago) |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path (si aparece) | `/health` |
| Variable de entorno | `PYTHON_VERSION` = `3.12.8` |

4. Después de desplegar, Render asigna una URL parecida a `https://nombre-servicio.onrender.com` (la tuya será diferente).
5. Prueba `https://TU_URL.onrender.com/health` y `https://TU_URL.onrender.com/docs`.

**Consideraciones del plan gratuito de Render:** la API se suspende luego de 15 minutos sin tráfico y puede tardar alrededor de un minuto en responder la primera vez. El filesystem es efímero, por eso el artefacto `.joblib` está versionado dentro de `backend`, no creado en disco después del arranque. Verifica que Render muestra explícitamente el plan **Free**; evita añadir tarjeta si no deseas posibles cargos adicionales por excesos.

## Paso 4 — Conectar frontend LOCAL con backend CLOUD

1. En una terminal: `cd frontend && python -m http.server 5500`.
2. Abre http://127.0.0.1:5500.
3. En “URL DEL SERVICIO”, pega la URL de Render y pulsa **Conectar**.
4. La interfaz muestra el estado de la API, ocho campos económicos y ejemplos históricos de 2007, 2009 y 2011.
5. Haz clic en **Generar predicción**: se envía `{ "entradas": [x1,x2,x3,x4,x5,x6,x7,x8] }` a `POST /predict` y se visualiza el porcentaje devuelto desde la nube.
6. Si usas ejemplos de un año ya incluido en entrenamiento final, **no** presentes esa comparación como evaluación independiente. La evaluación cronológica está en `reporte_entrenamiento.json`.

## Paso 5 — Video de sustentación (propuesta: 4–6 minutos)

**0:00–0:45:** enunciado del proyecto y cloud elegidas. Mostrar Google Colab y su exploración de servicios de IA.  
**0:45–1:30:** cargar CSV, explicar las ocho variables (x1..x8) y que Y es variación porcentual del PIB.  
**1:30–2:30:** explicar red MLP 8→4→1, escalado, entrenamiento y MAE del conjunto de prueba.  
**2:30–3:20:** mostrar exportación de `modelo_pib.joblib`, GitHub, URL y documentación Swagger de la API en Render.  
**3:20–4:50:** abrir el frontend en **localhost**, introducir ocho indicadores y generar una predicción. Mostrar DevTools → Network para demostrar que se consumió la API **en la nube**.  
**4:50–5:30:** reconocer limitación de 11 observaciones y cerrar.

## Estructura de archivos

```text
pib_ia_cloud_umb/
├── README.md
├── entrenamiento/
│   └── Entrenamiento_PIB_Google_Colab.ipynb
├── backend/
│   ├── datos/pib_2001_2011.csv
│   ├── train.py
│   ├── main.py
│   ├── requirements.txt
│   ├── modelo_pib.joblib
│   ├── config.json
│   └── reporte_entrenamiento.json
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Evidencias de evaluación

Se validó localmente con 8 registros (2001–2008) para entrenamiento y 3 (2009–2011) para prueba. **No confundir esa validación con el modelo final**, que después se ajusta con las 11 observaciones para servir peticiones. Estos resultados dependen del dataset y del modelo, y deben verificarse nuevamente en Colab.

| Indicador | Valor de la ejecución inicial |
|---|---:|
| MAE red neuronal | 1.4708 puntos porcentuales |
| MAE predictor media histórica | 2.8999 puntos porcentuales |
| Año 2009 real/predicho | 5.7158 % / 8.4067 % |
| Año 2010 real/predicho | 7.8148 % / 8.7815 % |
| Año 2011 real/predicho | 11.2041 % / 10.4491 % |

No prometemos resultados confiables fuera de la muestra y evitamos llamar al sistema *pronóstico autónomo del PIB futuro*.

## Seguridad y datos

La API acepta 8 números, permite peticiones de diferentes orígenes por CORS y se publica para demostración académica. No subas claves a GitHub. Si conviertes esto en una app pública, debes agregar límites de uso, validación de entradas más estricta, autenticación si procede y restringir CORS.

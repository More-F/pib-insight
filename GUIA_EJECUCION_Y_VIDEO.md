# PIB Insight — Guía de ejecución y guion del video

Esta guía lleva el proyecto de cero a la entrega y cubre los 5 puntos de la actividad.

| Punto de la guía | Cómo se cumple |
|---|---|
| 1. Crear cuenta cloud | Cuenta Google → Google Colab (y Render para publicar la API) |
| 2. Explorar servicios de IA | Recorrido por el catálogo de IA de Google Cloud (Vertex AI) en el video |
| 3. Entrenar una red neuronal con la base | Notebook `Entrenamiento_PIB_Google_Colab.ipynb` (MLP 8→4→1) |
| 4. Video explicando el entrenamiento | Guion de la parte B de esta guía |
| 5. App web que consuma la red y prediga el PIB | `frontend/` local → API FastAPI en Render |

---

## PARTE A — Ejecutar el proyecto (hacerlo ANTES de grabar)

### Requisitos
- Cuenta Google y cuenta GitHub.
- Python 3.10 o superior en el PC, solo para servir el frontend. Comprobar con `python --version`.

### A1. Entrenar en Google Colab (unos 10 minutos)
1. Descomprime el ZIP.
2. Entra a https://colab.research.google.com y abre **Archivo → Subir cuaderno** → `entrenamiento/Entrenamiento_PIB_Google_Colab.ipynb`.
3. Ejecuta la **celda 1**. Luego ve a **Entorno de ejecución → Reiniciar sesión**.
4. Ejecuta el resto de celdas en orden con Shift+Enter. En la celda 3 sube `backend/datos/pib_2001_2011.csv`.
5. La última celda descarga `modelo_pib.joblib`, `reporte_entrenamiento.json` y `config.json`.
   - Si el navegador pregunta, permite las descargas múltiples.
6. Copia esos 3 archivos dentro de `backend/` y reemplaza los que había.

### A2. Subir a GitHub (unos 5 minutos)
1. En https://github.com/new crea un repositorio **público** llamado, por ejemplo, `pib-insight`.
2. Elige **uploading an existing file** y arrastra el **contenido** de la carpeta `PIB_IA_Cloud_UMB`. La raíz del repositorio debe quedar con `backend/`, `frontend/`, `entrenamiento/`, `README.md`, etc.
3. Dale **Commit changes**.

### A3. Publicar la API en Render (unos 10 minutos)
1. Entra a https://dashboard.render.com, crea la cuenta con GitHub y elige **New → Web Service**.
2. Escoge el repositorio `pib-insight` y configúralo así:

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Free** |
| Environment Variable | `PYTHON_VERSION` = `3.12.8` |

3. Dale **Deploy** y espera a que diga **Live**.
4. Copia la URL. Será algo como `https://pib-insight-xxxx.onrender.com`.
5. Prueba en el navegador:
   - `TU_URL/health` debe responder `{"estado":"activo",...}`.
   - `TU_URL/docs` abre Swagger. Prueba ahí `POST /predict` con 8 números.

> El plan Free se duerme tras 15 minutos sin uso. Antes de grabar, abre `/health` y espera hasta un minuto a que despierte.

### A4. Ejecutar el frontend local conectado a la nube
```bash
cd frontend
python -m http.server 5500
```
1. Abre http://127.0.0.1:5500.
2. En **URL DEL SERVICIO** pega la URL de Render y dale **Conectar**. Debe aparecer **API conectada**.
3. Elige un ejemplo (2007, 2009 o 2011) o escribe tus valores y dale **Generar predicción**.

### Problemas comunes
| Síntoma | Causa y solución |
|---|---|
| Render falla con `InconsistentVersionWarning` o error al cargar el `.joblib` | No reiniciaste la sesión de Colab después de la celda 1. Vuelve a entrenar. |
| Render no encuentra `requirements.txt` | El Root Directory no es `backend`, o subiste la carpeta dentro de otra carpeta. |
| El frontend dice "Sin conexión" | Render está dormido: abre `/health`, espera y vuelve a conectar. Revisa que la URL empiece por `https://` y no termine en `/`. |
| `python` no se reconoce en Windows | Usa `py -m http.server 5500`. |

---

## PARTE B — Guion del video (5–7 minutos)

Recomendado: grabar con OBS o con la grabadora de Windows (Win+Alt+R), con micrófono. Tengan las pestañas abiertas de antemano: Google Cloud, Colab, GitHub, Render y el frontend.

### 1. Introducción (0:00–0:30)
- **Mostrar:** la diapositiva o el README con el objetivo.
- **Decir:** "Construimos una red neuronal que estima la variación porcentual anual del PIB de Colombia a partir de 8 indicadores macroeconómicos, la entrenamos en la nube y la consumimos desde una aplicación web."

### 2. Cuenta cloud y exploración de servicios de IA (0:30–1:30) → Puntos 1 y 2
- **Mostrar:** sesión iniciada en la cuenta Google, la consola https://console.cloud.google.com y el catálogo de IA, buscando **Vertex AI** en la barra.
- Pasar por: **Model Garden** (modelos preentrenados como Gemini), **AutoML/Entrenamiento** (modelos personalizados), **Workbench / Colab Enterprise** (notebooks en la nube) y las APIs de **Vision, Speech y Natural Language**.
- **Opcional:** mencionar que intentaron Azure for Students y la verificación académica de la universidad no fue aceptada. Eso muestra que exploraron más de una nube.
- **Decir:** por qué escogieron Colab: es gratuito, no pide tarjeta, corre en máquinas de Google y permite entrenar una red neuronal propia con código.

### 3. La base de conocimiento (1:30–2:15)
- **Mostrar:** el `.xls` del profesor (hoja *Cuadro 2 Var. % Anual*) y luego la celda 4 del notebook con la tabla.
- **Decir:** "Tenemos 11 años, de 2001 a 2011, 8 entradas (x1–x8) y una salida, Y = variación % del PIB. No es el PIB en pesos sino su crecimiento porcentual."

### 4. Entrenamiento de la red neuronal (2:15–3:45) → Punto 3 (el más importante)
- **Mostrar:** la celda 2, que comprueba que se está ejecutando en una máquina de Google en la nube.
- **Mostrar:** la función `build_model()` y explicar la arquitectura:
  - **Capa de entrada:** 8 neuronas, una por indicador.
  - **Capa oculta:** 4 neuronas con activación **tanh**.
  - **Capa de salida:** 1 neurona, el % del PIB.
  - **StandardScaler:** normaliza los datos para que todas las variables pesen igual.
  - **Optimizador L-BFGS:** sirve bien con pocos datos. La **regularización L2** (`alpha`) evita el sobreajuste.
- **Mostrar:** la ejecución de la celda 5 y explicar la validación: entrena con 2001–2008 y prueba con 2009–2011 (años que la red no vio).
- **Mostrar:** el resultado: **MAE ≈ 1,47 puntos porcentuales**, contra **2,90** del predictor de la media. La red se equivoca la mitad.
- **Mostrar:** la celda 6, con la forma de los pesos `(8,4)` y `(4,1)`, y la gráfica de real contra predicho.
- **Decir:** después de evaluar, se entrena el modelo final con los 11 años y se exporta `modelo_pib.joblib`.

### 5. Despliegue en la nube (3:45–4:45)
- **Mostrar:** la celda 7 descargando el modelo, el repositorio en GitHub con el modelo dentro de `backend/`, y Render con el servicio en **Live** y el plan **Free**.
- **Mostrar:** `TU_URL/docs` (Swagger) y hacer un `POST /predict` en vivo.
- **Decir:** la API está hecha con **FastAPI**. Recibe 8 valores, la red los procesa en el servidor de Render y devuelve el % estimado.

### 6. Aplicación web consumiendo la red (4:45–6:00) → Punto 5
- **Mostrar:** el frontend en `127.0.0.1:5500`. Pegar la URL de Render, **Conectar** y ver **API conectada**.
- **Mostrar:** cargar el ejemplo **2009** (año de crisis) y **Generar predicción**.
- **Abrir F12 → Network:** que se vea la petición `predict` hacia `onrender.com` con su respuesta JSON. Esto prueba que la predicción viene de la nube.
- **Mostrar:** cambiar un valor, por ejemplo subir las exportaciones, y ver cómo cambia la predicción.

### 7. Cierre y limitaciones (6:00–6:30)
- **Decir:** "Con solo 11 registros el modelo sirve para demostrar el proceso, no como pronóstico económico real. Con más años de datos del DANE se podría mejorar."

---

## Checklist antes de entregar
- [ ] Notebook ejecutado en Colab, con sus salidas visibles.
- [ ] Los 3 archivos descargados de Colab reemplazados en `backend/` y subidos a GitHub.
- [ ] Render en **Live** y `/health` respondiendo.
- [ ] Frontend conectado a la URL de Render y predicción funcionando.
- [ ] Video grabado con las 7 secciones.
- [ ] En la entrega: enlace del video, enlace del repositorio GitHub y URL de la API.

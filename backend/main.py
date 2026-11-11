"""API pública para demostración académica, no asesoría económica."""
from pathlib import Path
import json
import math
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT=Path(__file__).resolve().parent
with (ROOT/'config.json').open(encoding='utf-8') as f: CONFIG=json.load(f)
ARTIFACT=joblib.load(ROOT/'modelo_pib.joblib')
MODEL=ARTIFACT['modelo']
app=FastAPI(title='PIB IA — Red neuronal en la nube', version='1.0.0',
            description='Predicción académica de variación anual del PIB a partir de 8 indicadores.')
# En proyecto académico: front local puede correr en puertos 5500/5173.
# Para producción restringirlo a orígenes conocidos.
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=False,
                   allow_methods=['GET','POST'],allow_headers=['*'])

class Data(BaseModel):
    entradas: list[float] = Field(min_length=8,max_length=8,
                                  description='x1..x8: tasas porcentuales anuales')

@app.get('/health')
def health():
    return {'estado':'activo','modelo':'MLPRegressor 8-4-1','periodo':'2001–2011'}

@app.get('/config')
def config():return CONFIG

@app.post('/predict')
def predict(payload:Data):
    values=payload.entradas
    if any(not math.isfinite(x) for x in values):
        raise HTTPException(status_code=422,detail='Los ocho indicadores deben ser números finitos.')
    warnings=[]
    for n,(v,field) in enumerate(zip(values,CONFIG['campos']),1):
        if v < field['min'] - 0.01 or v > field['max'] + 0.01:
            warnings.append(f"x{n} ({field['nombre']}) fuera de rango histórico [{field['min']}, {field['max']}].")
    guess=float(MODEL.predict(np.array([values],dtype=float))[0])
    if not math.isfinite(guess):
        raise HTTPException(status_code=500,detail='El modelo no produjo una predicción válida.')
    return {
      'pib_estimado_pct':round(guess,4),
      'unidad':'variación porcentual anual (%)',
      'modelo':'Red neuronal MLP 8→4→1',
      'advertencias':warnings,
      'nota':'Estimación académica con solo 11 registros históricos; no es una proyección económica fiable.'
    }

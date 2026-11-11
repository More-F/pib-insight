"""Entrenamiento reproducible del perceptrón multicapa (red neuronal) para PIB.
Uso: python train.py
El conjunto solo contiene 11 años (2001-2011); uso didáctico exclusivamente.
"""
from pathlib import Path
import csv
import json
import numpy as np
import joblib
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.neural_network import MLPRegressor
from sklearn.compose import TransformedTargetRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / 'datos' / 'pib_2001_2011.csv'
FEATURES = ['importaciones', 'consumo_total', 'consumo_hogares', 'consumo_gobierno',
            'formacion_capital', 'formacion_capital_fijo', 'demanda_interna', 'exportaciones']
LABELS = ['Importaciones totales', 'Consumo total', 'Consumo de hogares',
          'Consumo final del Gobierno', 'Formación bruta de capital',
          'Formación bruta de capital fijo', 'Demanda final interna', 'Exportaciones totales']


def load_data():
    with CSV_PATH.open(encoding='utf-8', newline='') as f:
        data = list(csv.DictReader(f))
    x = np.array([[float(r[k]) for k in FEATURES] for r in data], dtype=float)
    y = np.array([float(r['pib']) for r in data], dtype=float)
    years = [int(r['anio']) for r in data]
    return x, y, years


def build_model():
    # MLP = red neuronal de tipo perceptrón multicapa; estandarización indispensable
    # para entrenar con variables expresadas en porcentajes de distintas escalas.
    net = Pipeline([
        ('escalador_entradas', StandardScaler()),
        ('red_neuronal', MLPRegressor(hidden_layer_sizes=(4,), activation='tanh',
                                    solver='lbfgs', alpha=2.0, max_iter=2500,
                                    random_state=42))
    ])
    return TransformedTargetRegressor(regressor=net, transformer=StandardScaler())


def main():
    x, y, years = load_data()
    if x.shape != (11, 8) or len(y) != 11:
        raise ValueError(f'Base inesperada: {x.shape}. Se esperan 11 filas y 8 indicadores.')
    # Validación cronológica: entrenar 2001–2008; probar 2009–2011.
    cut = 8
    test_model = build_model()
    test_model.fit(x[:cut], y[:cut])
    pred = test_model.predict(x[cut:])
    baseline = np.full(len(y[cut:]), y[:cut].mean(), dtype=float)
    report = {
        'tipo': 'Red neuronal MLP de regresión (8 entradas, 4 neuronas ocultas, 1 salida)',
        'objetivo': 'Variación porcentual anual del PIB (no valor monetario)',
        'fuente': 'Archivo de la asignatura; hoja Cuadro 2 Var. % Anual; Fuente: DANE',
        'n_ejemplos': len(y),
        'n_variables': x.shape[1],
        'entrenamiento_cronologico': [years[0], years[cut-1]],
        'prueba_cronologica': [years[cut], years[-1]],
        'mae_red_puntos_porcentuales': round(float(mean_absolute_error(y[cut:], pred)), 4),
        'rmse_red_puntos_porcentuales': round(float(root_mean_squared_error(y[cut:], pred)), 4),
        'mae_baseline_media_puntos_porcentuales': round(float(mean_absolute_error(y[cut:], baseline)), 4),
        'casos_prueba': [
            {'anio': int(years[cut+i]), 'real': round(float(y[cut+i]), 4),
             'predicho': round(float(pred[i]), 4)} for i in range(len(pred))
        ],
        'limitaciones': 'Muestra extremadamente pequeña (11 registros). No usar para proyecciones económicas reales.'
    }
    # Modelo de demostración: tras evaluar, entrenar con toda la base original.
    final_model = build_model()
    final_model.fit(x, y)
    joblib.dump({'modelo': final_model, 'caracteristicas': FEATURES}, ROOT / 'modelo_pib.joblib')
    with (ROOT / 'reporte_entrenamiento.json').open('w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    config = {
        'nombre': 'Predicción académica de la variación anual del PIB',
        'unidad': '% de variación anual',
        'n_registros': len(y),
        'periodo': [years[0], years[-1]],
        'campos': [
            {'id': k, 'nombre': lab, 'min': round(float(x[:,i].min()), 3),
             'max': round(float(x[:,i].max()), 3)}
            for i,(k,lab) in enumerate(zip(FEATURES, LABELS))
        ],
        'historico': [
            {'anio': int(years[i]), 'pib': round(float(y[i]), 4),
             'entradas': [round(float(v), 5) for v in x[i]]}
            for i in range(len(y))
        ]
    }
    with (ROOT / 'config.json').open('w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    print('Entrenamiento completado. Modelo: 8 → 4 → 1')
    print('Evaluación cronológica 2009–2011:')
    print('MAE de la red:', report['mae_red_puntos_porcentuales'], 'puntos porcentuales')
    print('MAE baseline:', report['mae_baseline_media_puntos_porcentuales'], 'puntos porcentuales')
    for item in report['casos_prueba']:
        print(f"{item['anio']}: real {item['real']}%, predicho {item['predicho']}%")
    print('Modelo y reporte guardados en backend/.')


if __name__ == '__main__':
    main()

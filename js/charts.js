// /js/charts.js - Versión Completa
document.addEventListener('DOMContentLoaded', () => {
    // Cargar ambos archivos JSON de forma asíncrona
    Promise.all([
        fetch('data/resultados_misiones.json').then(res => res.json()),
        fetch('data/horizonte_excelencia.json').then(res => res.json())
    ])
    .then(([dataMisiones, dataHorizonte]) => {
        if (!dataMisiones || !dataHorizonte) {
            console.error('No se pudieron cargar los archivos de datos. Verifique las rutas y los archivos JSON.');
            return;
        }

        // Router simple basado en el contenido de la página
        if (document.getElementById('promedioGlobalChart')) {
            procesarYRenderizarGraficosGlobales(dataMisiones, dataHorizonte);
        }
        if (document.querySelector('.tab-container')) {
            iniciarPaginaAnalisisAreas(dataMisiones, dataHorizonte);
        }
        if (document.querySelector('.destacados-grid')) {
            iniciarPaginaDestacados(dataMisiones);
        }
    })
    .catch(error => console.error('Error al cargar los datos:', error));
});

// ===================================================================
// LÓGICA PARA panorama_general.html
// ===================================================================
function procesarYRenderizarGraficosGlobales(dataMisiones, dataHorizonte) {
    const promediosGlobales = calcularPromediosPonderados(dataMisiones, 'promedioGlobal', 500);
    const horizonte2023 = dataHorizonte.horizonteExcelencia.data["2023"].puntajeGlobal.promedio;
    const horizonte2024 = dataHorizonte.horizonteExcelencia.data["2024"].puntajeGlobal.promedio;

    renderPromedioGlobalChart(promediosGlobales);
    renderComparativaHorizonteChart(promediosGlobales, horizonte2023, horizonte2024);
}

function renderPromedioGlobalChart(data) {
    const ctx = document.getElementById('promedioGlobalChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Misión Alfa', 'Misión Beta', 'Misión Gamma'],
            datasets: [{
                label: 'Promedio Global del Grado',
                data: data,
                backgroundColor: ['#54BBAB', '#F39325', '#17334B'],
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false, min: Math.min(...data) - 20 } },
            plugins: { legend: { display: false }, title: { display: true, text: 'Promedio Ponderado del Grado 9°' } }
        }
    });
}

function renderComparativaHorizonteChart(data, h2023, h2024) {
    const ctx = document.getElementById('comparativaHorizonteChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Misión Alfa', 'Misión Beta', 'Misión Gamma'],
            datasets: [
                {
                    label: 'Promedio Global del Grado',
                    data: data,
                    backgroundColor: '#17334B',
                    order: 2
                },
                {
                    label: `Horizonte 2023 (${h2023} pts)`,
                    data: Array(3).fill(h2023),
                    type: 'line',
                    borderColor: '#D94D15',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    order: 1
                },
                {
                    label: `Horizonte 2024 (${h2024} pts)`,
                    data: Array(3).fill(h2024),
                    type: 'line',
                    borderColor: '#54BBAB',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false, min: Math.min(...data, h2023, h2024) - 20 } },
            plugins: { title: { display: true, text: 'Progreso Hacia el Estándar Institucional' } }
        }
    });
}

// ===================================================================
// LÓGICA PARA analisis_areas.html
// ===================================================================
let chartInstances = {}; // Para gestionar y destruir gráficos al cambiar de pestaña

function iniciarPaginaAnalisisAreas(dataMisiones, dataHorizonte) {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const areaConfig = {
        lecturaCritica: { nombre: 'Lectura Crítica', componentes: ['sintactico', 'semantico', 'pragmatico'] },
        matematicas: { nombre: 'Matemáticas', componentes: ['numericoVariacional', 'geometricoMetrico', 'aleatorio'] },
        socialesCiudadanas: { nombre: 'Sociales y Ciudadanas', componentes: ['espacioAmbiente', 'historiaCultura', 'eticoPolitico'] },
        cienciasNaturales: { nombre: 'Ciencias Naturales', componentes: ['entornoBiologico', 'entornoFisico', 'cienciaTecnologiaSociedad'] },
        ingles: { nombre: 'Inglés', componentes: ['lectura', 'lexical', 'gramatical'] }
    };

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const targetId = link.dataset.target;
            document.getElementById(targetId).classList.add('active');
            renderAreaCharts(targetId, dataMisiones, dataHorizonte, areaConfig);
        });
    });

    renderAreaCharts('lecturaCritica', dataMisiones, dataHorizonte, areaConfig);
}

function renderAreaCharts(areaKey, dataMisiones, dataHorizonte, areaConfig) {
    const promediosArea = calcularPromediosPonderados(dataMisiones, `promediosPorArea.${areaKey}.promedio`, 100);
    const horizonteData = dataHorizonte.horizonteExcelencia.data["2024"].areas[areaKey];
    
    const promediosComponentes = {};
    const misiones = ['misionAlfa', 'misionBeta', 'misionGamma'];
    misiones.forEach(mision => {
        promediosComponentes[mision] = areaConfig[areaKey].componentes.map(comp => {
            const path = `promediosPorArea.${areaKey}.componentes.${comp}`;
            return calcularPromediosPonderados(dataMisiones, path, 1, mision)[0] || 0;
        });
    });

    renderAreaPromedioChart(areaKey, promediosArea, horizonteData);
    renderComponentesRadarChart(areaKey, promediosComponentes, areaConfig);
}

function renderAreaPromedioChart(areaKey, data, horizonteData) {
    const canvasId = `${areaKey}PromedioChart`;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Misión Alfa', 'Misión Beta', 'Misión Gamma'],
            datasets: [
                {
                    label: 'Promedio del Grado',
                    data: data,
                    backgroundColor: 'rgba(23, 51, 75, 0.2)',
                    borderColor: '#17334B',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: `Horizonte 2024 (${horizonteData.promedio} pts)`,
                    data: Array(3).fill(horizonteData.promedio),
                    type: 'line',
                    borderColor: '#D94D15',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: false } } }
    });
}

function renderComponentesRadarChart(areaKey, data, areaConfig) {
    const canvasId = `${areaKey}ComponentesChart`;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: areaConfig[areaKey].componentes.map(c => c.replace(/([A-Z])/g, ' $1').trim()),
            datasets: [
                { label: 'Misión Alfa', data: data.misionAlfa, backgroundColor: 'rgba(84, 187, 171, 0.2)', borderColor: '#54BBAB', pointBackgroundColor: '#54BBAB' },
                { label: 'Misión Beta', data: data.misionBeta, backgroundColor: 'rgba(243, 147, 37, 0.2)', borderColor: '#F39325', pointBackgroundColor: '#F39325' },
                { label: 'Misión Gamma', data: data.misionGamma, backgroundColor: 'rgba(23, 51, 75, 0.2)', borderColor: '#17334B', pointBackgroundColor: '#17334B' }
            ]
        },
        options: {
            responsive: true,
            scales: { r: { beginAtZero: true, max: 5 } }
        }
    });
}

// ===================================================================
// LÓGICA PARA destacados.html
// ===================================================================
function iniciarPaginaDestacados(dataMisiones) {
    const misionGamma = dataMisiones.resultadosGradoNoveno.misionGamma;
    let todosLosEstudiantes = [];
    for (const grupoKey in misionGamma) {
        todosLosEstudiantes.push(...misionGamma[grupoKey].datosIndividuales);
    }
    
    const areaConfig = {
        lecturaCritica: { id: "top-lecturaCritica-list", top: 3 },
        matematicas: { id: "top-matematicas-list", top: 3 },
        socialesCiudadanas: { id: "top-socialesCiudadanas-list", top: 3 },
        cienciasNaturales: { id: "top-cienciasNaturales-list", top: 3 },
        ingles: { id: "top-ingles-list", top: 3 }
    };
    
    const topGeneral = [...todosLosEstudiantes]
        .sort((a, b) => b.puntajeGeneral - a.puntajeGeneral)
        .slice(0, 5);
    renderList('top-general-list', topGeneral, 'puntajeGeneral');

    for (const areaKey in areaConfig) {
        const topArea = [...todosLosEstudiantes]
            .filter(s => s.resultadosPorArea[areaKey])
            .sort((a, b) => b.resultadosPorArea[areaKey].puntaje - a.resultadosPorArea[areaKey].puntaje)
            .slice(0, areaConfig[areaKey].top);
        renderList(areaConfig[areaKey].id, topArea, `resultadosPorArea.${areaKey}.puntaje`);
    }
}

function renderList(elementId, studentArray, scoreKey) {
    const listElement = document.getElementById(elementId);
    if (!listElement) return;
    listElement.innerHTML = '';

    studentArray.forEach(student => {
        const keys = scoreKey.split('.');
        const score = keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : 'N/A', student);
        
        const li = document.createElement('li');
        li.innerHTML = `${student.nombre} <span>${score}</span>`;
        listElement.appendChild(li);
    });
}

// ===================================================================
// FUNCIONES DE UTILIDAD (Cálculos)
// ===================================================================
function calcularPromediosPonderados(dataMisiones, dataPath, escalaMax, misionEspecifica = null) {
    const misiones = misionEspecifica ? [misionEspecifica] : ['misionAlfa', 'misionBeta', 'misionGamma'];
    const promedios = [];
    
    misiones.forEach(misionKey => {
        const misionData = dataMisiones.resultadosGradoNoveno[misionKey];
        if (!misionData || Object.keys(misionData).length === 0) {
            promedios.push(0);
            return;
        }

        let totalEstudiantes = 0;
        let sumaPonderada = 0;

        for (const grupoKey in misionData) {
            const grupo = misionData[grupoKey];
            const keys = dataPath.split('.');
            let valor = keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : 0, grupo.datosAgregados);
            
            totalEstudiantes += grupo.totalEstudiantes;
            sumaPonderada += valor * grupo.totalEstudiantes;
        }
        
        const promedioMision = totalEstudiantes > 0 ? sumaPonderada / totalEstudiantes : 0;
        
        let promedioHomologado = promedioMision;
        if (escalaMax > 5) {
            promedioHomologado = ((promedioMision - 1) / 4) * escalaMax;
        }

        promedios.push(parseFloat(promedioHomologado.toFixed(1)));
    });

    return promedios;
}
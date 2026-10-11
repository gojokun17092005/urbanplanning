// ═══════════════════════════════════════════════════════════════════
//  Smart Urban Planning DSS — Frontend Logic
//  Rule-based assessment engine. No ML dependencies.
// ═══════════════════════════════════════════════════════════════════

// ── 1. Parameter schema ──────────────────────────────────────────────────────
const PARAM_SCHEMA = [
  { id: 'populationDensity',          name: 'Population Density',      category: 'Demographic',     unit: 'cap/km²', min: 1000,  max: 35000, step: 500,  default: 12500, desc: 'Number of residents per square kilometre. Affects infrastructure load and service reach.' },
  { id: 'populationGrowthRate',       name: 'Population Growth Rate',  category: 'Demographic',     unit: '%/yr',    min: -2,    max: 8,     step: 0.1,  default: 2.4,   desc: 'Annual change in population. High growth requires rapid expansion of housing and utilities.' },
  { id: 'builtUpAreaPct',             name: 'Built-up Area',           category: 'Land Use',        unit: '%',       min: 10,    max: 90,    step: 1,    default: 62,    desc: 'Percentage of land covered by buildings and roads. Balances development with open space.' },
  { id: 'vacantLandPct',              name: 'Vacant Land',             category: 'Land Use',        unit: '%',       min: 0,     max: 60,    step: 1,    default: 12,    desc: 'Undeveloped land available for future projects, parks, or strategic reserves.' },
  { id: 'residentialLandPct',         name: 'Residential Land',        category: 'Land Use',        unit: '%',       min: 10,    max: 80,    step: 1,    default: 45,    desc: 'Share of land zoned for housing. A healthy balance prevents overcrowding.' },
  { id: 'commercialLandPct',          name: 'Commercial Land',         category: 'Land Use',        unit: '%',       min: 2,     max: 50,    step: 1,    default: 18,    desc: 'Land zoned for business and trade. Supports local economy and employment.' },
  { id: 'roadDensity',                name: 'Road Density',            category: 'Transport',       unit: 'km/km²',  min: 2,     max: 25,    step: 0.5,  default: 11.5,  desc: 'Length of roads per square kilometre. Impacts mobility, freight, and traffic distribution.' },
  { id: 'trafficCongestion',          name: 'Traffic Congestion',      category: 'Transport',       unit: '% delay', min: 10,    max: 95,    step: 1,    default: 48,    desc: 'Average delay compared to free-flowing traffic. High congestion impacts air quality and productivity.' },
  { id: 'publicTransportAccessibility', name: 'Public Transit Access', category: 'Transport',       unit: '/100',    min: 10,    max: 100,   step: 1,    default: 65,    desc: 'Indicator (0–100) of how easily residents can reach reliable public transport.' },
  { id: 'waterSupplyCoverage',        name: 'Water Coverage',          category: 'Infrastructure',  unit: '%',       min: 20,    max: 100,   step: 1,    default: 82,    desc: 'Percentage of households with access to piped, potable water supply.' },
  { id: 'sewerageCoverage',           name: 'Sewerage Coverage',       category: 'Infrastructure',  unit: '%',       min: 10,    max: 100,   step: 1,    default: 72,    desc: 'Percentage of properties connected to a formal underground sewerage network.' },
  { id: 'wasteManagementCoverage',    name: 'Waste Management',        category: 'Infrastructure',  unit: '%',       min: 20,    max: 100,   step: 1,    default: 76,    desc: 'Percentage of municipal solid waste that is formally collected and processed.' },
  { id: 'aqi',                        name: 'Air Quality (AQI)',       category: 'Environment',     unit: 'AQI',     min: 20,    max: 500,   step: 5,    default: 135,   desc: 'Air Quality Index. Lower is better for public health and environmental sustainability.' },
  { id: 'greenSpacePct',              name: 'Green Space',             category: 'Environment',     unit: '%',       min: 2,     max: 45,    step: 0.5,  default: 14.5,  desc: 'Share of area dedicated to parks, vegetation, and other green spaces.' },
  { id: 'floodRisk',                  name: 'Flood Risk Index',        category: 'Disaster',        unit: '/100',    min: 0,     max: 100,   step: 1,    default: 32,    desc: 'Risk indicator (0–100) combining drainage capacity and historical inundation risk.' },
  { id: 'distanceToHospital',         name: 'Dist. to Hospital',       category: 'Public Service',  unit: 'km',      min: 0.3,   max: 15,    step: 0.1,  default: 2.4,   desc: 'Average distance to the nearest major healthcare facility.' },
  { id: 'distanceToSchool',           name: 'Dist. to School',         category: 'Public Service',  unit: 'km',      min: 0.2,   max: 6,     step: 0.1,  default: 0.9,   desc: 'Average distance to primary or secondary educational facilities.' },
  { id: 'averageIncome',              name: 'Avg. Income',             category: 'Economic',        unit: '₹k/mo',   min: 15,    max: 250,   step: 5,    default: 68,    desc: 'Average monthly household income, affecting affordability and the local tax base.' },
  { id: 'landPrice',                  name: 'Land Price',              category: 'Economic',        unit: '₹k/m²',   min: 10,    max: 300,   step: 5,    default: 85,    desc: 'Average property valuation. Influences housing affordability and commercial viability.' },
  { id: 'infrastructureCost',         name: 'Infra Cost Index',        category: 'Economic',        unit: '₹Cr/km²', min: 10,    max: 200,   step: 5,    default: 48,    desc: 'Cost index for developing and maintaining municipal infrastructure.' },
];

// ── 2. Preset scenarios ──────────────────────────────────────────────────────
const PRESET_SCENARIOS = {
  metro_cbd: {
    meta: { name: 'Metropolitan CBD', desc: 'Explore congestion, pollution, and pressure on central infrastructure.' },
    params: { populationDensity: 22000, populationGrowthRate: 1.8, builtUpAreaPct: 78, vacantLandPct: 5, residentialLandPct: 20, commercialLandPct: 48, roadDensity: 16.5, trafficCongestion: 72, publicTransportAccessibility: 85, waterSupplyCoverage: 92, sewerageCoverage: 88, wasteManagementCoverage: 85, aqi: 185, greenSpacePct: 6.5, floodRisk: 38, distanceToHospital: 1.5, distanceToSchool: 1.2, averageIncome: 95, landPrice: 180, infrastructureCost: 95 }
  },
  residential: {
    meta: { name: 'Rapid Urbanizing Residential Sector', desc: 'Understand how population growth affects housing, utilities, and public services.' },
    params: { populationDensity: 19500, populationGrowthRate: 3.4, builtUpAreaPct: 70, vacantLandPct: 8, residentialLandPct: 65, commercialLandPct: 12, roadDensity: 12.0, trafficCongestion: 58, publicTransportAccessibility: 62, waterSupplyCoverage: 76, sewerageCoverage: 68, wasteManagementCoverage: 74, aqi: 142, greenSpacePct: 8.2, floodRisk: 44, distanceToHospital: 3.2, distanceToSchool: 0.8, averageIncome: 65, landPrice: 85, infrastructureCost: 55 }
  },
  eco_garden: {
    meta: { name: 'Sustainable Eco-Garden City', desc: 'Explore the balance between urban development and environmental sustainability.' },
    params: { populationDensity: 6500, populationGrowthRate: 1.4, builtUpAreaPct: 42, vacantLandPct: 22, residentialLandPct: 55, commercialLandPct: 8, roadDensity: 9.5, trafficCongestion: 22, publicTransportAccessibility: 52, waterSupplyCoverage: 94, sewerageCoverage: 88, wasteManagementCoverage: 90, aqi: 65, greenSpacePct: 24.0, floodRisk: 16, distanceToHospital: 3.8, distanceToSchool: 1.2, averageIncome: 88, landPrice: 65, infrastructureCost: 35 }
  },
  industrial: {
    meta: { name: 'Industrial & Manufacturing Hub', desc: 'Examine industrial infrastructure, air quality, utilities, and resilience.' },
    params: { populationDensity: 4800, populationGrowthRate: 1.2, builtUpAreaPct: 65, vacantLandPct: 18, residentialLandPct: 8, commercialLandPct: 15, roadDensity: 13.5, trafficCongestion: 52, publicTransportAccessibility: 40, waterSupplyCoverage: 74, sewerageCoverage: 62, wasteManagementCoverage: 70, aqi: 225, greenSpacePct: 7.0, floodRisk: 48, distanceToHospital: 5.5, distanceToSchool: 3.2, averageIncome: 42, landPrice: 45, infrastructureCost: 72 }
  },
  tod_corridor: {
    meta: { name: 'Transit-Oriented IT Corridor', desc: 'Explore commuter demand, transport accessibility, and employment growth.' },
    params: { populationDensity: 14500, populationGrowthRate: 3.6, builtUpAreaPct: 66, vacantLandPct: 14, residentialLandPct: 35, commercialLandPct: 38, roadDensity: 15.0, trafficCongestion: 54, publicTransportAccessibility: 88, waterSupplyCoverage: 94, sewerageCoverage: 90, wasteManagementCoverage: 88, aqi: 112, greenSpacePct: 15.5, floodRisk: 24, distanceToHospital: 2.1, distanceToSchool: 1.1, averageIncome: 120, landPrice: 140, infrastructureCost: 78 }
  },
  mixed_15min: {
    meta: { name: '15-Minute Mixed-Use Quarter', desc: 'Evaluate how easily residents can reach everyday services within their neighbourhood.' },
    params: { populationDensity: 16000, populationGrowthRate: 2.2, builtUpAreaPct: 72, vacantLandPct: 6, residentialLandPct: 40, commercialLandPct: 32, roadDensity: 14.2, trafficCongestion: 62, publicTransportAccessibility: 78, waterSupplyCoverage: 86, sewerageCoverage: 82, wasteManagementCoverage: 84, aqi: 128, greenSpacePct: 11.0, floodRisk: 30, distanceToHospital: 1.8, distanceToSchool: 0.6, averageIncome: 75, landPrice: 110, infrastructureCost: 62 }
  },
};

// ── 3. App state ─────────────────────────────────────────────────────────────
let currentScenarioKey = 'metro_cbd';
let currentParams      = { ...PRESET_SCENARIOS.metro_cbd.params };
let currentCategory    = 'All';
let radarChartInstance = null;
let lastAssessmentData = null;   // stores the last full result for comparison

// ── 4. Initialise ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateScenarioDesc();
  renderParamInputs();
  setupEvents();
  // Run a silent initial assessment so results show on first load
  runAssessment(true);
});

// ── 5. Scenario description ──────────────────────────────────────────────────
function updateScenarioDesc() {
  const meta = PRESET_SCENARIOS[currentScenarioKey].meta;
  document.getElementById('scenarioTitle').textContent = meta.name;
  document.getElementById('scenarioDesc').textContent  = meta.desc;
}

// ── 6. Render number-input grid ──────────────────────────────────────────────
function renderParamInputs() {
  const grid = document.getElementById('paramsGrid');
  grid.innerHTML = '';

  const list = currentCategory === 'All'
    ? PARAM_SCHEMA
    : PARAM_SCHEMA.filter(p => p.category === currentCategory);

  list.forEach(schema => {
    const val = currentParams[schema.id] ?? schema.default;
    const box = document.createElement('div');
    box.className  = 'param-box';
    box.dataset.id = schema.id;

    box.innerHTML = `
      <div class="param-label-row">
        <label class="param-name" for="input_${schema.id}">
          ${schema.name}
          <span class="info-icon" tabindex="0" aria-label="${schema.desc}">
            i
            <span class="tooltip">${schema.desc}</span>
          </span>
        </label>
        <span class="param-unit">${schema.unit}</span>
      </div>
      <div class="param-input-row">
        <input
          type="number"
          id="input_${schema.id}"
          name="${schema.id}"
          min="${schema.min}"
          max="${schema.max}"
          step="${schema.step}"
          value="${val}"
          aria-label="${schema.name} (${schema.unit})"
        />
      </div>
      <div class="param-range-hint">Range: ${schema.min} – ${schema.max} ${schema.unit}</div>
      <div class="param-error" id="err_${schema.id}" role="alert" aria-live="polite"></div>
    `;

    grid.appendChild(box);

    const input = box.querySelector('input');
    input.addEventListener('input', () => handleParamChange(schema, input));
    input.addEventListener('blur',  () => validateField(schema, input));
  });
}

// ── 7. Handle live input change ───────────────────────────────────────────────
function handleParamChange(schema, input) {
  const n = Number(input.value);
  if (!isNaN(n)) {
    currentParams[schema.id] = n;
  }
  // Clear error while typing (re-validate on blur)
  showFieldError(schema.id, '');
  input.classList.remove('invalid');
  input.closest('.param-box')?.classList.remove('has-error');
}

// ── 8. Per-field validation ───────────────────────────────────────────────────
function validateField(schema, input) {
  const raw = input.value;
  if (raw === '' || raw === null) {
    showFieldError(schema.id, 'Required. Using default value.');
    input.classList.add('invalid');
    input.closest('.param-box')?.classList.add('has-error');
    currentParams[schema.id] = schema.default;
    return false;
  }
  const n = Number(raw);
  if (isNaN(n)) {
    showFieldError(schema.id, 'Must be a number.');
    input.classList.add('invalid');
    input.closest('.param-box')?.classList.add('has-error');
    return false;
  }
  if (n < schema.min || n > schema.max) {
    showFieldError(schema.id, `Must be between ${schema.min} and ${schema.max}.`);
    input.classList.add('invalid');
    input.closest('.param-box')?.classList.add('has-error');
    // Clamp silently so calculations still run
    currentParams[schema.id] = Math.min(schema.max, Math.max(schema.min, n));
    return false;
  }
  // Valid
  showFieldError(schema.id, '');
  input.classList.remove('invalid');
  input.closest('.param-box')?.classList.remove('has-error');
  currentParams[schema.id] = n;
  return true;
}

function showFieldError(id, msg) {
  const el = document.getElementById(`err_${id}`);
  if (el) el.textContent = msg;
}

// ── 9. Validate all visible inputs; return true if all pass ──────────────────
function validateAll() {
  const grid = document.getElementById('paramsGrid');
  const inputs = grid.querySelectorAll('input[type="number"]');
  let allValid = true;
  inputs.forEach(input => {
    const schema = PARAM_SCHEMA.find(s => s.id === input.name);
    if (schema && !validateField(schema, input)) allValid = false;
  });
  return allValid;
}

// ── 10. Event wiring ─────────────────────────────────────────────────────────
function setupEvents() {
  // Preset dropdown
  document.getElementById('presetSelect').addEventListener('change', e => {
    currentScenarioKey = e.target.value;
    const preset = PRESET_SCENARIOS[currentScenarioKey];
    if (preset) {
      currentParams = { ...preset.params };
      updateScenarioDesc();
      renderParamInputs();
      runAssessment(true);
      showToast(`Scenario loaded: ${preset.meta.name}`);
    }
  });

  // Reset buttons (header + form)
  ['btnReset', 'btnReset2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('presetSelect').value = 'metro_cbd';
      currentScenarioKey = 'metro_cbd';
      currentParams = { ...PRESET_SCENARIOS.metro_cbd.params };
      updateScenarioDesc();
      renderParamInputs();
      runAssessment(true);
      showToast('Reset to Metropolitan CBD defaults.');
    });
  });

  // Assess buttons (header + form)
  ['btnAssess', 'btnAssess2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      runAssessment(false);
    });
  });

  // Category filter pills
  document.getElementById('pillsContainer').addEventListener('click', e => {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.cat;
      renderParamInputs();
    }
  });

  // What-if comparison
  document.getElementById('btnCompare').addEventListener('click', runComparison);
}

// ── 11. Toast notification ────────────────────────────────────────────────────
function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── 12. Run assessment ────────────────────────────────────────────────────────
async function runAssessment(silent = false) {
  // Validate all currently visible fields
  validateAll();

  // Hide any global validation summary (we use per-field errors instead)
  document.getElementById('validationSummary').hidden = true;

  try {
    const res = await fetch('/api/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(currentParams),
    });

    if (res.ok) {
      const data = await res.json();
      lastAssessmentData = data;
      updateUI(data);
      document.getElementById('resultsArea').hidden = false;
      if (!silent) showToast('Assessment complete. Review the findings below.');
      return;
    }
  } catch (err) {
    console.warn('Backend API unavailable, using client-side fallback:', err.message);
  }

  // Client-side fallback (mirrors server logic exactly)
  const data = clientSideAssess(currentParams);
  lastAssessmentData = data;
  updateUI(data);
  document.getElementById('resultsArea').hidden = false;
  if (!silent) showToast('Assessment complete (local engine).');
}

// ── 13. Client-side rule-based engine (mirrors server.js assessUrban) ────────
function clientSideAssess(raw) {
  const p = {};
  PARAM_SCHEMA.forEach(s => {
    const n = Number(raw[s.id]);
    p[s.id] = isNaN(n) ? s.default : Math.min(s.max, Math.max(s.min, n));
  });

  // Domain scores
  const demographicScore = Math.round(
    (p.populationDensity > 18000 ? Math.max(10, 100 - (p.populationDensity - 18000) / 200) : 95) * 0.6 +
    (p.populationGrowthRate > 3.5 ? Math.max(20, 100 - (p.populationGrowthRate - 3.5) * 18) : 92) * 0.4
  );
  const landUseScore = Math.round(
    (p.builtUpAreaPct > 80 ? Math.max(15, 100 - (p.builtUpAreaPct - 80) * 4) : 90) * 0.6 +
    (p.vacantLandPct < 5 ? 35 : 90) * 0.4
  );
  const roadScore      = Math.min(100, Math.max(15, (p.roadDensity / 15) * 85));
  const congestionScore = Math.max(10, 100 - p.trafficCongestion);
  const transportScore  = Math.round(roadScore * 0.3 + congestionScore * 0.35 + p.publicTransportAccessibility * 0.35);
  const infrastructureEquilibrium = Math.round(p.waterSupplyCoverage * 0.38 + p.sewerageCoverage * 0.34 + p.wasteManagementCoverage * 0.28);
  const aqiScore   = p.aqi <= 50 ? 100 : Math.round(Math.max(10, 100 - ((p.aqi - 50) / 250) * 90));
  const greenScore  = Math.min(100, Math.max(10, Math.round((p.greenSpacePct / 18) * 95)));
  const environmentScore = Math.round(aqiScore * 0.55 + greenScore * 0.45);
  const disasterScore    = Math.round(Math.max(10, 100 - p.floodRisk));
  const hospitalScore    = p.distanceToHospital <= 2.5 ? 95 : Math.max(15, Math.round(100 - (p.distanceToHospital - 2.5) * 12));
  const schoolScore      = p.distanceToSchool   <= 1.0 ? 98 : Math.max(20, Math.round(100 - (p.distanceToSchool   - 1.0) * 20));
  const publicServicesScore = Math.round(hospitalScore * 0.55 + schoolScore * 0.45);
  const affordabilityRatio  = (p.averageIncome * 12) / Math.max(10, p.landPrice);
  const economicScore       = Math.round(Math.min(100, Math.max(20, Math.min(85, affordabilityRatio * 10) + (100 - Math.min(80, p.infrastructureCost * 0.6)) * 0.35)));
  const compositeInfrastructureScore = Math.round(
    demographicScore * 0.10 + landUseScore * 0.10 + transportScore * 0.16 +
    infrastructureEquilibrium * 0.20 + environmentScore * 0.18 + disasterScore * 0.10 +
    publicServicesScore * 0.10 + economicScore * 0.06
  );

  // Stress index
  let sp = 0;
  if      (p.aqi > 250)               sp += 25; else if (p.aqi > 150)               sp += 15; else if (p.aqi > 100) sp += 8;
  if      (p.greenSpacePct < 6.0)     sp += 20; else if (p.greenSpacePct < 12.0)    sp += 10;
  if      (p.waterSupplyCoverage < 65) sp += 22; else if (p.waterSupplyCoverage < 80) sp += 10;
  if      (p.sewerageCoverage < 60)   sp += 20; else if (p.sewerageCoverage < 75)   sp += 10;
  if      (p.trafficCongestion > 65)  sp += 18; else if (p.trafficCongestion > 45)  sp += 10;
  if      (p.floodRisk > 55)          sp += 22; else if (p.floodRisk > 35)          sp += 12;
  const stressIndex = Math.min(100, Math.round(sp));

  let riskLevel, explanation;
  if (stressIndex >= 60) {
    riskLevel   = 'Critical';
    explanation = `Critical deficits detected: air pollution (AQI ${p.aqi}), utility gaps (Water ${p.waterSupplyCoverage}%, Sewer ${p.sewerageCoverage}%), or flood risk (${p.floodRisk}/100) require urgent intervention.`;
  } else if (stressIndex >= 38) {
    riskLevel   = 'High';
    explanation = `Elevated pressure: traffic congestion (${p.trafficCongestion}% delay), green space (${p.greenSpacePct}%), and utility gaps need near-term municipal budget allocation.`;
  } else if (stressIndex >= 20) {
    riskLevel   = 'Moderate';
    explanation = `Stable operation with some gaps: incremental transit upgrades (${p.publicTransportAccessibility}/100) and waste management improvements will sustain urban equilibrium.`;
  } else {
    riskLevel   = 'Low';
    explanation = `Optimal urban equilibrium: air quality (AQI ${p.aqi}), water coverage (${p.waterSupplyCoverage}%), and green space (${p.greenSpacePct}%) are within acceptable planning benchmarks.`;
  }

  const benchmarks = [
    { name: 'Water Supply Coverage',   target: '100%',  current: `${p.waterSupplyCoverage}%`,   status: p.waterSupplyCoverage >= 100 ? 'Pass' : p.waterSupplyCoverage >= 80 ? 'Moderate Deficit' : 'Critical Gap' },
    { name: 'Sewerage Network Coverage', target: '100%', current: `${p.sewerageCoverage}%`,     status: p.sewerageCoverage >= 100 ? 'Pass' : p.sewerageCoverage >= 75 ? 'Sub-Optimal' : 'Severe Deficit' },
    { name: 'Air Quality Index (AQI)', target: '≤ 100', current: `${p.aqi} AQI`,               status: p.aqi <= 100 ? 'Pass' : p.aqi <= 150 ? 'Moderate Pollution' : 'Severe Air Pollution' },
    { name: 'Green Space Coverage',    target: '≥ 15%', current: `${p.greenSpacePct}%`,         status: p.greenSpacePct >= 15 ? 'Pass' : p.greenSpacePct >= 10 ? 'Below Norm' : 'Ecological Deficit' },
    { name: 'Traffic Congestion',      target: '≤ 35%', current: `${p.trafficCongestion}%`,     status: p.trafficCongestion <= 35 ? 'Pass' : p.trafficCongestion <= 60 ? 'Moderate Congestion' : 'Severe Gridlock' },
    { name: 'Flood Risk Index',        target: '< 25',  current: `${p.floodRisk} / 100`,        status: p.floodRisk <= 25 ? 'Pass' : p.floodRisk <= 50 ? 'Moderate Hazard' : 'High Hazard' },
  ];

  const projects = [
    { name: 'Universal Potable Water Pipeline',       priority: p.waterSupplyCoverage < 75 ? 'Critical' : 'High',   impact: `Eliminates ${Math.max(0, 100 - p.waterSupplyCoverage)}% water deficit.` },
    { name: 'Underground Sewerage Network & STPs',    priority: p.sewerageCoverage < 70 ? 'Critical' : 'High',      impact: 'Serves unsewered wards to eliminate raw effluent discharge.' },
    { name: 'Clean Air Action & Smog Towers',         priority: p.aqi > 150 ? 'Critical' : 'Medium',                impact: 'Deploys anti-smog sweepers & low-emission transit zones.' },
    { name: 'Stormwater Drainage & Sponge Corridors', priority: p.floodRisk > 40 ? 'Critical' : 'Medium',           impact: 'Upgrades roadside drainage and constructs retention bioswales.' },
    { name: 'Urban Green Buffer Acquisition',          priority: p.greenSpacePct < 15 ? 'High' : 'Low',             impact: 'Reclaims vacant municipal land to reach 15% green space target.' },
  ];

  return {
    params: p,
    urgency: { riskLevel, stressIndex, explanation },
    compositeInfrastructureScore,
    equilibriumDimensions: { demographic: demographicScore, landUse: landUseScore, transport: transportScore, infrastructure: infrastructureEquilibrium, environment: environmentScore, disaster: disasterScore, publicServices: publicServicesScore, economic: economicScore },
    benchmarks,
    projects,
  };
}

// ── 14. Update UI ─────────────────────────────────────────────────────────────
function updateUI(data) {
  const { urgency, compositeInfrastructureScore, equilibriumDimensions, benchmarks, params } = data;
  const p = params || currentParams;

  // 14a. Conversational summary
  const urgencyWord = { Critical: 'in critical need of action', High: 'experiencing elevated pressure', Moderate: 'needing some attention', Low: 'performing well' };
  const gapsCount   = benchmarks.filter(b => !b.status.includes('Pass')).length;
  const riskColour  = { Critical: 'var(--accent-rose)', High: 'var(--accent-amber)', Moderate: 'var(--accent-amber)', Low: 'var(--accent-green)' };

  document.getElementById('conversationalSummary').innerHTML =
    `I've analysed the data. Currently, the city is <strong style="color:${riskColour[urgency.riskLevel]}">${urgencyWord[urgency.riskLevel]}</strong>. ` +
    `The urban stress level is <strong>${urgency.stressIndex} / 100</strong>, ` +
    `and the composite infrastructure score is <strong>${compositeInfrastructureScore} / 100</strong>. ` +
    `There are <strong style="color:var(--accent-rose)">${gapsCount}</strong> benchmark${gapsCount !== 1 ? 's' : ''} not yet met. ` +
    `<br><br><em style="font-size:0.9rem;color:var(--text-muted)">${urgency.explanation}</em>`;

  // 14b. Key metric chips
  const metricsStrip = document.getElementById('metricsStrip');
  metricsStrip.innerHTML = `
    <div class="metric-chip">
      <div class="chip-label">Risk Level</div>
      <div class="chip-value" style="color:${riskColour[urgency.riskLevel]}">${urgency.riskLevel}</div>
      <div class="chip-sub">Urban urgency classification</div>
    </div>
    <div class="metric-chip">
      <div class="chip-label">Stress Index</div>
      <div class="chip-value">${urgency.stressIndex} / 100</div>
      <div class="chip-sub">0 = none, 100 = maximum</div>
    </div>
    <div class="metric-chip">
      <div class="chip-label">Composite Score</div>
      <div class="chip-value">${compositeInfrastructureScore} / 100</div>
      <div class="chip-sub">8-domain weighted average</div>
    </div>
    <div class="metric-chip">
      <div class="chip-label">Benchmark Gaps</div>
      <div class="chip-value" style="color:${gapsCount > 0 ? 'var(--accent-rose)' : 'var(--accent-green)'}">${gapsCount} / ${benchmarks.length}</div>
      <div class="chip-sub">Targets not yet met</div>
    </div>
  `;

  // 14c. Human insights
  const insightsContainer = document.getElementById('insightsContainer');
  insightsContainer.innerHTML = '';
  generateInsights(p).forEach(ins => {
    insightsContainer.innerHTML += `
      <div class="insight-item">
        <div class="insight-icon">${ins.icon}</div>
        <div class="insight-content">
          <h4>${ins.title}</h4>
          <p>${ins.desc}</p>
        </div>
      </div>`;
  });

  // 14d. Chart story + radar
  document.getElementById('chartStory').textContent = buildChartStory(equilibriumDimensions);
  renderRadarChart(equilibriumDimensions);

  // 14e. Domain score bars
  const domainGrid = document.getElementById('domainScoresGrid');
  domainGrid.innerHTML = '';
  const domainLabels = { demographic: 'Demographic', landUse: 'Land Use', transport: 'Transport', infrastructure: 'Infrastructure', environment: 'Environment', disaster: 'Disaster', publicServices: 'Public Services', economic: 'Economic' };
  Object.entries(equilibriumDimensions).forEach(([key, val]) => {
    const div = document.createElement('div');
    div.className = 'domain-item';
    div.innerHTML = `
      <div class="score-header">
        <span style="color:var(--text-muted)">${domainLabels[key] || key}</span>
        <span class="score">${val}</span>
      </div>
      <div class="domain-bar-bg"><div class="domain-bar-fill" style="width:${val}%"></div></div>`;
    domainGrid.appendChild(div);
  });

  // 14f. Benchmarks table
  const tbody = document.getElementById('benchmarksTbody');
  tbody.innerHTML = '';
  benchmarks.forEach(b => {
    const bst = benchmarkBadge(b.status);
    tbody.innerHTML += `
      <tr>
        <td><strong>${b.name}</strong></td>
        <td>${b.target}</td>
        <td><strong>${b.current}</strong></td>
        <td><span class="status-badge ${bst.cls}">${bst.label}</span></td>
      </tr>`;
  });

}

// ── 15. Insights generator ────────────────────────────────────────────────────
function generateInsights(p) {
  const out = [];
  if (p.aqi > 100)                out.push({ icon: '💨', title: 'Clean air needs attention.', desc: `Air quality is above the planning target (Current: ${p.aqi} AQI). Consider reviewing emissions controls, public transport options, and industrial pollution sources.` });
  if (p.waterSupplyCoverage < 100 || p.sewerageCoverage < 100) out.push({ icon: '🚰', title: 'Essential services have room to improve.', desc: `Water coverage (${p.waterSupplyCoverage}%) and sewerage coverage (${p.sewerageCoverage}%) are below full capacity. Expanding access improves sanitation and resident welfare.` });
  if (p.greenSpacePct < 15)       out.push({ icon: '🌳', title: 'Green spaces are limited.', desc: `Current green coverage (${p.greenSpacePct}%) is below the 15% planning target. Parks, corridors, and tree planting would enhance well-being and reduce urban heat.` });
  if (p.trafficCongestion > 45)   out.push({ icon: '🚗', title: 'Traffic is causing delays.', desc: `Congestion at ${p.trafficCongestion}% means regular delays. Better transit alternatives or road network improvements could relieve pressure.` });
  if (p.floodRisk > 35)           out.push({ icon: '🌊', title: 'Flood exposure is elevated.', desc: `Flood risk index of ${p.floodRisk}/100 indicates moderate to high hazard. Review drainage infrastructure and low-lying area management.` });
  if (out.length === 0) out.push({ icon: '✅', title: 'Key indicators look stable.', desc: 'The current scenario is performing well against basic targets. Focus on long-term sustainability and equitable growth.' });
  return out.slice(0, 4);
}

// ── 16. Benchmark badge helper ────────────────────────────────────────────────
function benchmarkBadge(status) {
  if (status.includes('Pass'))                                return { label: 'Meeting target',    cls: 'pass' };
  if (status.includes('Moderate') || status.includes('Sub-Optimal') || status.includes('Below Norm') || status.includes('Moderate Congestion') || status.includes('Moderate Hazard')) return { label: 'Needs improvement', cls: 'warn' };
  return { label: 'Significant gap', cls: 'fail' };
}

// ── 17. Chart story ───────────────────────────────────────────────────────────
function buildChartStory(dims) {
  const strong = [], weak = [];
  Object.entries(dims).forEach(([k, v]) => { if (v >= 75) strong.push(k); else if (v <= 55) weak.push(k); });
  if (strong.length && weak.length) return `${cap(strong[0])} and ${strong[1] ? cap(strong[1]) : 'other areas'} score well, while ${cap(weak[0])} needs the most attention.`;
  if (weak.length)   return `Multiple areas including ${cap(weak[0])} need significant work to achieve balanced performance.`;
  if (strong.length > 1) return `Strong performance across most domains, particularly ${cap(strong[0])} and ${cap(strong[1])}.`;
  return 'Performance is broadly balanced across all planning domains.';
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);



// ── 19. Radar chart ───────────────────────────────────────────────────────────
function renderRadarChart(dims = {}) {
  const ctx = document.getElementById('radarChart')?.getContext('2d');
  if (!ctx || typeof Chart === 'undefined') return;

  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Demographic', 'Land Use', 'Transport', 'Infrastructure', 'Environment', 'Disaster', 'Public Services', 'Economic'],
      datasets: [{
        label: 'Sector Performance',
        data: [dims.demographic || 0, dims.landUse || 0, dims.transport || 0, dims.infrastructure || 0, dims.environment || 0, dims.disaster || 0, dims.publicServices || 0, dims.economic || 0],
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderColor:     '#2563eb',
        borderWidth:     2,
        pointBackgroundColor: '#2563eb',
      }]
    },
    options: {
      responsive:        true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines:  { color: 'rgba(0,0,0,0.05)' },
          grid:        { color: 'rgba(0,0,0,0.05)' },
          pointLabels: { color: '#6b7280', font: { size: 11, family: 'Inter' } },
          ticks:       { display: false },
          suggestedMin: 0,
          suggestedMax: 100,
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}



// ── 21. What-if scenario comparison ──────────────────────────────────────────
async function runComparison() {
  if (!lastAssessmentData) {
    showToast('Run an assessment first before comparing.');
    return;
  }

  const compareKey = document.getElementById('compareSelect').value;
  const comparePreset = PRESET_SCENARIOS[compareKey];
  if (!comparePreset) return;

  // Assess the comparison scenario (client-side for speed)
  const compareData = clientSideAssess(comparePreset.params);

  const metricRows = [
    { label: 'Risk Level',              a: lastAssessmentData.urgency.riskLevel,              b: compareData.urgency.riskLevel },
    { label: 'Stress Index',            a: `${lastAssessmentData.urgency.stressIndex} / 100`, b: `${compareData.urgency.stressIndex} / 100` },
    { label: 'Composite Score',         a: `${lastAssessmentData.compositeInfrastructureScore} / 100`, b: `${compareData.compositeInfrastructureScore} / 100` },
    { label: 'Demographic Score',       a: lastAssessmentData.equilibriumDimensions.demographic,    b: compareData.equilibriumDimensions.demographic },
    { label: 'Transport Score',         a: lastAssessmentData.equilibriumDimensions.transport,      b: compareData.equilibriumDimensions.transport },
    { label: 'Infrastructure Score',    a: lastAssessmentData.equilibriumDimensions.infrastructure, b: compareData.equilibriumDimensions.infrastructure },
    { label: 'Environment Score',       a: lastAssessmentData.equilibriumDimensions.environment,    b: compareData.equilibriumDimensions.environment },
    { label: 'Benchmarks Passing',
      a: `${lastAssessmentData.benchmarks.filter(b => b.status.includes('Pass')).length} / ${lastAssessmentData.benchmarks.length}`,
      b: `${compareData.benchmarks.filter(b => b.status.includes('Pass')).length} / ${compareData.benchmarks.length}` },
  ];

  // Column labels
  const currentLabel = PRESET_SCENARIOS[currentScenarioKey]?.meta.name || 'Current';
  document.getElementById('compareColA').textContent = currentLabel;
  document.getElementById('compareColB').textContent = comparePreset.meta.name;

  // Populate rows
  const tbody = document.getElementById('compareTableBody');
  tbody.innerHTML = '';
  metricRows.forEach(row => {
    tbody.innerHTML += `
      <tr>
        <td>${row.label}</td>
        <td><strong>${row.a}</strong></td>
        <td>${row.b}</td>
      </tr>`;
  });

  document.getElementById('comparisonTable').hidden = false;
  showToast(`Comparing: ${currentLabel} vs ${comparePreset.meta.name}`);
}

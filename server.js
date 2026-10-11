import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Input validation helpers ────────────────────────────────────────────────
const PARAM_LIMITS = {
  populationDensity:          { min: 1000,  max: 35000, default: 12500 },
  populationGrowthRate:       { min: -2,    max: 8,     default: 2.4   },
  builtUpAreaPct:             { min: 10,    max: 90,    default: 62    },
  vacantLandPct:              { min: 0,     max: 60,    default: 12    },
  residentialLandPct:         { min: 10,    max: 80,    default: 45    },
  commercialLandPct:          { min: 2,     max: 50,    default: 18    },
  roadDensity:                { min: 2,     max: 25,    default: 11.5  },
  trafficCongestion:          { min: 10,    max: 95,    default: 48    },
  publicTransportAccessibility:{ min: 10,   max: 100,   default: 65    },
  waterSupplyCoverage:        { min: 20,    max: 100,   default: 82    },
  sewerageCoverage:           { min: 10,    max: 100,   default: 72    },
  wasteManagementCoverage:    { min: 20,    max: 100,   default: 76    },
  aqi:                        { min: 20,    max: 500,   default: 135   },
  greenSpacePct:              { min: 2,     max: 45,    default: 14.5  },
  floodRisk:                  { min: 0,     max: 100,   default: 32    },
  distanceToHospital:         { min: 0.3,   max: 15,    default: 2.4   },
  distanceToSchool:           { min: 0.2,   max: 6,     default: 0.9   },
  averageIncome:              { min: 15,    max: 250,   default: 68    },
  landPrice:                  { min: 10,    max: 300,   default: 85    },
  infrastructureCost:         { min: 10,    max: 200,   default: 48    },
};

function sanitiseParams(raw) {
  const p = {};
  const errors = [];

  for (const [key, limits] of Object.entries(PARAM_LIMITS)) {
    const raw_val = raw[key];
    if (raw_val === undefined || raw_val === null || raw_val === '') {
      p[key] = limits.default;
      continue;
    }
    const n = Number(raw_val);
    if (isNaN(n)) {
      errors.push(`${key}: expected a number, got "${raw_val}"`);
      p[key] = limits.default;
      continue;
    }
    if (n < limits.min || n > limits.max) {
      errors.push(`${key}: ${n} is out of range [${limits.min}, ${limits.max}]`);
    }
    // Clamp rather than reject so the engine always produces output
    p[key] = Math.min(limits.max, Math.max(limits.min, n));
  }

  return { p, errors };
}

// ─── Rule-Based Urban Assessment Engine ──────────────────────────────────────
function assessUrban(p) {
  // Domain Scores (0–100)
  const demographicScore = Math.round(
    (p.populationDensity > 18000 ? Math.max(10, 100 - (p.populationDensity - 18000) / 200) : 95) * 0.6 +
    (p.populationGrowthRate > 3.5 ? Math.max(20, 100 - (p.populationGrowthRate - 3.5) * 18) : 92) * 0.4
  );

  const landUseScore = Math.round(
    (p.builtUpAreaPct > 80 ? Math.max(15, 100 - (p.builtUpAreaPct - 80) * 4) : 90) * 0.6 +
    (p.vacantLandPct < 5 ? 35 : 90) * 0.4
  );

  const roadScore = Math.min(100, Math.max(15, (p.roadDensity / 15) * 85));
  const congestionScore = Math.max(10, 100 - p.trafficCongestion);
  const transportScore = Math.round(roadScore * 0.3 + congestionScore * 0.35 + p.publicTransportAccessibility * 0.35);

  const infrastructureEquilibrium = Math.round(
    p.waterSupplyCoverage * 0.38 + p.sewerageCoverage * 0.34 + p.wasteManagementCoverage * 0.28
  );

  const aqiScore = p.aqi <= 50 ? 100 : Math.round(Math.max(10, 100 - ((p.aqi - 50) / 250) * 90));
  const greenScore = Math.min(100, Math.max(10, Math.round((p.greenSpacePct / 18) * 95)));
  const environmentScore = Math.round(aqiScore * 0.55 + greenScore * 0.45);

  const disasterScore = Math.round(Math.max(10, 100 - p.floodRisk));

  const hospitalScore = p.distanceToHospital <= 2.5 ? 95 : Math.max(15, Math.round(100 - (p.distanceToHospital - 2.5) * 12));
  const schoolScore   = p.distanceToSchool   <= 1.0 ? 98 : Math.max(20, Math.round(100 - (p.distanceToSchool   - 1.0) * 20));
  const publicServicesScore = Math.round(hospitalScore * 0.55 + schoolScore * 0.45);

  const affordabilityRatio = (p.averageIncome * 12) / Math.max(10, p.landPrice);
  const economicScore = Math.round(
    Math.min(100, Math.max(20, Math.min(85, affordabilityRatio * 10) + (100 - Math.min(80, p.infrastructureCost * 0.6)) * 0.35))
  );

  const compositeInfrastructureScore = Math.round(
    demographicScore    * 0.10 +
    landUseScore        * 0.10 +
    transportScore      * 0.16 +
    infrastructureEquilibrium * 0.20 +
    environmentScore    * 0.18 +
    disasterScore       * 0.10 +
    publicServicesScore * 0.10 +
    economicScore       * 0.06
  );

  // Decision Stress Index
  let stressPoints = 0;
  if      (p.aqi > 250)              stressPoints += 25;
  else if (p.aqi > 150)              stressPoints += 15;
  else if (p.aqi > 100)              stressPoints += 8;
  if      (p.greenSpacePct < 6.0)    stressPoints += 20;
  else if (p.greenSpacePct < 12.0)   stressPoints += 10;
  if      (p.waterSupplyCoverage < 65) stressPoints += 22;
  else if (p.waterSupplyCoverage < 80) stressPoints += 10;
  if      (p.sewerageCoverage < 60)  stressPoints += 20;
  else if (p.sewerageCoverage < 75)  stressPoints += 10;
  if      (p.trafficCongestion > 65) stressPoints += 18;
  else if (p.trafficCongestion > 45) stressPoints += 10;
  if      (p.floodRisk > 55)         stressPoints += 22;
  else if (p.floodRisk > 35)         stressPoints += 12;

  const stressIndex = Math.min(100, Math.round(stressPoints));

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

  // Planning Benchmark Compliance (project thresholds, not verified statutory determinations)
  const benchmarks = [
    {
      name: 'Water Supply Coverage',
      target: '100%',
      current: `${p.waterSupplyCoverage}%`,
      status: p.waterSupplyCoverage >= 100 ? 'Pass'
            : p.waterSupplyCoverage >= 80  ? 'Moderate Deficit'
            :                                 'Critical Gap',
      rule: 'MoHUA SLB target: 100% households with piped water.'
    },
    {
      name: 'Sewerage Network Coverage',
      target: '100%',
      current: `${p.sewerageCoverage}%`,
      status: p.sewerageCoverage >= 100 ? 'Pass'
            : p.sewerageCoverage >= 75  ? 'Sub-Optimal'
            :                             'Severe Deficit',
      rule: 'MoHUA SLB target: 100% underground sewerage network.'
    },
    {
      name: 'Air Quality Index (AQI)',
      target: '≤ 100',
      current: `${p.aqi} AQI`,
      status: p.aqi <= 100 ? 'Pass'
            : p.aqi <= 150 ? 'Moderate Pollution'
            :                 'Severe Air Pollution',
      rule: 'CPCB/WHO satisfactory threshold: AQI ≤ 100.'
    },
    {
      name: 'Green Space Coverage',
      target: '≥ 15%',
      current: `${p.greenSpacePct}%`,
      status: p.greenSpacePct >= 15 ? 'Pass'
            : p.greenSpacePct >= 10 ? 'Below Norm'
            :                          'Ecological Deficit',
      rule: 'URDPFI & WHO planning norm: ≥ 15% green cover.'
    },
    {
      name: 'Traffic Congestion',
      target: '≤ 35%',
      current: `${p.trafficCongestion}%`,
      status: p.trafficCongestion <= 35 ? 'Pass'
            : p.trafficCongestion <= 60 ? 'Moderate Congestion'
            :                             'Severe Gridlock',
      rule: 'Project threshold: ≤ 35% average traffic delay.'
    },
    {
      name: 'Flood Risk Index',
      target: '< 25',
      current: `${p.floodRisk} / 100`,
      status: p.floodRisk <= 25 ? 'Pass'
            : p.floodRisk <= 50 ? 'Moderate Hazard'
            :                     'High Hazard',
      rule: 'NDMA urban flood safety guideline: risk index < 25.'
    },
  ];

  // Actionable Recommendations
  const projects = [
    {
      name: 'Universal Potable Water Pipeline',
      priority: p.waterSupplyCoverage < 75 ? 'Critical' : 'High',
      impact: `Eliminates ${Math.max(0, 100 - p.waterSupplyCoverage)}% water deficit.`
    },
    {
      name: 'Underground Sewerage Network & STPs',
      priority: p.sewerageCoverage < 70 ? 'Critical' : 'High',
      impact: 'Serves unsewered wards to eliminate raw effluent discharge.'
    },
    {
      name: 'Clean Air Action & Smog Towers',
      priority: p.aqi > 150 ? 'Critical' : 'Medium',
      impact: 'Deploys anti-smog sweepers & low-emission transit zones.'
    },
    {
      name: 'Stormwater Drainage & Sponge Corridors',
      priority: p.floodRisk > 40 ? 'Critical' : 'Medium',
      impact: 'Upgrades roadside drainage and constructs retention bioswales.'
    },
    {
      name: 'Urban Green Buffer Acquisition',
      priority: p.greenSpacePct < 15 ? 'High' : 'Low',
      impact: 'Reclaims vacant municipal land to reach 15% green space target.'
    },
  ];

  return {
    params: p,
    urgency: { riskLevel, stressIndex, explanation },
    compositeInfrastructureScore,
    equilibriumDimensions: {
      demographic:    demographicScore,
      landUse:        landUseScore,
      transport:      transportScore,
      infrastructure: infrastructureEquilibrium,
      environment:    environmentScore,
      disaster:       disasterScore,
      publicServices: publicServicesScore,
      economic:       economicScore,
    },
    benchmarks,
    projects,
  };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Rule-based assessment endpoint
app.post('/api/assess', (req, res) => {
  const { p, errors } = sanitiseParams(req.body || {});
  const result = assessUrban(p);
  res.json({ ...result, validationWarnings: errors });
});

// Kept for backwards compatibility with existing frontend calls
app.post('/api/predict', (req, res) => {
  const { p, errors } = sanitiseParams(req.body || {});
  const result = assessUrban(p);
  res.json({ ...result, validationWarnings: errors });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Smart Urban Planning DSS',
    engine: 'rule-based',
    timestamp: new Date().toISOString(),
  });
});

// Fallback to static index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Smart Urban Planning DSS  →  http://localhost:${PORT}`);
  console.log(`   Engine: Rule-Based Assessment (no ML dependency)`);
  console.log(`======================================================\n`);
});

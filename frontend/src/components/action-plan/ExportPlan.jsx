/**
 * Generates a clean HTML report from the action plan data,
 * opens it in a new window, and triggers print (Save as PDF).
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nl2br(str) {
  if (!str) return '';
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

function severityBadge(severity) {
  const colors = {
    critical: '#DC2626', high: '#EA580C', moderate: '#D97706', low: '#2563EB',
  };
  const c = colors[severity] || '#6B7280';
  return `<span style="background:${c}22;color:${c};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;">${escapeHtml(severity)}</span>`;
}

function priorityBadge(priority) {
  const colors = {
    immediate: '#DC2626', 'short-term': '#D97706', 'long-term': '#2563EB',
  };
  const c = colors[priority] || '#6B7280';
  return `<span style="background:${c}22;color:${c};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;">${escapeHtml(priority)}</span>`;
}

export function exportAsPDF(plan) {
  if (!plan) return;

  const now = new Date(plan.generated_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const stats = plan.summary_statistics || {};

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(plan.report_title || 'Environment Action Plan')}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.6; }

  .cover { text-align: center; padding: 60px 40px 40px; border-bottom: 3px solid #0891b2; margin-bottom: 30px; }
  .cover h1 { font-size: 22px; color: #0f172a; margin-bottom: 6px; }
  .cover .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
  .cover .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 500px; margin: 0 auto; text-align: left; }
  .cover .meta dt { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .cover .meta dd { font-size: 11px; color: #334155; font-weight: 600; margin-bottom: 8px; }
  .cover .report-no { font-family: monospace; font-size: 11px; color: #0891b2; background: #f0fdfa; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 16px; }
  .cover .classification { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }

  .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-box .val { font-size: 22px; font-weight: 700; color: #0891b2; }
  .stat-box .label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }

  h2 { font-size: 14px; color: #0f172a; border-bottom: 2px solid #0891b2; padding-bottom: 6px; margin: 28px 0 14px; text-transform: uppercase; letter-spacing: 0.5px; }
  h3 { font-size: 12px; color: #0f172a; margin-bottom: 4px; }

  .summary-text { font-size: 11px; color: #334155; line-height: 1.7; margin-bottom: 20px; white-space: pre-line; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
  th { background: #f8fafc; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover { background: #f8fafc; }

  .finding { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
  .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .finding-id { font-family: monospace; font-size: 10px; color: #94a3b8; margin-right: 8px; }
  .finding p { font-size: 11px; color: #475569; margin-bottom: 8px; }
  .evidence-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 10px; color: #64748b; margin-bottom: 8px; }
  .evidence-box strong { color: #334155; }
  .finding-meta { font-size: 10px; color: #94a3b8; }

  .rec { border-left: 4px solid #0891b2; padding: 14px 14px 14px 18px; margin-bottom: 14px; background: #f8fafc; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
  .rec.immediate { border-left-color: #DC2626; }
  .rec.short-term { border-left-color: #D97706; }
  .rec.long-term { border-left-color: #2563EB; }
  .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .rec-id { font-family: monospace; font-size: 10px; color: #94a3b8; margin-right: 8px; }
  .rec p { font-size: 11px; color: #475569; margin-bottom: 8px; white-space: pre-line; }
  .rec-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #64748b; }
  .rec-meta strong { color: #334155; }

  .priority-action { display: flex; gap: 12px; padding: 10px 14px; border: 1px solid #fbbf2433; background: #fefce8; border-radius: 8px; margin-bottom: 8px; page-break-inside: avoid; }
  .priority-action .num { font-weight: 700; color: #d97706; font-size: 14px; min-width: 24px; }
  .priority-action .text { font-size: 11px; color: #92400e; }

  .kpi-current { color: #DC2626; font-weight: 600; font-family: monospace; }
  .kpi-1yr { color: #D97706; font-weight: 600; font-family: monospace; }
  .kpi-3yr { color: #059669; font-weight: 600; font-family: monospace; }

  .zone { display: flex; gap: 10px; padding: 8px 12px; border: 1px solid #f1f5f9; border-radius: 6px; margin-bottom: 6px; font-size: 10px; }
  .zone-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
  .zone-name { font-weight: 600; color: #0f172a; }
  .zone-coords { font-family: monospace; color: #94a3b8; font-size: 9px; }
  .zone-desc { color: #64748b; }

  .disclaimer { margin-top: 30px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10px; color: #94a3b8; font-style: italic; }
  .disclaimer strong { font-style: normal; color: #64748b; }

  .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #cbd5e1; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="report-no">${escapeHtml(plan.report_number || '')}</div>
  <h1>${escapeHtml(plan.report_title || `Environment Action Plan — ${plan.city}`)}</h1>
  <div class="subtitle">Satellite-Based Environmental Intelligence Assessment</div>
  <dl class="meta">
    <dt>Prepared For</dt><dd>${escapeHtml(plan.prepared_for || plan.city + ' Municipal Corporation')}</dd>
    <dt>Prepared By</dt><dd>${escapeHtml(plan.prepared_by || 'SatIntel Platform')}</dd>
    <dt>Date of Report</dt><dd>${now}</dd>
    <dt>Methodology</dt><dd>Multi-mission satellite RS + ML analytics</dd>
  </dl>
  <div class="classification">${escapeHtml(plan.classification || 'For Official Use')}</div>
</div>

<!-- STATS -->
<div class="stats-bar">
  <div class="stat-box"><div class="val">${stats.total_data_points_analyzed?.toLocaleString() || '—'}</div><div class="label">Data Points Analyzed</div></div>
  <div class="stat-box"><div class="val">${stats.satellite_missions_used || '4'}</div><div class="label">Satellite Missions</div></div>
  <div class="stat-box"><div class="val">${stats.total_anomalies_detected || '—'}</div><div class="label">Anomalies Detected</div></div>
  <div class="stat-box"><div class="val">${stats.total_hotspot_clusters || '—'}</div><div class="label">Hotspot Clusters</div></div>
</div>

<!-- EXECUTIVE SUMMARY -->
<h2>1. Executive Summary</h2>
<div class="summary-text">${nl2br(plan.executive_summary || plan.summary || '')}</div>

<!-- DATA SOURCES -->
${plan.data_sources?.length ? `
<h2>2. Data Sources</h2>
<table>
  <thead><tr><th>Mission</th><th>Agency</th><th>Parameter</th><th>Resolution</th><th>Coverage</th></tr></thead>
  <tbody>${plan.data_sources.map(ds => `
    <tr>
      <td><strong>${escapeHtml(ds.mission)}</strong></td>
      <td>${escapeHtml(ds.agency)}</td>
      <td>${escapeHtml(ds.parameter)}</td>
      <td style="font-family:monospace;font-size:10px;">${escapeHtml(ds.resolution)}</td>
      <td>${escapeHtml(ds.coverage)}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<!-- PRIORITY ACTIONS -->
${plan.priority_actions?.length ? `
<h2>3. Immediate Priority Actions</h2>
${plan.priority_actions.map((a, i) => `
<div class="priority-action">
  <div class="num">${i + 1}</div>
  <div class="text">${escapeHtml(a)}</div>
</div>`).join('')}` : ''}

<!-- RISK MATRIX -->
${plan.risk_matrix?.length ? `
<h2>4. Risk Assessment Matrix</h2>
<table>
  <thead><tr><th>Hazard</th><th>Likelihood</th><th>Impact</th><th>Risk Level</th><th>Affected Areas</th></tr></thead>
  <tbody>${plan.risk_matrix.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.hazard)}</strong></td>
      <td>${escapeHtml(r.likelihood)}</td>
      <td style="max-width:200px;">${escapeHtml(r.impact)}</td>
      <td>${severityBadge(r.risk_level?.toLowerCase())}</td>
      <td style="font-size:10px;">${escapeHtml(r.affected_areas)}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<!-- FINDINGS -->
${plan.findings?.length ? `
<h2>5. Key Findings</h2>
${plan.findings.map(f => `
<div class="finding">
  <div class="finding-header">
    <div><span class="finding-id">${escapeHtml(f.id || '')}</span><strong>${escapeHtml(f.title)}</strong></div>
    ${severityBadge(f.severity)}
  </div>
  <p>${nl2br(f.description)}</p>
  ${f.evidence ? `<div class="evidence-box"><strong>Satellite Evidence:</strong> ${escapeHtml(f.evidence)}</div>` : ''}
  <div class="finding-meta">
    ${f.affected_population ? `Population Impact: ${escapeHtml(f.affected_population)}` : ''}
    ${f.trend ? ` &nbsp;|&nbsp; Trend: ${escapeHtml(f.trend)}` : ''}
  </div>
</div>`).join('')}` : ''}

<!-- PRIORITY ZONES -->
${plan.priority_zones?.length ? `
<h2>6. Priority Intervention Zones</h2>
${plan.priority_zones.map(z => {
  const dotColor = z.severity === 'critical' ? '#DC2626' : z.severity === 'high' ? '#EA580C' : '#D97706';
  return `
<div class="zone">
  <div class="zone-dot" style="background:${dotColor};"></div>
  <div>
    <span class="zone-name">${escapeHtml(z.name)}</span>
    <span class="zone-coords">${z.lat}°N, ${z.lng}°E</span>
    ${severityBadge(z.severity)}
    <div class="zone-desc">${escapeHtml(z.description)}</div>
  </div>
</div>`;
}).join('')}` : ''}

<!-- RECOMMENDATIONS -->
${plan.recommendations?.length ? `
<h2>7. Recommendations</h2>
${plan.recommendations.map(r => `
<div class="rec ${r.priority}">
  <div class="rec-header">
    <div><span class="rec-id">${escapeHtml(r.id || '')}</span><strong>${escapeHtml(r.title)}</strong></div>
    ${priorityBadge(r.priority)}
  </div>
  <p>${nl2br(r.description)}</p>
  <div class="rec-meta">
    ${r.timeline ? `<div><strong>Timeline:</strong> ${escapeHtml(r.timeline)}</div>` : ''}
    ${r.location ? `<div><strong>Location:</strong> ${escapeHtml(r.location)}</div>` : ''}
    ${r.responsible_authority ? `<div><strong>Responsible:</strong> ${escapeHtml(r.responsible_authority)}</div>` : ''}
    ${r.estimated_impact ? `<div><strong>Expected Impact:</strong> ${escapeHtml(r.estimated_impact)}</div>` : ''}
    ${r.budget_category ? `<div><strong>Budget:</strong> ${escapeHtml(r.budget_category)}</div>` : ''}
  </div>
</div>`).join('')}` : ''}

<!-- KPIs -->
${plan.monitoring_framework?.kpis?.length ? `
<h2>8. Monitoring Framework & KPIs</h2>
<table>
  <thead><tr><th>Metric</th><th>Current Value</th><th>1-Year Target</th><th>3-Year Target</th></tr></thead>
  <tbody>${plan.monitoring_framework.kpis.map(k => `
    <tr>
      <td><strong>${escapeHtml(k.metric)}</strong></td>
      <td class="kpi-current">${escapeHtml(k.current)}</td>
      <td class="kpi-1yr">${escapeHtml(k.target_1yr)}</td>
      <td class="kpi-3yr">${escapeHtml(k.target_3yr)}</td>
    </tr>`).join('')}
  </tbody>
</table>

${plan.monitoring_framework.schedule?.length ? `
<h3>Quarterly Satellite Monitoring Schedule</h3>
<table>
  <thead><tr><th>Quarter</th><th>Focus Area</th></tr></thead>
  <tbody>${plan.monitoring_framework.schedule.map(q => `
    <tr><td><strong>${escapeHtml(q.quarter)}</strong></td><td>${escapeHtml(q.focus)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}` : ''}

<!-- DISCLAIMER -->
${plan.disclaimer ? `<div class="disclaimer"><strong>Disclaimer:</strong> ${escapeHtml(plan.disclaimer)}</div>` : ''}

<div class="footer">
  Generated by SatIntel — Satellite Environmental Intelligence Platform | AETRIX 2026 — PS-4<br/>
  Report Date: ${now} | ${escapeHtml(plan.report_number || '')}
</div>

</body>
</html>`;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to render then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  // Fallback if onload doesn't fire
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

export function exportAsJSON(plan) {
  if (!plan) return;
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EAP_${plan.city}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

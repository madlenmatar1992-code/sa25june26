(() => {
  const data = window.sentimentDashboardData;
  if (!data || !Array.isArray(data.summary) || !Array.isArray(data.analyzed)) {
    document.body.innerHTML = '<div class="empty" style="margin:24px">Dashboard data not found. Load <code>patient_sentiment_dashboard_data.js</code> first.</div>';
    return;
  }

  const summary = data.summary;
  const analyzed = data.analyzed;
  const meta = data.meta || {};

  const state = {
    hospital: 'All',
    source: 'All',
    polarity: 'All',
    patientType: 'All',
    confidence: 90,
    selectedDriver: ''
  };

  const el = {
    hospitalFilter: document.getElementById('hospitalFilter'),
    sourceFilter: document.getElementById('sourceFilter'),
    polarityFilter: document.getElementById('polarityFilter'),
    patientTypeFilter: document.getElementById('patientTypeFilter'),
    confidenceFilter: document.getElementById('confidenceFilter'),
    confidenceValue: document.getElementById('confidenceValue'),
    kpiFeedbacks: document.getElementById('kpiFeedbacks'),
    kpiSentiments: document.getElementById('kpiSentiments'),
    kpiPositive: document.getElementById('kpiPositive'),
    kpiNegative: document.getElementById('kpiNegative'),
    donutChart: document.getElementById('donutChart'),
    donutValue: document.getElementById('donutValue'),
    donutLabel: document.getElementById('donutLabel'),
    posBar: document.getElementById('posBar'),
    negBar: document.getElementById('negBar'),
    neuBar: document.getElementById('neuBar'),
    posLabel: document.getElementById('posLabel'),
    negLabel: document.getElementById('negLabel'),
    neuLabel: document.getElementById('neuLabel'),
    dominantTone: document.getElementById('dominantTone'),
    visibleHospitals: document.getElementById('visibleHospitals'),
    visibleSources: document.getElementById('visibleSources'),
    visibleComments: document.getElementById('visibleComments'),
    hospitalBreakdown: document.getElementById('hospitalBreakdown'),
    topPositive: document.getElementById('topPositive'),
    topNegative: document.getElementById('topNegative'),
    commentsList: document.getElementById('commentsList'),
    commentNote: document.getElementById('commentNote'),
    activeDriverChip: document.getElementById('activeDriverChip'),
    clearDriver: document.getElementById('clearDriver')
  };

  const clean = (value) => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const options = (values) => values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');

  function populateFilters() {
    el.hospitalFilter.innerHTML = options(['All', ...(meta.hospitals || [])]);
    el.sourceFilter.innerHTML = options(['All', ...(meta.sources || [])]);
    el.polarityFilter.innerHTML = options(['All', 'Positive', 'Negative', 'Neutral']);
    el.patientTypeFilter.innerHTML = options(['All', ...(meta.patient_types || [])]);
  }

  function primaryRows() {
    return summary.filter((row) => {
      return (state.hospital === 'All' || row['Unit Name'] === state.hospital)
        && (state.source === 'All' || row['Source'] === state.source)
        && (state.polarity === 'All' || row['Primary Polarity'] === state.polarity)
        && (state.patientType === 'All' || row['Patient Type'] === state.patientType)
        && Number(row['Primary Confidence'] || 0) >= state.confidence;
    });
  }

  function analyzedRows() {
    return analyzed.filter((row) => {
      return (state.hospital === 'All' || row['Unit Name'] === state.hospital)
        && (state.source === 'All' || row['Source'] === state.source)
        && (state.polarity === 'All' || row['Sentiment Type (Polarity)'] === state.polarity)
        && (state.patientType === 'All' || row['Patient Type'] === state.patientType)
        && Number(row['Confidence'] || 0) >= state.confidence;
    });
  }

  function sentimentCounts(rows, key = 'Primary Polarity') {
    return {
      Positive: rows.filter(r => r[key] === 'Positive').length,
      Negative: rows.filter(r => r[key] === 'Negative').length,
      Neutral: rows.filter(r => r[key] === 'Neutral').length
    };
  }

  function topBySentiment(rows, polarity) {
    const counts = new Map();
    rows
      .filter(r => r['Sentiment Type (Polarity)'] === polarity)
      .forEach(r => counts.set(r['Sentiment Category'], (counts.get(r['Sentiment Category']) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  function pct(value, total) {
    return `${((total ? value / total : 0) * 100).toFixed(1)}%`;
  }

  function render() {
    const sumRows = primaryRows();
    const senRows = analyzedRows();
    const totalSum = sumRows.length || 1;
    const totalSen = senRows.length || 1;
    const counts = sentimentCounts(sumRows);
    const analyzedCounts = sentimentCounts(senRows, 'Sentiment Type (Polarity)');
    const positive = counts.Positive;
    const negative = counts.Negative;
    const neutral = counts.Neutral;
    const positiveShare = positive / totalSum * 100;
    const negativeShare = negative / totalSum * 100;
    const neutralShare = neutral / totalSum * 100;
    const dominant = [['Positive', positive], ['Negative', negative], ['Neutral', neutral]].sort((a, b) => b[1] - a[1])[0][0] || '-';

    el.kpiFeedbacks.textContent = new Set(sumRows.map(r => r['Feedback ID'])).size.toLocaleString();
    el.kpiSentiments.textContent = senRows.length.toLocaleString();
    el.kpiPositive.textContent = pct(analyzedCounts.Positive, totalSen);
    el.kpiNegative.textContent = pct(analyzedCounts.Negative, totalSen);

    el.donutChart.style.background = `conic-gradient(#10b981 0 ${positiveShare}%, #ef4444 ${positiveShare}% ${positiveShare + negativeShare}%, #f59e0b ${positiveShare + negativeShare}% 100%)`;
    el.donutValue.textContent = pct(positive, totalSum);
    el.donutLabel.textContent = 'Positive share';
    el.posBar.style.width = `${positiveShare}%`;
    el.negBar.style.width = `${negativeShare}%`;
    el.neuBar.style.width = `${neutralShare}%`;
    el.posLabel.textContent = `${pct(positive, totalSum)} (${positive.toLocaleString()})`;
    el.negLabel.textContent = `${pct(negative, totalSum)} (${negative.toLocaleString()})`;
    el.neuLabel.textContent = `${pct(neutral, totalSum)} (${neutral.toLocaleString()})`;

    el.dominantTone.textContent = dominant;
    el.visibleHospitals.textContent = new Set(sumRows.map(r => r['Unit Name'])).size.toLocaleString();
    el.visibleSources.textContent = new Set(sumRows.map(r => r['Source'])).size.toLocaleString();
    el.visibleComments.textContent = new Set(sumRows.map(r => r['Feedback ID'])).size.toLocaleString();

    const hospitals = (meta.hospitals || [])
      .map(name => {
        const rows = sumRows.filter(r => r['Unit Name'] === name);
        return { name, rows, total: rows.length };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    el.hospitalBreakdown.innerHTML = hospitals.length ? hospitals.map(({ name, rows, total }) => {
      const c = sentimentCounts(rows);
      const p = total ? c.Positive / total * 100 : 0;
      const n = total ? c.Negative / total * 100 : 0;
      const u = total ? c.Neutral / total * 100 : 0;
      return `
        <div class="hospital-row">
          <div class="hospital-name">${escapeHtml(name)}</div>
          <div class="stack">
            <div class="seg pos" style="width:${p}%"></div>
            <div class="seg neg" style="width:${n}%"></div>
            <div class="seg neu" style="width:${u}%"></div>
          </div>
          <div class="metric">${pct(total, totalSum)} (${total.toLocaleString()})</div>
        </div>`;
    }).join('') : '<div class="empty">No feedback matches the selected filters.</div>';

    const renderDriverList = (rows, polarity) => {
      if (!rows.length) return '<div class="empty">No matching sentiment rows.</div>';
      const total = rows.reduce((sum, row) => sum + row[1], 0) || 1;
      return rows.map(([name, count]) => {
        const selected = state.selectedDriver === clean(name);
        const share = count / total * 100;
        return `
          <div class="driver-card ${selected ? 'active' : ''}" data-driver="${escapeHtml(name)}" role="button" tabindex="0" aria-pressed="${selected}">
            <div class="row">
              <div class="name">${escapeHtml(name)}</div>
              <div class="share">${pct(count, total)} (${count.toLocaleString()})</div>
            </div>
            <div class="bar"><div style="width:${share}%;background:${polarity === 'Positive' ? 'linear-gradient(90deg,#34d399,#10b981)' : 'linear-gradient(90deg,#fb7185,#ef4444)'}"></div></div>
          </div>`;
      }).join('');
    };

    const topPositive = topBySentiment(senRows, 'Positive');
    const topNegative = topBySentiment(senRows, 'Negative');
    el.topPositive.innerHTML = renderDriverList(topPositive, 'Positive');
    el.topNegative.innerHTML = renderDriverList(topNegative, 'Negative');

    const comments = sumRows.filter(row =>
      Number(row['Primary Confidence'] || 0) >= 90 &&
      String(row['Primary Sentiment'] || '').trim() !== 'Overall Positive' &&
      (!state.selectedDriver || String(row['Primary Sentiment'] || '').trim() === state.selectedDriver)
    );

    if (!comments.length) {
      el.commentsList.innerHTML = '<div class="empty">No matching classified comments for the current filter set.</div>';
    } else {
      const note = state.selectedDriver
        ? `<div class="comment-note">Filtered by top sentiment driver: <strong>${escapeHtml(state.selectedDriver)}</strong></div>`
        : '<div class="comment-note">Showing non-overall-positive comments with confidence 90% or higher.</div>';
      el.commentsList.innerHTML = `
        ${note}
        <div class="comments">
          ${comments.slice(0, 200).map(row => `
            <article class="comment">
              <div class="comment-top">
                <div class="chips">
                  <span class="chip">${escapeHtml(row['Unit Name'])}</span>
                  <span class="chip">${escapeHtml(row['Source'])}</span>
                  <span class="chip ${String(row['Primary Polarity']).toLowerCase().slice(0, 3)}">${escapeHtml(row['Primary Sentiment'])}</span>
                </div>
                <div class="chips">
                  <span class="chip">${escapeHtml(row['Patient Type'])}</span>
                  <span class="chip">${Number(row['Primary Confidence'] || 0)}%</span>
                </div>
              </div>
              <div class="chips" style="margin-bottom:8px">
                <span class="chip">Sentiments Gathered: ${analyzed.filter(a => a['Feedback ID'] === row['Feedback ID']).length}</span>
              </div>
              <p>${escapeHtml(row['Patient Comment'])}</p>
            </article>
          `).join('')}
        </div>`;
    }

    el.activeDriverChip.textContent = state.selectedDriver || 'No driver selected';
    el.commentNote.textContent = state.selectedDriver
      ? `Comments filtered by ${state.selectedDriver}.`
      : 'Showing non-overall-positive comments with confidence 90% or higher.';
  }

  function syncState() {
    state.hospital = el.hospitalFilter.value;
    state.source = el.sourceFilter.value;
    state.polarity = el.polarityFilter.value;
    state.patientType = el.patientTypeFilter.value;
    state.confidence = Number(el.confidenceFilter.value || 0);
    el.confidenceValue.textContent = `${state.confidence}%`;
  }

  function bind() {
    [el.hospitalFilter, el.sourceFilter, el.polarityFilter, el.patientTypeFilter].forEach(node => {
      node.addEventListener('change', () => {
        syncState();
        render();
      });
    });

    el.confidenceFilter.addEventListener('input', () => {
      syncState();
      render();
    });

    el.clearDriver.addEventListener('click', () => {
      state.selectedDriver = '';
      render();
    });

    const handleDriverClick = (event) => {
      const node = event.target.closest('.driver-card[data-driver]');
      if (!node) return;
      const driver = clean(node.dataset.driver);
      state.selectedDriver = state.selectedDriver === driver ? '' : driver;
      render();
    };

    el.topPositive.addEventListener('click', handleDriverClick);
    el.topNegative.addEventListener('click', handleDriverClick);
    el.topPositive.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') handleDriverClick(event);
    });
    el.topNegative.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') handleDriverClick(event);
    });
  }

  populateFilters();
  bind();
  syncState();
  render();
})();

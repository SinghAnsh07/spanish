// app.js - Spanish Studio Digital Testing Engine

// Global State
let currentTest = null;
let userAnswers = {};
let lastEvaluatedResults = [];
let activeTopicFilter = 'all';
let currentReviewFilter = 'all';
let activeFocusedInput = null;

// Persistent Studied Set
let studiedDocs = new Set();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initStudiedDocs();
  renderHub();
  setupFilterBar();
  setupBackButtons();
  updateStatsRibbon();
});

// Initialize Studied Set from localStorage or defaults
function initStudiedDocs() {
  try {
    const saved = localStorage.getItem('spanish_studied_docs');
    if (saved !== null) {
      const arr = JSON.parse(saved);
      studiedDocs = new Set(arr);
    } else if (typeof TESTS_DATA !== 'undefined') {
      // Default from database (files in done/ folder)
      TESTS_DATA.forEach(t => {
        if (t.default_studied || t.is_in_done_folder) {
          studiedDocs.add(t.id);
        }
      });
      saveStudiedDocs();
    }
  } catch (e) {
    console.error('Error loading studied docs from localStorage:', e);
  }
}

function saveStudiedDocs() {
  try {
    localStorage.setItem('spanish_studied_docs', JSON.stringify(Array.from(studiedDocs)));
  } catch (e) {
    console.error('Error saving studied docs to localStorage:', e);
  }
}

// Update Header Stats Ribbon & Filter Badges
function updateStatsRibbon() {
  if (typeof TESTS_DATA === 'undefined') return;

  const total = TESTS_DATA.length;
  const studiedCount = Array.from(studiedDocs).filter(id => TESTS_DATA.some(t => t.id === id)).length;
  const toStudyCount = total - studiedCount;
  const pct = Math.round((studiedCount / total) * 100);

  // Stats ribbon
  const statStudied = document.getElementById('stat-studied-count');
  if (statStudied) statStudied.textContent = `${studiedCount} / ${total}`;

  const progFill = document.getElementById('study-progress-fill');
  if (progFill) progFill.style.width = `${pct}%`;

  // Filter badge counters
  const badgeAll = document.getElementById('badge-all');
  if (badgeAll) badgeAll.textContent = total;

  const badgeStudied = document.getElementById('badge-studied');
  if (badgeStudied) badgeStudied.textContent = studiedCount;

  const badgeToStudy = document.getElementById('badge-to-study');
  if (badgeToStudy) badgeToStudy.textContent = toStudyCount;
}

// Setup Hub Documents
function renderHub() {
  const docsGrid = document.getElementById('docs-grid');
  if (!docsGrid || typeof TESTS_DATA === 'undefined') return;

  // Filter tests based on active topic / status
  const filteredTests = TESTS_DATA.filter(test => {
    if (activeTopicFilter === 'all') return true;
    if (activeTopicFilter === 'studied') return studiedDocs.has(test.id);
    if (activeTopicFilter === 'to-study') return !studiedDocs.has(test.id);

    const topicLower = (test.topic + ' ' + test.title + ' ' + test.id).toLowerCase();
    if (activeTopicFilter === 'gustar') return topicLower.includes('gustar');
    if (activeTopicFilter === 'prepositions') return topicLower.includes('preposicion') || topicLower.includes('lugar') || topicLower.includes('preposition');
    if (activeTopicFilter === 'calendar') return topicLower.includes('month') || topicLower.includes('mes') || topicLower.includes('weather') || topicLower.includes('clima') || topicLower.includes('season') || topicLower.includes('time') || topicLower.includes('hora');
    if (activeTopicFilter === 'reflexive') return topicLower.includes('reflexive') || topicLower.includes('reflexivo') || topicLower.includes('rutina');
    if (activeTopicFilter === 'stem') return topicLower.includes('stem') || topicLower.includes('boot') || topicLower.includes('tener');
    if (activeTopicFilter === 'ser-estar') return topicLower.includes('ser vs estar') || topicLower.includes('ser') || topicLower.includes('estar');
    if (activeTopicFilter === 'contextual') return topicLower.includes('contextual') || topicLower.includes('saber') || topicLower.includes('conocer');
    return true;
  });

  if (filteredTests.length === 0) {
    docsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem; background: #ffffff; border: 1px dashed #fbcfe8; border-radius: 16px; color: #6b7280;">
        <p style="font-size: 1.1rem; font-weight: 600; color: #be185d; margin-bottom: 0.35rem;">No worksheets found for this filter</p>
        <p style="font-size: 0.9rem;">Try selecting "All Documents" or a different topic category.</p>
      </div>
    `;
    return;
  }

  docsGrid.innerHTML = filteredTests.map(test => {
    const isPdf = test.filename.toLowerCase().endsWith('.pdf');
    const badgeClass = isPdf ? 'pdf' : 'docx';
    const badgeText = isPdf ? 'PDF DOC' : 'WORD DOCX';
    const isStudied = studiedDocs.has(test.id);
    
    const formatBadges = (test.format_breakdown || []).slice(0, 3).map(fmt => 
      `<span class="format-tag">${escapeHtml(fmt)}</span>`
    ).join('');

    return `
      <article class="doc-card ${isStudied ? 'is-studied' : ''}" id="card-${test.id}">
        <div class="doc-card-top">
          <div class="doc-card-header-row">
            <div class="doc-meta-tags">
              <span class="doc-badge ${badgeClass}">${badgeText}</span>
              ${test.is_in_done_folder ? '<span class="doc-badge done-folder" title="File located in done/ folder">📁 in done/</span>' : ''}
              <span class="doc-badge questions-count">${test.questions.length} Qs</span>
            </div>
            <button type="button" 
                    class="btn-toggle-studied ${isStudied ? 'studied' : 'unstudied'}" 
                    onclick="toggleStudied('${test.id}', event)" 
                    title="${isStudied ? 'Click to mark as unstudied' : 'Click to mark as studied'}">
              <span class="icon">${isStudied ? '✓' : '○'}</span>
              <span class="label">${isStudied ? 'Studied' : 'Mark as Studied'}</span>
            </button>
          </div>

          <h3 class="doc-title">${escapeHtml(test.title)}</h3>
          ${test.student ? `<div class="doc-student">${escapeHtml(test.student)}</div>` : ''}
          <p class="doc-desc">${escapeHtml(test.description)}</p>
          <div class="format-tags">
            ${formatBadges}
          </div>
        </div>
        <button class="btn-aesthetic" onclick="startTest('${test.id}')">
          Start Test →
        </button>
      </article>
    `;
  }).join('');
}

// Toggle Studied Status from Card
function toggleStudied(docId, event) {
  if (event) event.stopPropagation();

  const isCurrentlyStudied = studiedDocs.has(docId);
  const test = TESTS_DATA.find(t => t.id === docId);
  const docTitle = test ? test.title : 'Document';

  if (isCurrentlyStudied) {
    studiedDocs.delete(docId);
    showToast(`Marked "${docTitle}" as To Study`, false);
  } else {
    studiedDocs.add(docId);
    showToast(`🌸 Marked "${docTitle}" as Studied!`, true);
  }

  saveStudiedDocs();
  updateStatsRibbon();

  // If in studied or to-study filter, re-render hub to reflect filter change
  if (activeTopicFilter === 'studied' || activeTopicFilter === 'to-study') {
    renderHub();
  } else {
    // Smoothly update card in place
    const card = document.getElementById(`card-${docId}`);
    if (card) {
      const nowStudied = studiedDocs.has(docId);
      card.classList.toggle('is-studied', nowStudied);
      const btn = card.querySelector('.btn-toggle-studied');
      if (btn) {
        btn.className = `btn-toggle-studied ${nowStudied ? 'studied' : 'unstudied'}`;
        btn.title = nowStudied ? 'Click to mark as unstudied' : 'Click to mark as studied';
        btn.querySelector('.icon').textContent = nowStudied ? '✓' : '○';
        btn.querySelector('.label').textContent = nowStudied ? 'Studied' : 'Mark as Studied';
      }
    }
  }

  // Also sync with active test buttons if test is open
  syncActiveTestStudiedButton();
}

// Toggle Studied from inside Active Test or Results Screen
function toggleActiveTestStudied() {
  if (!currentTest) return;
  toggleStudied(currentTest.id);
  syncActiveTestStudiedButton();
}

function syncActiveTestStudiedButton() {
  if (!currentTest) return;
  const isStudied = studiedDocs.has(currentTest.id);

  // Test view button
  const testBtn = document.getElementById('test-btn-toggle-studied');
  if (testBtn) {
    testBtn.className = `btn-toggle-studied ${isStudied ? 'studied' : 'unstudied'}`;
    const icon = testBtn.querySelector('.icon');
    const label = testBtn.querySelector('.label');
    if (icon) icon.textContent = isStudied ? '✓' : '○';
    if (label) label.textContent = isStudied ? 'Studied' : 'Mark as Studied';
  }

  // Results view button
  const resBtn = document.getElementById('res-btn-toggle-studied');
  if (resBtn) {
    if (isStudied) {
      resBtn.className = 'btn-secondary';
      resBtn.innerHTML = '✓ Studied (Click to unmark)';
      resBtn.style.color = '#059669';
      resBtn.style.borderColor = '#a7f3d0';
      resBtn.style.background = '#ecfdf5';
    } else {
      resBtn.className = 'btn-secondary';
      resBtn.innerHTML = '✨ Mark Document as Studied';
      resBtn.style.color = '#be185d';
      resBtn.style.borderColor = '#fbcfe8';
      resBtn.style.background = '#ffffff';
    }
  }
}

// Sleek Toast Notification
function showToast(message, isSuccess = true) {
  const existing = document.querySelector('.studied-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'studied-toast';
  toast.innerHTML = `<span>${message}</span>`;
  if (!isSuccess) {
    toast.style.borderColor = '#fbcfe8';
    toast.style.color = '#be185d';
  }
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// Filter Bar Handler
function setupFilterBar() {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTopicFilter = btn.dataset.filter || 'all';
      renderHub();
    }
  });
}

function setupBackButtons() {
  const btnBack = document.getElementById('btn-back-hub');
  if (btnBack) {
    btnBack.addEventListener('click', returnToHub);
  }
}

// Start a Selected Test
function startTest(testId) {
  const test = TESTS_DATA.find(t => t.id === testId);
  if (!test) return;

  currentTest = test;
  userAnswers = {};

  // Switch View
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('results-view').style.display = 'none';
  const testView = document.getElementById('test-view');
  testView.style.display = 'block';

  // Set Test Details
  document.getElementById('test-active-title').textContent = test.title;
  document.getElementById('test-active-desc').textContent = test.description;
  document.getElementById('test-badge-count').textContent = `${test.questions.length} Questions`;

  syncActiveTestStudiedButton();
  renderQuestions(test.questions);
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Questions in Active Test
function renderQuestions(questions) {
  const container = document.getElementById('questions-container');
  if (!container) return;

  container.innerHTML = questions.map((q, idx) => {
    return `
      <div class="question-card" id="qcard-${q.id}">
        <div class="question-section-badge">Question ${idx + 1} of ${questions.length} · ${escapeHtml(q.section || 'General')}</div>
        <div class="question-prompt">${escapeHtml(q.prompt)}</div>
        <div class="question-body">
          ${renderQuestionInput(q, idx)}
        </div>
      </div>
    `;
  }).join('');

  // Attach input focus listeners for Spanish accents bar
  container.querySelectorAll('input.fill-input-box').forEach(input => {
    input.addEventListener('focus', () => {
      activeFocusedInput = input;
    });
    input.addEventListener('input', (e) => {
      const qId = e.target.dataset.qid;
      userAnswers[qId] = e.target.value;
      updateProgress();
    });
  });
}

function renderQuestionInput(q, idx) {
  if (q.type === 'mcq' || q.type === 'tf' || q.type === 'match') {
    return `
      <div class="options-group">
        ${q.options.map((opt, optIdx) => {
          return `
            <label class="option-pill-label" onclick="selectRadioOption('${q.id}', '${escapeJs(opt)}', this)">
              <input type="radio" name="input_${q.id}" value="${escapeHtml(opt)}" onchange="onRadioChange('${q.id}', '${escapeJs(opt)}')">
              <span>${escapeHtml(opt)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else {
    // Fill in the blank
    return `
      <div class="fill-input-wrapper">
        <input type="text" 
               class="fill-input-box" 
               id="input-${q.id}" 
               data-qid="${q.id}" 
               placeholder="Type your answer in Spanish..." 
               autocomplete="off" 
               spellcheck="false">
      </div>
    `;
  }
}

// Handle Option Selection
function selectRadioOption(qId, value, labelElem) {
  const card = document.getElementById(`qcard-${qId}`);
  if (card) {
    card.querySelectorAll('.option-pill-label').forEach(lbl => lbl.classList.remove('selected'));
  }
  if (labelElem) {
    labelElem.classList.add('selected');
    const radio = labelElem.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  userAnswers[qId] = value;
  updateProgress();
}

function onRadioChange(qId, value) {
  userAnswers[qId] = value;
  updateProgress();
}

// Update Answered Progress
function updateProgress() {
  if (!currentTest) return;
  const total = currentTest.questions.length;
  const answeredCount = Object.keys(userAnswers).filter(k => {
    const val = userAnswers[k];
    return val !== undefined && val !== null && String(val).trim().length > 0;
  }).length;

  const pct = Math.round((answeredCount / total) * 100);
  const fill = document.getElementById('test-progress-fill');
  if (fill) fill.style.width = `${pct}%`;

  const counter = document.getElementById('test-answered-counter');
  if (counter) {
    counter.innerHTML = `Answered: <strong>${answeredCount}</strong> of <strong>${total}</strong>`;
  }
}

// Spanish Accents Toolbar Helper
function insertAccent(char) {
  if (!activeFocusedInput) {
    // Pick the first available fill-in input if none currently focused
    activeFocusedInput = document.querySelector('input.fill-input-box');
  }
  if (!activeFocusedInput) return;

  const input = activeFocusedInput;
  const start = input.selectionStart || input.value.length;
  const end = input.selectionEnd || input.value.length;
  const text = input.value;
  
  input.value = text.substring(0, start) + char + text.substring(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + char.length;

  // Trigger input update
  const qId = input.dataset.qid;
  if (qId) {
    userAnswers[qId] = input.value;
    updateProgress();
  }
}

// Normalize strings for smart evaluation
function normalizeAnswer(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!]/g, '')
    .replace(/\s+/g, ' ');
}

// Accent-insensitive normalization
function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Evaluate Test
function submitActiveTest() {
  if (!currentTest) return;

  const total = currentTest.questions.length;
  const results = [];
  let correctCount = 0;

  currentTest.questions.forEach(q => {
    const userRaw = userAnswers[q.id] || '';
    const userNorm = normalizeAnswer(userRaw);
    const correctNorm = normalizeAnswer(q.answer);

    let isCorrect = false;

    if (q.type === 'mcq' || q.type === 'tf' || q.type === 'match') {
      isCorrect = (userNorm === correctNorm);
    } else {
      // Fill-in check
      const accepted = (q.acceptable_answers || [q.answer]).map(a => normalizeAnswer(a));
      
      // Exact normalized match or accent-stripped match
      isCorrect = accepted.includes(userNorm) || 
                  accepted.some(acc => stripDiacritics(acc) === stripDiacritics(userNorm) && userNorm.length > 0);
    }

    if (isCorrect) correctCount++;

    results.push({
      question: q,
      userAnswer: userRaw.trim() || '(No answer provided)',
      isCorrect: isCorrect,
      correctAnswer: q.answer,
      explanation: q.explanation
    });
  });

  lastEvaluatedResults = results;
  displayResults(correctCount, total, results);
}

// Display Test Results View
function displayResults(correct, total, results) {
  document.getElementById('test-view').style.display = 'none';
  const resView = document.getElementById('results-view');
  resView.style.display = 'block';

  const pct = Math.round((correct / total) * 100);
  const incorrect = total - correct;

  document.getElementById('res-score-percent').textContent = `${pct}%`;
  document.getElementById('res-score-fraction').textContent = `${correct} / ${total}`;
  document.getElementById('res-stat-correct').textContent = `✓ ${correct} Correct`;
  document.getElementById('res-stat-incorrect').textContent = `✕ ${incorrect} Incorrect`;
  document.getElementById('res-stat-total').textContent = `Total: ${total} Questions`;

  // Headline
  const headline = document.getElementById('res-headline');
  const comment = document.getElementById('res-comment');

  if (pct === 100) {
    headline.textContent = '¡Perfecto! Outstanding Score 🌟';
    comment.textContent = 'You answered every question with 100% accuracy. Excellent Spanish mastery!';
  } else if (pct >= 80) {
    headline.textContent = '¡Muy Bien! Great Job 👏';
    comment.textContent = 'Impressive performance! Check out the explanations below for the few you missed.';
  } else if (pct >= 60) {
    headline.textContent = '¡Buen Esfuerzo! Good Practice 👍';
    comment.textContent = 'Good foundation. Read through the grammar notes and explanations below to improve.';
  } else {
    headline.textContent = '¡Sigue Practicando! Keep Learning 💪';
    comment.textContent = 'Review the detailed grammar explanations below and try retaking the test!';
  }

  syncActiveTestStudiedButton();
  currentReviewFilter = 'all';
  updateReviewFilterButtons();
  renderReviewList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Filter Review Questions (All, Incorrect, Correct)
function filterReviewResults(filterType) {
  currentReviewFilter = filterType;
  updateReviewFilterButtons();
  renderReviewList();
}

function updateReviewFilterButtons() {
  document.getElementById('res-tab-all').classList.toggle('active', currentReviewFilter === 'all');
  document.getElementById('res-tab-incorrect').classList.toggle('active', currentReviewFilter === 'incorrect');
  document.getElementById('res-tab-correct').classList.toggle('active', currentReviewFilter === 'correct');
}

function renderReviewList() {
  const container = document.getElementById('review-container');
  if (!container) return;

  const filtered = lastEvaluatedResults.filter(item => {
    if (currentReviewFilter === 'incorrect') return !item.isCorrect;
    if (currentReviewFilter === 'correct') return item.isCorrect;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #9ca3af; background: #fff; border-radius: 14px;">
        No questions to display for this filter.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const q = item.question;
    const isCorrect = item.isCorrect;
    const cardClass = isCorrect ? 'correct' : 'incorrect';
    const tagText = isCorrect ? '✓ Correcto' : '✕ Incorrecto';
    const tagClass = isCorrect ? 'correct' : 'incorrect';

    return `
      <div class="review-card ${cardClass}">
        <div class="review-header">
          <span class="question-section-badge">${escapeHtml(q.section || 'Review')}</span>
          <span class="review-status-tag ${tagClass}">${tagText}</span>
        </div>
        <div class="review-prompt">${escapeHtml(q.prompt)}</div>
        
        <div class="answers-comparison">
          <div class="user-ans-row ${isCorrect ? '' : 'wrong-ans'}">
            <strong>Your answer:</strong> ${escapeHtml(item.userAnswer)}
          </div>
          <div class="correct-ans-row">
            <strong>Correct answer:</strong> ${escapeHtml(item.correctAnswer)}
          </div>
        </div>

        <div class="explanation-box">
          <span class="explanation-icon">💡</span>
          <div>
            <strong>Explicación:</strong> ${escapeHtml(item.explanation)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Retake Current Test
function retakeCurrentTest() {
  if (currentTest) {
    startTest(currentTest.id);
  }
}

// Return to Document Hub
function returnToHub() {
  currentTest = null;
  userAnswers = {};
  document.getElementById('test-view').style.display = 'none';
  document.getElementById('results-view').style.display = 'none';
  document.getElementById('hub-view').style.display = 'block';
  updateStatsRibbon();
  renderHub();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Security / HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

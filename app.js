// app.js - Spanish Studio Digital Testing Engine

// Global State
let currentTest = null;
let userAnswers = {};
let lastEvaluatedResults = [];
let activeTopicFilter = 'all';
let currentReviewFilter = 'all';
let activeFocusedInput = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderHub();
  setupFilterBar();
  setupBackButtons();
});

// Setup Hub Documents
function renderHub() {
  const docsGrid = document.getElementById('docs-grid');
  if (!docsGrid || typeof TESTS_DATA === 'undefined') return;

  // Filter tests based on active topic
  const filteredTests = TESTS_DATA.filter(test => {
    if (activeTopicFilter === 'all') return true;
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

  docsGrid.innerHTML = filteredTests.map(test => {
    const isPdf = test.filename.toLowerCase().endsWith('.pdf');
    const badgeClass = isPdf ? 'pdf' : 'docx';
    const badgeText = isPdf ? 'PDF DOC' : 'WORD DOCX';
    
    const formatBadges = (test.format_breakdown || []).slice(0, 3).map(fmt => 
      `<span class="format-tag">${escapeHtml(fmt)}</span>`
    ).join('');

    return `
      <article class="doc-card" id="card-${test.id}">
        <div class="doc-card-top">
          <div class="doc-meta-tags">
            <span class="doc-badge ${badgeClass}">${badgeText}</span>
            <span class="doc-badge questions-count">${test.questions.length} Questions</span>
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

// Filter Bar Handler
function setupFilterBar() {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  filterBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      filterBar.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      activeTopicFilter = e.target.dataset.filter || 'all';
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

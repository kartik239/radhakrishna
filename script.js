const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwEqCWUwCjBR290mgx7kxoM5XB8DHuNvJzzA94WAv2tEnAg6l3H1uadZAroeFMdKiLP/exec';
const STORAGE_KEY = 'srk-registration-draft-v1';
const submittedIds = new Set(JSON.parse(localStorage.getItem('srk-submitted-ids') || '[]'));
const form = document.querySelector('#registrationForm');
const draftBadge = document.querySelector('#draftBadge');
const successScreen = document.querySelector('#successScreen');
const statusEl = document.querySelector('#formStatus');
const progressBar = document.querySelector('#progressBar');
const fields = [...form.elements].filter(el => el.name);
let isSubmitted = false;
let saveTimer;

document.querySelector('#birthDate').max = new Date().toISOString().slice(0, 10);
restoreDraft();
updateCounters();
updateProgress();
fields.forEach(field => {
  field.addEventListener('input', handleChange);
  field.addEventListener('change', handleChange);
});
form.addEventListener('submit', submitForm);
window.addEventListener('beforeunload', event => {
  if (!isSubmitted && hasDraft()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function handleChange(event) {
  if (event.target.inputMode === 'numeric' || event.target.type === 'tel') {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
  }
  updateCounters();
  updateProgress();
  validateField(event.target, false);
  saveDraftSoon();
}

function saveDraftSoon() {
  draftBadge.textContent = 'Saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readForm()));
    draftBadge.textContent = 'Saved';
  }, 180);
}

function readForm() {
  return fields.reduce((data, field) => {
    if (field.type === 'radio') {
      if (field.checked) data[field.name] = field.value;
    } else if (field.type === 'checkbox') data[field.name] = field.checked;
    else data[field.name] = field.value;
    return data;
  }, {});
}

function restoreDraft() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  fields.forEach(field => {
    if (!(field.name in saved)) return;
    if (field.type === 'radio') field.checked = saved[field.name] === field.value;
    else if (field.type === 'checkbox') field.checked = Boolean(saved[field.name]);
    else field.value = saved[field.name];
  });
  if (Object.keys(saved).length) draftBadge.textContent = 'Restored';
}

function hasDraft() {
  return Object.values(readForm()).some(value => value === true || String(value || '').trim());
}

function updateCounters() {
  document.querySelectorAll('.counter').forEach(counter => {
    const input = document.getElementById(counter.dataset.for);
    counter.textContent = `${input.value.length} characters`;
  });
}

function updateProgress() {
  const data = readForm();
  const keys = ['childName','address','mobile','parentName','parentMobile','schoolName','grade','birthDate','gender','character','consent'];
  const complete = keys.filter(key => data[key] === true || String(data[key] || '').trim()).length;
  progressBar.style.width = `${Math.round((complete / keys.length) * 100)}%`;
}

function validateField(field, show = true) {
  const wrapper = field.closest('.field') || field.closest('label');
  const error = document.getElementById(`${field.name}Error`);
  if (!error) return true;
  let message = '';
  const value = String(field.value || '').trim();
  if (field.required && !value && field.type !== 'radio' && field.type !== 'checkbox') message = 'This field is required.';
  if ((field.name === 'mobile' || field.name === 'parentMobile') && value && !/^\d{10}$/.test(value)) message = 'Please enter exactly 10 digits.';
  if (field.name === 'grade' && value !== '' && Number(value) < 0) message = 'Grade cannot be less than 0.';
  if (field.name === 'birthDate' && value && value > new Date().toISOString().slice(0, 10)) message = 'Birth date cannot be in the future.';
  if (field.name === 'character' && !value) message = 'Please select a character.';
  if (field.type === 'checkbox' && !field.checked) message = 'Declaration is required.';
  if (show) {
    error.textContent = message;
    wrapper?.classList.toggle('invalid', Boolean(message));
    wrapper?.classList.toggle('valid', !message && Boolean(value || field.checked));
  }
  return !message;
}

function validateForm() {
  let valid = true;
  fields.forEach(field => { if (field.type !== 'radio') valid = validateField(field) && valid; });
  const genderError = document.getElementById('genderError');
  const genderSet = form.querySelector('fieldset');
  const genderChecked = Boolean(form.querySelector('input[name="gender"]:checked'));
  genderError.textContent = genderChecked ? '' : 'Please select gender.';
  genderSet.classList.toggle('invalid', !genderChecked);
  valid = genderChecked && valid;
  if (!valid) scrollToFirstError();
  return valid;
}

function scrollToFirstError() {
  const first = form.querySelector('.invalid, .error:not(:empty)');
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function createRegistrationId() {
  const count = Number(localStorage.getItem('srk-registration-count') || '0') + 1;
  localStorage.setItem('srk-registration-count', String(count));
  return `SRK2025-${String(count).padStart(4, '0')}`;
}

async function submitForm(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const registrationId = createRegistrationId();
  if (submittedIds.has(registrationId)) return;
  const payload = { timestamp: new Date().toISOString(), registrationId, ...readForm(), browser: navigator.userAgent, consent: document.querySelector('#consent').checked ? 'Yes' : 'No' };
  form.classList.add('loading');
  statusEl.textContent = 'Submitting...';
  try {
    if (!WEB_APP_URL.includes('PASTE_')) {
      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: formData });
    } else {
      await new Promise(resolve => setTimeout(resolve, 700));
    }
    submittedIds.add(registrationId);
    localStorage.setItem('srk-submitted-ids', JSON.stringify([...submittedIds]));
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    updateCounters();
    updateProgress();
    isSubmitted = true;
    draftBadge.textContent = '✅ Submitted';
    successScreen.classList.add('show');
    successScreen.setAttribute('aria-hidden', 'false');
    setTimeout(() => successScreen.classList.remove('show'), 4200);
    statusEl.textContent = `Success! Registration ID: ${registrationId}`;
    const childName = document.querySelector('#childName')?.value || '';
    const waText = encodeURIComponent(`🎉 श्री राधाकृष्ण वेशभूषा स्पर्धा 2026 मध्ये ${childName} ची नोंदणी यशस्वी झाली!

🆔 Registration ID: ${registrationId}

🙏 श्री राधाकृष्ण फ्रेंड्स क्लब, शिरवळ

तुम्हीही नोंदणी करा!`);
    const waBtn = document.querySelector('#whatsappShareBtn');
    if (waBtn) waBtn.href = `https://wa.me/?text=${waText}`;
  } catch (error) {
    statusEl.textContent = 'Submission failed. Please check your internet connection and try again.';
  } finally {
    form.classList.remove('loading');
  }
}

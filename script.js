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
  if (field.name === 'grade' && value !== '' && Number(value) > 6) message = 'Maximum grade allowed is 6th.';
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
  return `SRK2026-${String(count).padStart(4, '0')}`;
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

// ── Chatbot ──
const SYSTEM_PROMPT = `You are "राधाकृष्ण सहाय्यक", a warm and knowledgeable assistant for "श्री राधाकृष्ण वेशभूषा स्पर्धा 2026". You represent the event with devotion and professionalism. Always respond in the same language the user writes in — Marathi, Hindi, or English. Be warm, concise (2-4 sentences), and helpful.

━━━ ORGANIZATION ━━━
- Full event name: श्री राधाकृष्ण वेशभूषा स्पर्धा 2026
- Organized by: श्री राधाकृष्ण फ्रेंड्स क्लब, शिरवळ
- President / अध्यक्ष: श्री संदिप गायकवाड
- WhatsApp contact: 9860844503
- This is an annual cultural event celebrating devotion to Radha and Krishna through children's costume performances.

━━━ EVENT DETAILS ━━━
- Date: शनिवार, 5 सप्टेंबर 2026 (Saturday, 5th September 2026)
- Time: सायंकाळी 6:00 वाजता (6:00 PM onwards)
- Venue: कबुले हॉल, केदारेश्वर मंदिर जवळ, शिरवळ
- Entry for audience: Free and open to all
- Registration fee for participants: absolutely FREE — कोणतेही शुल्क नाही

━━━ ELIGIBILITY ━━━
- Age group: Children studying in Grade 1 to Grade 6 (इयत्ता १ ली ते ६ वी)
- Children above Grade 6 are NOT eligible
- Children below Grade 1 (pre-school/nursery/KG) are also not eligible
- Both boys and girls can participate
- Children must be from Shirwal or nearby areas (no restriction mentioned explicitly, open to all)
- Only two character choices: राधा (Radha) or श्री कृष्ण (Shri Krishna)
- A boy can dress as Krishna, a girl can dress as Radha or Krishna

━━━ REGISTRATION ━━━
- Registration is done online through this form only
- Required fields: Child's full name, address, mobile number, parent name, WhatsApp mobile number, school name, grade/class, date of birth, gender, character choice (Radha or Krishna), parent consent
- After successful registration, a unique Registration ID is generated in format SRK2026-XXXX (e.g. SRK2026-0001)
- Save the Registration ID — it will be needed on the event day
- Registration deadline: not yet announced, register as early as possible
- One registration per child

━━━ COSTUME GUIDELINES ━━━
- Costume must be of Radha or Krishna only — no other characters allowed
- Traditional, devotional costumes are expected
- Children should be dressed in full costume on the day of the event
- Props like flute (बासरी), peacock feather (मोरपीस), lotus (कमळ) are encouraged
- Parents are responsible for arranging the costume

━━━ ON THE DAY ━━━
- Participants should arrive before 6:00 PM
- Bring the Registration ID (SRK2026-XXXX) on the day
- Venue: कबुले हॉल, केदारेश्वर मंदिर जवळ, शिरवळ — easy to find near the Kedareshwar temple
- Parents/guardians must accompany children

━━━ RULES ━━━
- Only Radha or Krishna costume permitted
- Maximum class: 6th grade
- Parent/guardian consent is mandatory during registration
- Entry is completely free — no hidden charges
- Judges' decision will be final
- Participants must be present on time

━━━ CONTACT ━━━
- For any queries, WhatsApp: 9860844503 (श्री संदिप गायकवाड, अध्यक्ष)

━━━ COMMON QUESTIONS & ANSWERS ━━━
Q: Is there any registration fee? → No, प्रवेश व नोंदणी संपूर्णपणे निःशुल्क आहे.
Q: My child is in 7th grade, can they participate? → No, only up to Grade 6.
Q: Can a boy dress as Radha? → The form allows any child to pick Radha or Krishna. Traditionally Krishna for boys but there is no strict restriction mentioned.
Q: Where is the venue? → कबुले हॉल, केदारेश्वर मंदिर जवळ, शिरवळ — near the famous Kedareshwar temple in Shirwal.
Q: What time should we arrive? → Please arrive before 6:00 PM on 5th September 2026.
Q: I didn't receive a Registration ID → After submitting the form, the ID appears on screen. If missed, contact 9860844503 on WhatsApp.
Q: Can we register on the spot? → Online registration is preferred. For spot registration queries, contact 9860844503.
Q: What props can my child carry? → Flute, peacock feather, lotus, or other traditional Radha-Krishna props are welcome.

If someone asks something not covered above, say:
"माफ करा, या प्रश्नाचे उत्तर मला नक्की माहित नाही. अधिक माहितीसाठी कृपया श्री संदिप गायकवाड यांना WhatsApp करा: 9860844503 🙏"

Never make up information not listed above.`;

let chatHistory = [];
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chatbotWindow');
  win.classList.toggle('open', chatOpen);
  win.setAttribute('aria-hidden', String(!chatOpen));
  if (chatOpen) document.getElementById('chatbotInput').focus();
}

async function sendChat() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendMsg(text, 'user');
  chatHistory.push({ role: 'user', content: text });

  const typing = appendMsg('टाइप करत आहे...', 'typing');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'माफ करा, काहीतरी चूक झाली.';
    typing.remove();
    appendMsg(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    typing.remove();
    appendMsg('माफ करा, सध्या उत्तर देता येत नाही. 9860844503 वर WhatsApp करा.', 'bot');
  }
}

function appendMsg(text, type) {
  const msgs = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

// ── Music Player ──
document.addEventListener('DOMContentLoaded', function () {
  const bgMusic = document.getElementById('bgMusic');
  const musicIcon = document.getElementById('musicIcon');
  const musicBtn = document.getElementById('musicBtn');
  let musicPlaying = false;

  if (!bgMusic || !musicIcon || !musicBtn) return;

  bgMusic.volume = 0.35;

  window.toggleMusic = function () {
    if (musicPlaying) {
      bgMusic.pause();
      musicIcon.textContent = '🔇';
      musicPlaying = false;
    } else {
      bgMusic.play().then(() => {
        musicIcon.textContent = '🎵';
        musicPlaying = true;
      }).catch(() => {
        musicIcon.textContent = '❌';
      });
    }
  };

  // Auto-play softly on first interaction anywhere on page
  document.addEventListener('click', function startMusic(e) {
    if (e.target === musicBtn || musicBtn.contains(e.target)) return;
    if (!musicPlaying) {
      bgMusic.play().then(() => {
        musicIcon.textContent = '🎵';
        musicPlaying = true;
      }).catch(() => {});
    }
    document.removeEventListener('click', startMusic);
  });
});

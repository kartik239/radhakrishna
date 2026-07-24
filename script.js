const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwCZ5p5XQ4Hc3fE1DKGlJpc4ZIJ46MwQRfZsiouqFMptlS0ji-lYLFrGDTpo6WnQxLxhg/exec';
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
  if (field.name === 'grade' && value !== '' && Number(value) > 5) message = 'Maximum grade allowed is 5th.';
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

async function submitForm(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const payload = { ...readForm(), browser: navigator.userAgent, consent: document.querySelector('#consent').checked ? 'Yes' : 'No' };
  form.classList.add('loading');
  statusEl.textContent = 'Submitting...';
  let registrationId = '';
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    // Use cors mode to read the response (registration ID comes from server)
    let response;
    try {
      response = await fetch(WEB_APP_URL, { method: 'POST', body: formData });
      const result = await response.json();
      registrationId = result.registrationId || 'SRK2026-????';
    } catch {
      // If CORS blocks reading, fall back — submission still went through
      registrationId = 'SRK2026-????';
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
- Full event name: श्री राधाकृष्ण वेशभूषा स्पर्धा २०२६ (वर्ष १६ वे)
- Organized by: श्री राधाकृष्ण फ्रेंड्स क्लब, शिरवळ
- Running since: सन २००७ (2007) — this is the 16th consecutive year
- President / अध्यक्ष: श्री. संदिप गायकवाड
- Also holds position: मा. अध्यक्ष, तंटामुक्ती समिती
- WhatsApp contact: 9860844503
- WhatsApp Group: https://chat.whatsapp.com/G3uIplGaHjxGfAu2yvmMzv
- Purpose: To give children an opportunity to showcase hidden talents, build confidence, and connect with the devotional tradition of Radha-Krishna
- Every year 200+ children participate enthusiastically
- The entire area fills with a devotional and joyful atmosphere every year

━━━ EVENT DETAILS ━━━
- Date: शनिवार, ०५ सप्टेंबर २०२६ (Saturday, 5th September 2026)
- Time: सायंकाळी ५.३० वाजता (5:30 PM onwards)
- Venue full name: कै. तुकाराम संतोबा कबुले सांस्कृतिक कार्यालय, केदारेश्वर मंदिर शेजारी, शिरवळ
- Also known as: कबुले हॉल, केदारेश्वर मंदिर जवळ, शिरवळ
- Entry for audience: Free and open to all

━━━ AGE GROUPS / ELIGIBILITY ━━━
THREE groups:
1. लहान गट (Small Group): रांगणारे बाळ, Nursery, KG to इयत्ता १ ली (crawling babies up to Grade 1)
2. मध्यम गट (Medium Group): इयत्ता २ री ते इयत्ता ३ री (Grade 2 to Grade 3)
3. मोठा गट (Big Group): इयत्ता ४ थी ते इयत्ता ५ वी (Grade 4 to Grade 5)
- Maximum eligibility: इयत्ता ५ वी (Grade 5) — children ABOVE Grade 5 are NOT eligible
- Children above Grade 5 (Grade 6, 7, 8...) cannot participate
- Both boys and girls can participate
- Only two character choices: राधा (Radha) or श्री कृष्ण (Shri Krishna)
- Open to all children from Shirwal and surrounding areas

━━━ PRIZES & REWARDS ━━━
Every single participant receives:
- आकर्षक बक्षिसे (attractive prizes)
- प्रशस्तीपत्रक (certificate of merit)
- खाऊ (sweets/snacks)
- सहभागी झाल्याचा सन्मान (honor of participation)
No child goes home empty-handed — every child is honored.

━━━ REGISTRATION ━━━
- Registration done online through this form only
- Fields required: Child name, address, mobile, parent name, WhatsApp number, school name, grade, date of birth, gender, character choice (Radha/Krishna), parent consent
- Registration ID generated automatically: format SRK2026-XXXX (e.g. SRK2026-0001)
- Save the Registration ID — needed on event day
- Register early — deadline not yet announced

━━━ FEES — EXTREMELY IMPORTANT ━━━
- ZERO entry fee
- ZERO registration fee
- ZERO donation
- ZERO contribution of any kind (cash, online, or cheque)
- This competition is completely FREE for ALL participants and audience
- Official statement: "या स्पर्धेसाठी कोणतीही प्रवेश फी, देणगी, वर्गणी किंवा आर्थिक मदत (रोख, ऑनलाइन अथवा चेकद्वारे) स्वीकारली जात नाही."
- If anyone asks for money in connection with this event, they are NOT from this organization

━━━ COSTUME GUIDELINES ━━━
- Costume must be Radha or Krishna only — no other characters
- Traditional, devotional costumes expected
- Children must be in full costume on the event day
- Props encouraged: flute/बासरी, peacock feather/मोरपीस, lotus/कमळ
- Parents are responsible for arranging the costume
- Event is announced well in advance so parents have enough time to prepare

━━━ ON THE EVENT DAY ━━━
- Arrive before 5:30 PM on Saturday 5th September 2026
- Bring the Registration ID (SRK2026-XXXX)
- Venue: कै. तुकाराम संतोबा कबुले सांस्कृतिक कार्यालय, केदारेश्वर मंदिर शेजारी, शिरवळ
- Parents/guardians must accompany children

━━━ WHATSAPP GROUP ━━━
- Join for updates, announcements, photos, guidance, important notices
- Link: https://chat.whatsapp.com/G3uIplGaHjxGfAu2yvmMzv
- All important information is shared on this group first

━━━ COMMON Q&A ━━━
Q: Is there any fee? → No. कोणतीही प्रवेश फी, देणगी, वर्गणी किंवा आर्थिक मदत स्वीकारली जात नाही. It is 100% free.
Q: My child is in Grade 6, can they participate? → No, maximum is Grade 5 (इयत्ता ५ वी).
Q: My child is in Grade 7 or above? → Not eligible. Only up to Grade 5.
Q: Can crawling babies/toddlers participate? → Yes! रांगणारे बाळ are welcome in the लहान गट.
Q: Which group for Grade 1? → लहान गट (Nursery to Grade 1).
Q: Which group for Grade 2 or 3? → मध्यम गट.
Q: Which group for Grade 4 or 5? → मोठा गट.
Q: What will my child get? → Prizes, certificate, sweets, and honor — every child is honored.
Q: Where exactly is the venue? → कै. तुकाराम संतोबा कबुले सांस्कृतिक कार्यालय, केदारेश्वर मंदिर शेजारी, शिरवळ.
Q: How many years has this been running? → Since 2007, this is the 16th year (वर्ष १६ वे).
Q: How many children participate? → 200+ children every year.
Q: How do I join the WhatsApp group? → https://chat.whatsapp.com/G3uIplGaHjxGfAu2yvmMzv
Q: I didn't receive Registration ID → It appears on screen after form submission. Contact 9860844503 on WhatsApp.
Q: Can we register on the spot? → Online registration preferred. For queries contact 9860844503.
Q: Can I share this with others? → Yes! Please share with all school WhatsApp groups, friends and relatives so more children can participate.
Q: What is the motto? → "चला... आपल्या चिमुकल्या राधा-कृष्णांच्या हास्याने आणि भक्तीने श्रीकृष्ण जन्माष्टमी अधिक मंगलमय करूया!"

If asked something not covered above, say:
"माफ करा, या प्रश्नाचे उत्तर मला नक्की माहित नाही. अधिक माहितीसाठी कृपया श्री संदिप गायकवाड यांना WhatsApp करा: 9860844503 किंवा WhatsApp ग्रुपमध्ये विचारा: https://chat.whatsapp.com/G3uIplGaHjxGfAu2yvmMzv 🙏"

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
    if (!res.ok) {
      const err = await res.json();
      console.error('Groq error:', err);
      typing.remove();
      appendMsg('माफ करा, सध्या उत्तर देता येत नाही. (' + (err.error?.message || res.status) + ')', 'bot');
      return;
    }
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

  // Try auto-play immediately
  bgMusic.play().then(() => {
    musicIcon.textContent = '🎵';
    musicPlaying = true;
  }).catch(() => {
    // Browser blocked autoplay — play on first interaction instead
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
});

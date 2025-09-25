// script.js
const btnPreview = document.getElementById('btnPreview');
const btnRecordMic = document.getElementById('btnRecordMic');
const btnCaptureTab = document.getElementById('btnCaptureTab');
const statusEl = document.getElementById('status');
const textEl = document.getElementById('text');

// helper to pick a voice (female-preferred)
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  // prefer any voice that looks female by name; fallback to first available
  return voices.find(v => /female|woman|zira|linda|samantha|amelie|victoria/i.test(v.name)) || voices[0] || null;
}

function setStatus(txt, recording=false) {
  statusEl.textContent = txt;
  statusEl.style.color = recording ? '#ffde59' : '';
}

// Ensure voices loaded
if (speechSynthesis.getVoices().length === 0) {
  speechSynthesis.addEventListener('voiceschanged', ()=> {});
}

// Simple preview
btnPreview.addEventListener('click', () => {
  const text = textEl.value.trim();
  if (!text) { alert('Please enter text'); return; }
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = 'en-US';
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

// RECORD MICROPHONE while playing TTS
btnRecordMic.addEventListener('click', async () => {
  const text = textEl.value.trim();
  if (!text) { alert('Please enter text'); return; }

  // Request microphone permission first
  let micStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert('Microphone access denied or not available.\n\nError: ' + (err.message || err));
    return;
  }

  const mediaRecorder = new MediaRecorder(micStream);
  const chunks = [];
  mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

  mediaRecorder.onstop = () => {
    // stop tracks
    micStream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    downloadBlob(blob, `mic-recording-${Date.now()}.webm`);
    setStatus('Saved microphone recording');
  };

  // Prepare utterance; start recorder when TTS actually starts speaking
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = 'en-US';

  u.onstart = () => {
    setStatus('Recording microphone... (playing TTS)', true);
    try { mediaRecorder.start(); } catch (err) { console.error('Recorder start failed', err); }
  };
  u.onend = () => {
    // give a tiny delay to ensure final dataavailable fires
    setStatus('Stopping recorder...');
    setTimeout(() => mediaRecorder.state !== 'inactive' && mediaRecorder.stop(), 120);
  };

  // Speak
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

// CAPTURE TAB AUDIO (recommended) and download the real TTS output
btnCaptureTab.addEventListener('click', async () => {
  const text = textEl.value.trim();
  if (!text) { alert('Please enter text'); return; }

  // Request tab (display) capture with audio. User must choose "This tab" and check "Share audio".
  let captureStream;
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
  } catch (err) {
    alert('Screen/Tab capture denied or not available.\n\nTip: To record tab audio choose "This tab" and enable "Share audio".\n\nError: ' + (err.message || err));
    return;
  }

  // The captured stream will contain the tab audio (if user picked tab + share audio)
  const mediaRecorder = new MediaRecorder(captureStream);
  const chunks = [];
  mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

  mediaRecorder.onstop = () => {
    // stop tracks
    captureStream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    downloadBlob(blob, `tab-audio-${Date.now()}.webm`);
    setStatus('Saved tab audio recording');
  };

  // Create utterance and speak. Start recorder as soon as we call speak,
  // but in practice onstart is safer
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = 'en-US';

  u.onstart = () => {
    setStatus('Recording tab audio... (playing TTS)', true);
    try { mediaRecorder.start(); } catch (err) { console.error('Recorder start failed', err); }
  };
  u.onend = () => {
    setStatus('Stopping capture...');
    setTimeout(() => mediaRecorder.state !== 'inactive' && mediaRecorder.stop(), 120);
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

// helper to download blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

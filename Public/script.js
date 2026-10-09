const socket = io();
const $ = (id) => document.getElementById(id);

const home = $('home'), chat = $('chat'), log = $('log');
const form = $('form'), input = $('input'), sendBtn = $('send');
const statusEl = $('status'), typingEl = $('typing');

let typingTimer = null;
let typingSent = false;

function show(screen) {
  home.hidden = screen !== 'home';
  chat.hidden = screen !== 'chat';
}

function addMsg(text, who) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = text; // textContent keeps strangers' text from running as code
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function note(text) {
  const d = document.createElement('div');
  d.className = 'note';
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function canType(on) {
  input.disabled = !on;
  sendBtn.disabled = !on;
  if (on) input.focus();
}

function find() {
  log.innerHTML = '';
  typingEl.hidden = true;
  canType(false);
  statusEl.textContent = 'Looking for someone…';
  show('chat');
  socket.emit('find');
}

function endChat(message) {
  canType(false);
  typingEl.hidden = true;
  statusEl.textContent = 'Chat ended';
  note(message);
}

$('start').onclick = find;
$('next').onclick = find;
$('home-btn').onclick = () => { socket.emit('leave'); show('home'); };
$('bye').onclick = () => { socket.emit('leave'); endChat('You said goodbye.'); };
$('report').onclick = () => { socket.emit('report'); endChat('Thanks for telling us. This chat has ended.'); };

form.onsubmit = (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  socket.emit('message', text);
  addMsg(text, 'me');
  input.value = '';
  socket.emit('typing', false);
  typingSent = false;
};

input.oninput = () => {
  if (!typingSent) { socket.emit('typing', true); typingSent = true; }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { socket.emit('typing', false); typingSent = false; }, 1500);
};

socket.on('waiting', () => { statusEl.textContent = 'Looking for someone…'; });
socket.on('matched', () => {
  statusEl.textContent = "You're chatting with a stranger";
  note('Say hi 🌸');
  canType(true);
});
socket.on('message', (text) => { typingEl.hidden = true; addMsg(text, 'them'); });
socket.on('typing', (v) => { typingEl.hidden = !v; });
socket.on('partner-left', () => endChat('They said goodbye.'));
socket.on('online', (n) => { $('online').textContent = n; });

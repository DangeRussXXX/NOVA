const novaCore = document.getElementById('novaCoreContainer');
const humSpeak = document.getElementById('novaHumSpeak');
const humListen = document.getElementById('novaHumListen');
const humError = document.getElementById('novaHumError');

let novaHumVolume = 0.2;

[humSpeak, humListen, humError].forEach(a => {
    if (a) a.volume = novaHumVolume;
});

function clearNovaStates() {
    if (!novaCore) return;
    novaCore.classList.remove('nova-speaking', 'nova-error', 'nova-listening');
}

function novaSetIdle() {
    clearNovaStates();
}

function novaSetListening() {
    clearNovaStates();
    if (novaCore) novaCore.classList.add('nova-listening');
    if (humListen) {
        humListen.currentTime = 0;
        humListen.play().catch(() => {});
    }
}

function novaSetSpeaking(amplitude = 1.0) {
    clearNovaStates();
    if (novaCore) novaCore.classList.add('nova-speaking');

    if (humSpeak) {
        humSpeak.currentTime = 0;
        humSpeak.play().catch(() => {});
    }
}

function novaSetError() {
    clearNovaStates();
    if (novaCore) novaCore.classList.add('nova-error');

    if (humError) {
        humError.currentTime = 0;
        humError.play().catch(() => {});
    }
}

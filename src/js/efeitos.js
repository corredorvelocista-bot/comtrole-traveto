let audioCtx = null;

export function tocarSomLancamento() {
    try {
        audioCtx =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const now =
            audioCtx.currentTime;

        const tocarNota =
            (
                frequencia,
                inicio,
                duracao
            ) => {
                const osc =
                    audioCtx.createOscillator();

                const gain =
                    audioCtx.createGain();

                osc.type =
                    'sine';

                osc.frequency.setValueAtTime(
                    frequencia,
                    inicio
                );

                gain.gain.setValueAtTime(
                    0.05,
                    inicio
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    inicio + duracao
                );

                osc.connect(gain);
                gain.connect(
                    audioCtx.destination
                );

                osc.start(inicio);

                osc.stop(
                    inicio + duracao
                );
            };

        tocarNota(
            523.25,
            now,
            0.15
        );

        tocarNota(
            659.25,
            now + 0.04,
            0.2
        );

    } catch (e) {
        // Ignora se o navegador bloquear autoplay
    }
}

// =====================================================
// SOM DA META
// =====================================================

export function tocarSomMetaBatida() {
    try {
        audioCtx =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const now =
            audioCtx.currentTime;

        const tocarNota =
            (
                frequencia,
                inicio,
                duracao
            ) => {
                const osc =
                    audioCtx.createOscillator();

                const gain =
                    audioCtx.createGain();

                osc.type =
                    'triangle';

                osc.frequency.setValueAtTime(
                    frequencia,
                    inicio
                );

                gain.gain.setValueAtTime(
                    0.08,
                    inicio
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    inicio + duracao
                );

                osc.connect(gain);
                gain.connect(
                    audioCtx.destination
                );

                osc.start(inicio);

                osc.stop(
                    inicio + duracao
                );
            };

        tocarNota(
            523.25,
            now,
            0.15
        );

        tocarNota(
            659.25,
            now + 0.12,
            0.15
        );

        tocarNota(
            783.99,
            now + 0.24,
            0.15
        );

        tocarNota(
            1046.50,
            now + 0.36,
            0.4
        );

    } catch (e) {
        // Ignora se bloqueado pelo navegador
    }
}

// =====================================================
// ANIMAÇÃO DA META
// =====================================================

export function dispararAnimacaoMetaBatida() {
    tocarSomMetaBatida();

    const quantidade = 30;

    const cores = [
        '#4caf50',
        '#ff9800',
        '#2196f3',
        '#e91e63',
        '#ffeb3b'
    ];

    for (
        let i = 0;
        i < quantidade;
        i++
    ) {
        const confete =
            document.createElement(
                'div'
            );

        confete.style.position =
            'fixed';

        confete.style.width =
            `${Math.random() * 8 + 6}px`;

        confete.style.height =
            `${Math.random() * 8 + 6}px`;

        confete.style.backgroundColor =
            cores[
                Math.floor(
                    Math.random() *
                    cores.length
                )
            ];

        confete.style.top =
            '-10px';

        confete.style.left =
            `${Math.random() * window.innerWidth}px`;

        confete.style.opacity =
            '1';

        confete.style.borderRadius =
            '50%';

        confete.style.zIndex =
            '9999';

        confete.style.pointerEvents =
            'none';

        document.body.appendChild(
            confete
        );

        const duracao =
            Math.random() * 2000 + 1500;

        const animacao =
            confete.animate(
                [
                    {
                        transform:
                            'translateY(0) rotate(0deg)',
                        opacity: 1
                    },
                    {
                        transform:
                            `translateY(${window.innerHeight + 50}px) rotate(${Math.random() * 720 - 360}deg)`,
                        opacity: 0
                    }
                ],
                {
                    duration:
                        duracao,
                    easing:
                        'ease-out'
                }
            );

        animacao.onfinish =
            () => {
                confete.remove();
            };
    }
}
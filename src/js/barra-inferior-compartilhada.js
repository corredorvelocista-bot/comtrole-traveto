
/* ANOTEI-BARRA-COMPARTILHADA */
(() => {
    function inicializarBarraInferior() {
        document.body.classList.add("has-bottom-navigation");

        if (!document.querySelector(".bottom-bar")) {
            document.body.insertAdjacentHTML("beforeend", `
                <nav class="bottom-bar" aria-label="Navegação rápida">
                    <button id="btnBottomBusca" class="bottom-item"
                        aria-label="Buscar" type="button">
                        <span class="bottom-icon">
                            <svg viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="1.7"
                                stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <circle cx="10.8" cy="10.8" r="6.8"/>
                                <path d="m16 16 4.2 4.2"/>
                            </svg>
                        </span>
                        <span class="bottom-label">Buscar</span>
                    </button>

                    <button id="btnBottomHome" class="bottom-item"
                        aria-label="Ir para o início" type="button">
                        <span class="bottom-icon">
                            <svg viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="1.7"
                                stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="m3 10 9-7 9 7"/>
                                <path d="M5.5 9v11h13V9"/>
                                <path d="M9.5 20v-6h5v6"/>
                            </svg>
                        </span>
                        <span class="bottom-label">Home</span>
                    </button>

                    <button id="btnBottomGestao" class="bottom-item"
                        aria-label="Abrir Gestão" type="button">
                        <span class="bottom-icon">
                            <svg viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="1.7"
                                stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="M4 20V11"/>
                                <path d="M10 20V5"/>
                                <path d="M16 20v-8"/>
                                <path d="M22 20H2"/>
                            </svg>
                        </span>
                        <span class="bottom-label">Gestão</span>
                    </button>

                    <button id="btnBottomDespesas" class="bottom-item"
                        aria-label="Abrir Despesas" type="button">
                        <span class="bottom-icon">
                            <svg viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="1.7"
                                stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <rect x="5" y="3" width="14" height="18" rx="2"/>
                                <path d="M9 8h6"/>
                                <path d="M9 12h6"/>
                                <path d="M9 16h3"/>
                            </svg>
                        </span>
                        <span class="bottom-label">Despesas</span>
                    </button>
                </nav>
            `);
        }

        document.getElementById("btnBottomHome")?.addEventListener("click", () => {
            window.location.href = "index.html";
        });

        document.getElementById("btnBottomGestao")?.addEventListener("click", () => {
            window.location.href = "gestao-financeira.html";
        });

        document.getElementById("btnBottomDespesas")?.addEventListener("click", () => {
            window.location.href = "despesas-pessoais.html";
        });

        document.getElementById("btnBottomBusca")?.addEventListener("click", () => {
            const campo = document.querySelector(
                'input[type="search"]:not([disabled]), ' +
                'input[placeholder*="buscar" i]:not([disabled]), ' +
                'input[placeholder*="pesquisar" i]:not([disabled])'
            );

            if (campo) {
                campo.focus();
                campo.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                window.location.href = "index.html";
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializarBarraInferior, {
            once: true
        });
    } else {
        inicializarBarraInferior();
    }
})();

import {
  supabase,
  supabaseConfigurado
} from './SupabaseService.js';

const botao = document.getElementById('google-login');
const textoBotao = document.getElementById('google-label');
const mensagem = document.getElementById('login-message');

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

async function iniciarLoginGoogle() {
  if (!supabaseConfigurado || !supabase) {
    mostrarMensagem(
      'A conexão não está configurada. Confira o arquivo .env.local e reinicie o servidor.'
    );
    return;
  }

  botao.disabled = true;
  textoBotao.textContent = 'Conectando ao Google...';
  mostrarMensagem('');

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/index.html`
      }
    });

    if (error) throw error;

    mostrarMensagem('Redirecionando para o Google...');
  } catch (error) {
    console.error('Falha no login Google:', error);
    mostrarMensagem(
      'Não foi possível iniciar o login. Confira a configuração do provedor Google no Supabase.'
    );
    botao.disabled = false;
    textoBotao.textContent = 'Continuar com Google';
  }
}

async function verificarSessao() {
  if (!supabaseConfigurado || !supabase) return;

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Falha ao verificar sessão:', error);
    return;
  }

  if (data.session) {
    window.location.replace('./index.html');
  }
}

botao.addEventListener('click', iniciarLoginGoogle);
verificarSessao();

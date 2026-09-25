/* ============================================================================
   VIEWS/LOGIN.JS — TELA DE ENTRADA DO SISTEMA
   ----------------------------------------------------------------------------
   A estrutura visual do login já está no index.html (formulário estático).
   Este arquivo apenas: 1) conecta o formulário à validação do Auth;
   2) controla o que aparece na tela (login vs. painel).
   ============================================================================ */

const ViewLogin = {

  /* -------------------------------------------------------------------------
     iniciar()
     Chamado uma vez no carregamento do sistema. Liga o evento de envio
     do formulário de login à função de autenticação.
     ------------------------------------------------------------------------- */
  iniciar() {
    const form = document.getElementById("form-login");

    // "submit" dispara quando o usuário aperta Enter ou clica em "Entrar"
    form.addEventListener("submit", (evento) => {
      evento.preventDefault(); // impede o recarregamento da página

      // Pega os valores digitados nos campos
      const email = document.getElementById("login-email").value;
      const senha = document.getElementById("login-senha").value;

      // Pede para o Auth validar as credenciais
      const resultado = Auth.entrar(email, senha);

      const erro = document.getElementById("login-erro");
      if (!resultado.ok) {
        // Falhou: mostra a mensagem em vermelho e limpa a senha digitada
        erro.textContent = resultado.erro;
        erro.classList.remove("oculto");
        document.getElementById("login-senha").value = "";
        return;
      }

      // Deu certo: esconde a mensagem de erro e entrega o controle ao app.js
      erro.classList.add("oculto");
      form.reset(); // limpa o formulário para o próximo acesso
      App.entrarNoSistema(); // função do roteador que abre o painel
    });
  },

  /* -------------------------------------------------------------------------
     mostrar() / esconder()
     Controla qual "camada" está visível na tela.
     ------------------------------------------------------------------------- */
  mostrar() {
    document.getElementById("tela-login").classList.remove("oculto");
    document.getElementById("aplicacao").classList.add("oculto");
  },
  esconder() {
    document.getElementById("tela-login").classList.add("oculto");
    document.getElementById("aplicacao").classList.remove("oculto");
  },
};

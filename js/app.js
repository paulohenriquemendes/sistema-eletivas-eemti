/* ============================================================================
   APP.JS — ROTEADOR E INICIALIZAÇÃO DO SISTEMA
   ----------------------------------------------------------------------------
   Este é o "maestro": é carregado por último (depois de todos os outros
   scripts) e cuida de:
     1. Verificar se há alguém logado (Auth) e mostrar login ou painel;
     2. Montar o MENU lateral conforme o perfil do usuário;
     3. ROTEAR entre as telas usando o "hash" da URL (ex.: #/eletivas),
        o padrão de Single Page Applications;
     4. Reagir ao logout (botão Sair).

   COMO O ROTEAMENTO FUNCIONA:
   Cada tela tem um identificador (ex.: "eletivas"). A URL vira
   "#/eletivas", o evento "hashchange" dispara, o roteador confere se o
   perfil logado pode ver aquela tela e chama ViewX.renderizar().
   ============================================================================ */

const App = {

  /* -------------------------------------------------------------------------
     Definição das TELAS do sistema.
     - id ........ identificador usado na URL (#/id) e nas permissões
     - rotulo .... texto que aparece no menu lateral
     - icone ..... emoji exibido antes do texto (pode trocar à vontade)
     - view ...... objeto com a função renderizar() da tela
     O menu só mostra as telas liberadas para o perfil (js/config.js).
     ------------------------------------------------------------------------- */
  TELAS: [
    { id: "dashboard",  rotulo: "Painel",          icone: "🏠", view: ViewDashboard },
    { id: "eletivas",   rotulo: "Eletivas",         icone: "📘", view: ViewEletivas },
    { id: "alunos",     rotulo: "Alunos",           icone: "🎓", view: ViewAlunos },
    { id: "matriculas", rotulo: "Matrículas",       icone: "🔗", view: ViewMatriculas },
    { id: "relatorios", rotulo: "Consultas",        icone: "📊", view: ViewRelatorios },
    { id: "admin",      rotulo: "Gerenciar dados",  icone: "⚙️", view: ViewAdmin },
  ],

  /* -------------------------------------------------------------------------
     iniciar()
     Ponto de entrada: roda quando a página termina de carregar.
     ------------------------------------------------------------------------- */
  iniciar() {
    // Liga o formulário de login (tela inicial de todos)
    ViewLogin.iniciar();

    // Botão "Sair" da sidebar
    document.getElementById("btn-sair").addEventListener("click", () => this.sairDoSistema());

    // Botão ☰ do celular: abre/fecha a barra lateral
    document.getElementById("btn-menu-mobile").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("aberta");
    });

    // Toda mudança de hash (#/...) troca a tela atual
    window.addEventListener("hashchange", () => this.rotear());

    // Decide a primeira tela: login (ninguém logado) ou painel (já logado)
    this.entrarNoSistema();
  },

  /* -------------------------------------------------------------------------
     entrarNoSistema()
     Verifica a sessão e exibe a interface correta. É chamado:
     - no carregamento da página;
     - logo após um login bem-sucedido (pela ViewLogin).
     ------------------------------------------------------------------------- */
  entrarNoSistema() {
    if (!Auth.estaLogado()) {
      ViewLogin.mostrar(); // ninguém logado: mostra a tela de login
      return;
    }

    // Há sessão: mostra o painel e monta o menu do perfil
    ViewLogin.esconder();

    // Primeira visita nesta máquina? Carrega dados de EXEMPLO para o
    // sistema já abrir demonstrando eletivas, alunos e matrículas.
    // (O marcador no localStorage impede recarregar toda vez.)
    if (!Storage.marcadorSeeded()) {
      ViewAdmin.carregarDadosExemplo();
      Storage.marcarComoSeeded();
    }

    this.montarMenu();
    this.rotear(); // renderiza a tela da URL atual (ou a padrão)
  },

  /* -------------------------------------------------------------------------
     montarMenu()
     Cria os itens do menu lateral filtrando as telas pelo perfil logado.
     Ex.: o perfil "aluno" só vê Painel, Eletivas e Consultas.
     ------------------------------------------------------------------------- */
  montarMenu() {
    const usuario = Auth.usuarioAtual();
    const nav = document.getElementById("menu-nav");
    nav.innerHTML = ""; // limpa o menu anterior

    this.TELAS.forEach((tela) => {
      // Só entra no menu o que o perfil tem permissão de ver
      if (!Auth.podeVerTela(tela.id)) return;

      const link = document.createElement("a");
      link.href = "#/" + tela.id;          // o hash dispara o roteamento
      link.id = "menu-" + tela.id;         // usado para marcar o item ativo
      link.innerHTML = `${tela.icone} ${UI.escape(tela.rotulo)}`;
      link.addEventListener("click", () => {
        // No celular, fechar a sidebar após escolher uma tela
        document.getElementById("sidebar").classList.remove("aberta");
      });
      nav.appendChild(link);
    });

    // Preenche o rodapé com os dados de quem está logado
    document.getElementById("usuario-nome").textContent = usuario.nome;
    document.getElementById("usuario-perfil").textContent =
      "Perfil: " + (CONFIG.PERFIS[usuario.perfil]?.rotulo || usuario.perfil);
  },

  /* -------------------------------------------------------------------------
     rotear()
     Interpreta o hash da URL e renderiza a tela pedida.
     Ex.: "#/relatorios?aluno=abc" -> tela "relatorios", parâmetro "aluno=abc".
     Também BLOQUEIA o acesso a telas não permitidas ao perfil logado.
     ------------------------------------------------------------------------- */
  rotear() {
    // Sem sessão, nada a rotear (a tela de login cuida de tudo)
    if (!Auth.estaLogado()) return;

    // Lê o hash: "#/eletivas" -> "eletivas"; vazio -> "dashboard"
    const hash = (location.hash || "#/dashboard").replace(/^#\//, "");

    // Separa a tela dos parâmetros: "relatorios?aluno=abc" -> ["relatorios", "aluno=abc"]
    const [idTela, parametros] = hash.split("?");

    // Busca a definição da tela pelo id
    const tela = this.TELAS.find((t) => t.id === idTela) || this.TELAS[0];

    // CONTROLE DE ACESSO: perfil sem permissão é jogado para o painel
    if (!Auth.podeVerTela(tela.id)) {
      UI.toast("Seu perfil não tem acesso a esta tela.", "aviso");
      this.navegar("dashboard");
      return;
    }

    // Marca o item atual no menu (item amarelo)
    document.querySelectorAll(".sidebar-nav a").forEach((a) => a.classList.remove("ativo"));
    const itemAtivo = document.getElementById("menu-" + tela.id);
    if (itemAtivo) itemAtivo.classList.add("ativo");

    // Renderiza a tela, passando os parâmetros da URL quando existirem
    tela.view.renderizar(parametros || "");

    // Sobe a página para o topo ao trocar de tela
    window.scrollTo(0, 0);
  },

  /* -------------------------------------------------------------------------
     navegar(idTela)
     Atalho para trocar de tela pelo código (equivale a clicar no menu).
     ------------------------------------------------------------------------- */
  navegar(idTela) {
    location.hash = "#/" + idTela; // o hashchange dispara o roteamento acima
  },

  /* -------------------------------------------------------------------------
     sairDoSistema()
     Encerra a sessão e volta para a tela de login.
     ------------------------------------------------------------------------- */
  sairDoSistema() {
    UI.confirmar("Encerrar a sessão e sair do sistema?", () => {
      Auth.sair();
      location.hash = "";          // limpa a rota atual
      this.entrarNoSistema();      // volta para o login
      UI.toast("Sessão encerrada. Até logo!", "aviso");
    });
  },
};

/* -----------------------------------------------------------------------------
   INICIALIZAÇÃO: quando o navegador termina de montar a página (todos os
   scripts carregados), o sistema começa a funcionar.
   ----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => App.iniciar());

/* ============================================================================
   AUTH.JS — AUTENTICAÇÃO E CONTROLE DE ACESSO
   ----------------------------------------------------------------------------
   Cuida do login, do logout e de responder a pergunta que o resto do
   sistema faz o tempo todo: "o usuário logado PODE fazer isto?"

   COMO O LOGIN FUNCIONA (sistema estático no GitHub Pages):
   1. O e-mail e a senha digitados são comparados com a lista
      CONFIG.CREDENCIAIS (arquivo js/config.js).
   2. Se baterem, a sessão (perfil + nome) é salva no localStorage, então
      o usuário continua logado ao fechar e reabrir o navegador.
   3. Cada tela consulta Auth.podeEditar() antes de mostrar os botões
      de Cadastrar/Editar/Excluir. Aluno e Professor só consultam.
   ============================================================================ */

const Auth = {

  /* Chave usada para guardar a sessão no localStorage */
  CHAVE_SESSAO: CONFIG.PREFIXO_STORAGE + "sessao",

  /* -------------------------------------------------------------------------
     entrar(email, senha)
     Verifica as credenciais com a lista do config.js.
     Retorna { ok: true, usuario } quando dá certo,
     ou { ok: false, erro: "mensagem" } quando e-mail/senha não conferem.
     ------------------------------------------------------------------------- */
  entrar(email, senha) {
    // Procura um usuário com o mesmo e-mail E a mesma senha (sem diferenciar
    // maiúsculas/minúsculas no e-mail)
    const usuario = CONFIG.CREDENCIAIS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
    );

    if (!usuario) {
      // Mensagem genérica por segurança: não revela se foi o e-mail ou a senha
      return { ok: false, erro: "E-mail ou senha inválidos. Verifique e tente novamente." };
    }

    // Salva a sessão (sem guardar a senha!) e devolve o usuário logado
    const sessao = { email: usuario.email, perfil: usuario.perfil, nome: usuario.nome };
    localStorage.setItem(this.CHAVE_SESSAO, JSON.stringify(sessao));
    return { ok: true, usuario: sessao };
  },

  /* -------------------------------------------------------------------------
     sair()
     Encerra a sessão atual (apaga do localStorage).
     A tela de login volta a aparecer pelo roteador.
     ------------------------------------------------------------------------- */
  sair() {
    localStorage.removeItem(this.CHAVE_SESSAO);
  },

  /* -------------------------------------------------------------------------
     usuarioAtual()
     Retorna a sessão salva (ou null se ninguém estiver logado).
     ------------------------------------------------------------------------- */
  usuarioAtual() {
    const bruto = localStorage.getItem(this.CHAVE_SESSAO);
    return bruto ? JSON.parse(bruto) : null;
  },

  /* -------------------------------------------------------------------------
     estaLogado()
     Resposta rápida: existe alguém logado? (sim/não)
     ------------------------------------------------------------------------- */
  estaLogado() {
    return this.usuarioAtual() !== null;
  },

  /* -------------------------------------------------------------------------
     perfilAtual()
     Retorna o perfil logado ("secretaria", "professor" ou "aluno"),
     já com suas permissões vindo do CONFIG.PERFIS.
     ------------------------------------------------------------------------- */
  perfilAtual() {
    const usuario = this.usuarioAtual();
    return usuario ? CONFIG.PERFIS[usuario.perfil] : null;
  },

  /* -------------------------------------------------------------------------
     podeEditar()
     A pergunta mais importante do controle de acesso:
     o usuário logado pode CRIAR / EDITAR / EXCLUIR registros?
     - secretaria -> true (acesso total)
     - professor  -> false (somente consulta)
     - aluno      -> false (somente consulta)
     ------------------------------------------------------------------------- */
  podeEditar() {
    const perfil = this.perfilAtual();
    return perfil ? perfil.podeEditar : false; // sem login: nunca pode editar
  },

  /* -------------------------------------------------------------------------
     podeVerTela(idTela)
     Verifica se o perfil logado tem acesso à tela pedida (pelo menu).
     Retorna true/false. Usado pelo roteador para proteger as rotas.
     ------------------------------------------------------------------------- */
  podeVerTela(idTela) {
    const perfil = this.perfilAtual();
    return perfil ? perfil.telas.includes(idTela) : false;
  },
};

/* ============================================================================
   CONFIG.JS — CONFIGURAÇÕES GERAIS DO SISTEMA
   ----------------------------------------------------------------------------
   Este arquivo centraliza tudo que você pode precisar alterar sem mexer
   na lógica do sistema:
   - as credenciais de acesso (e-mail, senha e perfil de cada usuário);
   - as permissões de cada perfil (o que pode ou não fazer);
   - o prefixo usado para salvar os dados no navegador.
   ============================================================================ */

const CONFIG = {

  /* -------------------------------------------------------------------------
     CHAVE DE PERSISTÊNCIA
     Os dados são salvos no navegador (localStorage) usando este prefixo.
     Ex.: "eletivas_2026" guarda os registros de eletivas.
     Trocar o prefixo "zera" o sistema (útil para testes).
     ------------------------------------------------------------------------- */
  PREFIXO_STORAGE: "eletivas_seduc_",

  /* -------------------------------------------------------------------------
     CREDENCIAIS DE ACESSO
     Cada linha representa um usuário que pode entrar no sistema.
     - email    -> usado no login
     - senha    -> usada no login (texto puro apenas por ser um sistema
                   estático/hospedado no GitHub Pages; para mudar, edite aqui)
     - perfil   -> "secretaria", "professor" ou "aluno"
     - nome     -> nome exibido no menu após o login

     ⚠️ IMPORTANTE: para adicionar um novo professor ou aluno, basta copiar
     uma linha e trocar os dados. Para remover um acesso, apague a linha.
     ------------------------------------------------------------------------- */
  CREDENCIAIS: [
    {
      email: "secretaria@escola.ce.gov.br",
      senha: "Secretaria@2026",
      perfil: "secretaria",
      nome: "Secretaria Escolar",
    },
    {
      email: "professor@escola.ce.gov.br",
      senha: "Professor@2026",
      perfil: "professor",
      nome: "Professor(a)",
    },
    {
      email: "aluno@escola.ce.gov.br",
      senha: "Aluno@2026",
      perfil: "aluno",
      nome: "Aluno(a)",
    },
  ],

  /* -------------------------------------------------------------------------
     PERMISSÕES POR PERFIL
     Define o que cada tipo de usuário pode ver e fazer.
     - podeEditar ............... se pode cadastrar/editar/excluir registros
     - telas .................... lista de telas liberadas (ids do roteador)
     - telasSomenteConsulta ..... telas abertas porém sem botões de edição
     As telas são as mesmas definidas em js/app.js (menu e ROTAS).
     ------------------------------------------------------------------------- */
  PERFIS: {
    /* SECRETARIA: acesso total ao sistema */
    secretaria: {
      rotulo: "Secretaria",
      podeEditar: true,
      telas: ["dashboard", "eletivas", "alunos", "matriculas", "relatorios", "admin"],
    },

    /* PROFESSOR: consulta eletivas, alunos e relatórios (sem editar) */
    professor: {
      rotulo: "Professor",
      podeEditar: false,
      telas: ["dashboard", "eletivas", "alunos", "matriculas", "relatorios"],
    },

    /* ALUNO: consulta o catálogo de eletivas e os relatórios (histórico) */
    aluno: {
      rotulo: "Aluno",
      podeEditar: false,
      telas: ["dashboard", "eletivas", "relatorios"],
    },
  },

  /* -------------------------------------------------------------------------
     ÁREAS DE CONHECIMENTO (usadas no cadastro da eletiva)
     Lista de seleção do formulário. Edite conforme as áreas do seu currículo.
     ------------------------------------------------------------------------- */
  AREAS_CONHECIMENTO: [
    "Linguagens e suas Tecnologias",
    "Matemática e suas Tecnologias",
    "Ciências da Natureza e suas Tecnologias",
    "Ciências Humanas e Sociedade Aplicada",
    "Formação Técnica e Profissional",
    "Projeto de Vida",
  ],

  /* -------------------------------------------------------------------------
     TURNOS e STATUS
     Opções fixas usadas nos formulários.
     ------------------------------------------------------------------------- */
  TURNOS: ["Manhã", "Tarde", "Noite"],
  STATUS_ELETIVA: ["Planejada", "Em andamento", "Concluída", "Cancelada"],
  STATUS_MATRICULA: ["Ativa", "Concluída", "Cancelada"],
};

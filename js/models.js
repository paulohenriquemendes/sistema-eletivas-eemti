/* ============================================================================
   MODELS.JS — ENTIDADES E REGRAS DE NEGÓCIO
   ----------------------------------------------------------------------------
   Aqui ficam os "modelos de dados" do sistema e todas as VALIDAÇÕES.
   Nenhuma tela grava dados diretamente: ela chama as funções daqui, que
   verificam as regras (campo obrigatório, matrícula duplicada, vagas...)
   e só então salvam usando o Storage.

   AS TRÊS ENTIDADES PRINCIPAIS:
   1. ELETIVA   -> a disciplina eletiva oferecida num semestre (ex.: Robótica, 2026.1)
   2. ALUNO     -> o estudante da base da escola
   3. MATRICULA -> o vínculo entre aluno e eletiva ("o aluno X está matriculado
                   na eletiva Y"), com o semestre gravado para o histórico

   COMO FUNCIONA O SEMESTRE:
   As eletivas do novo Ensino Médio funcionam por SEMESTRE (ex.: 2026.1 e
   2026.2 — dois por ano). O semestre é registrado na eletiva e copiado
   para a matrícula, permitindo consultar o histórico do aluno por período.
   ============================================================================ */

const Models = {

  /* ==========================================================================
     ELETIVAS
     ========================================================================== */

  /* Lista todas as eletivas, opcionalmente filtradas por semestre.
     Se informar semestre (ex.: "2026.1"), devolve só as dele. */
  listarEletivas(semestre) {
    let lista = Storage.listar("eletivas");
    if (semestre && semestre !== "todos") {
      lista = lista.filter((e) => e.semestre === semestre); // filtra pelo campo
    }
    // Ordena por semestre (mais novo primeiro) e depois por nome
    return lista.sort((a, b) => (b.semestre + a.nome).localeCompare(a.semestre + b.nome));
  },

  /* Busca uma eletiva pelo id */
  obterEletiva(id) {
    return Storage.obter("eletivas", id);
  },

  /* Valida os dados de uma eletiva antes de salvar.
     Retorna { ok: true } se tudo certo, ou { ok: false, erro: "mensagem" } */
  validarEletiva(dados, idIgnorar) {
    // Regra 1: nome é obrigatório
    if (!dados.nome || !dados.nome.trim())
      return { ok: false, erro: "Informe o nome da eletiva." };

    // Regra 2: professor responsável é obrigatório
    if (!dados.professorResponsavel || !dados.professorResponsavel.trim())
      return { ok: false, erro: "Informe o professor responsável." };

    // Regra 3: semestre deve seguir o formato AAAA.1 ou AAAA.2
    if (!/^\d{4}\.[12]$/.test(dados.semestre || ""))
      return { ok: false, erro: "Selecione um semestre válido (ex.: 2026.1)." };

    // Regra 4: não pode existir outra eletiva com o mesmo nome no MESMO semestre
    const duplicada = this.listarEletivas().find(
      (e) =>
        e.nome.trim().toLowerCase() === dados.nome.trim().toLowerCase() &&
        e.semestre === dados.semestre &&
        e.id !== idIgnorar // ignora a própria eletiva quando está EDITANDO
    );
    if (duplicada)
      return { ok: false, erro: `Já existe uma eletiva "${dados.nome}" no semestre ${dados.semestre}.` };

    // Regra 5: vagas deve ser um número inteiro maior que zero
    const vagas = parseInt(dados.vagas, 10);
    if (isNaN(vagas) || vagas < 1)
      return { ok: false, erro: "Informe um número de vagas válido (maior que zero)." };

    return { ok: true }; // passou por todas as regras
  },

  /* Cadastra (ou edita) uma eletiva.
     Se receber um id existente, atualiza; senão, cria um registro novo. */
  salvarEletiva(dados, id) {
    const validacao = this.validarEletiva(dados, id);
    if (!validacao.ok) return validacao; // devolve o erro para a tela mostrar

    // Padroniza os campos antes de gravar (trim remove espaços extras)
    const registro = {
      nome: dados.nome.trim(),
      descricao: (dados.descricao || "").trim(),
      areaConhecimento: dados.areaConhecimento || "",
      professorResponsavel: dados.professorResponsavel.trim(),
      semestre: dados.semestre,
      cargaHoraria: parseInt(dados.cargaHoraria, 10) || 0,
      horario: (dados.horario || "").trim(),
      local: (dados.local || "").trim(),
      vagas: parseInt(dados.vagas, 10),
      status: dados.status || "Planejada",
    };

    if (id) {
      return { ok: true, dados: Storage.atualizar("eletivas", id, registro) };
    }
    return { ok: true, dados: Storage.incluir("eletivas", registro) };
  },

  /* Exclui uma eletiva — mas antes verifica se há matrículas ligadas a ela */
  excluirEletiva(id) {
    const matriculas = this.listarMatriculas().filter((m) => m.eletivaId === id);
    if (matriculas.length > 0) {
      // Regra de integridade: não deixa apagar eletiva com alunos matriculados
      return {
        ok: false,
        erro: `Não é possível excluir: existem ${matriculas.length} aluno(s) matriculado(s). Cancele as matrículas primeiro.`,
      };
    }
    Storage.remover("eletivas", id);
    return { ok: true };
  },

  /* ==========================================================================
     ALUNOS
     ========================================================================== */

  /* Lista todos os alunos, ordenados por nome */
  listarAlunos() {
    return Storage.listar("alunos").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },

  /* Busca um aluno pelo id */
  obterAluno(id) {
    return Storage.obter("alunos", id);
  },

  /* Valida os dados de um aluno antes de salvar */
  validarAluno(dados, idIgnorar) {
    // Regra 1: nome obrigatório
    if (!dados.nome || !dados.nome.trim())
      return { ok: false, erro: "Informe o nome do aluno." };

    // Regra 2: número de matrícula obrigatório
    if (!dados.matricula || !dados.matricula.trim())
      return { ok: false, erro: "Informe o número de matrícula." };

    // Regra 3: a matrícula é única na escola (não pode repetir)
    const duplicado = this.listarAlunos().find(
      (a) =>
        a.matricula.trim() === dados.matricula.trim() &&
        a.id !== idIgnorar // ignora o próprio aluno ao editar
    );
    if (duplicado)
      return { ok: false, erro: `A matrícula ${dados.matricula} já pertence a ${duplicado.nome}.` };

    return { ok: true };
  },

  /* Cadastra (ou edita) um aluno */
  salvarAluno(dados, id) {
    const validacao = this.validarAluno(dados, id);
    if (!validacao.ok) return validacao;

    const registro = {
      nome: dados.nome.trim(),
      matricula: dados.matricula.trim(),
      turma: (dados.turma || "").trim(),
      email: (dados.email || "").trim(),
      turno: dados.turno || "",
    };

    if (id) {
      return { ok: true, dados: Storage.atualizar("alunos", id, registro) };
    }
    return { ok: true, dados: Storage.incluir("alunos", registro) };
  },

  /* Exclui um aluno — bloqueia se ele tiver matrículas ativas em eletivas */
  excluirAluno(id) {
    const matriculas = this.listarMatriculas().filter(
      (m) => m.alunoId === id && m.status !== "Cancelada"
    );
    if (matriculas.length > 0) {
      return {
        ok: false,
        erro: `Não é possível excluir: o aluno possui ${matriculas.length} matrícula(s) em eletivas. Cancele as matrículas primeiro.`,
      };
    }
    Storage.remover("alunos", id);
    return { ok: true };
  },

  /* -------------------------------------------------------------------------
     IMPORTAÇÃO EM LOTE DE ALUNOS
     Recebe um TEXTO colado na tela (um aluno por linha) e cria todos.
     Formatos aceitos por linha:
       - "Nome do Aluno"                         -> matrícula gerada automaticamente
       - "Nome do Aluno;12345"                   -> nome + matrícula
       - "Nome do Aluno;12345;2A"                -> nome + matrícula + turma
     (é possível usar ; , ou tabulação como separador)
     Retorna o resumo: quantos criou, quantos pulou e as mensagens.
     ------------------------------------------------------------------------- */
  importarAlunosEmLote(texto, turnoPadrao) {
    const resumo = { criados: 0, ignorados: [], totalLinhas: 0 };

    // Separa o texto em linhas e remove as vazias
    const linhas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    resumo.totalLinhas = linhas.length;

    linhas.forEach((linha) => {
      // Divide a linha pelos separadores (; ou tab)
      const partes = linha.split(/[;,\t]/).map((p) => p.trim());

      const nome = partes[0];                                    // 1ª parte: sempre o nome
      const matricula = partes[1] || this.gerarMatricula();      // 2ª: matrícula (ou gera uma)
      const turma = partes[2] || "";                             // 3ª: turma (opcional)

      // Tenta salvar; se a matrícula já existir, registra o motivo e pula
      const resultado = this.salvarAluno({ nome, matricula, turma, turno: turnoPadrao || "" });
      if (resultado.ok) {
        resumo.criados++;
      } else {
        resumo.ignorados.push(`"${nome}" — ${resultado.erro}`);
      }
    });

    return resumo;
  },

  /* Gera um número de matrícula automático para importações sem matrícula.
     Usa o ano atual + 4 dígitos aleatórios, evitando repetidos. */
  gerarMatricula() {
    const ano = new Date().getFullYear();
    let numero;
    do {
      numero = ano + String(Math.floor(1000 + Math.random() * 9000)); // ex.: 20264831
    } while (this.listarAlunos().some((a) => a.matricula === numero));
    return numero;
  },

  /* ==========================================================================
     MATRÍCULAS (vínculo aluno <-> eletiva)
     ========================================================================== */

  /* Lista todas as matrículas, com os dados "juntados" da eletiva e do aluno.
     Esse "join" é feito aqui para as telas não precisarem fazer contas. */
  listarMatriculas() {
    const matriculas = Storage.listar("matriculas");
    return matriculas.map((m) => ({
      ...m,
      eletiva: this.obterEletiva(m.eletivaId), // dados completos da eletiva
      aluno: this.obterAluno(m.alunoId),       // dados completos do aluno
    }));
  },

  /* Matricula um aluno numa eletiva, aplicando TODAS as regras de negócio:
     1. aluno e eletiva devem existir;
     2. não pode matricular o mesmo aluno 2x na mesma eletiva;
     3. a eletiva não pode ter mais alunos que o número de vagas. */
  matricular(alunoId, eletivaId) {
    const aluno = this.obterAluno(alunoId);
    const eletiva = this.obterEletiva(eletivaId);
    if (!aluno)  return { ok: false, erro: "Aluno não encontrado." };
    if (!eletiva) return { ok: false, erro: "Eletiva não encontrada." };

    // Regra 2: matrícula duplicada na MESMA eletiva (status não cancelada)
    const jaMatriculado = this.listarMatriculas().find(
      (m) => m.eletivaId === eletivaId && m.alunoId === alunoId && m.status !== "Cancelada"
    );
    if (jaMatriculado)
      return { ok: false, erro: `${aluno.nome} já está matriculado nesta eletiva.` };

    // Regra 3: controle de vagas
    const ocupadas = this.listarMatriculas().filter(
      (m) => m.eletivaId === eletivaId && m.status !== "Cancelada"
    ).length;
    if (ocupadas >= eletiva.vagas)
      return { ok: false, erro: `A eletiva "${eletiva.nome}" está lotada (${eletiva.vagas} vaga(s)).` };

    // Tudo certo: grava a matrícula com o semestre da eletiva (para o histórico)
    const registro = {
      alunoId: alunoId,
      eletivaId: eletivaId,
      semestre: eletiva.semestre, // ex.: "2026.1" — permite consultar depois
      dataMatricula: new Date().toISOString(),
      status: "Ativa",
    };
    return { ok: true, dados: Storage.incluir("matriculas", registro) };
  },

  /* Matrícula em LOTE: matricula vários alunos numa mesma eletiva de uma vez.
     Recebe a lista de ids de alunos; para cada um tenta matricular e conta
     o resultado. Usada pela tela de "cadastrar vários alunos de uma vez". */
  matricularEmLote(alunoIds, eletivaId) {
    const resumo = { sucesso: [], falhas: [] };
    alunoIds.forEach((id) => {
      const r = this.matricular(id, eletivaId);
      if (r.ok) {
        resumo.sucesso.push(this.obterAluno(id).nome);
      } else {
        resumo.falhas.push(r.erro);
      }
    });
    return resumo;
  },

  /* Altera o status de uma matrícula (Ativa / Concluída / Cancelada) */
  alterarStatusMatricula(id, novoStatus) {
    return Storage.atualizar("matriculas", id, { status: novoStatus });
  },

  /* Exclui definitivamente uma matrícula (o vínculo deixa de existir) */
  excluirMatricula(id) {
    Storage.remover("matriculas", id);
    return { ok: true };
  },

  /* ==========================================================================
     RELATÓRIOS / CONSULTAS
     ========================================================================== */

  /* HISTÓRICO DO ALUNO: retorna todas as eletivas que o aluno fez/cursa,
     agrupadas por semestre (ex.: { "2026.1": [matrícula, ...], "2026.2": [...] }).
     É a consulta que mostra o percurso do aluno no novo Ensino Médio. */
  historicoDoAluno(alunoId) {
    const ativas = this.listarMatriculas().filter(
      (m) => m.alunoId === alunoId && m.status !== "Cancelada"
    );
    // Agrupa por semestre usando reduce (acumulador de agrupamento)
    return ativas.reduce((grupos, m) => {
      if (!m.eletiva) return grupos; // proteção: eletiva foi apagada
      (grupos[m.semestre] = grupos[m.semestre] || []).push(m);
      return grupos;
    }, {});
  },

  /* Lista de chamada: todos os alunos ativos de uma eletiva */
  alunosDaEletiva(eletivaId) {
    return this.listarMatriculas()
      .filter((m) => m.eletivaId === eletivaId && m.status !== "Cancelada")
      .sort((a, b) => (a.aluno ? a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR") : 0));
  },

  /* Lista de semestres existentes no sistema (para os filtros das telas).
     Combina os semestres das eletivas já cadastradas + os 2 do ano atual. */
  listarSemestres() {
    const dosDados = Storage.listar("eletivas").map((e) => e.semestre);
    const anoAtual = new Date().getFullYear();
    const atuais = [`${anoAtual}.1`, `${anoAtual}.2`];
    // Set remove duplicatas; sort desc organiza do mais novo para o mais antigo
    return [...new Set([...dosDados, ...atuais])].sort((a, b) => b.localeCompare(a));
  },

  /* ==========================================================================
     DASHBOARD: números resumidos para a tela inicial
     ========================================================================== */
  estatisticas() {
    const eletivas = Storage.listar("eletivas");
    const alunos = Storage.listar("alunos");
    const matriculas = Storage.listar("matriculas").filter((m) => m.status !== "Cancelada");
    const semestreAtual = `${new Date().getFullYear()}.${new Date().getMonth() < 6 ? "1" : "2"}`;

    return {
      totalEletivas: eletivas.length,
      eletivasAtivas: eletivas.filter((e) => e.status === "Em andamento").length,
      totalAlunos: alunos.length,
      totalMatriculas: matriculas.length,
      matriculasSemestreAtual: matriculas.filter((m) => m.semestre === semestreAtual).length,
      semestreAtual,
    };
  },
};

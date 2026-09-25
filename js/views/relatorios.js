/* ============================================================================
   VIEWS/RELATORIOS.JS — TELA DE CONSULTAS E HISTÓRICO
   ----------------------------------------------------------------------------
   Reúne as consultas que dão sentido ao sistema ao longo do tempo:
     1. HISTÓRICO DO ALUNO: todas as eletivas que o aluno fez/cursa,
        agrupadas por semestre (o novo Ensino Médio = 2 eletivas por ano);
     2. LISTA DE CHAMADA: todos os alunos de uma eletiva, com exportação.

   Todos os perfis acessam esta tela (alunos consultam o próprio histórico
   usando o número de matrícula na busca).
   ============================================================================ */

const ViewRelatorios = {

  /* -------------------------------------------------------------------------
     renderizar(parametros)
     parametros pode trazer "?aluno=<id>" quando o usuário clicou no botão
     📋 da tela de Alunos (chega aqui já com o aluno pré-selecionado).
     ------------------------------------------------------------------------- */
  renderizar(parametros) {
    // Extrai o id do aluno da "query string" do hash (ex.: #/relatorios?aluno=abc)
    const alunoInicial = new URLSearchParams(parametros || "").get("aluno") || "";

    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Consultas e histórico</h1>
        <p>Veja as eletivas cursadas por cada aluno, semestre a semestre.</p>
      </div>

      <!-- ================== CONSULTA 1: HISTÓRICO DO ALUNO ================== -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Histórico de eletivas do aluno</h2>
            <p>Selecione um aluno da base ou busque pelo número de matrícula.</p>
          </div>
        </div>

        <div class="filtros">
          <select id="rel-aluno" style="max-width:320px;"></select>
          <input type="search" id="rel-busca-matricula" placeholder="Ou digite o nº de matrícula + Enter" style="max-width:300px;" />
        </div>

        <!-- O histórico agrupado por semestre aparece aqui -->
        <div id="rel-historico"></div>
      </div>

      <!-- ================== CONSULTA 2: LISTA DE CHAMADA ================== -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Lista de chamada por eletiva</h2>
            <p>Alunos ativos de uma eletiva, com opção de exportar.</p>
          </div>
        </div>

        <div class="filtros">
          <select id="rel-eletiva" style="max-width:360px;"></select>
          <button class="btn btn-secundario" id="rel-exportar-chamada">⬇ Exportar lista (CSV)</button>
        </div>

        <div class="tabela-limite">
          <table>
            <thead><tr><th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Status da matrícula</th></tr></thead>
            <tbody id="rel-tbody-chamada"></tbody>
          </table>
        </div>
        <div id="rel-vazio-chamada" class="vazio oculto"></div>
      </div>
    `;

    /* ---- Consulta 1: histórico do aluno ---- */

    // Preenche o select com todos os alunos da base
    const selectAluno = document.getElementById("rel-aluno");
    selectAluno.innerHTML = '<option value="">— Selecione um aluno —</option>' +
      Models.listarAlunos()
        .map((a) => `<option value="${a.id}">${UI.escape(a.nome)} (${UI.escape(a.matricula)})</option>`)
        .join("");

    selectAluno.addEventListener("change", () => this.mostrarHistorico(selectAluno.value));

    // Busca alternativa pelo número de matrícula (útil para o próprio aluno)
    document.getElementById("rel-busca-matricula").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return; // só dispara ao apertar Enter
      e.preventDefault();
      const digitado = e.target.value.trim();
      if (!digitado) return;
      // Procura o aluno cuja matrícula termina com o trecho digitado
      const aluno = Models.listarAlunos().find((a) =>
        a.matricula.includes(digitado) || a.nome.toLowerCase().includes(digitado.toLowerCase())
      );
      if (!aluno) {
        UI.toast("Nenhum aluno encontrado com essa matrícula/nome.", "aviso");
        return;
      }
      selectAluno.value = aluno.id;      // sincroniza o select
      this.mostrarHistorico(aluno.id);   // e mostra o histórico
    });

    /* ---- Consulta 2: lista de chamada ---- */

    const selectEletiva = document.getElementById("rel-eletiva");

    // Agrupa as eletivas por semestre para facilitar a escolha
    const grupos = {};
    Models.listarEletivas("todos").forEach((e) => {
      (grupos[e.semestre] = grupos[e.semestre] || []).push(e);
    });
    selectEletiva.innerHTML = '<option value="">— Selecione uma eletiva —</option>' +
      Object.keys(grupos)
        .sort((a, b) => b.localeCompare(a))
        .map((sem) => {
          const opts = grupos[sem]
            .map((e) => `<option value="${e.id}">${UI.escape(e.nome)} (${sem})</option>`)
            .join("");
          return `<optgroup label="${UI.escape(sem)}">${opts}</optgroup>`;
        })
        .join("");

    selectEletiva.addEventListener("change", () => this.mostrarChamada(selectEletiva.value));
    document.getElementById("rel-exportar-chamada").addEventListener("click", () => {
      const id = selectEletiva.value;
      if (!id) {
        UI.toast("Selecione uma eletiva para exportar.", "aviso");
        return;
      }
      const eletiva = Models.obterEletiva(id);
      const alunos = Models.alunosDaEletiva(id);
      UI.exportarCSV(
        `chamada-${eletiva.nome.replace(/\s+/g, "-").toLowerCase()}.csv`,
        ["Aluno", "Matrícula", "Turma", "Status"],
        alunos.map((m) => [m.aluno?.nome || "", m.aluno?.matricula || "", m.aluno?.turma || "", m.status])
      );
    });

    /* Estado inicial */
    this.mostrarChamada("");

    // Se chegou pela tela de alunos (ex.: #/relatorios?aluno=abc),
    // já abre o histórico daquele aluno direto.
    if (alunoInicial) {
      selectAluno.value = alunoInicial;
      this.mostrarHistorico(alunoInicial);
    } else {
      document.getElementById("rel-historico").innerHTML =
        '<div class="vazio">Selecione um aluno para ver as eletivas cursadas por semestre.</div>';
    }
  },

  /* -------------------------------------------------------------------------
     mostrarHistorico(alunoId)
     Desenha o histórico do aluno: um bloco por semestre com as eletivas.
     Aqui aparece o "percurso" do aluno no novo Ensino Médio.
     ------------------------------------------------------------------------- */
  mostrarHistorico(alunoId) {
    const area = document.getElementById("rel-historico");
    if (!alunoId) {
      area.innerHTML = '<div class="vazio">Selecione um aluno para ver o histórico.</div>';
      return;
    }

    const aluno = Models.obterAluno(alunoId);
    if (!aluno) {
      area.innerHTML = '<div class="vazio">Aluno não encontrado.</div>';
      return;
    }

    // Models.historicoDoAluno devolve um objeto { "2026.1": [...], "2026.2": [...] }
    const historico = Models.historicoDoAluno(alunoId);
    const semestres = Object.keys(historico).sort((a, b) => a.localeCompare(b)); // do mais antigo ao mais novo
    const total = semestres.reduce((soma, sem) => soma + historico[sem].length, 0);

    area.innerHTML = `
      <p style="margin-bottom:12px;">
        <strong>${UI.escape(aluno.nome)}</strong> · mat. ${UI.escape(aluno.matricula)}
        ${aluno.turma ? "· " + UI.escape(aluno.turma) : ""} —
        <span class="badge badge-azul">${total} eletiva(s) no total</span>
      </p>
      ${
        total === 0
          ? '<div class="vazio">Este aluno ainda não tem matrícula em eletivas.</div>'
          : semestres
              .map((sem) => {
                // Um bloco por semestre, com tabela das eletivas daquele período
                const linhas = historico[sem]
                  .map((m) => {
                    const e = m.eletiva;
                    return `
                      <tr>
                        <td><strong>${UI.escape(e.nome)}</strong><br>
                            <small style="color:var(--cinza-texto)">${UI.escape(e.areaConhecimento || "")}</small></td>
                        <td>${UI.escape(e.professorResponsavel)}</td>
                        <td>${e.cargaHoraria ? e.cargaHoraria + "h" : "—"}</td>
                        <td>${UI.badgeStatus(m.status)}</td>
                      </tr>`;
                  })
                  .join("");
                return `
                  <div class="semestre-bloco">
                    <div class="semestre-titulo">Semestre ${UI.escape(sem)} — ${historico[sem].length} eletiva(s)</div>
                    <div class="tabela-limite">
                    <table>
                      <thead><tr><th>Eletiva</th><th>Professor</th><th>Carga</th><th>Status</th></tr></thead>
                      <tbody>${linhas}</tbody>
                    </table>
                    </div>
                  </div>`;
              })
              .join("")
      }
    `;
  },

  /* -------------------------------------------------------------------------
     mostrarChamada(eletivaId)
     Preenche a tabela da lista de chamada da eletiva escolhida.
     ------------------------------------------------------------------------- */
  mostrarChamada(eletivaId) {
    const tbody = document.getElementById("rel-tbody-chamada");
    const vazio = document.getElementById("rel-vazio-chamada");

    if (!eletivaId) {
      tbody.innerHTML = "";
      vazio.textContent = "Selecione uma eletiva para ver os alunos matriculados.";
      vazio.classList.remove("oculto");
      return;
    }

    const alunos = Models.alunosDaEletiva(eletivaId);
    if (alunos.length === 0) {
      tbody.innerHTML = "";
      vazio.textContent = "Nenhum aluno matriculado nesta eletiva.";
      vazio.classList.remove("oculto");
      return;
    }
    vazio.classList.add("oculto");

    tbody.innerHTML = alunos
      .map((m) => {
        const a = m.aluno || { nome: "(removido)", matricula: "—", turma: "—" };
        return `
          <tr>
            <td>${UI.escape(a.nome)}</td>
            <td>${UI.escape(a.matricula)}</td>
            <td>${UI.escape(a.turma || "—")}</td>
            <td>${UI.badgeStatus(m.status)}</td>
          </tr>`;
      })
      .join("");
  },
};

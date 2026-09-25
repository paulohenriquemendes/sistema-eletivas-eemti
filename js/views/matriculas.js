/* ============================================================================
   VIEWS/MATRICULAS.JS — TELA DE VÍNCULO ALUNO ↔ ELETIVA (MATRÍCULA)
   ----------------------------------------------------------------------------
   É o coração do sistema: aqui a secretaria VINCULA os alunos às eletivas.
     - Matrícula INDIVIDUAL: marca um aluno na lista e confirma;
     - Matrícula EM LOTE: marca vários alunos de uma vez (ou todos os da
       busca) e confirma — cadastra todos juntos.

   Também lista as matrículas existentes, com filtro por eletiva, e permite
   cancelar/concluir/excluir o vínculo. Professores consultam as listas.
   ============================================================================ */

const ViewMatriculas = {

  filtros: { busca: "", eletivaId: "todas" }, // filtros da lista de matrículas
  eletivaSelecionada: "",                      // eletiva escolhida para matricular
  alunosMarcados: new Set(),                   // ids dos alunos marcados na lista

  /* -------------------------------------------------------------------------
     renderizar()
     Desenha as duas seções da tela: (1) matricular e (2) matrículas ativas.
     ------------------------------------------------------------------------- */
  renderizar() {
    const podeEditar = Auth.podeEditar();

    // Primeiro semestre disponível fica pré-selecionado para a matrícula
    if (!this.eletivaSelecionada) {
      const opcoes = Models.listarEletivas("todos");
      this.eletivaSelecionada = opcoes.length ? opcoes[0].id : "";
    }

    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Matrículas em eletivas</h1>
        <p>Vincule os alunos da base às eletivas — individualmente ou em lote.</p>
      </div>

      ${!podeEditar ? '<div class="aviso-consulta">🔎 Perfil de consulta: você pode visualizar os alunos matriculados em cada eletiva.</div>' : ""}

      <!-- ================== SEÇÃO 1: MATRICULAR ALUNOS ================== -->
      <div class="card" id="card-matricular">
        <div class="card-cabecalho">
          <div>
            <h2>Matricular alunos</h2>
            <p>Escolha a eletiva, marque os alunos e confirme.</p>
          </div>
        </div>

        <!-- Seleção da eletiva de destino -->
        <div class="linha-campos">
          <div>
            <label for="mat-eletiva">Eletiva de destino *</label>
            <select id="mat-eletiva"></select>
          </div>
          <div>
            <label for="mat-semestre-filtro">Filtrar eletivas por semestre</label>
            <select id="mat-semestre-filtro"></select>
          </div>
        </div>

        <!-- Painel com o estado da eletiva escolhida (vagas ocupadas) -->
        <p id="mat-info-eletiva" style="font-size:13px;color:var(--cinza-texto);margin-bottom:12px;"></p>

        ${
          podeEditar
            ? `
        <!-- Busca de alunos da base -->
        <label for="mat-busca-aluno">Buscar alunos na base (marque um ou vários)</label>
        <input type="search" id="mat-busca-aluno" placeholder="🔎 Nome, matrícula ou turma..." style="max-width:420px;" />

        <!-- Lista de alunos com caixas de seleção (renderizada pelo JS) -->
        <div id="mat-lista-alunos" style="max-height:280px;overflow-y:auto;border:1px solid var(--cinza-borda);border-radius:8px;margin:10px 0;padding:6px;"></div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-secundario" id="mat-marcar-todos">Marcar todos da busca</button>
          <button class="btn btn-secundario" id="mat-desmarcar">Limpar seleção</button>
          <strong id="mat-contagem-selecao" style="font-size:13px;color:var(--azul-primario);"></strong>
        </div>
        <div style="margin-top:14px;">
          <button class="btn btn-amarelo" id="btn-matricular">✓ Matricular selecionado(s)</button>
        </div>`
            : '<div class="vazio">Somente a secretaria pode vincular alunos às eletivas.</div>'
        }
      </div>

      <!-- ============ SEÇÃO 2: MATRÍCULAS REALIZADAS (LISTA) ============ -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Matrículas realizadas</h2>
            <p id="contagem-matriculas"></p>
          </div>
          <button class="btn btn-secundario" id="btn-exportar-matriculas">⬇ Exportar CSV</button>
        </div>

        <!-- Filtros da lista: por eletiva + busca por aluno -->
        <div class="filtros">
          <select id="mat-filtro-eletiva"></select>
          <input type="search" id="mat-filtro-busca" placeholder="🔎 Buscar por aluno..." value="${UI.escape(this.filtros.busca)}" style="max-width:280px;" />
        </div>

        <div class="tabela-limite">
          <table>
            <thead>
              <tr><th>Aluno</th><th>Eletiva</th><th>Semestre</th><th>Data</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody id="tbody-matriculas"></tbody>
          </table>
        </div>
        <div id="vazio-matriculas" class="vazio oculto"></div>
      </div>
    `;

    /* ---- Eventos: seção matricular ---- */

    // Select de eletivas, agrupado por semestre (optgroups)
    this.preencherSelectEletivas("mat-eletiva", this.eletivaSelecionada);
    document.getElementById("mat-eletiva").addEventListener("change", (e) => {
      this.eletivaSelecionada = e.target.value;
      this.alunosMarcados.clear(); // trocou a eletiva: limpa a seleção
      this.atualizarInfoEletiva();
      this.atualizarListaAlunos();
    });

    // Filtro por semestre recarrega o select de eletivas
    UI.preencherSelectSemestres("mat-semestre-filtro");
    document.getElementById("mat-semestre-filtro").addEventListener("change", (e) => {
      this.eletivaSelecionada = "";
      this.preencherSelectEletivas("mat-eletiva", "");
      this.atualizarInfoEletiva();
      this.atualizarListaAlunos();
    });

    if (podeEditar) {
      // Busca na lista de alunos para marcar
      document.getElementById("mat-busca-aluno").addEventListener("input", () => this.atualizarListaAlunos());

      // Marcar/desmarcar todos os alunos exibidos na busca atual
      document.getElementById("mat-marcar-todos").addEventListener("click", () => {
        this.alunosFiltradosParaMarcar().forEach((a) => this.alunosMarcados.add(a.id));
        this.atualizarListaAlunos();
      });
      document.getElementById("mat-desmarcar").addEventListener("click", () => {
        this.alunosMarcados.clear();
        this.atualizarListaAlunos();
      });

      // Botão principal: efetiva as matrículas
      document.getElementById("btn-matricular").addEventListener("click", () => this.matricularSelecionados());
    }

    /* ---- Eventos: seção lista de matrículas ---- */

    this.preencherSelectEletivas("mat-filtro-eletiva", this.filtros.eletivaId, true);
    document.getElementById("mat-filtro-eletiva").addEventListener("change", (e) => {
      this.filtros.eletivaId = e.target.value;
      this.atualizarTabelaMatriculas();
    });
    document.getElementById("mat-filtro-busca").addEventListener("input", (e) => {
      this.filtros.busca = e.target.value;
      this.atualizarTabelaMatriculas();
    });
    document.getElementById("btn-exportar-matriculas").addEventListener("click", () => this.exportarMatriculas());

    // Render inicial das partes dinâmicas
    this.atualizarInfoEletiva();
    if (podeEditar) this.atualizarListaAlunos();
    this.atualizarTabelaMatriculas();
  },

  /* -------------------------------------------------------------------------
     preencherSelectEletivas(idSelect, selecionada, comOpcaoTodas)
     Monta o <select> de eletivas agrupado por semestre (mais fácil de achar).
     ------------------------------------------------------------------------- */
  preencherSelectEletivas(idSelect, selecionada, comOpcaoTodas = false) {
    const select = document.getElementById(idSelect);
    const semestreFiltro = document.getElementById("mat-semestre-filtro")?.value || "todos";
    let eletivas = Models.listarEletivas(semestreFiltro);

    // Agrupa as eletivas por semestre para virar <optgroup>
    const grupos = {};
    eletivas.forEach((e) => {
      (grupos[e.semestre] = grupos[e.semestre] || []).push(e);
    });

    select.innerHTML = (comOpcaoTodas ? '<option value="todas">Todas as eletivas</option>' : "");

    Object.keys(grupos)
      .sort((a, b) => b.localeCompare(a)) // semestres mais novos primeiro
      .forEach((sem) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = sem; // título do grupo
        grupos[sem].forEach((e) => {
          const ocupadas = Models.alunosDaEletiva(e.id).length;
          const op = document.createElement("option");
          op.value = e.id;
          op.textContent = `${e.nome} (${ocupadas}/${e.vagas} vagas)`;
          if (e.id === selecionada) op.selected = true;
          optgroup.appendChild(op);
        });
        select.appendChild(optgroup);
      });

    // Se nada foi marcado, seleciona a primeira opção disponível
    if (!selecionada || !eletivas.some((e) => e.id === selecionada)) {
      this.eletivaSelecionada = comOpcaoTodas ? "todas" : (eletivas[0]?.id || "");
      select.value = this.eletivaSelecionada;
    }
  },

  /* -------------------------------------------------------------------------
     atualizarInfoEletiva()
     Mostra o resumo da eletiva escolhida (professor, vagas ocupadas/livres).
     ------------------------------------------------------------------------- */
  atualizarInfoEletiva() {
    const info = document.getElementById("mat-info-eletiva");
    const eletiva = Models.obterEletiva(this.eletivaSelecionada);
    if (!info) return;
    if (!eletiva) {
      info.textContent = "Cadastre uma eletiva antes de matricular alunos.";
      return;
    }
    const ocupadas = Models.alunosDaEletiva(eletiva.id).length;
    info.innerHTML = `<strong>${UI.escape(eletiva.nome)}</strong> · ${UI.escape(eletiva.semestre)} ·
      Prof.: ${UI.escape(eletiva.professorResponsavel)} ·
      Vagas: ${ocupadas}/${eletiva.vagas} ·
      ${UI.badgeStatus(eletiva.status)}`;
  },

  /* -------------------------------------------------------------------------
     alunosFiltradosParaMarcar()
     Devolve os alunos conforme a busca digitada no campo de marcar.
     Também esconde quem já está matriculado na eletiva escolhida
     (não faz sentido marcar de novo quem já está dentro).
     ------------------------------------------------------------------------- */
  alunosFiltradosParaMarcar() {
    const busca = (document.getElementById("mat-busca-aluno")?.value || "").trim().toLowerCase();
    const jaMatriculados = Models.alunosDaEletiva(this.eletivaSelecionada)
      .map((m) => m.alunoId);

    return Models.listarAlunos().filter((a) => {
      const casaComBusca = [a.nome, a.matricula, a.turma].join(" ").toLowerCase().includes(busca);
      const jaDentro = jaMatriculados.includes(a.id);
      return casaComBusca && !jaDentro; // só quem ainda não está matriculado
    });
  },

  /* -------------------------------------------------------------------------
     atualizarListaAlunos()
     Redesenha a lista de alunos com caixas de marcação (checkboxes).
     ------------------------------------------------------------------------- */
  atualizarListaAlunos() {
    const container = document.getElementById("mat-lista-alunos");
    if (!container) return; // perfil sem permissão não tem esse bloco

    const alunos = this.alunosFiltradosParaMarcar();

    if (alunos.length === 0) {
      container.innerHTML = '<div class="vazio">Nenhum aluno disponível (todos os encontrados já estão matriculados ou a base está vazia).</div>';
      this.atualizarContagem();
      return;
    }

    // Cada aluno vira uma linha clicável com caixa de marcação
    container.innerHTML = alunos
      .map((a) => {
        const marcado = this.alunosMarcados.has(a.id);
        return `
          <label style="display:flex;align-items:center;gap:10px;padding:7px 6px;border-radius:6px;cursor:pointer;${marcado ? "background:var(--azul-claro);" : ""}">
            <input type="checkbox" data-aluno="${a.id}" ${marcado ? "checked" : ""} />
            <span><strong>${UI.escape(a.nome)}</strong>
              <span style="color:var(--cinza-texto);font-size:12px;">
                · mat. ${UI.escape(a.matricula)} ${a.turma ? "· " + UI.escape(a.turma) : ""}
              </span>
            </span>
          </label>`;
      })
      .join("");

    // Marca/desmarca ao clicar na caixa
    container.querySelectorAll("[data-aluno]").forEach((chk) =>
      chk.addEventListener("change", () => {
        const id = chk.dataset.aluno;
        if (chk.checked) this.alunosMarcados.add(id);
        else this.alunosMarcados.delete(id);
        this.atualizarListaAlunos(); // redesenha p/ destacar a linha
      })
    );

    this.atualizarContagem();
  },

  /* Atualiza o texto "N aluno(s) selecionado(s)" */
  atualizarContagem() {
    const el = document.getElementById("mat-contagem-selecao");
    if (el) el.textContent = `${this.alunosMarcados.size} aluno(s) selecionado(s)`;
  },

  /* -------------------------------------------------------------------------
     matricularSelecionados()
     Efetiva a matrícula de TODOS os alunos marcados na eletiva escolhida.
     Usa a função de lote do Models, que aplica as regras de vagas/duplicidade
     aluno por aluno e devolve o resumo (quantos entraram, quais falharam).
     ------------------------------------------------------------------------- */
  matricularSelecionados() {
    if (this.alunosMarcados.size === 0) {
      UI.toast("Marque pelo menos um aluno na lista.", "aviso");
      return;
    }
    if (!this.eletivaSelecionada) {
      UI.toast("Escolha uma eletiva de destino.", "aviso");
      return;
    }

    // Confirmação com resumo do que vai ser feito
    UI.confirmar(
      `Matricular ${this.alunosMarcados.size} aluno(s) na eletiva selecionada?`,
      () => {
        const resumo = Models.matricularEmLote([...this.alunosMarcados], this.eletivaSelecionada);

        // Notifica o resultado geral
        if (resumo.sucesso.length > 0)
          UI.toast(`${resumo.sucesso.length} aluno(s) matriculado(s) com sucesso!`, "sucesso");

        // Se houve falhas (lote, duplicidade), mostra em modal detalhado
        if (resumo.falhas.length > 0) {
          UI.abrirModal(
            "Alguns alunos não foram matriculados",
            `
            <ul style="padding-left:20px;font-size:13px;display:grid;gap:6px;">
              ${resumo.falhas.map((f) => `<li>${UI.escape(f)}</li>`).join("")}
            </ul>
            <div class="modal-acoes"><button class="btn btn-primario" onclick="UI.fecharModal()">OK</button></div>`
          );
        }

        // Limpa a seleção e atualiza todas as partes da tela
        this.alunosMarcados.clear();
        this.preencherSelectEletivas("mat-eletiva", this.eletivaSelecionada);
        this.preencherSelectEletivas("mat-filtro-eletiva", this.filtros.eletivaId, true);
        this.atualizarInfoEletiva();
        this.atualizarListaAlunos();
        this.atualizarTabelaMatriculas();
      }
    );
  },

  /* -------------------------------------------------------------------------
     atualizarTabelaMatriculas()
     Redesenha a lista de matrículas com os filtros aplicados.
     ------------------------------------------------------------------------- */
  atualizarTabelaMatriculas() {
    const podeEditar = Auth.podeEditar();
    const busca = this.filtros.busca.trim().toLowerCase();

    let matriculas = Models.listarMatriculas();

    // Filtro por eletiva específica (se não for "todas")
    if (this.filtros.eletivaId && this.filtros.eletivaId !== "todas") {
      matriculas = matriculas.filter((m) => m.eletivaId === this.filtros.eletivaId);
    }

    // Filtro de busca pelo nome/matrícula do aluno
    if (busca) {
      matriculas = matriculas.filter((m) =>
        [m.aluno?.nome, m.aluno?.matricula].join(" ").toLowerCase().includes(busca)
      );
    }

    // Mais recentes primeiro
    matriculas.sort((a, b) => (b.dataMatricula || "").localeCompare(a.dataMatricula || ""));

    const tbody = document.getElementById("tbody-matriculas");
    const vazio = document.getElementById("vazio-matriculas");
    document.getElementById("contagem-matriculas").textContent =
      `${matriculas.length} matrícula(s) listada(s)`;

    if (matriculas.length === 0) {
      tbody.innerHTML = "";
      vazio.textContent = "Nenhuma matrícula encontrada com os filtros atuais.";
      vazio.classList.remove("oculto");
      return;
    }
    vazio.classList.add("oculto");

    tbody.innerHTML = matriculas
      .map((m) => {
        const aluno = m.aluno || { nome: "(removido)", matricula: "—" };
        const eletiva = m.eletiva || { nome: "(removida)", semestre: "—" };
        return `
          <tr>
            <td><strong>${UI.escape(aluno.nome)}</strong><br>
                <small style="color:var(--cinza-texto)">mat. ${UI.escape(aluno.matricula)}</small></td>
            <td>${UI.escape(eletiva.nome)}</td>
            <td><span class="badge badge-azul">${UI.escape(eletiva.semestre)}</span></td>
            <td>${UI.formatarData(m.dataMatricula)}</td>
            <td>${UI.badgeStatus(m.status)}</td>
            <td>
              ${podeEditar ? `
              <div class="acoes">
                <button class="btn btn-secundario btn-pequeno" data-status="${m.id}" title="Alterar status">🔄</button>
                <button class="btn btn-perigo btn-pequeno" data-remover="${m.id}" title="Excluir vínculo">🗑</button>
              </div>` : "—"}
            </td>
          </tr>`;
      })
      .join("");

    if (podeEditar) {
      // 🔄 Alterar o status da matrícula (Ativa/Concluída/Cancelada)
      tbody.querySelectorAll("[data-status]").forEach((btn) =>
        btn.addEventListener("click", () => this.alterarStatus(btn.dataset.status))
      );
      // 🗑 Excluir o vínculo
      tbody.querySelectorAll("[data-remover]").forEach((btn) =>
        btn.addEventListener("click", () => this.excluir(btn.dataset.remover))
      );
    }
  },

  /* Modal rápido para trocar o status de uma matrícula */
  alterarStatus(id) {
    const opcoes = CONFIG.STATUS_MATRICULA.map(
      (s) => `<option value="${UI.escape(s)}">${UI.escape(s)}</option>`
    ).join("");
    const modal = UI.abrirModal(
      "Alterar status da matrícula",
      `
      <label for="st-novo">Novo status</label>
      <select id="st-novo">${opcoes}</select>
      <div class="modal-acoes">
        <button class="btn btn-secundario" id="st-cancelar">Cancelar</button>
        <button class="btn btn-primario" id="st-salvar">Salvar</button>
      </div>`
    );
    modal.querySelector("#st-cancelar").addEventListener("click", () => UI.fecharModal());
    modal.querySelector("#st-salvar").addEventListener("click", () => {
      Models.alterarStatusMatricula(id, modal.querySelector("#st-novo").value);
      UI.fecharModal();
      UI.toast("Status atualizado.", "sucesso");
      this.atualizarTabelaMatriculas();
    });
  },

  /* Excluir definitivamente o vínculo (com confirmação) */
  excluir(id) {
    UI.confirmar("Excluir esta matrícula (vínculo aluno–eletiva)?", () => {
      Models.excluirMatricula(id);
      UI.toast("Matrícula excluída.", "sucesso");
      this.preencherSelectEletivas("mat-eletiva", this.eletivaSelecionada);
      this.preencherSelectEletivas("mat-filtro-eletiva", this.filtros.eletivaId, true);
      this.atualizarInfoEletiva();
      this.atualizarListaAlunos();
      this.atualizarTabelaMatriculas();
    });
  },

  /* Exporta as matrículas atualmente listadas para CSV */
  exportarMatriculas() {
    let matriculas = Models.listarMatriculas();
    if (this.filtros.eletivaId !== "todas")
      matriculas = matriculas.filter((m) => m.eletivaId === this.filtros.eletivaId);
    if (this.filtros.busca.trim()) {
      const busca = this.filtros.busca.trim().toLowerCase();
      matriculas = matriculas.filter((m) =>
        [m.aluno?.nome, m.aluno?.matricula].join(" ").toLowerCase().includes(busca)
      );
    }
    UI.exportarCSV(
      "matriculas.csv",
      ["Aluno", "Matrícula", "Eletiva", "Semestre", "Data", "Status"],
      matriculas.map((m) => [
        m.aluno?.nome || "", m.aluno?.matricula || "", m.eletiva?.nome || "",
        m.eletiva?.semestre || m.semestre, UI.formatarData(m.dataMatricula), m.status,
      ])
    );
  },
};

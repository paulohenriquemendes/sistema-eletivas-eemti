/* ============================================================================
   VIEWS/ALUNOS.JS — TELA DA BASE DE ALUNOS
   ----------------------------------------------------------------------------
   A base de alunos é a "fonte" usada na hora de vincular alunos às eletivas.
   Aqui a secretaria pode:
     - cadastrar um aluno individualmente;
     - EDITAR e EXCLUIR registros de alunos;
     - IMPORTAR VÁRIOS ALUNOS DE UMA VEZ (colar a lista: um por linha);
     - exportar a base em CSV.

   Para PROFESSOR e ALUNO: somente consulta da lista.
   ============================================================================ */

const ViewAlunos = {

  filtros: { busca: "" }, // filtro de pesquisa da tela

  /* -------------------------------------------------------------------------
     renderizar()
     Desenha a tela com a tabela de alunos.
     ------------------------------------------------------------------------- */
  renderizar() {
    const podeEditar = Auth.podeEditar();

    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Alunos</h1>
        <p>Base de estudantes da escola, usada para vincular alunos às eletivas.</p>
      </div>

      ${!podeEditar ? '<div class="aviso-consulta">🔎 Perfil de consulta: apenas visualização da base de alunos.</div>' : ""}

      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Base de alunos</h2>
            <p id="contagem-alunos"></p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secundario" id="btn-exportar-alunos">⬇ Exportar CSV</button>
            ${podeEditar ? '<button class="btn btn-secundario" id="btn-importar-alunos">📥 Importar lista</button>' : ""}
            ${podeEditar ? '<button class="btn btn-amarelo" id="btn-novo-aluno">+ Novo aluno</button>' : ""}
          </div>
        </div>

        <!-- Campo de pesquisa por nome, matrícula ou turma -->
        <div class="filtros">
          <input type="search" id="filtro-alunos" placeholder="🔎 Buscar por nome, matrícula ou turma..." value="${UI.escape(this.filtros.busca)}" style="max-width:320px;" />
        </div>

        <div class="tabela-limite">
          <table>
            <thead>
              <tr>
                <th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Turno</th>
                <th>Eletivas (ativas)</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-alunos"></tbody>
          </table>
        </div>
        <div id="vazio-alunos" class="vazio oculto"></div>
      </div>
    `;

    /* ---- Eventos da tela ---- */

    // Pesquisa em tempo real
    document.getElementById("filtro-alunos").addEventListener("input", (e) => {
      this.filtros.busca = e.target.value;
      this.atualizarTabela();
    });

    // Exportação da base completa em CSV
    document.getElementById("btn-exportar-alunos").addEventListener("click", () => {
      const alunos = Models.listarAlunos();
      UI.exportarCSV(
        "base-alunos.csv",
        ["Nome", "Matrícula", "Turma", "Turno", "E-mail"],
        alunos.map((a) => [a.nome, a.matricula, a.turma, a.turno, a.email])
      );
    });

    if (podeEditar) {
      document.getElementById("btn-novo-aluno").addEventListener("click", () => this.abrirFormulario());
      document.getElementById("btn-importar-alunos").addEventListener("click", () => this.abrirImportacao());
    }

    this.atualizarTabela();
  },

  /* -------------------------------------------------------------------------
     atualizarTabela()
     Aplica a pesquisa e redesenha a tabela de alunos.
     ------------------------------------------------------------------------- */
  atualizarTabela() {
    const podeEditar = Auth.podeEditar();
    const busca = this.filtros.busca.trim().toLowerCase();

    let alunos = Models.listarAlunos();

    // Filtro de texto sobre nome, matrícula e turma
    if (busca) {
      alunos = alunos.filter((a) =>
        [a.nome, a.matricula, a.turma].join(" ").toLowerCase().includes(busca)
      );
    }

    const tbody = document.getElementById("tbody-alunos");
    const vazio = document.getElementById("vazio-alunos");
    document.getElementById("contagem-alunos").textContent = `${alunos.length} aluno(s) na base`;

    if (alunos.length === 0) {
      tbody.innerHTML = "";
      vazio.textContent = "Nenhum aluno encontrado. Cadastre alunos individualmente ou use a importação em lote.";
      vazio.classList.remove("oculto");
      return;
    }
    vazio.classList.add("oculto");

    tbody.innerHTML = alunos
      .map((a) => {
        // Conta as matrículas ativas do aluno (eletivas que ele cursa/ cursou)
        const matriculas = Models.listarMatriculas().filter(
          (m) => m.alunoId === a.id && m.status !== "Cancelada"
        );
        return `
          <tr>
            <td><strong>${UI.escape(a.nome)}</strong>${a.email ? `<br><small style="color:var(--cinza-texto)">${UI.escape(a.email)}</small>` : ""}</td>
            <td>${UI.escape(a.matricula)}</td>
            <td>${UI.escape(a.turma || "—")}</td>
            <td>${UI.escape(a.turno || "—")}</td>
            <td><span class="badge badge-azul">${matriculas.length}</span></td>
            <td>
              <div class="acoes">
                <button class="btn btn-secundario btn-pequeno" data-historico="${a.id}" title="Ver histórico de eletivas">📋</button>
                ${podeEditar ? `
                  <button class="btn btn-secundario btn-pequeno" data-editar="${a.id}" title="Editar">✏️</button>
                  <button class="btn btn-perigo btn-pequeno" data-excluir="${a.id}" title="Excluir">🗑</button>
                ` : ""}
              </div>
            </td>
          </tr>`;
      })
      .join("");

    // 📋 Histórico: leva para a tela de relatórios já com o aluno selecionado
    tbody.querySelectorAll("[data-historico]").forEach((btn) =>
      btn.addEventListener("click", () => {
        location.hash = "#/relatorios?aluno=" + btn.dataset.historico;
      })
    );

    if (podeEditar) {
      tbody.querySelectorAll("[data-editar]").forEach((btn) =>
        btn.addEventListener("click", () => this.abrirFormulario(btn.dataset.editar))
      );
      tbody.querySelectorAll("[data-excluir]").forEach((btn) =>
        btn.addEventListener("click", () => this.excluir(btn.dataset.excluir))
      );
    }
  },

  /* -------------------------------------------------------------------------
     abrirFormulario(idOuNada)
     Modal de cadastro/edição de UM aluno.
     ------------------------------------------------------------------------- */
  abrirFormulario(id) {
    const aluno = id ? Models.obterAluno(id) : null;

    const opcoesTurno = CONFIG.TURNOS.map(
      (t) => `<option value="${t}" ${aluno?.turno === t ? "selected" : ""}>${t}</option>`
    ).join("");

    const modal = UI.abrirModal(
      aluno ? "Editar aluno" : "Novo aluno",
      `
      <form id="form-aluno" autocomplete="off">
        <div class="linha-campos">
          <div>
            <label for="al-nome">Nome completo *</label>
            <input id="al-nome" value="${UI.escape(aluno?.nome || "")}" required />
          </div>
          <div>
            <label for="al-matricula">Nº de matrícula *</label>
            <input id="al-matricula" value="${UI.escape(aluno?.matricula || "")}" required />
          </div>
        </div>
        <div class="linha-campos">
          <div>
            <label for="al-turma">Turma</label>
            <input id="al-turma" value="${UI.escape(aluno?.turma || "")}" placeholder="Ex.: 2º ano A" />
          </div>
          <div>
            <label for="al-turno">Turno</label>
            <select id="al-turno">${opcoesTurno}</select>
          </div>
          <div>
            <label for="al-email">E-mail</label>
            <input id="al-email" type="email" value="${UI.escape(aluno?.email || "")}" />
          </div>
        </div>
        <p class="msg-erro oculto" id="al-erro"></p>
        <div class="modal-acoes">
          <button type="button" class="btn btn-secundario" id="al-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario">${aluno ? "Salvar alterações" : "Cadastrar aluno"}</button>
        </div>
      </form>
      `
    );

    modal.querySelector("#al-cancelar").addEventListener("click", () => UI.fecharModal());

    modal.querySelector("#form-aluno").addEventListener("submit", (evento) => {
      evento.preventDefault();
      const dados = {
        nome: modal.querySelector("#al-nome").value,
        matricula: modal.querySelector("#al-matricula").value,
        turma: modal.querySelector("#al-turma").value,
        turno: modal.querySelector("#al-turno").value,
        email: modal.querySelector("#al-email").value,
      };

      const resultado = Models.salvarAluno(dados, id);
      const erro = modal.querySelector("#al-erro");

      if (!resultado.ok) {
        erro.textContent = resultado.erro; // ex.: matrícula duplicada
        erro.classList.remove("oculto");
        return;
      }

      UI.fecharModal();
      UI.toast(id ? "Aluno atualizado!" : "Aluno cadastrado!", "sucesso");
      this.atualizarTabela();
    });
  },

  /* -------------------------------------------------------------------------
     abrirImportacao()
     IMPORTAÇÃO EM LOTE: a secretaria cola uma lista (um aluno por linha)
     e o sistema cadastra todos de uma vez.
     Formatos aceitos por linha (separador: ; ou tabulação):
       Nome do Aluno
       Nome do Aluno;12345
       Nome do Aluno;12345;2º ano A
     ------------------------------------------------------------------------- */
  abrirImportacao() {
    const modal = UI.abrirModal(
      "Importar alunos em lote",
      `
      <p style="font-size:13px;color:var(--cinza-texto);margin-bottom:10px;">
        Cole abaixo a lista de alunos, <strong>um por linha</strong>. Você pode incluir
        a matrícula e a turma na mesma linha, separadas por ponto e vírgula:
      </p>
      <div style="background:var(--cinza-fundo);border-radius:8px;padding:10px 14px;font-size:12.5px;margin-bottom:12px;">
        <code>Maria da Silva;20261;2º ano A</code><br>
        <code>João Pereira;20262;2º ano B</code><br>
        <code>Ana Lima&nbsp;(sem matrícula: o sistema gera uma)</code>
      </div>
      <label for="al-importar-texto">Lista de alunos</label>
      <textarea id="al-importar-texto" rows="8" placeholder="Cole aqui a lista de alunos, um por linha..."></textarea>
      <div class="linha-campos" style="margin-top:10px;">
        <div>
          <label for="al-importar-turno">Turno padrão para todos</label>
          <select id="al-importar-turno">
            ${CONFIG.TURNOS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="modal-acoes">
        <button class="btn btn-secundario" id="al-importar-cancelar">Cancelar</button>
        <button class="btn btn-amarelo" id="al-importar-confirmar">Importar alunos</button>
      </div>
      `
    );

    modal.querySelector("#al-importar-cancelar").addEventListener("click", () => UI.fecharModal());

    modal.querySelector("#al-importar-confirmar").addEventListener("click", () => {
      const texto = modal.querySelector("#al-importar-texto").value;
      const turno = modal.querySelector("#al-importar-turno").value;

      if (!texto.trim()) {
        UI.toast("Cole a lista de alunos antes de importar.", "aviso");
        return;
      }

      // O Models faz a leitura linha a linha e cadastra cada aluno
      const resumo = Models.importarAlunosEmLote(texto, turno);

      UI.fecharModal();
      UI.toast(`Importação concluída: ${resumo.criados} aluno(s) cadastrado(s).`, "sucesso");

      // Se houve linhas ignoradas (ex.: matrícula repetida), avisa em detalhe
      if (resumo.ignorados.length > 0) {
        UI.abrirModal(
          "Registros não importados",
          `
          <p style="font-size:13px;margin-bottom:10px;">${resumo.ignorados.length} linha(s) foram ignoradas:</p>
          <ul style="padding-left:20px;font-size:13px;display:grid;gap:6px;">
            ${resumo.ignorados.map((i) => `<li>${UI.escape(i)}</li>`).join("")}
          </ul>
          <div class="modal-acoes"><button class="btn btn-primario" onclick="UI.fecharModal()">OK</button></div>
          `
        );
      }

      this.atualizarTabela();
    });
  },

  /* -------------------------------------------------------------------------
     excluir(id)
     Exclui um aluno — com confirmação e bloqueio se houver matrículas ativas.
     ------------------------------------------------------------------------- */
  excluir(id) {
    const aluno = Models.obterAluno(id);
    if (!aluno) return;

    UI.confirmar(`Excluir o aluno "${aluno.nome}" da base?`, () => {
      const resultado = Models.excluirAluno(id);
      if (resultado.ok) {
        UI.toast("Aluno excluído.", "sucesso");
      } else {
        UI.toast(resultado.erro, "erro");
      }
      this.atualizarTabela();
    });
  },
};

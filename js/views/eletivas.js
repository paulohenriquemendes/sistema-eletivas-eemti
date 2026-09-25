/* ============================================================================
   VIEWS/ELETIVAS.JS — TELA DE CADASTRO DE ELETIVAS (CRUD COMPLETO)
   ----------------------------------------------------------------------------
   CRUD = Create (criar), Read (consultar), Update (editar), Delete (excluir).
   Nesta tela a secretaria:
     - lista e pesquisa as eletivas (todos os perfis podem consultar);
     - cadastra uma nova eletiva (formulário em modal);
     - edita os dados de uma eletiva existente;
     - exclui uma eletiva (com bloqueio se houver alunos matriculados);
     - visualiza a lista de alunos de cada eletiva.

   Para ALUNO e PROFESSOR os botões de edição não aparecem (consulta apenas).
   ============================================================================ */

const ViewEletivas = {

  /* Filtros guardados durante a sessão da tela (pesquisa + semestre) */
  filtros: { busca: "", semestre: "todos" },

  /* -------------------------------------------------------------------------
     renderizar()
     Desenha a tela com a tabela de eletivas e os filtros.
     ------------------------------------------------------------------------- */
  renderizar() {
    const podeEditar = Auth.podeEditar(); // só a secretaria edita

    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Eletivas</h1>
        <p>Cadastro das disciplinas eletivas do novo Ensino Médio, organizadas por semestre.</p>
      </div>

      ${!podeEditar ? '<div class="aviso-consulta">🔎 Perfil de consulta: apenas visualização das eletivas e dos alunos matriculados.</div>' : ""}

      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Lista de eletivas</h2>
            <p id="contagem-eletivas"></p>
          </div>
          ${podeEditar ? '<button class="btn btn-amarelo" id="btn-nova-eletiva">+ Nova eletiva</button>' : ""}
        </div>

        <!-- Filtros: campo de busca + seleção de semestre -->
        <div class="filtros">
          <input type="search" id="filtro-busca" placeholder="🔎 Buscar por nome, professor ou área..." value="${UI.escape(this.filtros.busca)}" />
          <select id="filtro-semestre">
            <option value="todos">Todos os semestres</option>
          </select>
        </div>

        <!-- A tabela é redesenhada pela função atualizarTabela() -->
        <div class="tabela-limite">
          <table>
            <thead>
              <tr>
                <th>Eletiva</th><th>Professor</th><th>Semestre</th>
                <th>Carga</th><th>Vagas</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <!-- O tbody é preenchido pelo JS abaixo -->
            <tbody id="tbody-eletivas"></tbody>
          </table>
        </div>
        <div id="vazio-eletivas" class="vazio oculto"></div>
      </div>
    `;

    /* ---- Conexão dos eventos da tela (após o HTML existir) ---- */

    // Preenche o filtro de semestres com os períodos conhecidos
    UI.preencherSelectSemestres("filtro-semestre", this.filtros.semestre === "todos"
      ? "" : this.filtros.semestre);
    // Garante a opção "todos" selecionada quando for o caso
    document.getElementById("filtro-semestre").value = this.filtros.semestre;

    // Pesquisa: redesenha a tabela a cada tecla digitada
    document.getElementById("filtro-busca").addEventListener("input", (e) => {
      this.filtros.busca = e.target.value;
      this.atualizarTabela();
    });

    // Troca de semestre: redesenha a tabela
    document.getElementById("filtro-semestre").addEventListener("change", (e) => {
      this.filtros.semestre = e.target.value;
      this.atualizarTabela();
    });

    // Botão "+ Nova eletiva" (só existe para secretaria)
    const btnNovo = document.getElementById("btn-nova-eletiva");
    if (btnNovo) btnNovo.addEventListener("click", () => this.abrirFormulario());

    // Desenha a tabela pela primeira vez
    this.atualizarTabela();
  },

  /* -------------------------------------------------------------------------
     atualizarTabela()
     Aplica os filtros (busca + semestre) na lista de eletivas e redesenha
     o corpo da tabela. Chamada a cada alteração de filtro e após cada
     operação de salvar/excluir.
     ------------------------------------------------------------------------- */
  atualizarTabela() {
    const podeEditar = Auth.podeEditar();
    const busca = this.filtros.busca.trim().toLowerCase();

    // Parte da lista já filtrada por semestre (função do models)
    let eletivas = Models.listarEletivas(this.filtros.semestre);

    // Filtro adicional de texto: nome, professor ou área de conhecimento
    if (busca) {
      eletivas = eletivas.filter((e) =>
        [e.nome, e.professorResponsavel, e.areaConhecimento]
          .join(" ") // junta os campos numa string só e pesquisa nela
          .toLowerCase()
          .includes(busca)
      );
    }

    const tbody = document.getElementById("tbody-eletivas");
    const vazio = document.getElementById("vazio-eletivas");
    const contagem = document.getElementById("contagem-eletivas");

    contagem.textContent = `${eletivas.length} eletiva(s) encontrada(s)`;

    // Estado vazio: mensagem amigável quando não há registros
    if (eletivas.length === 0) {
      tbody.innerHTML = "";
      vazio.textContent = "Nenhuma eletiva encontrada com os filtros atuais.";
      vazio.classList.remove("oculto");
      return;
    }
    vazio.classList.add("oculto");

    // Monta cada linha da tabela
    tbody.innerHTML = eletivas
      .map((e) => {
        const matriculados = Models.alunosDaEletiva(e.id).length;
        return `
          <tr>
            <td>
              <strong>${UI.escape(e.nome)}</strong><br>
              <small style="color:var(--cinza-texto)">${UI.escape(e.areaConhecimento)}</small>
            </td>
            <td>${UI.escape(e.professorResponsavel)}</td>
            <td><span class="badge badge-azul">${UI.escape(e.semestre)}</span></td>
            <td>${e.cargaHoraria ? e.cargaHoraria + "h" : "—"}</td>
            <td>${matriculados}/${e.vagas}</td>
            <td>${UI.badgeStatus(e.status)}</td>
            <td>
              <div class="acoes">
                <button class="btn btn-secundario btn-pequeno" data-ver="${e.id}" title="Ver alunos matriculados">👥</button>
                ${podeEditar ? `
                  <button class="btn btn-secundario btn-pequeno" data-editar="${e.id}" title="Editar">✏️</button>
                  <button class="btn btn-perigo btn-pequeno" data-excluir="${e.id}" title="Excluir">🗑</button>
                ` : ""}
              </div>
            </td>
          </tr>`;
      })
      .join("");

    /* ---- Liga os eventos dos botões de cada linha ---- */

    // 👥 Ver alunos matriculados nesta eletiva
    tbody.querySelectorAll("[data-ver]").forEach((btn) =>
      btn.addEventListener("click", () => this.verAlunos(btn.dataset.ver))
    );

    if (podeEditar) {
      // ✏️ Editar: abre o formulário preenchido
      tbody.querySelectorAll("[data-editar]").forEach((btn) =>
        btn.addEventListener("click", () => this.abrirFormulario(btn.dataset.editar))
      );
      // 🗑 Excluir: pede confirmação antes
      tbody.querySelectorAll("[data-excluir]").forEach((btn) =>
        btn.addEventListener("click", () => this.excluir(btn.dataset.excluir))
      );
    }
  },

  /* -------------------------------------------------------------------------
     abrirFormulario(idOuNada)
     Abre o modal com o formulário da eletiva.
     - Sem argumento .... cadastrar uma NOVA eletiva (campos vazios)
     - Com um id ....... EDITAR a eletiva correspondente (campos preenchidos)
     ------------------------------------------------------------------------- */
  abrirFormulario(id) {
    const eletiva = id ? Models.obterEletiva(id) : null; // null = novo cadastro

    // Monta as opções do select de área de conhecimento
    const opcoesArea = CONFIG.AREAS_CONHECIMENTO.map(
      (a) => `<option value="${UI.escape(a)}" ${eletiva?.areaConhecimento === a ? "selected" : ""}>${UI.escape(a)}</option>`
    ).join("");

    // Monta as opções do select de status
    const opcoesStatus = CONFIG.STATUS_ELETIVA.map(
      (s) => `<option value="${UI.escape(s)}" ${eletiva?.status === s ? "selected" : ""}>${UI.escape(s)}</option>`
    ).join("");

    const modal = UI.abrirModal(
      eletiva ? "Editar eletiva" : "Nova eletiva",
      `
      <form id="form-eletiva" autocomplete="off">
        <div class="linha-campos">
          <div>
            <label for="el-nome">Nome da eletiva *</label>
            <input id="el-nome" value="${UI.escape(eletiva?.nome || "")}" placeholder="Ex.: Robótica Educacional" required />
          </div>
          <div>
            <label for="el-professor">Professor(a) responsável *</label>
            <input id="el-professor" value="${UI.escape(eletiva?.professorResponsavel || "")}" placeholder="Nome completo" required />
          </div>
        </div>

        <div class="linha-campos">
          <div>
            <label for="el-area">Área do conhecimento</label>
            <select id="el-area">${opcoesArea}</select>
          </div>
          <div>
            <label for="el-semestre">Semestre *</label>
            <select id="el-semestre"></select>
          </div>
        </div>

        <div class="linha-campos">
          <div>
            <label for="el-carga">Carga horária (horas)</label>
            <input id="el-carga" type="number" min="0" value="${eletiva?.cargaHoraria ?? ""}" placeholder="Ex.: 40" />
          </div>
          <div>
            <label for="el-vagas">Vagas *</label>
            <input id="el-vagas" type="number" min="1" value="${eletiva?.vagas ?? 30}" required />
          </div>
          <div>
            <label for="el-horario">Horário</label>
            <input id="el-horario" value="${UI.escape(eletiva?.horario || "")}" placeholder="Ex.: Ter/Qui 14h–16h" />
          </div>
          <div>
            <label for="el-local">Local</label>
            <input id="el-local" value="${UI.escape(eletiva?.local || "")}" placeholder="Ex.: Laboratório 2" />
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label for="el-status">Status</label>
          <select id="el-status">${opcoesStatus}</select>
        </div>

        <div style="margin-bottom:12px;">
          <label for="el-descricao">Descrição / ementa</label>
          <textarea id="el-descricao" placeholder="Breve descrição do conteúdo trabalhado na eletiva...">${UI.escape(eletiva?.descricao || "")}</textarea>
        </div>

        <p class="msg-erro oculto" id="el-erro"></p>

        <div class="modal-acoes">
          <button type="button" class="btn btn-secundario" id="el-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario">${eletiva ? "Salvar alterações" : "Cadastrar eletiva"}</button>
        </div>
      </form>
      `
    );

    // Preenche os semestres no select do formulário
    UI.preencherSelectSemestres("el-semestre", eletiva?.semestre || "");

    // Cancelar fecha o modal sem salvar
    modal.querySelector("#el-cancelar").addEventListener("click", () => UI.fecharModal());

    // Envio do formulário: valida e salva via Models
    modal.querySelector("#form-eletiva").addEventListener("submit", (evento) => {
      evento.preventDefault();

      // Junta os valores digitados em um objeto
      const dados = {
        nome: modal.querySelector("#el-nome").value,
        professorResponsavel: modal.querySelector("#el-professor").value,
        areaConhecimento: modal.querySelector("#el-area").value,
        semestre: modal.querySelector("#el-semestre").value,
        cargaHoraria: modal.querySelector("#el-carga").value,
        vagas: modal.querySelector("#el-vagas").value,
        horario: modal.querySelector("#el-horario").value,
        local: modal.querySelector("#el-local").value,
        status: modal.querySelector("#el-status").value,
        descricao: modal.querySelector("#el-descricao").value,
      };

      // Models aplica as regras de negócio e salva
      const resultado = Models.salvarEletiva(dados, id);
      const erro = modal.querySelector("#el-erro");

      if (!resultado.ok) {
        erro.textContent = resultado.erro; // exibe o motivo da recusa
        erro.classList.remove("oculto");
        return;
      }

      UI.fecharModal();
      UI.toast(id ? "Eletiva atualizada com sucesso!" : "Eletiva cadastrada com sucesso!", "sucesso");
      this.atualizarTabela();
    });
  },

  /* -------------------------------------------------------------------------
     excluir(id)
     Exclui a eletiva — com confirmação e bloqueio se houver matrículas.
     ------------------------------------------------------------------------- */
  excluir(id) {
    const eletiva = Models.obterEletiva(id);
    if (!eletiva) return;

    // Pede a confirmação do usuário antes de excluir
    UI.confirmar(
      `Excluir definitivamente a eletiva "${eletiva.nome}" (${eletiva.semestre})?`,
      () => {
        const resultado = Models.excluirEletiva(id);
        if (resultado.ok) {
          UI.toast("Eletiva excluída.", "sucesso");
        } else {
          UI.toast(resultado.erro, "erro"); // ex.: existem alunos matriculados
        }
        this.atualizarTabela();
      }
    );
  },

  /* -------------------------------------------------------------------------
     verAlunos(id)
     Abre um modal com a lista de chamada da eletiva (alunos ativos).
     Disponível para todos os perfis (consulta).
     ------------------------------------------------------------------------- */
  verAlunos(id) {
    const eletiva = Models.obterEletiva(id);
    const alunos = Models.alunosDaEletiva(id);

    const linhas = alunos
      .map((m) => {
        const a = m.aluno || { nome: "(aluno removido)", matricula: "—", turma: "—" };
        return `
          <tr>
            <td>${UI.escape(a.nome)}</td>
            <td>${UI.escape(a.matricula)}</td>
            <td>${UI.escape(a.turma || "—")}</td>
            <td>${UI.formatarData(m.dataMatricula)}</td>
          </tr>`;
      })
      .join("");

    UI.abrirModal(
      `Alunos matriculados — ${eletiva.nome}`,
      `
        <p style="font-size:13px;color:var(--cinza-texto);margin-bottom:10px;">
          Semestre ${UI.escape(eletiva.semestre)} · ${alunos.length} de ${eletiva.vagas} vaga(s) ocupadas
        </p>
        ${alunos.length === 0
          ? '<div class="vazio">Nenhum aluno matriculado nesta eletiva ainda.</div>'
          : `<div class="tabela-limite"><table>
              <thead><tr><th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Data da matrícula</th></tr></thead>
              <tbody>${linhas}</tbody>
             </table></div>`}
        <div class="modal-acoes">
          ${Auth.podeEditar() && alunos.length > 0
            ? `<button class="btn btn-secundario" id="btn-exportar-chamada">⬇ Exportar lista (CSV)</button>` : ""}
          <button class="btn btn-primario" id="btn-fechar-alunos">Fechar</button>
        </div>
      `
    );

    // Botão fechar
    document.getElementById("btn-fechar-alunos").addEventListener("click", () => UI.fecharModal());

    // Exportação da lista de chamada em CSV (Excel)
    const btnExportar = document.getElementById("btn-exportar-chamada");
    if (btnExportar) {
      btnExportar.addEventListener("click", () => {
        UI.exportarCSV(
          `lista-${eletiva.nome.replace(/\s+/g, "-").toLowerCase()}-${eletiva.semestre}.csv`,
          ["Aluno", "Matrícula", "Turma", "Data da matrícula"],
          alunos.map((m) => [
            m.aluno?.nome || "",
            m.aluno?.matricula || "",
            m.aluno?.turma || "",
            UI.formatarData(m.dataMatricula),
          ])
        );
      });
    }
  },
};

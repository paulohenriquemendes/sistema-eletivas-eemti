/* ============================================================================
   VIEWS/DASHBOARD.JS — TELA INICIAL (PAINEL)
   ----------------------------------------------------------------------------
   Mostra os números gerais do sistema (quantas eletivas, alunos, matrículas)
   e um resumo das eletivas do semestre atual. É a "porta de entrada" após
   o login, para todos os perfis.
   ============================================================================ */

const ViewDashboard = {

  /* -------------------------------------------------------------------------
     renderizar()
     Desenha a tela dentro da área de conteúdo (#conteudo).
     ------------------------------------------------------------------------- */
  renderizar() {
    const stats = Models.estatisticas();          // números calculados no models
    const podeEditar = Auth.podeEditar();          // secretaria vê botão de ação
    const perfil = Auth.perfilAtual();

    // Busca as eletivas do semestre atual para a lista resumida
    const eletivasAtual = Models.listarEletivas(stats.semestreAtual);

    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Painel geral</h1>
        <p>Bem-vindo(a), ${UI.escape(Auth.usuarioAtual()?.nome || "")} —
           perfil: ${UI.escape(perfil?.rotulo || "")} · Semestre atual: ${stats.semestreAtual}</p>
      </div>

      ${!podeEditar ? '<div class="aviso-consulta">🔎 Seu perfil é de <strong>consulta</strong>: você pode visualizar todas as informações, mas não cadastrar, editar ou excluir registros.</div>' : ""}

      <!-- Cartões de estatística (grid automático de 4) -->
      <div class="grid-stats">
        <div class="stat">
          <div class="stat numero">${stats.totalEletivas}</div>
          <div class="stat rotulo">Eletivas cadastradas</div>
        </div>
        <div class="stat destaque-amarelo">
          <div class="stat numero">${stats.eletivasAtivas}</div>
          <div class="stat rotulo">Eletivas em andamento</div>
        </div>
        <div class="stat">
          <div class="stat numero">${stats.totalAlunos}</div>
          <div class="stat rotulo">Alunos na base</div>
        </div>
        <div class="stat destaque-amarelo">
          <div class="stat numero">${stats.totalMatriculas}</div>
          <div class="stat rotulo">Matrículas em eletivas</div>
        </div>
      </div>

      <!-- Lista das eletivas do semestre atual -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Eletivas do semestre ${stats.semestreAtual}</h2>
            <p>${eletivasAtual.length} eletiva(s) oferecida(s) neste período</p>
          </div>
          ${podeEditar ? '<a class="btn btn-amarelo" href="#/eletivas">+ Nova eletiva</a>' : ""}
        </div>

        ${
          eletivasAtual.length === 0
            ? '<div class="vazio">Nenhuma eletiva cadastrada para o semestre atual.</div>'
            : `
          <div class="tabela-limite">
          <table>
            <thead>
              <tr><th>Eletiva</th><th>Professor</th><th>Vagas</th><th>Matriculados</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${eletivasAtual
                .map((e) => {
                  // Conta quantos alunos ativos existem nesta eletiva
                  const matriculados = Models.alunosDaEletiva(e.id).length;
                  return `
                    <tr>
                      <td><strong>${UI.escape(e.nome)}</strong><br>
                          <small style="color:var(--cinza-texto)">${UI.escape(e.areaConhecimento)}</small></td>
                      <td>${UI.escape(e.professorResponsavel)}</td>
                      <td>${e.vagas}</td>
                      <td>${matriculados}</td>
                      <td>${UI.badgeStatus(e.status)}</td>
                    </tr>`;
                })
                .join("")}
            </tbody>
          </table>
          </div>`
        }
      </div>
    `;
  },
};

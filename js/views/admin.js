/* ============================================================================
   VIEWS/ADMIN.JS — TELA ADMINISTRATIVA (SOMENTE SECRETARIA)
   ----------------------------------------------------------------------------
   Ferramentas de manutenção do sistema, exclusivas do perfil secretaria:
     - carregar dados de EXEMPLO (para conhecer o sistema rapidamente);
     - fazer BACKUP dos dados (exporta tudo em um arquivo .json);
     - RESTAURAR um backup (importa o arquivo exportado);
     - limpar todos os dados (reiniciar do zero).

   COMO FUNCIONA O BACKUP: os dados vivem no navegador (localStorage).
   O backup exporta tudo para um arquivo, permitindo transferir os dados
   para outro computador ou guardar uma cópia de segurança.
   ============================================================================ */

const ViewAdmin = {

  /* -------------------------------------------------------------------------
     renderizar()
     Só a secretaria chega aqui (o roteador já bloqueia os outros perfis).
     ------------------------------------------------------------------------- */
  renderizar() {
    document.getElementById("conteudo").innerHTML = `
      <div class="titulo-tela">
        <h1>Gerenciar dados</h1>
        <p>Backup, restauração, dados de exemplo e limpeza do sistema.</p>
      </div>

      <!-- ============ BACKUP E RESTAURAÇÃO ============ -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Backup e restauração</h2>
            <p>Guarde uma cópia de todos os dados ou restaure um backup salvo.</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primario" id="btn-backup">⬇ Exportar backup (JSON)</button>
          <label class="btn btn-secundario" style="cursor:pointer;">
            ⬆ Importar backup
            <!-- input de arquivo invisível: o clique no botão abre a janela -->
            <input type="file" id="input-restore" accept=".json" class="oculto" />
          </label>
        </div>
        <p style="font-size:12.5px;color:var(--cinza-texto);margin-top:10px;">
          ⚠️ Os dados ficam salvos no navegador do computador usado. Para usar o
          sistema em outra máquina, exporte o backup aqui e importe lá.
        </p>
      </div>

      <!-- ============ DADOS DE EXEMPLO ============ -->
      <div class="card">
        <div class="card-cabecalho">
          <div>
            <h2>Dados de exemplo</h2>
            <p>Cria eletivas, alunos e matrículas fictícias para explorar o sistema.</p>
          </div>
        </div>
        <button class="btn btn-amarelo" id="btn-seed">Carregar dados de exemplo</button>
      </div>

      <!-- ============ ZONA DE PERIGO ============ -->
      <div class="card" style="border-color:#fca5a5;">
        <div class="card-cabecalho">
          <div>
            <h2 style="color:var(--vermelho-erro);">Zona de perigo</h2>
            <p>Apaga TODAS as eletivas, alunos e matrículas. Não há como desfazer.</p>
          </div>
        </div>
        <button class="btn btn-perigo" id="btn-limpar">🗑 Limpar todos os dados</button>
      </div>
    `;

    /* ---- Exportar backup: junta todas as coleções num arquivo .json ---- */
    document.getElementById("btn-backup").addEventListener("click", () => {
      const backup = {
        versao: 1,
        exportadoEm: new Date().toISOString(),
        eletivas: Storage.listar("eletivas"),
        alunos: Storage.listar("alunos"),
        matriculas: Storage.listar("matriculas"),
      };
      // Cria o arquivo e dispara o download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `backup-eletivas-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      UI.toast("Backup exportado!", "sucesso");
    });

    /* ---- Importar backup: lê o arquivo escolhido e grava os dados ---- */
    document.getElementById("input-restore").addEventListener("change", (evento) => {
      const arquivo = evento.target.files[0];
      if (!arquivo) return;

      const leitor = new FileReader();
      leitor.onload = () => {
        try {
          const dados = JSON.parse(leitor.result); // converte o texto em objetos

          // Validação básica: o arquivo precisa ter as 3 coleções
          if (!dados.eletivas || !dados.alunos || !dados.matriculas) {
            throw new Error("Arquivo não parece ser um backup deste sistema.");
          }

          UI.confirmar("Importar este backup? Os dados atuais serão substituídos.", () => {
            Storage.salvar("eletivas", dados.eletivas);
            Storage.salvar("alunos", dados.alunos);
            Storage.salvar("matriculas", dados.matriculas);
            UI.toast("Backup restaurado com sucesso!", "sucesso");
            App.navegar("dashboard"); // volta ao painel atualizado
          });
        } catch (erro) {
          UI.toast("Erro ao importar: " + erro.message, "erro");
        }
      };
      leitor.readAsText(arquivo); // lê o arquivo como texto
    });

    /* ---- Dados de exemplo: chama a função de seed abaixo ---- */
    document.getElementById("btn-seed").addEventListener("click", () => {
      UI.confirmar("Carregar os dados de exemplo? Registros com dados fictícios serão adicionados.", () => {
        const resumo = this.carregarDadosExemplo();
        UI.toast(`Exemplos carregados: ${resumo.eletivas} eletiva(s), ${resumo.alunos} aluno(s), ${resumo.matriculas} matrícula(s).`, "sucesso");
        App.navegar("dashboard");
      });
    });

    /* ---- Limpar tudo: pede confirmação DUPLA antes de apagar ---- */
    document.getElementById("btn-limpar").addEventListener("click", () => {
      UI.confirmar("Tem certeza? Isso apaga TODAS as eletivas, alunos e matrículas.", () => {
        Storage.limparTudo();
        UI.toast("Todos os dados foram apagados.", "aviso");
        App.navegar("dashboard");
      });
    });
  },

  /* -------------------------------------------------------------------------
     carregarDadosExemplo()
     Cria um pequeno conjunto de dados fictícios (eletivas, alunos e
     matrículas) para explorar o sistema sem cadastrar nada à mão.
     Só adiciona o que ainda não existe (por nome/matrícula).
     ------------------------------------------------------------------------- */
  carregarDadosExemplo() {
    const ano = new Date().getFullYear();
    const sem1 = `${ano}.1`;
    const sem2 = `${ano}.2`;
    const resumo = { eletivas: 0, alunos: 0, matriculas: 0 };

    // ---- Eletivas de exemplo ----
    const eletivasExemplo = [
      { nome: "Robótica Educacional", professorResponsavel: "Prof. Carlos Eduardo", areaConhecimento: "Ciências da Natureza e suas Tecnologias", semestre: sem1, cargaHoraria: 40, vagas: 25, horario: "Ter/Qui 14h–16h", local: "Laboratório de Informática", status: "Em andamento", descricao: "Construção e programação de robôs com kits educacionais." },
      { nome: "Leitura e Produção de Textos", professorResponsavel: "Profa. Maria Helena", areaConhecimento: "Linguagens e suas Tecnologias", semestre: sem1, cargaHoraria: 40, vagas: 30, horario: "Seg/Qua 14h–16h", local: "Sala 12", status: "Em andamento", descricao: "Oficinas de leitura, escrita criativa e produção textual." },
      { nome: "Educação Financeira", professorResponsavel: "Prof. Francisco Lima", areaConhecimento: "Matemática e suas Tecnologias", semestre: sem1, cargaHoraria: 40, vagas: 30, horario: "Sex 14h–17h", local: "Sala 08", status: "Em andamento", descricao: "Orçamento pessoal, juros, investimentos e consumo consciente." },
      { nome: "Empreendedorismo e Projeto de Vida", professorResponsavel: "Profa. Ana Beatriz", areaConhecimento: "Projeto de Vida", semestre: sem2, cargaHoraria: 40, vagas: 28, horario: "Ter/Qui 14h–16h", local: "Sala 05", status: "Planejada", descricao: "Elaboração de projetos pessoais, profissionais e negócios sociais." },
      { nome: "Introdução à Programação", professorResponsavel: "Prof. Carlos Eduardo", areaConhecimento: "Matemática e suas Tecnologias", semestre: sem2, cargaHoraria: 40, vagas: 20, horario: "Seg/Qua 16h–18h", local: "Laboratório de Informática", status: "Planejada", descricao: "Lógica de programação e criação de páginas web com HTML/CSS/JS." },
    ];

    eletivasExemplo.forEach((dados) => {
      // Evita duplicar se já existir uma eletiva com o mesmo nome no semestre
      const jaExiste = Models.listarEletivas().some(
        (e) => e.nome === dados.nome && e.semestre === dados.semestre
      );
      if (!jaExiste) {
        Models.salvarEletiva(dados);
        resumo.eletivas++;
      }
    });

    // ---- Alunos de exemplo ----
    const alunosExemplo = [
      { nome: "Ana Clara Ferreira", matricula: `${ano}001`, turma: "1º ano A", turno: "Tarde" },
      { nome: "Bruno Souza Almeida", matricula: `${ano}002`, turma: "1º ano A", turno: "Tarde" },
      { nome: "Carla Nunes Bezerra", matricula: `${ano}003`, turma: "2º ano B", turno: "Manhã" },
      { nome: "Diego Matos Rocha", matricula: `${ano}004`, turma: "2º ano B", turno: "Manhã" },
      { nome: "Emanuelle Lima Castro", matricula: `${ano}005`, turma: "3º ano A", turno: "Tarde" },
      { nome: "Felipe Gomes Dias", matricula: `${ano}006`, turma: "3º ano A", turno: "Tarde" },
    ];

    const alunosPorNome = {};
    alunosExemplo.forEach((dados) => {
      const jaExiste = Models.listarAlunos().some((a) => a.matricula === dados.matricula);
      if (!jaExiste) {
        const r = Models.salvarAluno(dados);
        if (r.ok) {
          resumo.alunos++;
          alunosPorNome[dados.nome] = r.dados.id; // guarda o id para matricular
        }
      } else {
        // Já existia: guarda o id do registro existente
        const existente = Models.listarAlunos().find((a) => a.matricula === dados.matricula);
        alunosPorNome[existente.nome] = existente.id;
      }
    });

    // ---- Matrículas de exemplo (vinculando os alunos às eletivas) ----
    const todas = Models.listarEletivas();
    const achar = (nome) => todas.find((e) => e.nome === nome)?.id;

    const matriculasExemplo = [
      ["Ana Clara Ferreira", "Robótica Educacional"],
      ["Ana Clara Ferreira", "Leitura e Produção de Textos"],
      ["Bruno Souza Almeida", "Robótica Educacional"],
      ["Carla Nunes Bezerra", "Educação Financeira"],
      ["Diego Matos Rocha", "Leitura e Produção de Textos"],
      ["Emanuelle Lima Castro", "Educação Financeira"],
      ["Felipe Gomes Dias", "Robótica Educacional"],
    ];

    matriculasExemplo.forEach(([nomeAluno, nomeEletiva]) => {
      const alunoId = alunosPorNome[nomeAluno];
      const eletivaId = achar(nomeEletiva);
      if (alunoId && eletivaId) {
        const r = Models.matricular(alunoId, eletivaId);
        if (r.ok) resumo.matriculas++;
      }
    });

    return resumo;
  },
};

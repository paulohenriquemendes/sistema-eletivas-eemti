/* ============================================================================
   UI.JS — FERRAMENTAS DE INTERFACE REUTILIZÁVEIS
   ----------------------------------------------------------------------------
   Funções pequenas que as telas usam o tempo todo:
   - notificações (toasts);
   - janelas modais (formulários de edição);
   - proteção contra HTML malicioso (escape);
   - formatação de data;
   - exportação de tabela para CSV (Excel).

   Tudo fica agrupado no objeto "UI" para não poluir o namespace global.
   ============================================================================ */

const UI = {

  /* -------------------------------------------------------------------------
     escape(texto)
     Converte caracteres especiais em "versões seguras" antes de inserir
     o texto no HTML (previne que alguém digite <script> num campo e o
     sistema execute o código). SEMPRE use ao exibir dados digitados.
     ------------------------------------------------------------------------- */
  escape(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /* -------------------------------------------------------------------------
     toast(mensagem, tipo)
     Exibe a notificação no canto inferior direito e some sozinha após 3,5s.
     tipos: "sucesso" (verde), "erro" (vermelho), "aviso" (amarelo)
     ------------------------------------------------------------------------- */
  toast(mensagem, tipo = "sucesso") {
    const area = document.getElementById("toasts"); // div fixa no index.html
    const div = document.createElement("div");
    div.className = `toast toast-${tipo}`;           // classe define a cor
    div.textContent = mensagem;                      // texto puro (sem HTML)
    area.appendChild(div);

    // Agenda a remoção automática com um fade suave
    setTimeout(() => {
      div.style.opacity = "0";                       // some gradualmente
      setTimeout(() => div.remove(), 300);           // e é retirado do DOM
    }, 3500);
  },

  /* -------------------------------------------------------------------------
     abrirModal(titulo, htmlConteudo)
     Abre a janela modal com um formulário/aviso por cima da tela.
     Clique no fundo escurecido ou no "X" fecha o modal.
     Devolve a caixa do modal para a tela preencher os campos depois.
     ------------------------------------------------------------------------- */
  abrirModal(titulo, htmlConteudo) {
    const container = document.getElementById("modal-container");

    // Monta a estrutura: fundo escurecido + caixa branca + botão fechar
    container.innerHTML = `
      <div class="modal-fundo">
        <div class="modal-caixa">
          <button class="modal-fechar" title="Fechar">✕</button>
          <h2>${this.escape(titulo)}</h2>
          <div class="modal-corpo">${htmlConteudo}</div>
        </div>
      </div>`;

    // Fecha ao clicar no ✕
    container.querySelector(".modal-fechar").onclick = () => this.fecharModal();

    // Fecha ao clicar na área escura fora da caixa
    container.querySelector(".modal-fundo").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-fundo")) this.fecharModal();
    });

    return container.querySelector(".modal-caixa");
  },

  /* Fecha o modal (limpa o container) */
  fecharModal() {
    document.getElementById("modal-container").innerHTML = "";
  },

  /* -------------------------------------------------------------------------
     confirmar(mensagem, funcaoConfirmada)
     Pede a confirmação do usuário numa janela modal antes de ações
     destrutivas (excluir). Ao clicar em "Confirmar", executa a função.
     ------------------------------------------------------------------------- */
  confirmar(mensagem, funcaoConfirmada) {
    const modal = this.abrirModal(
      "Confirmar ação",
      `
        <p style="font-size:14px; line-height:1.5;">${this.escape(mensagem)}</p>
        <div class="modal-acoes">
          <button class="btn btn-secundario" id="btn-cancelar">Cancelar</button>
          <button class="btn btn-primario" id="btn-confirmar">Confirmar</button>
        </div>
      `
    );
    modal.querySelector("#btn-cancelar").onclick = () => this.fecharModal();
    modal.querySelector("#btn-confirmar").onclick = () => {
      this.fecharModal();
      funcaoConfirmada(); // executa a ação (ex.: a exclusão de fato)
    };
  },

  /* -------------------------------------------------------------------------
     formatarData(iso)
     Converte a data salva (formato internacional) para o padrão brasileiro.
     Ex.: "2026-03-05T10:00:00Z" -> "05/03/2026"
     ------------------------------------------------------------------------- */
  formatarData(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  },

  /* -------------------------------------------------------------------------
     badgeStatus(status)
     Gera a etiqueta colorida de status, com a cor certa para cada valor.
     ------------------------------------------------------------------------- */
  badgeStatus(status) {
    const mapa = {
      "Planejada": "badge-azul",
      "Em andamento": "badge-amarelo",
      "Concluída": "badge-verde",
      "Cancelada": "badge-cinza",
      "Ativa": "badge-amarelo",
    };
    const cor = mapa[status] || "badge-cinza"; // cor padrão se não achar
    return `<span class="badge ${cor}">${this.escape(status)}</span>`;
  },

  /* -------------------------------------------------------------------------
     selectSemestres(idSelect, selecionado)
     Preenche um <select> com todos os semestres conhecidos do sistema.
     Serve para os filtros das telas e para o formulário da eletiva.
     ------------------------------------------------------------------------- */
  preencherSelectSemestres(idSelect, selecionado = "") {
    const select = document.getElementById(idSelect);
    if (!select) return;
    select.innerHTML = ""; // limpa as opções atuais

    Models.listarSemestres().forEach((sem) => {
      const op = document.createElement("option");
      op.value = sem;
      op.textContent = sem;
      if (sem === selecionado) op.selected = true; // marca o selecionado
      select.appendChild(op);
    });
  },

  /* -------------------------------------------------------------------------
     exportarCSV(nomeArquivo, colunas, linhas)
     Gera um arquivo CSV (abre no Excel) a partir dos dados da tabela e
     dispara o download no navegador.
     - colunas: array com os títulos (cabeçalho)
     - linhas:  array de arrays com os valores de cada linha
     ------------------------------------------------------------------------- */
  exportarCSV(nomeArquivo, colunas, linhas) {
    // Junta colunas e linhas num único formato de linhas
    const todasAsLinhas = [colunas, ...linhas];

    // Converte cada linha para o formato CSV, envolvendo textos em aspas
    // e trocando ; por vírgula interna para não quebrar a planilha
    const conteudo = todasAsLinhas
      .map((linha) => linha.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    // Adiciona o BOM (código especial) para o Excel reconhecer acentos
    const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });

    // Cria um link invisível de download e "clica" nele programaticamente
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove(); // remove o link do DOM depois do download
  },
};

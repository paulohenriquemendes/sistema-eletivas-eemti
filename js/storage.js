/* ============================================================================
   STORAGE.JS — CAMADA DE PERSISTÊNCIA DE DADOS
   ----------------------------------------------------------------------------
   O sistema é hospedado no GitHub Pages (páginas estáticas), então não há
   servidor com banco de dados. A solução adotada é o "localStorage" do
   navegador: os dados ficam salvos no próprio computador de quem usa
   (o navegador guarda os registros mesmo depois de fechar a aba).

   ARQUITETURA (padrão "Repository"):
   Este arquivo é a ÚNICA parte do sistema que fala com o localStorage.
   Todas as outras telas usam as funções daqui (listar, salvar, remover...).
   Assim, se um dia você quiser trocar localStorage por um banco real
   (ex.: Firebase ou uma API), só precisa reescrever este arquivo.

   ⚠️ ATENÇÃO: como os dados ficam no navegador, cada computador tem
   "seu próprio banco". Limpar os dados de navegação apaga os registros.
   ------------------------------------------------------------------------- */

const Storage = {

  /* -------------------------------------------------------------------------
     chaveCompleta(nome)
     Monta a chave final usada no localStorage.
     Ex.: chaveCompleta("alunos") -> "eletivas_seduc_alunos"
     ------------------------------------------------------------------------- */
  chaveCompleta(nome) {
    return CONFIG.PREFIXO_STORAGE + nome; // junta o prefixo com o nome da lista
  },

  /* -------------------------------------------------------------------------
     listar(nomeColecao)
     Retorna TODOS os registros de uma coleção (ex.: todas as eletivas).
     Se ainda não existir nada salvo, devolve uma lista vazia [].
     ------------------------------------------------------------------------- */
  listar(nomeColecao) {
    const bruto = localStorage.getItem(this.chaveCompleta(nomeColecao));
    // JSON.parse converte o texto salvo de volta em objetos JavaScript;
    // se o texto for null (nunca salvo), devolvemos uma lista vazia.
    return bruto ? JSON.parse(bruto) : [];
  },

  /* -------------------------------------------------------------------------
     obter(nomeColecao, id)
     Retorna UM registro pelo seu id, ou null se não existir.
     ------------------------------------------------------------------------- */
  obter(nomeColecao, id) {
    return this.listar(nomeColecao).find((item) => item.id === id) || null;
  },

  /* -------------------------------------------------------------------------
     salvar(nomeColecao, lista)
     Grava a lista completa da coleção no localStorage.
     JSON.stringify converte os objetos JavaScript em texto para salvar.
     ------------------------------------------------------------------------- */
  salvar(nomeColecao, lista) {
    localStorage.setItem(this.chaveCompleta(nomeColecao), JSON.stringify(lista));
  },

  /* -------------------------------------------------------------------------
     incluir(nomeColecao, registro)
     Adiciona UM novo registro à coleção.
     - Gera um id único (função gerarId abaixo)
     - Grava as datas de criação/atualização automaticamente
     Retorna o registro já com o id preenchido.
     ------------------------------------------------------------------------- */
  incluir(nomeColecao, registro) {
    const lista = this.listar(nomeColecao);        // pega a lista atual
    const novo = {
      ...registro,                                // copia os campos recebidos
      id: this.gerarId(),                          // adiciona o id único
      criadoEm: new Date().toISOString(),         // data de criação
      atualizadoEm: new Date().toISOString(),     // última atualização
    };
    lista.push(novo);                              // adiciona ao final da lista
    this.salvar(nomeColecao, lista);               // grava tudo de volta
    return novo;                                   // devolve o registro criado
  },

  /* -------------------------------------------------------------------------
     atualizar(nomeColecao, id, dadosNovos)
     Altera um registro existente, mantendo o id e a data de criação.
     Retorna o registro atualizado, ou null se o id não for encontrado.
     ------------------------------------------------------------------------- */
  atualizar(nomeColecao, id, dadosNovos) {
    const lista = this.listar(nomeColecao);
    const indice = lista.findIndex((item) => item.id === id); // acha a posição
    if (indice === -1) return null;                 // não encontrou: sai

    // Mescla o antigo com o novo e atualiza a data de modificação
    lista[indice] = {
      ...lista[indice],
      ...dadosNovos,
      id: id,                                       // o id nunca muda
      atualizadoEm: new Date().toISOString(),
    };
    this.salvar(nomeColecao, lista);
    return lista[indice];
  },

  /* -------------------------------------------------------------------------
     remover(nomeColecao, id)
     Apaga um registro pelo id. Retorna true se apagou, false se não achou.
     ------------------------------------------------------------------------- */
  remover(nomeColecao, id) {
    const lista = this.listar(nomeColecao);
    const novaLista = lista.filter((item) => item.id !== id); // fica todo mundo menos ele
    if (novaLista.length === lista.length) return false;       // nada foi removido
    this.salvar(nomeColecao, novaLista);
    return true;
  },

  /* -------------------------------------------------------------------------
     limparTudo()
     Apaga TODAS as coleções do sistema (uso restrito à tela administrativa).
     Percorre cada coleção conhecida e remove a chave do localStorage.
     ------------------------------------------------------------------------- */
  limparTudo() {
    ["eletivas", "alunos", "matriculas", "config"].forEach((colecao) =>
      localStorage.removeItem(this.chaveCompleta(colecao))
    );
  },

  /* -------------------------------------------------------------------------
     marcadorSeeded() / marcarComoSeeded()
     Controla se os "dados de exemplo" já foram carregados uma vez.
     Assim o sistema não recarrega os exemplos toda vez que abre.
     ------------------------------------------------------------------------- */
  marcadorSeeded() {
    return localStorage.getItem(this.chaveCompleta("config")) !== null;
  },
  marcarComoSeeded() {
    localStorage.setItem(this.chaveCompleta("config"), JSON.stringify({
      dadosExemploCarregados: true,
      marcadoEm: new Date().toISOString(),
    }));
  },

  /* -------------------------------------------------------------------------
     gerarId()
     Cria um identificador único para cada registro.
     Combina a hora atual em milissegundos com um número aleatório,
     formatado em base 36 (letras + números) para ficar curto.
     ------------------------------------------------------------------------- */
  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
};

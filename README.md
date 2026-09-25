# 📘 Sistema de Gestão de Eletivas — Novo Ensino Médio (Seduc/CE)

Sistema web completo para **cadastrar, consultar, editar e excluir as disciplinas eletivas** do novo Ensino Médio, além de **vincular os alunos** às eletivas (matrícula individual ou em lote) e **consultar o histórico do aluno por semestre**.

> Publicado via GitHub Pages: **https://paulohenriquemendes.github.io/sistema-eletivas-eemti/**

---

## 🔐 Acessos (credenciais)

| Perfil | E-mail | Senha | O que pode |
|---|---|---|---|
| **Secretaria** | `secretaria@escola.ce.gov.br` | `Secretaria@2026` | Tudo: cadastrar, editar, excluir, matricular, backup |
| **Professor** | `professor@escola.ce.gov.br` | `Professor@2026` | Somente consulta (eletivas, alunos, listas) |
| **Aluno** | `aluno@escola.ce.gov.br` | `Aluno@2026` | Somente consulta (eletivas e histórico) |

Para trocar as credenciais, edite a lista `CONFIG.CREDENCIAIS` no arquivo **`js/config.js`**.

---

## ✨ Funcionalidades

- **Eletivas (CRUD completo)**: cadastro com nome, professor, área do conhecimento, semestre (ex.: 2026.1 / 2026.2), carga horária, horário, local, vagas, status e ementa. Busca e filtro por semestre.
- **Base de alunos (CRUD)**: cadastro individual e **importação em lote** (cole a lista, um por linha: `Nome;matrícula;turma`).
- **Matrículas**: vincule um aluno individualmente ou **marque vários de uma vez** na mesma eletiva. Controle de **vagas** e bloqueio de **matrícula duplicada**.
- **Histórico por semestre**: consulte quais eletivas o aluno fez em cada semestre do percurso escolar.
- **Lista de chamada** por eletiva, com exportação **CSV** (Excel).
- **Painel** com estatísticas gerais.
- **Login com perfis** e controle de permissões (secretaria edita; professor e aluno só consultam).
- **Backup e restauração** dos dados em arquivo JSON, e dados de exemplo para explorar o sistema.

---

## 🎨 Identidade visual

Paleta em tons de **azul-marinho** com destaques em **amarelo** e neutros em cinza, definida no topo do `css/styles.css` como variáveis CSS:

| Uso | Cor |
|---|---|
| Cor principal (azul-marinho) | `#1D3D7D` |
| Azul escuro (hover) | `#142B5C` |
| Fundo azul suave | `#EAF0FB` |
| Amarelo de destaque | `#FFC94D` |
| Cinza de fundo/texto | `#F4F5F8` / `#64748B` |

Para mudar a cor do sistema inteiro, basta alterar essas variáveis.

---

## 📁 Estrutura do projeto

```
index.html          → estrutura das telas (login + painel)
css/
  styles.css        → todo o visual (variáveis de cor no topo)
js/
  config.js         → credenciais, permissões e listas (áreas, turnos, status)
  storage.js        → camada de dados: ÚNICO arquivo que salva no navegador
  auth.js           → login/logout e permissões por perfil
  models.js         → entidades e REGRAS DE NEGÓCIO (validações, vagas, duplicidade)
  ui.js             → utilitários de interface (notificações, modais, CSV)
  views/
    login.js        → tela de entrada
    dashboard.js    → painel com estatísticas
    eletivas.js     → CRUD de eletivas
    alunos.js       → base de alunos + importação em lote
    matriculas.js   → vínculo aluno ↔ eletiva (individual e lote)
    relatorios.js   → histórico por semestre + listas de chamada
    admin.js        → backup, restauração, dados de exemplo, limpeza
  app.js            → roteador das telas (carregado por último)
```

**Todos os arquivos estão comentados linha a linha em português** para facilitar manutenção futura.

---

## 🛠️ Como funciona por dentro (arquitetura)

- **SPA (Single Page Application)**: é uma única página que troca de tela pelo hash da URL (`#/eletivas`, `#/alunos`...), sem recarregar.
- **Separação de responsabilidades** (metodologia MVC simplificada):
  - `views/` = o que o usuário vê;
  - `models.js` = regras de negócio e validações;
  - `storage.js` = persistência (padrão *Repository*).
- **Persistência**: os dados são salvos no **localStorage do navegador**. Cada máquina tem seu próprio "banco". Use **Gerenciar dados → Exportar backup** para transferir dados entre computadores ou guardar cópia de segurança.
- **Controle de acesso**: o perfil logado decide o menu e se os botões de edição aparecem (`Auth.podeEditar()`).

### Regras de negócio implementadas

1. Não é possível criar duas eletivas com o mesmo nome no mesmo semestre.
2. Número de matrícula do aluno é único.
3. Aluno não pode ser matriculado duas vezes na mesma eletiva.
4. Respeita o limite de **vagas** de cada eletiva.
5. Não é possível excluir eletiva com alunos matriculados, nem aluno com matrículas ativas (integridade).
6. O **semestre** é gravado na matrícula, permitindo o histórico por período.

---

## ✏️ Como editar e publicar

O site é publicado pelo **GitHub Pages** a partir da branch `main`. Qualquer alteração enviada (commit) para esse repositório atualiza o site automaticamente em poucos minutos.

1. Edite os arquivos (cores em `css/styles.css`, credenciais em `js/config.js`, telas em `js/views/`).
2. Faça commit e push para a branch `main`.
3. Pronto: o GitHub Pages publica a nova versão.

---

## 💻 Tecnologias

HTML5, CSS3 e JavaScript puro (sem frameworks ou dependências) — roda 100% no navegador, inclusive no celular.

# ⚔️ Wurm Online — A Guilda Achievements Codex & Tracker

Sistema oficial de rastreamento, categorização, Journal de metas e rankings de Conquistas (Achievements) para os membros de **A Guilda** no Wurm Online.

---

## 🚀 Como Conectar seu Personagem (3 Passos)

1. **Baixe o pacote:** Baixe o arquivo `Wurm-Guilda-Tracker.zip`.
2. **Execute o instalador:** Extraia os arquivos e dê dois cliques em `Instalar-Guilda-Tracker.bat`.
   - O instalador detecta a pasta do seu Wurm na Steam automaticamente (em qualquer disco).
   - Ele cria um atalho seguro na sua Área de Trabalho: `Wurm Online (Guilda Tracker)`.
3. **Jogue normalmente:** Abra o jogo pela Steam. Ao abrir a janela de Conquistas (*Tools -> Achievements*), seus dados são registrados e sincronizados na hora.

---

## 🛡️ Transparência & Segurança (O que cada arquivo faz?)

- **`wurm_achievements.jar` (~800 KB):**
  Agente oficial Java (`-javaagent`) passivo. Apenas escuta os pacotes oficiais de conquistas que o servidor envia para a sua tela e gera um arquivo de texto local (`.json`). **Não altera mecânicas do jogo, não dá vantagens (não é bot nem hack) e não acessa senhas nem arquivos pessoais.**
- **`Instalar-Guilda-Tracker.bat`:**
  Script em lote transparente que apenas localiza a pasta do Wurm e cria o atalho no Desktop.
- **Preciso instalar o Java?**
  **Não!** O Wurm Online já inclui o Java 21 oficial da desenvolvedora dentro da pasta do jogo (`runtime\bin\java.exe`).

---

## 🌐 Ecossistema A Guilda
Integrado aos demais portais da guilda:
- [Portal Geral](https://wurm-aguild-site.pages.dev)
- [Mineração Optimizer](https://wurm-mining-tool.pages.dev)
- [Receitas](https://wurm-recipe-tool.pages.dev)
- [Liturgy](https://wurm-liturgy.pages.dev)
- [Leilões](https://wurm-auction-helper.pages.dev)
- [Badges](https://wurm-aguilda-badges.pages.dev)

const fs = require('fs');
const path = require('path');

// 1. Load existing rich entries
let existingDB = {};
try {
  existingDB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'existing_db.json'), 'utf8'));
} catch (e) {
  console.log('No existing_db.json found, starting fresh');
}

// 2. Load Wiki Text
const wikiPath = 'C:/Users/Metalgear/.gemini/antigravity/brain/96cca567-5c6e-4b77-acb2-b5d433a8bc57/achievements_wiki.txt';
const wikiText = fs.readFileSync(wikiPath, 'utf8');

// 3. Load Player In-Game Achievements Dump
const jotaPath = path.join(__dirname, '..', 'achievements_jotasiete.json');
const jotaData = JSON.parse(fs.readFileSync(jotaPath, 'utf8'));

// Helper to clean wiki text
function cleanWiki(str) {
  if (!str) return '';
  return str
    .replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/^\|\s*/, '')
    .replace(/\s*\|$/, '')
    .trim();
}

// Parse Wiki Tables
const wikiEntries = [];
const lines = wikiText.split('\n');
let currentSection = 'General';

for (let line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('===')) {
    currentSection = trimmed.replace(/=/g, '').trim();
  } else if (trimmed.startsWith('==')) {
    currentSection = trimmed.replace(/=/g, '').trim();
  } else if (trimmed.includes('||')) {
    const rawParts = trimmed.split('||');
    const parts = rawParts.map(p => cleanWiki(p));
    if (parts.length >= 2) {
      const name = parts[0];
      if (name && name !== 'Achievement' && !name.startsWith('{') && !name.startsWith('!')) {
        let desc = '', rarity = 'Silver', howTo = '';
        if (currentSection.toLowerCase().includes('goals')) {
          howTo = parts[1] || '';
          rarity = 'Silver';
        } else if (parts.length === 2) {
          howTo = parts[1];
        } else if (parts.length === 3) {
          desc = parts[1];
          howTo = parts[2];
        } else if (parts.length >= 4) {
          desc = parts[1];
          rarity = parts[2] || 'Silver';
          howTo = parts[3];
        }
        wikiEntries.push({
          section: currentSection,
          name: name.replace(/^"(.*)"$/, '$1'),
          description: desc,
          rarity: rarity,
          howTo: howTo
        });
      }
    }
  }
}

console.log(`Parsed ${wikiEntries.length} entries from Wurmpedia.`);

// Translation and categorization dictionary
const TRANSLATIONS = {
  // Metals & Crafting
  "actions performed": { ptName: "Ações Realizadas", cat: "work", icon: "📦", label: "Trabalho & Produção", meaning: "Contador mestre de todas as interações e ações produtivas executadas pelo personagem no mundo." },
  "improve": { ptName: "Melhorar Item", cat: "work", icon: "🔨", label: "Forja & Carpintaria", meaning: "Aprimoramento bem-sucedido de qualidade de um item usando ferramentas adequadas." },
  "oops, that went wrong": { ptName: "Opa, Deu Ruim!", cat: "work", icon: "💥", label: "Forja & Trabalho", meaning: "Falha ao tentar melhorar um item (perda de qualidade ou quebra sem sucesso)." },
  "good work": { ptName: "Bom Trabalho", cat: "work", icon: "✨", label: "Forja & Artesanato", meaning: "Sucesso magistral ao elevar a qualidade de um item além do nível da sua própria perícia atual." },
  "exceptional craftsman": { ptName: "Artesão Excepcional", cat: "work", icon: "🌟", label: "Forja & Qualidade", meaning: "Melhorou com maestria um item de qualidade inferior a 50 para qualidade superior a 50.00." },
  "exceptional craftsmen": { ptName: "Artesão Excepcional", cat: "work", icon: "🌟", label: "Forja & Qualidade", meaning: "Melhorou com maestria um item de qualidade inferior a 50 para qualidade superior a 50.00." },
  "pursuit of excellence": { ptName: "Busca pela Excelência", cat: "work", icon: "💎", label: "Forja & Qualidade", meaning: "Aprimorou a qualidade de um item para além de 70.00, demonstrando alto grau de domínio técnico." },
  "on the path to perfection": { ptName: "No Caminho da Perfeição", cat: "work", icon: "👑", label: "Forja & Qualidade", meaning: "Atingiu um dos patamares mais altos da manufatura, melhorando um item acima de 90.00 QL!" },
  "perfection": { ptName: "Perfeição Absoluta", cat: "work", icon: "💎", label: "Forja Suprema", meaning: "Alcançou o ápice máximo da manufatura em Wurm Online com um item de 99.00 de Qualidade!" },
  "almost impossible": { ptName: "Quase Impossível", cat: "work", icon: "💎", label: "Forja Suprema", meaning: "Criou um Item Fantástico (Fantastic Item), façanha de raridade lendária do servidor." },
  "supreme being": { ptName: "Ser Supremo", cat: "work", icon: "🥇", label: "Forja Rara", meaning: "Criou um Item Supremo (Supreme Item), imbuído de poder cósmico." },
  "really rare": { ptName: "Realmente Raro", cat: "work", icon: "🥈", label: "Forja Rara", meaning: "Criou com sucesso um item com a condição especial de Raro (Rare Item)." },
  "rarity": { ptName: "Raridade do Servidor", cat: "work", icon: "🥈", label: "Forja Recorde", meaning: "Melhorou um item além do recorde máximo anterior registrado em todo o servidor." },
  "bugged rarity": { ptName: "Raridade Legada", cat: "work", icon: "⚙️", label: "Histórico Wurm", meaning: "Conquistada durante o evento de correção de raridades do motor do jogo." },

  // Metals
  "iron item": { ptName: "Item de Ferro", cat: "work", icon: "⛓️", label: "Metalurgia Básica", meaning: "Forjou um item de ferro fundido, a base da infraestrutura humana em Wurm." },
  "silver item": { ptName: "Item de Prata", cat: "work", icon: "🪙", label: "Ourivesaria Nobre", meaning: "Forjou um item de prata nobre, ideal para recipientes mágicos e adornos." },
  "steel item": { ptName: "Item de Aço", cat: "work", icon: "⚔️", label: "Metalurgia Avançada", meaning: "Confeccionou um item forjado a partir de ligas de aço refinado." },
  "tin item": { ptName: "Item de Estanho", cat: "work", icon: "🥫", label: "Metalurgia & Ligas", meaning: "Manufaturou um item a partir de estanho refinado." },
  "electrum item": { ptName: "Item de Electrum", cat: "work", icon: "⚡", label: "Ourivesaria Especial", meaning: "Forjou uma peça a partir de Electrum, lendária liga mágica de ouro e prata." },
  "copper item": { ptName: "Item de Cobre", cat: "work", icon: "🧲", label: "Metalurgia & Ligas", meaning: "Forjou um item feito de cobre maciço." },
  "gold item": { ptName: "Item de Ouro", cat: "work", icon: "👑", label: "Ourivesaria Nobre", meaning: "Forjou uma relíquia de ouro puro, o metal solar de Wurm." },
  "zinc item": { ptName: "Item de Zinco", cat: "work", icon: "🔩", label: "Metalurgia & Ligas", meaning: "Criou um item feito de zinco, componente essencial para produção de latão." },
  "lead item": { ptName: "Item de Chumbo", cat: "work", icon: "⚓", label: "Metalurgia & Pesos", meaning: "Moldou um item pesado a partir de chumbo." },
  "brass item": { ptName: "Item de Latão", cat: "work", icon: "🎺", label: "Metalurgia de Ligas", meaning: "Fundiu e moldou um item feito da resistente liga de latão (cobre + zinco)." },
  "bronze item": { ptName: "Item de Bronze", cat: "work", icon: "🛡️", label: "Metalurgia Antiga", meaning: "Criou uma peça a partir do milenar bronze (cobre + estanho)." },
  "adamantine item": { ptName: "Item de Adamantina", cat: "work", icon: "🔮", label: "Metalurgia Lendária", meaning: "Forjou um item com Adamantina, um dos metais lunares mais densos e indestrutíveis." },
  "glimmersteel item": { ptName: "Item de Glimmersteel", cat: "work", icon: "✨", label: "Metalurgia Mística", meaning: "Confeccionou uma arma ou armadura do reluzente e etéreo Glimmersteel." },
  "seryll item": { ptName: "Item de Seryll", cat: "work", icon: "💠", label: "Metalurgia Celestial", meaning: "Forjou um item de Seryll, a lendária liga multicolorida criada no altar dos deuses." },

  // Items & Utilities
  "the tortoise": { ptName: "O Escudo Quelônio", cat: "work", icon: "🐢", label: "Forja & Armaduras", meaning: "Transformou o casco de uma tartaruga em um resistente escudo protetor." },
  "rack 'em up": { ptName: "Organização em Racks", cat: "work", icon: "🪵", label: "Carpintaria & Guarda", meaning: "Construiu racks de armazenamento para manter vilarejos e depósitos impecáveis." },
  "neat and tidy": { ptName: "Tudo em Ordem", cat: "work", icon: "🧹", label: "Organização", meaning: "Ajustou e limpou áreas com maestria para preservar a qualidade dos itens." },

  // Bridges & Construction
  "wood bridge maker": { ptName: "Construtor de Ponte de Madeira", cat: "work", icon: "🪵", label: "Construção de Pontes", meaning: "Concluiu integralmente a construção de uma ponte de madeira sobre rios ou vales." },
  "wooden bridge maker": { ptName: "Construtor de Ponte de Madeira", cat: "work", icon: "🪵", label: "Construção de Pontes", meaning: "Concluiu integralmente a construção de uma ponte de madeira sobre rios ou vales." },
  "stone bridge maker": { ptName: "Construtor de Ponte de Pedra", cat: "work", icon: "🧱", label: "Construção de Pontes", meaning: "Concluiu uma sólida ponte de blocos de cantaria de pedra." },
  "marble bridge maker": { ptName: "Construtor de Ponte de Mármore", cat: "work", icon: "🏛️", label: "Construção de Pontes", meaning: "Concluiu uma magnífica e reluzente ponte inteiramente feita de mármore nobre." },
  "rope bridge maker": { ptName: "Construtor de Ponte de Corda", cat: "work", icon: "🪢", label: "Construção de Pontes", meaning: "Completou a estrutura de uma ponte pênsil de cordas sobre o desfiladeiro." },
  "master bridgebuilder": { ptName: "Mestre Construtor de Pontes", cat: "work", icon: "🌉", label: "Engenharia Civil", meaning: "Ergueu pelo menos uma ponte completa de cada tipo de material existente no mundo!" },
  "tower builder": { ptName: "Construtor de Torres", cat: "work", icon: "🏰", label: "Alvenaria Militar", meaning: "Construiu uma torre de guarda (guard tower) para vigiar e defender o território." },
  "settler": { ptName: "Colonizador", cat: "work", icon: "🏠", label: "Construção Habitacional", meaning: "Completou a última parede da sua residência, estabelecendo um lar no mundo." },
  "well maker": { ptName: "Mestre dos Poços", cat: "work", icon: "💧", label: "Engenharia Hídrica", meaning: "Encontrou uma nascente de água pura no solo e construiu um poço artesiano funcional." },
  "janitor": { ptName: "Zelador das Estruturas", cat: "work", icon: "🧹", label: "Manutenção", meaning: "Reparou 50 cercas, pisos ou paredes deterioradas pelas intempéries do tempo." },
  "environment improval engineer": { ptName: "Engenheiro de Conservação", cat: "work", icon: "🛠️", label: "Manutenção Avançada", meaning: "Reparou 250 cercas, pisos ou paredes restaurando a integridade das vilas." },
  "decay removal services": { ptName: "Serviços de Manutenção", cat: "work", icon: "🛠️", label: "Manutenção Perita", meaning: "Reparou 1.250 estruturas, mantendo assentamentos inteiros protegidos da ruína." },
  "sisyphus says hello": { ptName: "O Fardo de Sísifo", cat: "work", icon: "🗿", label: "Restauração Épica", meaning: "Reparou incríveis 6.250 estruturas! Um monumento à paciência e persistência." },
  "cleanup operation": { ptName: "Operação de Limpeza", cat: "work", icon: "🗑️", label: "Reciclagem", meaning: "Destinou 100 itens obsoletos para decomposição em lixeiras de assentamento." },
  "enviromental hero": { ptName: "Herói Ecológico", cat: "work", icon: "♻️", label: "Preservação Mundial", meaning: "Descartou 10.000 itens descartáveis em recipientes de lixo, mantendo Wurm limpo!" },

  // Forestry, Digging, Gems
  "tree hugger": { ptName: "Amante das Árvores", cat: "work", icon: "🌱", label: "Silvicultura", meaning: "Plantou com sucesso 200 brotos de árvores para reflorestar o mapa." },
  "fo's favorite": { ptName: "Favorito de Fo", cat: "work", icon: "🌳", label: "Silvicultura Sagrada", meaning: "Plantou 1.000 árvores, tornando-se querido pelos deuses da natureza." },
  "fo's favourite": { ptName: "Favorito de Fo", cat: "work", icon: "🌳", label: "Silvicultura Sagrada", meaning: "Plantou 1.000 árvores, tornando-se querido pelos deuses da natureza." },
  "johnny appleseed": { ptName: "Semeador de Florestas", cat: "work", icon: "🌲", label: "Silvicultura Mestre", meaning: "Plantou 5.000 árvores! Sua dedicação restaurou ecossistemas inteiros." },
  "deforestation": { ptName: "Desmatamento", cat: "work", icon: "🪓", label: "Corte de Madeira", meaning: "Derrubou 1.000 árvores para alimentar fornalhas e obras de engenharia." },
  "paul bunyan": { ptName: "Lenhador Lendário", cat: "work", icon: "🪓", label: "Silvicultura Pesada", meaning: "Derrubou 5.000 árvores, ombreando com os maiores lenhadores da história." },
  "almost as good as an axe": { ptName: "Improvisador da Mata", cat: "work", icon: "🪓", label: "Corte Rústico", meaning: "Derrubou uma árvore madura sem usar machado, demonstrando pura determinação." },
  "bumble bee": { ptName: "Abelhudo Jardineiro", cat: "work", icon: "🐝", label: "Botânica & Paisagismo", meaning: "Plantou 500 flores ornamentais perfumando e embelezando os campos." },
  "hedgehog": { ptName: "Mestre das Cercas-Vivas", cat: "work", icon: "🌿", label: "Jardinagem", meaning: "Plantou 200 cercas-vivas ou canteiros delimitando caminhos e vilas." },
  "hippie": { ptName: "Poder das Flores", cat: "work", icon: "🌸", label: "Botânica", meaning: "Plantou 100 flores espalhando cor pela natureza." },
  "truffle pig": { ptName: "Caçador de Cogumelos", cat: "work", icon: "🍄", label: "Coleta Silvestre", meaning: "Colheu 20 cogumelos selvagens pela floresta úmida." },
  "forest dweller": { ptName: "Habitante da Floresta", cat: "work", icon: "🍄", label: "Coleta Silvestre", meaning: "Colheu cogumelos na mata fechada." },

  // Mining, Digging, Archaeology
  "gold digger": { ptName: "Garimpeiro de Ouro", cat: "work", icon: "⛏️", label: "Mineração Profunda", meaning: "Extraiu minério de ouro puro das entranhas rochosas da montanha." },
  "brilliant!": { ptName: "Gema Brilhante!", cat: "work", icon: "💎", label: "Mineração de Gemas", meaning: "Minerou ou escavou uma gema preciosa de altíssima pureza (90+ QL)." },
  "exquisite gem": { ptName: "Gema Requintada", cat: "work", icon: "💎", label: "Mineração Preciosa", meaning: "Encontrou uma pedra preciosa de formato e lapidação singulares." },
  "gravedigger": { ptName: "Coveiro Solene", cat: "survival", icon: "⚰️", label: "Sepultamento", meaning: "Enterrou os restos mortais de uma criatura ou jogador falecido, dando-lhe repouso." },
  "undertaker": { ptName: "Agente Funerário", cat: "survival", icon: "⚰️", label: "Sepultamento Mestre", meaning: "Sepultou 100 cadáveres, limpando o campo de batalha da putrefação." },
  "fragmental": { ptName: "Restaurador de Relíquias", cat: "work", icon: "🏺", label: "Arqueologia", meaning: "Reconstruiu uma ferramenta antiga unindo fragmentos escavados do passado." },
  "careful identifier": { ptName: "Identificador Cuidadoso", cat: "work", icon: "🔍", label: "Arqueologia Fina", meaning: "Limpou e identificou perfeitamente 50 fragmentos arqueológicos históricos." },
  "talented investigator": { ptName: "Investigador Talentoso", cat: "work", icon: "🔍", label: "Arqueologia", meaning: "Investigou e escavou 50 fragmentos históricos preservados pela terra." },
  "rarity discovered": { ptName: "Raridade Arqueológica", cat: "work", icon: "📜", label: "Arqueologia Rara", meaning: "Descobriu um fragmento arqueológico de raridade excepcional." },
  "rarity discoverer": { ptName: "Descobridor de Raridades", cat: "work", icon: "📜", label: "Arqueologia Rara", meaning: "Identificou peças raras dos séculos passados no subsolo." },
  "statue bro?": { ptName: "Mestre das Estátuas Antigas", cat: "work", icon: "🗿", label: "Arqueologia Magistral", meaning: "Reconstruiu uma gigantesca estátua milenar peça por peça com maestria." },
  "maskter of recreation": { ptName: "Mestre das Máscaras", cat: "work", icon: "🎭", label: "Arqueologia Rara", meaning: "Reconstituiu com perfeição uma máscara cerimonial ancestral a partir de fragmentos." },
  "master of recreation": { ptName: "Mestre da Reconstituição", cat: "work", icon: "🏺", label: "Arqueologia de Elite", meaning: "Reconstruiu dezenas de artefatos arqueológicos completos." },
  "shaking the foundations of the earth": { ptName: "Abalador das Profundezas", cat: "work", icon: "💥", label: "Engenharia de Minas", meaning: "Derrubou 5 entradas de mina antigas utilizando orbes de tremor (shaker orbs)." },

  // Boats & Navigation
  "knarr sailor": { ptName: "Comandante de Knarr", cat: "sailing", icon: "⛵", label: "Náutica & Navegação", meaning: "Capitaneou um cargueiro nórdico Knarr, o navio comercial mais confiável dos mares." },
  "corbita sailor": { ptName: "Comandante de Corbita", cat: "sailing", icon: "⛵", label: "Náutica & Navegação", meaning: "Comandou uma Corbita mercantil, verdadeiro navio de transporte do Mediterrâneo." },
  "caravel sailor": { ptName: "Comandante de Caravela", cat: "sailing", icon: "⛵", label: "Náutica & Navegação", meaning: "Navegou em águas profundas comandando uma rápida e imponente Caravela." },
  "cog sailor": { ptName: "Comandante de Cog", cat: "sailing", icon: "⛵", label: "Náutica & Navegação", meaning: "Comandou uma nau Cog com seus altos bordos de proteção medieval." },
  "rowboat sailor": { ptName: "Remador de Bote", cat: "sailing", icon: "🚣", label: "Náutica Fluvial", meaning: "Comandou um bote a remo desbravando rios e costas costeiras." },
  "sailboat sailor": { ptName: "Velejador Costeiro", cat: "sailing", icon: "⛵", label: "Náutica Leve", meaning: "Conduziu um pequeno barco a vela pegando os ventos litorâneos." },
  "crude canoe sailor": { ptName: "Canoeiro Rústico", cat: "sailing", icon: "🛶", label: "Náutica Primitiva", meaning: "Conduziu uma frágil canoa de tronco escavado, desafiando a gravidade aquática!" },
  "knarr maker": { ptName: "Construtor de Knarr", cat: "work", icon: "🛠️", label: "Construção Naval", meaning: "Completou a construção do casco e velame de um navio cargueiro Knarr." },
  "corbita maker": { ptName: "Construtor de Corbita", cat: "work", icon: "🛠️", label: "Construção Naval", meaning: "Finalizou a montagem de um imponente cargueiro Corbita." },
  "caravel maker": { ptName: "Construtor de Caravela", cat: "work", icon: "🛠️", label: "Construção Naval", meaning: "Concluiu a elaborada engenharia naval de uma Caravela dos oceanos." },
  "cog maker": { ptName: "Construtor de Cog", cat: "work", icon: "🛠️", label: "Construção Naval", meaning: "Finalizou a construção naval de uma robusta embarcação Cog." },
  "rowboat maker": { ptName: "Construtor de Bote", cat: "work", icon: "🪵", label: "Construção Naval", meaning: "Terminou de talhar e selar as tábuas de um bote a remos." },
  "sailboat maker": { ptName: "Construtor de Veleiro", cat: "work", icon: "🛠️", label: "Construção Naval", meaning: "Completou a manufatura das cavernas e mastro de um barco a vela." },
  "crude canoe maker": { ptName: "Construtor de Canoa", cat: "work", icon: "🛶", label: "Construção Naval", meaning: "Escavou um tronco e fabricou uma canoa simples e funcional." },
  "cap'n": { ptName: "Capitão dos Mares", cat: "sailing", icon: "⚓", label: "Náutica Suprema", meaning: "Comandou todos os tipos e classes de embarcações existentes em Wurm Online!" },
  "chief mate": { ptName: "Primeiro Imediato", cat: "sailing", icon: "⚓", label: "Náutica & Embarques", meaning: "Embarcou inúmeras vezes em navios como tripulante e timoneiro de confiança." },
  "out at sea": { ptName: "Em Alto Mar", cat: "sailing", icon: "🌊", label: "Navegação Oceânica", meaning: "Navegou longe da vista da terra firme adentrando águas oceânicas profundas." },
  "drunken sailor": { ptName: "Marinheiro Embriagado", cat: "sailing", icon: "🍺", label: "Náutica Audaciosa", meaning: "Pilotou o leme de uma embarcação sob efeito visível de bebidas alcoólicas." },
  "angry sailor": { ptName: "Marinheiro Furioso", cat: "sailing", icon: "⚓", label: "Náutica & Duelo", meaning: "Confrontou e sobreviveu a encontros perigosos em alto mar." },
  "vynora commands you": { ptName: "Comandos de Vynora", cat: "sailing", icon: "🎣", label: "Pesca & Devoção", meaning: "Pescou 200 peixes, ouvindo os sussurros dos segredos das profundezas marinhas." },
  "the path of vynora": { ptName: "O Caminho de Vynora", cat: "sailing", icon: "🦈", label: "Pesca Mestre", meaning: "Capturou impressionantes 1.000 peixes nos mares e rios do mundo!" },
  "giant fish": { ptName: "O Monstro dos Mares", cat: "sailing", icon: "🦈", label: "Pesca Lendária", meaning: "Pescou um gigantesco tubarão de qualidade extraordinária nas profundezas." },

  // Mounts & Animals
  "animal care": { ptName: "Cuidado Animal", cat: "mounts", icon: "🥕", label: "Trato Animal", meaning: "Alimentou e cuidou com carinho de um animal sob sua proteção." },
  "horse whisperer": { ptName: "Encantador de Cavalos", cat: "mounts", icon: "🐴", label: "Montarias & Vínculo", meaning: "Acenou amigavelmente para um cavalo, demonstrando empatia pelas criaturas." },
  "cowboy": { ptName: "Vaqueiro do Sertão", cat: "mounts", icon: "🤠", label: "Montarias & Condução", meaning: "Montou a cavalo conduzindo simultaneamente uma manada de 3 touros bravos." },
  "last rope": { ptName: "Comitiva de Corda", cat: "mounts", icon: "🪢", label: "Condução Animal", meaning: "Conduziu 3 animais ao mesmo tempo amarrados por cordas." },
  "rider of the apocalypse": { ptName: "Cavaleiro do Apocalipse", cat: "mounts", icon: "🏇", label: "Cavalgada de Elite", meaning: "Cavalgou uma distância colossal ininterrupta de mais de 16 quilômetros!" },
  "sore bottom": { ptName: "Nádegas Doloridas", cat: "mounts", icon: "🐎", label: "Cavalgada Extensa", meaning: "Cavalgou por horas consecutivas precisando urgente de unguento de fazendeiro." },
  "brave knight": { ptName: "Cavaleiro Audaz", cat: "mounts", icon: "🏇", label: "Montaria Nobre", meaning: "Cavalgou montado em um cavalo pelas planícies do reino." },
  "faux knight": { ptName: "Cavaleiro Caipira", cat: "mounts", icon: "🐄", label: "Montaria Cômica", meaning: "Montou e cavalgou nas costas de uma vaca!" },
  "really brave knight": { ptName: "Cavaleiro Destemido", cat: "mounts", icon: "🐻", label: "Montaria Feroz", meaning: "Cavalgou montado no dorso de um temível urso pardo domado." },
  "man's best friend": { ptName: "Melhor Amigo do Homem", cat: "mounts", icon: "🐶", label: "Domesticação", meaning: "Domou uma criatura selvagem com sucesso usando paciência e oferendas." },
  "are you sure that's what animal husbandry means?": { ptName: "Cruzamento Animal", cat: "mounts", icon: "🐎", label: "Pecuária", meaning: "Cruzou e procriou animais domésticos em suas baias." },
  "it will only hurt for a little while...": { ptName: "Marca de Rebanho", cat: "mounts", icon: "🔥", label: "Pecuária", meaning: "Marcou um animal com ferro em brasa para registrar sua posse na vila." },

  // Carts & Logistics
  "hauler": { ptName: "Transportador de Carga", cat: "work", icon: "🛒", label: "Logística", meaning: "Puxou manualmente uma carroça pesada por mais de 250 ladrilhos de estrada." },
  "moved a mountain": { ptName: "Moveu uma Montanha", cat: "work", icon: "🛒", label: "Transporte Pesado", meaning: "Transportou toneladas de rocha e materiais em comboios de carroças." },
  "trucker": { ptName: "Caminhoneiro do Wurm", cat: "work", icon: "🛒", label: "Logística de Longa Distância", meaning: "Conduziu uma grande carroça como comandante por estradas continentais." },
  "joyrider": { ptName: "Passeio de Carona", cat: "exploration", icon: "🛒", label: "Viagem em Grupo", meaning: "Viajou confortavelmente como passageiro de uma carroça por 4.000 ladrilhos." },
  "irresponsible driving": { ptName: "Direção Perigosa", cat: "exploration", icon: "🍷", label: "Condução Imprudente", meaning: "Assumiu o controle de uma carroça em velocidade sob estado de embriaguez." },
  "dead end": { ptName: "Fim da Linha", cat: "survival", icon: "💀", label: "Acidente Viário", meaning: "Encontrou a morte trágica durante a condução de um veículo ou carroça." },
  "much bigger pockets": { ptName: "Bolsos Ampliados (Carreta Pequena)", cat: "work", icon: "🛒", label: "Carpintaria", meaning: "Construiu uma carroça pequena para transportar seus materiais." },
  "portable handbag": { ptName: "Bolsa Gigante (Grande Carroça)", cat: "work", icon: "🛒", label: "Carpintaria", meaning: "Concluiu a manufatura de uma carroça de carga pesada (large cart)." },

  // Monsters & Kill Counters
  "spiders killed": { ptName: "Aranhas Mortas", cat: "combat", icon: "🕷️", label: "Combate & Caça", meaning: "Abateu uma temível aranha gigante nas florestas ou cavernas escuras." },
  "arachnophile": { ptName: "Aracnofobia Reversa", cat: "combat", icon: "🕷️", label: "Extermínio de Pragas", meaning: "Exterminou uma centena de aranhas gigantes sem demonstrar qualquer hesitação." },
  "honey, guess what's for dinner!": { ptName: "Querida, Adivinha o Jantar!", cat: "combat", icon: "🕷️", label: "Genocídio Aracnídeo", meaning: "Exterminou mais de 1.000 aranhas gigantes limpando territórios inteiros." },
  "my furry eight-legged friends": { ptName: "Amigos Peludos de Oito Patas", cat: "combat", icon: "🕷️", label: "Pesadelo das Aranhas", meaning: "Abateu mais de 2.000 aranhas! O maior pesadelo dos aracnídeos de Wurm." },
  "bug squisher": { ptName: "Esmagador de Insetos", cat: "combat", icon: "🕷️", label: "Combate Rápido", meaning: "Abateu uma gigantesca aranha colossal em combate direto." },
  "bear hunt": { ptName: "Caça ao Urso", cat: "combat", icon: "🐻", label: "Combate Silvestre", meaning: "Abateu com sucesso um poderoso urso das montanhas." },
  "bisons": { ptName: "Bisões Abatidos", cat: "combat", icon: "🦬", label: "Caça de Grande Porte", meaning: "Abateu um grande e pesado bisão das pradarias." },
  "bovine master": { ptName: "Mestre dos Bovinos", cat: "combat", icon: "🐂", label: "Combate Rural", meaning: "Abateu um touro enfurecido ou bovino feroz em duelo." },
  "kill the pig": { ptName: "Mata-Porco", cat: "combat", icon: "🐖", label: "Caça & Abastecimento", meaning: "Abateu um javali ou porco para abastecer a despensa de carne." },
  "bringing home the bacon": { ptName: "Trazendo o Bacon", cat: "combat", icon: "🥓", label: "Caça de Sobrevivência", meaning: "Abateu um porco garantindo alimento saboroso para a guilda." },
  "deer killed": { ptName: "Cervos Abatidos", cat: "combat", icon: "🦌", label: "Caça Rápida", meaning: "Abateu um cervo silvestre em disparada pelas matas." },
  "hunter apprentice": { ptName: "Aprendiz de Caçador", cat: "combat", icon: "🦌", label: "Caça Prática", meaning: "Abateu 20 cervos demonstrando pontaria e paciência de rastreamento." },
  "pheasant hunt": { ptName: "Caça ao Faisão", cat: "combat", icon: "🦃", label: "Caça Menor", meaning: "Abateu um faisão com precisão cirúrgica." },
  "hens killed": { ptName: "Galinhas Abatidas", cat: "combat", icon: "🐔", label: "Controle de Galinheiro", meaning: "Abateu galinhas no quintal ou na mata." },
  "out, out, brief candle!": { ptName: "Terror das Galinhas", cat: "combat", icon: "🐔", label: "Matança Avícola", meaning: "Abateu 10 galinhas assustadas." },
  "dog life": { ptName: "Vida de Cão", cat: "combat", icon: "🐕", label: "Combate Canino", meaning: "Pôs fim ao sofrimento de um cão selvagem ou sarnento." },
  "meoww!": { ptName: "Miau Feroz", cat: "combat", icon: "🐱", label: "Combate Selvagem", meaning: "Enfrentou e abateu um gato selvagem ágil das matas." },
  "rrreoww!": { ptName: "Rugido da Montanha", cat: "combat", icon: "🦁", label: "Combate Selvagem", meaning: "Derrotou um poderoso leão da montanha em combate corpo a corpo." },
  "rat race": { ptName: "Corrida dos Ratos", cat: "combat", icon: "🐀", label: "Controle de Pragas", meaning: "Eliminou ratos pestilentos de armazéns e esgotos." },
  "debugger": { ptName: "Eliminador de Insetos das Cavernas", cat: "combat", icon: "🪲", label: "Combate Subterrâneo", meaning: "Matou um cave bug rastejante nas profundezas das minas." },
  "trolls killed": { ptName: "Trolls Mortos", cat: "combat", icon: "🧌", label: "Combate Brutal", meaning: "Abateu um monstruoso e sanguinário Troll das montanhas." },
  "no son of a troll": { ptName: "Sem Amor a Trolls", cat: "combat", icon: "🧌", label: "Genocídio Troll", meaning: "Abateu nada menos que 1.000 Trolls gigantescos!" },
  "trollslayer": { ptName: "Exterminador de Trolls", cat: "combat", icon: "🧌", label: "Combate Feroz", meaning: "Eliminou um temível Troll em duelo." },
  "troll king assassination": { ptName: "Regicídio do Rei Troll", cat: "combat", icon: "👑", label: "Chefe Mundial", meaning: "Participou ativamente do combate fatal que aniquilou o lendário Troll King!" },
  "crocodiles killed": { ptName: "Crocodilos Mortos", cat: "combat", icon: "🐊", label: "Combate Anfíbio", meaning: "Abateu um crocodilo voraz nas águas turvas dos pântanos." },
  "tastes like chicken": { ptName: "Gosto de Frango", cat: "combat", icon: "🐊", label: "Caça de Pântano", meaning: "Abateu 20 crocodilos colhendo peles resistentes e carnes exóticas." },
  "crocodile dundee": { ptName: "Crocodilo Dundee", cat: "combat", icon: "🐊", label: "Lenda dos Pântanos", meaning: "Exterminou uma imensa quantidade de crocodilos monstruosos." },
  "wolves killed": { ptName: "Lobos Mortos", cat: "combat", icon: "🐺", label: "Combate Lupino", meaning: "Abateu um feroz lobo negro em combate mortal." },
  "dances with wolves": { ptName: "Dança com Lobos", cat: "combat", icon: "🐺", label: "Caça de Alcateia", meaning: "Eliminou 100 lobos selvagens protegendo suas terras." },
  "zombies killed": { ptName: "Zumbis Mortos", cat: "combat", icon: "🧟", label: "Extermínio Morto-Vivo", meaning: "Destruiu um zumbi pútrido reanimado por magia sombria." },
  "braaains": { ptName: "Céeeeerebros!", cat: "combat", icon: "🧟", label: "Combate aos Mortos-Vivos", meaning: "Eliminou 10 zumbis sem deixar nenhum membro intacto." },
  "zombie hunter": { ptName: "Caçador de Zumbis", cat: "combat", icon: "🧟", label: "Caçador das Sombras", meaning: "Abateu 50 zumbis em cemitérios e noites escuras." },
  "scrapion": { ptName: "Mata-Escorpião", cat: "combat", icon: "🦂", label: "Combate Venenoso", meaning: "Subjugou um temível escorpião gigante venenoso das areias e estepes." },
  "lava spiders killed": { ptName: "Aranhas de Lava Mortas", cat: "combat", icon: "🌋", label: "Combate Elemental", meaning: "Abateu uma infernal aranha de magma incandescente." },
  "lava fiends killed": { ptName: "Demônios de Lava Mortos", cat: "combat", icon: "🔥", label: "Combate Elemental", meaning: "Derrotou um demônio de fogo líquido nascente da terra vulcânica." },
  "fire extinguisher": { ptName: "Extintor Vulcânico", cat: "combat", icon: "🧯", label: "Caça do Fogo", meaning: "Exterminou múltiplas criaturas vulcânicas (aranhas e demônios de lava)." },
  "no fuel for the flame of udun": { ptName: "Apagando as Chamas de Udûn", cat: "combat", icon: "🔥", label: "Genocídio do Fogo", meaning: "Abateu 100 demônios de lava em batalha!" },
  "you cannot pass": { ptName: "Você Não Vai Passar!", cat: "combat", icon: "🧙", label: "Combate Arcano", meaning: "Eliminou 20 demônios de lava em defesa de suas posições." },
  "demons": { ptName: "Demônios Abatidos", cat: "combat", icon: "👿", label: "Combate Abissal", meaning: "Abateu um temível demônio de Sol." },
  "all hell": { ptName: "Inferno Completo", cat: "combat", icon: "🔥", label: "Bestiário Infernal", meaning: "Abateu pelo menos um de cada monstro do submundo: Hell Scorpious, Hell Horse e Hell Hound!" },
  "hello goodbye": { ptName: "Olá e Adeus (Hell Scorpius)", cat: "combat", icon: "🦂", label: "Submundo", meaning: "Enfrentou e destruiu um terrível Hell Scorpius abissal." },
  "hellova fight": { ptName: "Luta Infernal (Hell Horse)", cat: "combat", icon: "🐎", label: "Submundo", meaning: "Derrubou em duelo o tenebroso cavalo de fogo do inferno." },
  "to hell with it": { ptName: "Para o Inferno! (Hell Hound)", cat: "combat", icon: "🐕", label: "Submundo", meaning: "Exterminou o feroz cão de caça dos abismos infernais." },

  // Rift Invasions
  "rift beasts": { ptName: "Bestas da Fenda", cat: "combat", icon: "🌀", label: "Invasores da Fenda", meaning: "Abateu uma bizarra e corrompida Besta transdimensional da Fenda." },
  "rift jackals": { ptName: "Chacais da Fenda", cat: "combat", icon: "🌀", label: "Invasores da Fenda", meaning: "Eliminou um ágil e voraz Chacal alienígena da Fenda." },
  "rift ogre": { ptName: "Ogro da Fenda", cat: "combat", icon: "🌀", label: "Invasores da Fenda", meaning: "Derrubou a força bruta e titânica de um Ogro da Fenda." },
  "rift warmaster": { ptName: "Mestre de Guerra da Fenda", cat: "combat", icon: "🌀", label: "Líderes da Fenda", meaning: "Venceu o combate mortal contra um dos comandantes da Fenda." },
  "rift specialist": { ptName: "Especialista da Fenda", cat: "combat", icon: "🌀", label: "Elite da Fenda", meaning: "Derrotou todas as diferentes estirpes de criaturas invasoras da Fenda." },
  "jackal hunter": { ptName: "Caçador de Chacais da Fenda", cat: "combat", icon: "🌀", label: "Defesa Dimensional", meaning: "Aniquilou dezenas de Chacais da Fenda em eventos de invasão." },
  "rift beast nemesis": { ptName: "Nêmesis das Bestas da Fenda", cat: "combat", icon: "🌀", label: "Defesa Dimensional", meaning: "Exterminou uma legião massiva de Bestas da Fenda." },
  "rift ogre hero": { ptName: "Herói contra Ogros da Fenda", cat: "combat", icon: "🌀", label: "Defesa Dimensional", meaning: "Herói consagrado por derrotar incontáveis Ogros colossais da Fenda." },
  "juggernaut's demise": { ptName: "Queda do Juggernaut", cat: "combat", icon: "💀", label: "Chefe da Fenda", meaning: "Aniquilou o colossal Juggernaut, máquina viva de guerra da Fenda." },
  "own the rift": { ptName: "Dono da Fenda", cat: "combat", icon: "🌌", label: "Conquista Cósmica", meaning: "Derrotou uma quantidade inacreditável de seres da Fenda Dimensional." },
  "shutting down": { ptName: "Fechamento da Fenda", cat: "epic", icon: "🌀", label: "Evento Cósmico", meaning: "Lutou bravamente na Fenda e esteve presente no instante de seu selamento." },
  "rift opener": { ptName: "Abridor da Fenda", cat: "epic", icon: "🩸", label: "Rituais Arcanos", meaning: "Sacrificou um Coração da Fenda no altar dimensional." },
  "investigating the rift": { ptName: "Investigando a Fenda", cat: "exploration", icon: "🧭", label: "Exploração Cósmica", meaning: "Atravessou o ladrilho central da Fenda antes de sua erupção total." },
  "die by the rift": { ptName: "Caído na Fenda", cat: "survival", icon: "💀", label: "Fenda Mortal", meaning: "Sucumbiu ao poder avassalador das forças dentro da área da Fenda." },
  "ghost of the rift warmasters": { ptName: "Assombração dos Mestres da Fenda", cat: "combat", icon: "👻", label: "Terror da Fenda", meaning: "Provocou terror e caos entre os maiores generais da Fenda." },
  "rift master": { ptName: "Mestre da Fenda", cat: "epic", icon: "🌀", label: "Grande Defensor", meaning: "Participou ativamente de uma grande incursão de fenda." },

  // Special Conditions & Bosses
  "slayer of the champ": { ptName: "Matador de Campeão", cat: "combat", icon: "🏆", label: "Combate de Elite", meaning: "Abateu uma criatura com a mutação de Campeão (Champion), status lendário de perigo." },
  "slayer of fiercity": { ptName: "Matador dos Ferozes", cat: "combat", icon: "💢", label: "Combate Feroz", meaning: "Abateu uma criatura com a condição especial de Feroz (Fierce)." },
  "slayer of the fiercity": { ptName: "Matador dos Ferozes", cat: "combat", icon: "💢", label: "Combate Feroz", meaning: "Abateu uma criatura com a condição especial de Feroz (Fierce)." },
  "slayer of procastination": { ptName: "Matador dos Lentos", cat: "combat", icon: "⏳", label: "Combate Especial", meaning: "Abateu uma criatura com a condição Slow (Lenta)." },
  "slayer of the lurker": { ptName: "Matador dos Emboscadores", cat: "combat", icon: "👁️", label: "Combate Furtivo", meaning: "Abateu uma criatura com a condição Lurking (Emboscadora)." },
  "slayer of the meek": { ptName: "Matador dos Covardes", cat: "combat", icon: "🐇", label: "Combate Especial", meaning: "Abateu uma criatura Scared (Assustada/Fugitiva)." },
  "slayer of the sly": { ptName: "Matador dos Sorrateiros", cat: "combat", icon: "🦊", label: "Combate Especial", meaning: "Abateu uma criatura Sly (Sorrateira e manhosa)." },
  "soilent green": { ptName: "Matador dos Esverdeados", cat: "combat", icon: "🍏", label: "Combate Tóxico", meaning: "Abateu uma criatura tóxica com a condição Greenish." },
  "speedfighter": { ptName: "Lutador Veloz", cat: "combat", icon: "⚡", label: "Combate Ágil", meaning: "Abateu uma criatura que possuía a condição Alert (Alerta e veloz)." },
  "speed fighter": { ptName: "Lutador Veloz", cat: "combat", icon: "⚡", label: "Combate Ágil", meaning: "Abateu uma criatura que possuía a condição Alert (Alerta e veloz)." },
  "silencer": { ptName: "Silenciador da Fúria", cat: "combat", icon: "🤫", label: "Pacificação", meaning: "Abateu uma perigosa criatura com a condição Raging (Enfurecida)." },
  "willbreaker": { ptName: "Quebrador de Vontades", cat: "combat", icon: "🔨", label: "Combate Pesado", meaning: "Abateu uma criatura de carapaça impenetrável com condição Hardened." },
  "becalmer": { ptName: "Pacificador de Feras", cat: "combat", icon: "🕊️", label: "Combate Especial", meaning: "Derrotou uma criatura irritada com a condição Angry." },
  "mercykiller": { ptName: "Golpe de Misericórdia", cat: "combat", icon: "🩹", label: "Combate Humanitário", meaning: "Abateu uma criatura doente e em sofrimento com condição Diseased." },
  "dragonslayer": { ptName: "Matador de Dragões", cat: "combat", icon: "🐉", label: "Lenda Suprema", meaning: "Lutou ativamente contra um Grande Dragão ancestral no instante de sua queda!" },
  "drakeslayer": { ptName: "Matador de Dragonetes", cat: "combat", icon: "🐲", label: "Caça a Dragões", meaning: "Abateu um dragão jovem (Drake/Hatchling) em combate feroz." },
  "drake spirits": { ptName: "Espíritos de Dragão", cat: "combat", icon: "👻", label: "Combate Sobrenatural", meaning: "Derrotou um etéreo Drake Spirit." },
  "sea mastership": { ptName: "Senhor da Serpente Marinha", cat: "combat", icon: "🐍", label: "Terror dos Oceanos", meaning: "Matou a lendária Sea Serpent que aterrorizava as rotas náuticas." },
  "moby dick": { ptName: "Moby Dick (Tubarão Colossal)", cat: "combat", icon: "🦈", label: "Monstro Oceânico", meaning: "Abateu o colossal tubarão gigante dos mares desconhecidos." },
  "one eyed snake": { ptName: "Matador do Ciclope", cat: "combat", icon: "👁️", label: "Monstro Mitológico", meaning: "Derrotou em combate mortal o temível Kyklops de um olho só." },
  "incarnated to hell": { ptName: "Banidor da Encarnação de Libila", cat: "combat", icon: "⚡", label: "Confronto Divino", meaning: "Baniu a avatar física da deusa sombria Libila de volta ao inferno." },
  "how many sons?": { ptName: "Quantos Filhos? (Son of Nogump)", cat: "combat", icon: "👹", label: "Combate Gigante", meaning: "Abateu em batalha um dos gigantescos Filhos de Nogump." },
  "uttacha spawn slayer": { ptName: "Matador da Cria de Uttacha", cat: "combat", icon: "🐙", label: "Monstro Abissal", meaning: "Abateu uma monstruosa Cria de Uttacha emergida do caos." },
  "unicorns killed": { ptName: "Unicórnios Abatidos", cat: "combat", icon: "🦄", label: "Caça Rara", meaning: "Abateu um lendário e mítico unicórnio das matas encantadas." },
  "tears of the unicorn": { ptName: "Lágrimas de Unicórnio", cat: "combat", icon: "🦄", label: "Perdição da Beleza", meaning: "Abateu 100 unicórnios, tornando-se o ceifador da pureza e da luz." },
  "death comes crawling": { ptName: "A Morte Rasteja (Deathcrawler)", cat: "combat", icon: "🕷️", label: "Minion Mortal", meaning: "Abateu um lacaio da rainha Deathcrawler." },
  "goblin slayer": { ptName: "Matador de Goblins", cat: "combat", icon: "👺", label: "Combate Humanoide", meaning: "Abateu um goblin invasor de acampamentos." },
  "goblin leadership": { ptName: "Fim da Liderança Goblin", cat: "combat", icon: "👺", label: "Chefe Goblin", meaning: "Abateu o astuto e brutal líder dos clãs goblins." },

  // PvP & Dueling
  "kingdom infiltration": { ptName: "Infiltração no Reino Inimigo", cat: "combat", icon: "⚔️", label: "PvP & Guerra", meaning: "Abateu um soldado ou criatura leal a um reino inimigo hostil." },
  "settlement assault": { ptName: "Assalto ao Assentamento", cat: "combat", icon: "⚔️", label: "Cerco & Invasão", meaning: "Eliminou um temível Espírito Templário de guarda em vila inimiga." },
  "miner on strike": { ptName: "Mineiro em Greve (Picareta)", cat: "combat", icon: "⛏️", label: "PvP Letal", meaning: "Abateu outro jogador em combate armado apenas com uma picareta de mina!" },
  "axe kill": { ptName: "Golpe de Machado Fatal", cat: "combat", icon: "🪓", label: "PvP & Combate", meaning: "Eliminou um adversário desferindo o golpe final com qualquer machado de guerra." },
  "maul kill": { ptName: "Esmagamento por Malho", cat: "combat", icon: "🔨", label: "PvP & Combate", meaning: "Esmagou as defesas inimigas desferindo golpe fatal com um malho de duas mãos." },
  "headsman": { ptName: "Carrasco Decapitador", cat: "combat", icon: "🪓", label: "PvP & Duelos", meaning: "Especialista em resolver desavenças com a lâmina afiada de machados de batalha." },
  "finish him!": { ptName: "Sem Piedade! (Fatality)", cat: "combat", icon: "⚔️", label: "Combate Despiadado", meaning: "Nenhuma misericórdia foi concedida ao adversário no encerramento da batalha." },
  "just killed a man": { ptName: "Duelo Mortal", cat: "combat", icon: "⚔️", label: "Duelos", meaning: "Venceu um combate mortal direto contra outro ser humano." },
  "backstabber": { ptName: "Apunhalada pelas Costas", cat: "combat", icon: "🗡️", label: "Táticas Traiçoeiras", meaning: "Derrotou um adversário atingindo-o pelas costas enquanto ele olhava para longe." },
  "be gentle please": { ptName: "Vitória em Spar", cat: "combat", icon: "🤺", label: "Treinamento Militar", meaning: "Venceu um combate amigável de treino (spar) contra outro colega de armas." },
  "brother in spars": { ptName: "Parceiro de Treinos", cat: "combat", icon: "🤺", label: "Treinamento Militar", meaning: "Participou de centenas de sessões de spar treinando soldados do reino." },
  "warrior": { ptName: "Guerreiro Reputado", cat: "combat", icon: "🎖️", label: "Classificação de Batalha", meaning: "Alcançou a prestigiosa marca de 1.100 pontos de Battle Rank (BR)." },
  "traitor": { ptName: "Traidor do Reino", cat: "combat", icon: "🗡️", label: "Infâmia", meaning: "Abateu um guarda do reino que estava apenas cumprindo seu dever cívico." },
  "ruler": { ptName: "Soberano de Facção", cat: "combat", icon: "👑", label: "Liderança Suprema", meaning: "Ascendeu ao posto máximo de Líder Supremo de Facção nos servidores PvP!" },
  "cavalier kills": { ptName: "Cavaleiro - Abates de Glória", cat: "combat", icon: "🛡️", label: "Ordem da Cavalaria", meaning: "Abateu 10 monstros perigosos, qualificando-se para o título de Cavalier." },
  "cavalier skills": { ptName: "Cavaleiro - Mestria Técnica", cat: "combat", icon: "🛡️", label: "Ordem da Cavalaria", meaning: "Adquiriu 80 novos pontos de perícia, pavimentando seu caminho como Cavalier." },

  // Exploration & World
  "nomad": { ptName: "Nômade", cat: "exploration", icon: "🧭", label: "Exploração de Vilas", meaning: "Viajante incansável que desbravou dezenas de diferentes vilas e assentamentos." },
  "wanderer": { ptName: "Andarilho das Estradas", cat: "exploration", icon: "🥾", label: "Viagens Terrestres", meaning: "Percorreu distâncias colossais a pé por estradas, florestas e vales." },
  "tradesman": { ptName: "Comerciante Viajante", cat: "exploration", icon: "🎒", label: "Intercâmbio Mundial", meaning: "Cruzou portais migrando entre diferentes servidores do ecossistema Wurm." },
  "the first": { ptName: "O Pioneiro Solitário", cat: "exploration", icon: "🌟", label: "Desbravador Primordial", meaning: "Foi o primeiríssimo habitante a pisar na terra virgem de um novo servidor!" },
  "went up a hill": { ptName: "Subiu a Colina", cat: "exploration", icon: "⛰️", label: "Alpinismo", meaning: "Escalou elevações montanhosas apreciando o horizonte de grandes altitudes." },
  "mountain goat": { ptName: "Cabra da Montanha", cat: "exploration", icon: "🧗", label: "Alpinismo Avançado", meaning: "Subiu até cumes vertiginosos onde poucos ousam pisar sem cair." },
  "thin air": { ptName: "Ar Rarefeito", cat: "exploration", icon: "🏔️", label: "Alpinismo de Altitude", meaning: "Atingiu alturas impressionantes superando as nuvens e o vento gélido." },
  "on the way to the moon": { ptName: "A Caminho da Lua", cat: "exploration", icon: "🌕", label: "Cumes Lendários", meaning: "Alcançou o cume máximo do Dragon Fang, o ponto mais alto de todo o mundo!" },
  "clumsy": { ptName: "Desajeitado", cat: "survival", icon: "🤕", label: "Acidentes & Quedas", meaning: "Caiu e se machucou mais de 125 vezes tentando escalar encostas íngremes!" },
  "ouch that hurt": { ptName: "Ai, Isso Doeu!", cat: "survival", icon: "🤕", label: "Acidentes & Quedas", meaning: "Sofreu uma queda feia de grande altura e sobreviveu por pouco." },
  "wet feet": { ptName: "Pés Molhados", cat: "exploration", icon: "🏊", label: "Natação", meaning: "Mergulhou nas águas gélidas de lagos ou oceanos dando as primeiras braçadas." },
  "concrete shoes": { ptName: "Sapatos de Concreto", cat: "survival", icon: "🪨", label: "Afogamento", meaning: "Descobriu da pior maneira que nadar sem fôlego leva ao fundo do oceano." },
  "tossed dwarf": { ptName: "Anão Voador", cat: "survival", icon: "💨", label: "Impacto & Projéteis", meaning: "Foi arremessado pelos ares de maneira desajeitada após receber um grande impacto." },
  "death from above": { ptName: "Morte Vinda de Cima", cat: "survival", icon: "☄️", label: "Catapultas & Artilharia", meaning: "Atingido em cheio por destroços voadores disparados por uma catapulta de cerco." },
  "ashes to ashes": { ptName: "Cinzas às Cinzas", cat: "survival", icon: "🌋", label: "Lava Mortal", meaning: "Encontrou um fim incandescente pisando em um ladrilho de rocha de lava viva." },
  "overdosed on acupuncture": { ptName: "Overdose de Acupuntura", cat: "survival", icon: "🌵", label: "Armadilhas Farpadas", meaning: "Morreu perfurado por espinhos mortais de cercas pontiagudas ou barreiras." },
  "abstinence": { ptName: "Abstinência (Jejum)", cat: "survival", icon: "🍞", label: "Jejum Forçado", meaning: "Passou um longo período sem comer, entrando em regime de jejum metabólico." },
  "ascetic": { ptName: "Asceta Faminto", cat: "survival", icon: "🥀", label: "Inanição Crítica", meaning: "Barra de comida caiu abaixo de 7%, experimentando os limites da fome biológica." },
  "just a cold": { ptName: "Apenas um Resfriado", cat: "survival", icon: "🤧", label: "Enfermidades", meaning: "Contraiu uma doença contagiosa no clima hostil, espirrando pelos cantos." },
  "the lucky one": { ptName: "O Sortudo Escapista", cat: "survival", icon: "🍀", label: "Sobrevivência Milagrosa", meaning: "Curou-se e sobreviveu após sua vida despencar para menos de 1%!" },
  "deep pockets": { ptName: "Bolsos Sobrecarregados", cat: "exploration", icon: "🎒", label: "Capacidade de Carga", meaning: "Tentou carregar mais peso do que sua força física aguentava, ficando imobilizado." },
  "free hugs": { ptName: "Abraços Grátis", cat: "exploration", icon: "🤗", label: "Sociabilidade", meaning: "Distribuiu sorrisos e gestos calorosos para outros aventureiros." },
  "flirtatious": { ptName: "Paquerador Nato", cat: "exploration", icon: "😘", label: "Sociabilidade", meaning: "Flertou com 10 jogadores distintos espalhando charme e descontração." },
  "nancy the tavern wench": { ptName: "Dançarino da Taverna", cat: "exploration", icon: "💃", label: "Vida Noturna", meaning: "Dançou animadamente com 10 jogadores únicos ao som da música da taverna." },
  "popular joe": { ptName: "Popularidade Ampla", cat: "exploration", icon: "🤝", label: "Amizades & Rede", meaning: "Adicionou mais de 50 companheiros à sua lista pessoal de amigos." },
  "party king": { ptName: "Rei da Festa", cat: "exploration", icon: "🎉", label: "Comemoração Épica", meaning: "Alcançou patamares altíssimos de status social e festividades no reino." },
  "you beauty": { ptName: "Elegância Nobre", cat: "exploration", icon: "💍", label: "Vestuário & Joias", meaning: "Vestiu simultaneamente um anel, um colar e um bracelete de adorno." },
  "slacker": { ptName: "Preguiçoso de Plantão", cat: "exploration", icon: "🥱", label: "Ócio Criativo", meaning: "Passou um bom tempo apenas parado observando a vida passar sem fazer nada." },
  "skilled": { ptName: "Habilidoso Multifacetado", cat: "work", icon: "🎓", label: "Evolução Global", meaning: "Acumulou uma marca expressiva de pontos de habilidades em múltiplas periciais." },
  "king's court": { ptName: "Corte Real", cat: "epic", icon: "👑", label: "Honraria Real", meaning: "Nomeado para um cargo de alta patente governamental dentro do reino." },
  "won the game": { ptName: "Venceu o Jogo!", cat: "epic", icon: "🏆", label: "Objetivo Cumprido", meaning: "Concluiu integralmente todos os seus objetivos e metas pessoais em Wurm Online!" },
  "debt collector": { ptName: "Cobrador de Dívidas", cat: "exploration", icon: "💰", label: "Finanças de Vila", meaning: "Drenou os cofres da conta de um assentamento reivindicando fundos." },
  "up the drain": { ptName: "Dreno Contínuo", cat: "exploration", icon: "💰", label: "Finanças de Vila", meaning: "Esvaziou fundos de assentamento por dois dias consecutivos cobrindo despesas." },
  "founder": { ptName: "Fundador de Vila", cat: "exploration", icon: "👑", label: "Colonização", meaning: "Fundou um novo assentamento (deed) estabelecendo soberania e proteção no mapa." },
  "citizen": { ptName: "Cidadão Consagrado", cat: "exploration", icon: "📜", label: "Cidadania", meaning: "Tornou-se cidadão oficial de um vilarejo com direitos de moradia." },

  // Religion & Meditation
  "bodhisattva": { ptName: "Bodhisattva Iluminado", cat: "epic", icon: "🧘", label: "Meditação & Espírito", meaning: "Meditou incríveis 2.000 vezes, purificando a mente e alcançando a iluminação!" },
  "peace of mind": { ptName: "Paz de Espírito", cat: "epic", icon: "🧘", label: "Meditação Básica", meaning: "Meditou 200 vezes aprendendo a desacelerar a mente nas colinas." },
  "epic helper": { ptName: "Ajudante Épico", cat: "epic", icon: "⚡", label: "Missões Divinas", meaning: "Apoiou a jornada dos deuses em Valrei entregando suprimentos nas missões épicas." },
  "epic finalizer": { ptName: "Finalizador Épico", cat: "epic", icon: "⚡", label: "Missões Divinas", meaning: "Concluiu a etapa decisiva de vitória de uma missão épica das divindades." },
  "defiler": { ptName: "Profanador do Altar Sagrado", cat: "epic", icon: "⚡", label: "Guerra Teológica", meaning: "Destruiu um altar White Light sagrado desafiando as divindades da luz." },
  "in the name of magranon": { ptName: "Em Nome de Magranon", cat: "epic", icon: "⚔️", label: "Devoção Guerreira", meaning: "Forjou espadas cerimoniais consagradas ao deus guerreiro Magranon." },
  "waller": { ptName: "Muralha Mágica", cat: "epic", icon: "🪄", label: "Magia Arcana", meaning: "Canalizou a fonte elemental dos deuses erguendo uma barreira mágica." },
  "master of runes": { ptName: "Mestre das Runas", cat: "epic", icon: "🪨", label: "Encantamento Rúnico", meaning: "Utilizou e dominou as runas sagradas concedidas pelos deuses." },

  // Cooking & Brewing
  "beer": { ptName: "Cerveja Artesanal", cat: "work", icon: "🍺", label: "Culinária & Fermentação", meaning: "Fermentou com sucesso um lote de cerveja saborosa no barril." },
  "berry pie": { ptName: "Torta de Frutas Silvestres", cat: "work", icon: "🥧", label: "Confeitaria Fina", meaning: "Assou no forno a lenha uma torta suculenta de frutas silvestres colhidas na mata." },
  "black forest gateau": { ptName: "Bolo Floresta Negra", cat: "work", icon: "🎂", label: "Confeitaria Nobre", meaning: "Preparou o famoso bolo de chocolate e cerejas da Floresta Negra." },
  "brewer": { ptName: "Mestre Cervejeiro", cat: "work", icon: "🍻", label: "Fermentação Mestre", meaning: "Fermentou pelo menos um lote de cada tipo de bebida alcoólica do mundo!" },
  "chocoholic": { ptName: "Chocólatra", cat: "work", icon: "🍫", label: "Confeitaria Nobre", meaning: "Assou um magnífico bolo com camadas ricas de puro chocolate." },
  "cookies": { ptName: "Biscoitos Caseiros", cat: "work", icon: "🍪", label: "Confeitaria Caseira", meaning: "Assou fornadas de deliciosos biscoitos crocantes para viagem." },
  "cottage pie": { ptName: "Torta Rústica (Cottage Pie)", cat: "work", icon: "🥧", label: "Culinária Rústica", meaning: "Preparou a clássica torta inglesa de carne com purê dourado." },
  "custard creams": { ptName: "Biscoitos Recheados de Creme", cat: "work", icon: "🍪", label: "Confeitaria Inglesa", meaning: "Assou biscoitos delicados com suave recheio de creme." },
  "custard pie": { ptName: "Torta de Creme (Custard Pie)", cat: "work", icon: "🥧", label: "Confeitaria Tradicional", meaning: "Assou uma cremosa e aromática torta de creme de baunilha." },
  "distiller": { ptName: "Mestre Destilador", cat: "work", icon: "🍶", label: "Alquimia & Destilação", meaning: "Destilou com perfeição um lote de cada bebida espirituosa de Wurm." },
  "fish pie": { ptName: "Torta de Peixe Fresco", cat: "work", icon: "🥧", label: "Culinária Marítima", meaning: "Cozinhou uma saborosa torta recheada com peixes recém-pescados." },
  "fruit pie": { ptName: "Torta de Frutas Tropicais", cat: "work", icon: "🥧", label: "Confeitaria de Frutas", meaning: "Assou uma torta dourada repleta de frutas doces do pomar." },
  "gin": { ptName: "Destilação de Gin", cat: "work", icon: "🍸", label: "Alquimia & Destilação", meaning: "Destilou gin aromático com zimbro e botânicos selecionados." },
  "gruel": { ptName: "Mingau Rústico (Gruel)", cat: "work", icon: "🥣", label: "Culinária Básica", meaning: "Cozinhou mingau básico no caldeirão para aplacar a fome diária." },
  "insect stew": { ptName: "Ensopado de Insetos", cat: "work", icon: "🍲", label: "Culinária Selvagem", meaning: "Preparou um ensopado exótico de insetos garantindo energia nas matas." },
  "meat pie": { ptName: "Torta de Carne Suculenta", cat: "work", icon: "🥧", label: "Culinária Tradicional", meaning: "Assou uma robusta torta de carne com molho espesso e temperado." },
  "moonshine": { ptName: "Destilado Clandestino (Moonshine)", cat: "work", icon: "🫗", label: "Destilação Rústica", meaning: "Destilou um lote potente de moonshine artesanal na calada da noite." },
  "pasta maker": { ptName: "Massa Artesanal", cat: "work", icon: "🍝", label: "Culinária Italiana", meaning: "Preparou massas caseiras frescas com ovos e farinha pura." },
  "pie-maker": { ptName: "Grão-Mestre das Tortas", cat: "work", icon: "🥧", label: "Culinária Suprema", meaning: "Assou com maestria todas as tortas do jogo: carne, peixe, framboesa, frutas, cerveja e creme!" },
  "pizza maker": { ptName: "Pizzaiolo Artesanal", cat: "work", icon: "🍕", label: "Culinária Gastronômica", meaning: "Assou deliciosas pizzas no forno a lenha recheadas com queijo e tomates." },
  "pizza master": { ptName: "Grão-Mestre da Pizza", cat: "work", icon: "🍕", label: "Culinária Lendária", meaning: "Assou centenas de pizzas artesanais dignas dos maiores banquetes!" },
  "pork pie": { ptName: "Torta de Lombo Suíno", cat: "work", icon: "🥧", label: "Culinária Tradicional", meaning: "Assou uma clássica torta suína britânica com massa folhada." },
  "raspberry pi": { ptName: "Torta de Framboesa (Raspberry Pi)", cat: "work", icon: "🥧", label: "Confeitaria & Humor", meaning: "Assou uma torta de framboesa celebrando os programadores de Wurm!" },
  "simple pasta": { ptName: "Macarrão Simples", cat: "work", icon: "🍝", label: "Culinária Prática", meaning: "Cozinhou um prato reconfortante de macarrão caseiro." },
  "steak and ale pie": { ptName: "Torta de Carne e Cerveja", cat: "work", icon: "🥧", label: "Culinária de Taberna", meaning: "Cozinhou a célebre torta de bife marinado na cerveja preta." },
  "sushi maker": { ptName: "Sushiman dos Mares", cat: "work", icon: "🍱", label: "Gastronomia Oriental", meaning: "Cortou filés finos de peixes frescos e enrolou sushis com precisão." },
  "vinegar": { ptName: "Vinagre Fermentado", cat: "work", icon: "🍾", label: "Fermentação Culinária", meaning: "Produziu vinagre azedo útil para conservas e molhos." },
  "vodka": { ptName: "Destilação de Vodka", cat: "work", icon: "🧊", label: "Destilação Pura", meaning: "Destilou um lote límpido e cristalino de vodka pura." },
  "whisky": { ptName: "Destilação de Whisky", cat: "work", icon: "🥃", label: "Destilação Nobre", meaning: "Destilou whisky envelhecido em barris de carvalho aromático." },
  "baker": { ptName: "Padeiro de Vilarejo", cat: "work", icon: "🥖", label: "Panificação", meaning: "Assou mais de 100 pães perfumando as manhãs do assentamento." },
  "bread maker": { ptName: "Mestre Padeiro", cat: "work", icon: "🍞", label: "Panificação Prática", meaning: "Dominou a arte de sovar farinha e assar pães fofos no forno." },
  "the smell of freshly baked bread": { ptName: "O Aroma do Pão Quentinho", cat: "work", icon: "🍞", label: "Panificação Confortável", meaning: "Assou 100 fornadas de pão fresco enchendo a vila de alegria." },
  "dough hands": { ptName: "Mãos de Farinha", cat: "work", icon: "🌾", label: "Panificação em Massa", meaning: "Assou mais de 500 pães, alimentando reinos inteiros com seu trabalho." },
  "adulterator": { ptName: "Produtor de Vinho", cat: "work", icon: "🍷", label: "Vitivinicultura", meaning: "Produziu 100 litros de vinho tinto fermentado das vinhas." },
  "peasant winemaker": { ptName: "Vinhateiro Camponês", cat: "work", icon: "🍇", label: "Vitivinicultura", meaning: "Fermentou 500 litros de vinho caseiro das videiras da sua encosta." },
  "vigneron": { ptName: "Vinhateiro Consagrado", cat: "work", icon: "🍇", label: "Vitivinicultura Nobre", meaning: "Produziu 1.000 litros de vinho refinado apreciado pelos nobres." },
  "master winemaker": { ptName: "Grão-Mestre dos Vinhos", cat: "work", icon: "🍷", label: "Vitivinicultura Suprema", meaning: "Alcançou a marca colossal de 5.000 litros de vinho engarrafados!" },
  "obsessive eater": { ptName: "Comilão Insaciável", cat: "survival", icon: "🍖", label: "Apetite Brutal", meaning: "Comeu banquetes sucessivos até bater 99% da barra de alimentação com um grande arroto!" },
  "singing while eating": { ptName: "Cantoria no Banquete", cat: "exploration", icon: "🎶", label: "Gastronomia Nobre", meaning: "Saboreou uma refeição de qualidade lendária digna de canções de trovador." },
  "hexer": { ptName: "Alquimista de Poções", cat: "survival", icon: "🧪", label: "Alquimia Médica", meaning: "Ingeriu mais de 20 poções mágicas alterando seu metabolismo." },
  "under the influence": { ptName: "Sob Efeito Alquímico", cat: "survival", icon: "🧪", label: "Alquimia Prática", meaning: "Bebeu poções esverdeadas sentindo os efeitos fluírem nas veias." },

  // Loyalty
  "landed": { ptName: "Fidelidade Wurm (1 Mês)", cat: "exploration", icon: "📜", label: "Fidelidade Premium", meaning: "Completou seu primeiro mês oficial como assinante premium do jogo." },
  "survived": { ptName: "Sobrevivente Veterano (3 Meses)", cat: "exploration", icon: "🥉", label: "Fidelidade Premium", meaning: "Manteve sua assinatura ativa por 3 meses consecutivos de aventuras." },
  "scouted": { ptName: "Explorador Veterano (6 Meses)", cat: "exploration", icon: "🥈", label: "Fidelidade Premium", meaning: "Completou 6 meses de presença e evolução no mundo de Wurm." },
  "experienced": { ptName: "Experiência Consagrada (9 Meses)", cat: "exploration", icon: "🥈", label: "Fidelidade Premium", meaning: "Alcançou a marca respeitável de 9 meses de conta premium ativa." },
  "owning": { ptName: "Senhor do Território (12 Meses)", cat: "exploration", icon: "🥇", label: "Fidelidade Premium", meaning: "Celebrou 1 ano completo de pioneirismo e liderança no servidor." },
  "shined": { ptName: "Brilho Dourado (16 Meses)", cat: "exploration", icon: "🥇", label: "Fidelidade Premium", meaning: "Acumulou 16 meses de assinatura construindo a história do jogo." },
  "glittered": { ptName: "Resplendor Cintilante (20 Meses)", cat: "exploration", icon: "🥇", label: "Fidelidade Premium", meaning: "Manteve status de lenda viva com 20 meses de fidelidade ao mundo." },
  "highly illuminated": { ptName: "Altamente Iluminado (26 Meses)", cat: "exploration", icon: "🥇", label: "Fidelidade Premium", meaning: "Alcançou mais de 2 anos de conta ativa guiando as novas gerações." },
  "foundation pillar": { ptName: "Pilar Fundamental (36 Meses)", cat: "exploration", icon: "💎", label: "Lenda Viva", meaning: "Pilastra fundamental da comunidade com 3 anos de assinatura contínua!" },
  "revered one": { ptName: "Reverenciado (48 Meses)", cat: "exploration", icon: "💎", label: "Lenda Viva", meaning: "Quatro anos de história! Respeitado por reis, sacerdotes e novatos." },
  "patron of the net": { ptName: "Patrono da Rede (60 Meses)", cat: "exploration", icon: "💎", label: "Lenda Viva", meaning: "Cinco anos de apoio ininterrupto e sustentação do universo Wurm." },
  "myth or legend?": { ptName: "Mito ou Lenda? (80 Meses)", cat: "exploration", icon: "💎", label: "Monumento Histórico", meaning: "Mais de 6 anos e meio de assinatura! Uma figura mítica e imortal nos anais do tempo." },

  // Events
  "independence tourist": { ptName: "Turista de Independence", cat: "exploration", icon: "🏁", label: "Eventos & Corridas", meaning: "Completou a célebre corrida de turismo pelo servidor pioneiro Independence." },
  "gopher for the gods": { ptName: "Roedor dos Deuses", cat: "exploration", icon: "🐿️", label: "Eventos Especiais", meaning: "Completou a lendária caça ao tesouro Scavenger Hunt de maio de 2016." },
  "geographer of the isles": { ptName: "Geógrafo das Ilhas", cat: "exploration", icon: "🗺️", label: "Eventos de Mapa", meaning: "Reuniu todos os fragmentos do mapa do tesouro no evento de Pristine." },
  "i survived the labyrinth.": { ptName: "Sobrevivente do Labirinto", cat: "exploration", icon: "🌀", label: "Eventos Especiais", meaning: "Completou e encontrou a saída do épico Labirinto de Xanadu de 2015!" }
};

// Also generate translations for Steam Goals (77 goals)
const GOAL_TRANSLATIONS = {
  "wurmian": { ptName: "Cidadão de Wurm", cat: "exploration", icon: "🌍", meaning: "Concluiu com êxito o tutorial inicial do jogo." },
  "can you dig it?": { ptName: "Consegue Escavar?", cat: "work", icon: "⛏️", meaning: "Abriu um túnel escavando uma parede rochosa de montanha." },
  "architect": { ptName: "Arquiteto", cat: "work", icon: "📐", meaning: "Planejou uma estrutura ou fundação no terreno." },
  "builder": { ptName: "Construtor de Casas", cat: "work", icon: "🏠", meaning: "Completou a construção integral de uma residência." },
  "town planner": { ptName: "Urbanista Municipal", cat: "work", icon: "🏘️", meaning: "Construiu 10 casas contribuindo para o crescimento da vila." },
  "for the greater good": { ptName: "Pelo Bem Maior", cat: "combat", icon: "⚔️", meaning: "Abateu sua primeira criatura no mundo selvagem." },
  "ecological disaster underway": { ptName: "Desastre Ecológico", cat: "combat", icon: "⚔️", meaning: "Abateu 100 criaturas selvagens em combates." },
  "surface scratched": { ptName: "Arranhão na Superfície (Nível 20)", cat: "work", icon: "🌱", meaning: "Alcançou o nível 20 em uma habilidade." },
  "going strong": { ptName: "Firme e Forte (Nível 50)", cat: "work", icon: "🌿", meaning: "Elevou uma habilidade ao respeitável nível 50." },
  "really getting stuck in": { ptName: "Especialista Dedicado (Nível 70)", cat: "work", icon: "🌳", meaning: "Alcançou o nível 70 em uma perícia de ofício ou combate." },
  "halfway there": { ptName: "Metade do Caminho (Nível 90)", cat: "work", icon: "👑", meaning: "Atingiu o monumental nível 90 em uma habilidade!" },
  "wildlife? i've seen some...": { ptName: "Veterano de Luta (Luta 70)", cat: "combat", icon: "⚔️", meaning: "Elevou sua habilidade de Luta (Fighting) para 70." },
  "a really slow chase": { ptName: "Perseguição em Câmera Lenta", cat: "combat", icon: "🐌", meaning: "Abateu uma criatura com a condição Slow." },
  "you're not so green": { ptName: "Nada de Principiante", cat: "combat", icon: "🍏", meaning: "Abateu uma criatura venenosa com condição Greenish." },
  "champion amongst creatures": { ptName: "Campeão entre Criaturas", cat: "combat", icon: "🏆", meaning: "Eliminou uma criatura com o temido status de Champion." },
  "incoming!": { ptName: "Ataque Aéreo!", cat: "combat", icon: "☄️", meaning: "Abateu uma criatura disparando um projétil de catapulta." },
  "blackest heart in the land": { ptName: "O Coração Mais Sombrio", cat: "combat", icon: "🦄", meaning: "Eliminou um unicórnio sagrado pelas matas." },
  "they don't like it up 'em!": { ptName: "Provocação de Batalha", cat: "combat", icon: "🗣️", meaning: "Provocou (taunt) um inimigo durante o combate." },
  "ploughing the ocean waves": { ptName: "Sulcando as Ondas", cat: "sailing", icon: "⛵", meaning: "Comandou um barco ou navio pelos mares abertos." },
  "building communities": { ptName: "Construindo Comunidades", cat: "exploration", icon: "📜", meaning: "Entrou e tornou-se membro oficial de uma vila." },
  "don't make me turn this wagon around!": { ptName: "Vitória na Disputa", cat: "combat", icon: "🤺", meaning: "Venceu um duelo amigável de treino contra outro jogador." },
  "i'm not as think as you drunk i am!": { ptName: "Fórmula da Embriaguez", cat: "exploration", icon: "🍺", meaning: "Ficou completamente bêbado após bebericar na taverna." },
  "forestry department? we don't need no stinking forestry department!": { ptName: "Departamento Florestal? Jamais!", cat: "work", icon: "🪓", meaning: "Derrubou 100 árvores para abastecer obras." },
  "forestry department recruit": { ptName: "Recruta Florestal", cat: "work", icon: "🌱", meaning: "Plantou 100 brotos de árvore pelo mapa." },
  "...is my hand supposed to glow as well?": { ptName: "Lâmina Encantada", cat: "epic", icon: "✨", meaning: "Equipou uma arma abençoada com feitiços arcanos." },
  "celestial trash compactor": { ptName: "Compactador Celestial", cat: "epic", icon: "⚡", meaning: "Sacrificou 50 itens nos altares sagrados dos deuses." },
  "burrowing varmint!": { ptName: "Toupeira Subterrânea", cat: "work", icon: "⛏️", meaning: "Destruiu e escavou uma parede interna de caverna." },
  "charlie mops": { ptName: "Charlie Mops (O Inventor da Cerveja)", cat: "work", icon: "🍺", meaning: "Fermentou um lote fresco de cerveja artesanal." },
  "hangover is now in pre-production": { ptName: "Ressaca em Produção", cat: "work", icon: "🍷", meaning: "Pisou uvas e fermentou um barril de vinho caseiro." },
  "heard a higher calling": { ptName: "Um Chamado Superior", cat: "epic", icon: "🙏", meaning: "Converteu-se em seguidor oficial de uma divindade de Valrei." },
  "rower with boat, seeks stream for merriness": { ptName: "Bote à Deriva", cat: "sailing", icon: "🚣", meaning: "Construiu um barco a remo novo para navegar." },
  "all the colours of the rainbow": { ptName: "Todas as Cores do Arco-Íris", cat: "work", icon: "🎨", meaning: "Tingiu um item com pigmentos artesanais coloridos." },
  "if looks could kill": { ptName: "Armadura Estilizada", cat: "work", icon: "🛡️", meaning: "Tingiu uma peça da sua armadura de guerra." },
  "red goes faster": { ptName: "Vermelho Corre Mais!", cat: "work", icon: "🚗", meaning: "Pintou um veículo ou carroça com tintas vívidas." },
  "siesta": { ptName: "A Hora da Sesta", cat: "exploration", icon: "🛌", meaning: "Dormiu em uma cama macia recuperando o sono." },
  "waiting game": { ptName: "O Jogo da Espera", cat: "work", icon: "🌾", meaning: "Arou a terra e plantou sua primeira colheita agrícola." },
  "quick, trouble the waters!": { ptName: "Projeto de Ponte", cat: "work", icon: "📐", meaning: "Planejou a fundação de uma nova ponte sobre a água." },
  "it takes a village": { ptName: "União Faz a Força", cat: "epic", icon: "⚡", meaning: "Apoiou os esforços coletivos de uma missão de reino." },
  "now we're cooking with tar!": { ptName: "Cozinheiro de 250 Receitas", cat: "work", icon: "🍳", meaning: "Aprendeu mais de 250 receitas do livro culinário de Wurm." },
  "born to rune!": { ptName: "Nascido para as Runas", cat: "epic", icon: "🪨", meaning: "Gravou e ativou uma runa mística em um item." },
  "every day, in every way...": { ptName: "Todo Santo Dia...", cat: "work", icon: "🔨", meaning: "Melhorou itens mais de 1.000 vezes na bigorna e bancada." },
  "dude, sweeeeeeet!": { ptName: "Doce como Mel!", cat: "work", icon: "🍯", meaning: "Colheu potes de mel fresco das colmeias da vila." },
  "eating for at least a day": { ptName: "Jantar Garantido", cat: "sailing", icon: "🐟", meaning: "Pescou um peixe garantindo alimento fresco." },
  "absolutely divine!": { ptName: "Água Divina!", cat: "work", icon: "💧", meaning: "Localizou uma fonte subterrânea de água usando um pêndulo de radiestesia." },
  "pucker up!": { ptName: "Beijo Apaixonado", cat: "exploration", icon: "💋", meaning: "Beijou outro personagem espalhando afeto pelo mundo." },
  "bee whisperer": { ptName: "Encantador de Abelhas", cat: "work", icon: "🐝", meaning: "Abriu e inspecionou uma colmeia sem sofrer ferroadas." },
  "puppeteer": { ptName: "Mestre dos Fantoches", cat: "exploration", icon: "🎭", meaning: "Apresentou um animado show de fantoches na praça da vila." },
  "yo ho ho and a bottle of whatever this is": { ptName: "Garrafa de Rum", cat: "work", icon: "🏴‍☠️", meaning: "Destilou um lote de rum digno de piratas." },
  "world famous author": { ptName: "Autor Famoso", cat: "work", icon: "📖", meaning: "Escreveu páginas de sabedoria e publicou um livro." },
  "beary good!": { ptName: "Tapete de Urso", cat: "work", icon: "🐻", meaning: "Curtil couro e confeccionou um aconchegante tapete de pele de urso." },
  "when life gives you lemons...": { ptName: "Limonada Suave", cat: "work", icon: "🍋", meaning: "Espremeu limões frescos preparando uma refrescante limonada." },
  "no archeologists inside": { ptName: "Despensa Segura", cat: "work", icon: "🥫", meaning: "Construiu uma despensa (larder) para conservar alimentos." },
  "lounge lizard": { ptName: "Espreguiçadeira Real", cat: "work", icon: "🛋️", meaning: "Construiu uma luxuosa cadeira de descanso real." },
  "ratalicious!": { ptName: "Espetinho de Rato", cat: "work", icon: "🍢", meaning: "Assou um espetinho rústico de rato na fogueira de acampamento." },
  "treasures of the sea": { ptName: "Tesouro das Profundezas", cat: "sailing", icon: "🦪", meaning: "Encontrou uma pérola brilhante dentro de uma ostra marinha." },
  "jaws": { ptName: "Tubarão Branco (Tubarão Abatido)", cat: "combat", icon: "🦈", meaning: "Caçou e abateu um tubarão agressivo nos mares." },
  "i scream, you scream": { ptName: "Sorvete Gelado!", cat: "work", icon: "🍨", meaning: "Bateu leite e frutas preparando um delicioso sorvete gelado." },
  "early bird catches the wurm": { ptName: "Pássaro Madrugador", cat: "work", icon: "🪱", meaning: "Remexeu o solo úmido e encontrou uma minhoca." },
  "snowball fight!": { ptName: "Guerra de Bolas de Neve!", cat: "exploration", icon: "❄️", meaning: "Moldou e arremessou uma bola de neve em outro aventureiro." },
  "some unique blood": { ptName: "Sangue de Criatura Única", cat: "combat", icon: "🩸", meaning: "Coletou o sangue raríssimo de uma criatura lendária única." },
  "ting-a-ling": { ptName: "Badalo do Sino", cat: "work", icon: "🔔", meaning: "Tocou o sino da igreja ou do vilarejo avisando a população." }
};

// Merged database keyed by standard title
const COMPLETE_DB = {};

// Helper to determine category, icon, label, rarity
function inferMeta(name, rawDesc, rawHowTo, rawRarity) {
  const norm = name.toLowerCase().trim();

  // 1. Check existingDB first
  for (let k in existingDB) {
    if (k.toLowerCase().trim() === norm) {
      return {
        ...existingDB[k],
        description: rawDesc || existingDB[k].meaning || '',
        howTo: rawHowTo || existingDB[k].unlock || ''
      };
    }
  }

  // 2. Check TRANSLATIONS
  if (TRANSLATIONS[norm]) {
    const t = TRANSLATIONS[norm];
    return {
      ptName: t.ptName,
      category: t.cat,
      categoryLabel: t.label || (t.cat === 'combat' ? 'Combate & Caça' : t.cat === 'sailing' ? 'Náutica & Navegação' : t.cat === 'work' ? 'Trabalho & Forja' : t.cat === 'mounts' ? 'Montarias & Animais' : t.cat === 'epic' ? 'Épico & Divino' : t.cat === 'survival' ? 'Sobrevivência' : 'Exploração & Mundo'),
      categoryIcon: t.icon,
      meaning: t.meaning,
      unlock: rawHowTo || (t.cat === 'combat' ? 'Derrotar o alvo indicado no jogo.' : 'Realizar a ação requerida no mundo de Wurm.'),
      rarity: rawRarity || 'Silver'
    };
  }

  // 3. Check GOALS
  if (GOAL_TRANSLATIONS[norm]) {
    const g = GOAL_TRANSLATIONS[norm];
    return {
      ptName: g.ptName,
      category: g.cat,
      categoryLabel: g.cat === 'combat' ? 'Combate & Caça' : g.cat === 'sailing' ? 'Náutica & Navegação' : g.cat === 'work' ? 'Trabalho & Forja' : g.cat === 'mounts' ? 'Montarias & Animais' : g.cat === 'epic' ? 'Épico & Divino' : g.cat === 'survival' ? 'Sobrevivência' : 'Exploração & Mundo',
      categoryIcon: g.icon,
      meaning: g.meaning,
      unlock: rawHowTo || 'Concluir a meta correspondente no jogo ou Steam.',
      rarity: rawRarity || 'Silver'
    };
  }

  // 4. Keyword heuristic
  let cat = 'exploration', label = 'Exploração & Mundo', icon = '🧭';
  let ptName = name;

  if (/killed|slayer|hunt|demise|beast|spawn|ogre|jackal|champ|assassination|zombie|wolf|troll|spider|crocodile|bear|hell|dragon|drake|demon|scorpion|scrapion/i.test(name)) {
    cat = 'combat'; label = 'Combate & Caça'; icon = '⚔️';
  } else if (/item|craft|improve|bridge|maker|smith|forge|dig|mine|gem|wall|fence|repair|tidy|rack|pot/i.test(name)) {
    cat = 'work'; label = 'Trabalho & Forja'; icon = '📦';
  } else if (/sailor|boat|ship|sea|ocean|fish|water|rower|canoe|knarr|corbita|caravel|cog/i.test(name)) {
    cat = 'sailing'; label = 'Náutica & Navegação'; icon = '⛵';
  } else if (/horse|cow|bull|mount|rider|ride|husbandry|tame/i.test(name)) {
    cat = 'mounts'; label = 'Montarias & Animais'; icon = '🐴';
  } else if (/rift|god|altar|prayer|priest|mission|valrei|epic|holy|deity|sacrific/i.test(name)) {
    cat = 'epic'; label = 'Épico & Divino'; icon = '⚡';
  } else if (/die|death|fasting|starv|cold|drown|lava|thorns|hurt|clumsy|corpse/i.test(name)) {
    cat = 'survival'; label = 'Sobrevivência'; icon = '💀';
  } else if (/pie|bread|cake|beer|wine|pasta|cook|bake|brew|distill|whisky|vodka|sushi/i.test(name)) {
    cat = 'work'; label = 'Culinária & Trabalho'; icon = '🍳';
  }

  return {
    ptName: ptName,
    category: cat,
    categoryLabel: label,
    categoryIcon: icon,
    meaning: rawDesc || 'Conquista reconhecida pelo mundo de Wurm Online.',
    unlock: rawHowTo || 'Executar a respectiva ação no jogo.',
    rarity: rawRarity || 'Silver'
  };
}

// Populate from Wiki
for (let entry of wikiEntries) {
  const meta = inferMeta(entry.name, entry.description, entry.howTo, entry.rarity);
  COMPLETE_DB[entry.name] = {
    ptName: meta.ptName,
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    categoryIcon: meta.categoryIcon,
    meaning: meta.meaning,
    unlock: meta.unlock || entry.howTo,
    trivia: meta.trivia || '',
    rarity: entry.rarity || meta.rarity || 'Silver',
    description: entry.description || ''
  };
}

// Populate from Player Dump (achievements_jotasiete.json) to ensure 100% of real dumps have an exact match
for (let ach of jotaData.achievements) {
  const existing = COMPLETE_DB[ach.name];
  if (!existing) {
    const meta = inferMeta(ach.name, ach.description, '', ach.rarity);
    COMPLETE_DB[ach.name] = {
      ptName: meta.ptName,
      category: meta.category,
      categoryLabel: meta.categoryLabel,
      categoryIcon: meta.categoryIcon,
      meaning: meta.meaning || ach.description,
      unlock: meta.unlock || 'Realizar a respectiva façanha no jogo.',
      trivia: meta.trivia || '',
      rarity: ach.rarity || meta.rarity || 'Silver',
      description: ach.description || ''
    };
  } else {
    if (!existing.description && ach.description) {
      existing.description = ach.description;
    }
    if (!existing.meaning || existing.meaning.startsWith('Conquista reconhecida')) {
      existing.meaning = ach.description;
    }
  }
}

// Overwrite with existing rich entries (Nomad, Knarr Sailor, etc.)
for (let k in existingDB) {
  COMPLETE_DB[k] = {
    ...COMPLETE_DB[k],
    ...existingDB[k]
  };
}

console.log(`Total achievements compiled in COMPLETE_DB: ${Object.keys(COMPLETE_DB).length}`);

// Verify player achievements
let playerUnmatched = 0;
for (let ach of jotaData.achievements) {
  if (!COMPLETE_DB[ach.name]) {
    console.log('STILL UNMATCHED:', ach.name);
    playerUnmatched++;
  }
}
console.log(`Player dump unmatched count: ${playerUnmatched}`);

// Build WIKI_ACHIEVEMENTS array for Journal 2.0
const WIKI_ACHIEVEMENTS = [];
for (let name in COMPLETE_DB) {
  const item = COMPLETE_DB[name];
  WIKI_ACHIEVEMENTS.push({
    name: name,
    ptName: item.ptName,
    rarity: item.rarity,
    category: item.category,
    categoryLabel: item.categoryLabel,
    categoryIcon: item.categoryIcon,
    description: item.description || item.meaning,
    howTo: item.unlock || item.meaning,
    meaning: item.meaning,
    trivia: item.trivia || ''
  });
}

// Sort WIKI_ACHIEVEMENTS alphabetically
WIKI_ACHIEVEMENTS.sort((a, b) => a.name.localeCompare(b.name));

// Build file content
let jsContent = `// Base de Conhecimento Wurm Online - Categorias, Significados e Traduções Completas
// Fonte oficial: Wurmpedia (https://www.wurmpedia.com/index.php/Achievements) + Dump do Cliente Wurm
// Gerado automaticamente com cobertura integral de todas as conquistas do jogo

const WURM_ACHIEVEMENTS_DB = ${JSON.stringify(COMPLETE_DB, null, 2)};

// Mapa de busca normalizada (minúsculas sem caracteres especiais) para tolerância total a variações
const WURM_ACHIEVEMENTS_NORM = {};
for (const [k, v] of Object.entries(WURM_ACHIEVEMENTS_DB)) {
  const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!WURM_ACHIEVEMENTS_NORM[normKey]) {
    WURM_ACHIEVEMENTS_NORM[normKey] = v;
  }
}

// Helper oficial para obter metadados infalíveis
function getAchievementMeta(name) {
  if (!name) {
    return {
      ptName: 'Conquista',
      category: 'exploration',
      categoryLabel: 'Geral',
      categoryIcon: '🎯',
      meaning: 'Ação registrada no servidor.',
      unlock: 'Realizar a ação no jogo.',
      rarity: 'Silver'
    };
  }

  // 1. Busca direta exata
  if (WURM_ACHIEVEMENTS_DB[name]) return WURM_ACHIEVEMENTS_DB[name];

  // 2. Busca normalizada case-insensitive e sem pontuação
  const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (WURM_ACHIEVEMENTS_NORM[cleanKey]) return WURM_ACHIEVEMENTS_NORM[cleanKey];

  // 3. Fallback inteligente baseado em palavras-chave
  let cat = 'exploration', label = 'Exploração & Mundo', icon = '🧭';
  if (/killed|slayer|hunt|demise|beast|spawn|ogre|jackal|champ|assassination|zombie|wolf|troll|spider|crocodile|bear|hell|dragon|drake|demon|scorpion|scrapion/i.test(name)) {
    cat = 'combat'; label = 'Combate & Caça'; icon = '⚔️';
  } else if (/item|craft|improve|bridge|maker|smith|forge|dig|mine|gem|wall|fence|repair|tidy|rack|pot/i.test(name)) {
    cat = 'work'; label = 'Trabalho & Forja'; icon = '📦';
  } else if (/sailor|boat|ship|sea|ocean|fish|water|rower|canoe|knarr|corbita|caravel|cog/i.test(name)) {
    cat = 'sailing'; label = 'Náutica & Navegação'; icon = '⛵';
  } else if (/horse|cow|bull|mount|rider|ride|husbandry|tame/i.test(name)) {
    cat = 'mounts'; label = 'Montarias & Animais'; icon = '🐴';
  } else if (/rift|god|altar|prayer|priest|mission|valrei|epic|holy|deity|sacrific/i.test(name)) {
    cat = 'epic'; label = 'Épico & Divino'; icon = '⚡';
  } else if (/die|death|fasting|starv|cold|drown|lava|thorns|hurt|clumsy|corpse/i.test(name)) {
    cat = 'survival'; label = 'Sobrevivência'; icon = '💀';
  } else if (/pie|bread|cake|beer|wine|pasta|cook|bake|brew|distill|whisky|vodka|sushi/i.test(name)) {
    cat = 'work'; label = 'Culinária & Trabalho'; icon = '🍳';
  }

  return {
    ptName: name,
    category: cat,
    categoryLabel: label,
    categoryIcon: icon,
    meaning: 'Conquista reconhecida pelo mundo de Wurm Online.',
    unlock: 'Executar a respectiva ação no jogo.',
    rarity: 'Silver'
  };
}

// Catálogo Global para o Journal 2.0 (Mapa de Metas)
const WIKI_ACHIEVEMENTS = ${JSON.stringify(WIKI_ACHIEVEMENTS, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'achievements_db.js'), jsContent, 'utf8');
console.log('Successfully wrote updated achievements_db.js!');

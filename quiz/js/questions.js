// ============================================================
// Quiz "Você Entende Bitcoin?" — Banco de Perguntas
// 20 perguntas fixas, 5 alternativas, bilíngue PT/EN
// ============================================================

const QUESTIONS = {
  pt: [
    // ── FÁCIL (1-6): Fundamentos ──────────────────────────────
    {
      id: 1,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'O que é o Bitcoin?',
      options: [
        'Uma moeda digital emitida pelo governo dos Estados Unidos',
        'Um software de código aberto que funciona como dinheiro digital sem intermediários',
        'Uma ação negociada na bolsa de valores',
        'Um banco digital internacional',
        'Uma criptomoeda criada por uma empresa de tecnologia'
      ],
      correct: 1
    },
    {
      id: 2,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'Qual é o número máximo de bitcoins que existirão?',
      options: [
        'Não há limite — novos bitcoins são criados indefinidamente',
        '100 milhões',
        '21 milhões',
        '1 bilhão',
        '21 bilhões'
      ],
      correct: 2
    },
    {
      id: 3,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'O que é a blockchain do Bitcoin?',
      options: [
        'O aplicativo usado para comprar Bitcoin',
        'Um registro público e imutável de todas as transações da rede',
        'O servidor central que armazena os bitcoins',
        'Um banco de dados privado mantido pelos mineradores',
        'O nome do algoritmo de criptografia do Bitcoin'
      ],
      correct: 1
    },
    {
      id: 4,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'Quem é Satoshi Nakamoto?',
      options: [
        'O CEO da maior exchange de Bitcoin do mundo',
        'Um programador japonês que foi preso por criar o Bitcoin',
        'O pseudônimo do criador (ou criadores) do Bitcoin, cuja identidade real é desconhecida',
        'Um economista que propôs o Bitcoin ao Banco Central dos EUA',
        'O fundador da Ethereum'
      ],
      correct: 2
    },
    {
      id: 5,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'O que significa dizer que o Bitcoin é "descentralizado"?',
      options: [
        'Que ele só funciona fora dos grandes centros financeiros',
        'Que nenhuma entidade única controla a rede — ela é mantida por milhares de participantes ao redor do mundo',
        'Que ele só pode ser usado em países em desenvolvimento',
        'Que as transações são processadas por um único computador central muito potente',
        'Que o preço é definido por um comitê internacional'
      ],
      correct: 1
    },
    {
      id: 6,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'O que é um satoshi?',
      options: [
        'A carteira oficial do Bitcoin',
        'O nome do algoritmo de consenso do Bitcoin',
        'A menor unidade do Bitcoin — 1 bitcoin = 100 milhões de satoshis',
        'Um tipo especial de transação na Lightning Network',
        'O nome da primeira exchange de Bitcoin'
      ],
      correct: 2
    },

    // ── MÉDIO (7-13): Halving, Mineração, Custódia ────────────
    {
      id: 7,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'O que é o halving do Bitcoin?',
      options: [
        'A divisão do Bitcoin em duas criptomoedas diferentes',
        'A redução pela metade da recompensa paga aos mineradores, que ocorre aproximadamente a cada 4 anos',
        'A queda de 50% no preço do Bitcoin que ocorre periodicamente',
        'O processo de dividir um bitcoin em unidades menores',
        'Um mecanismo de emergência para desligar a rede Bitcoin'
      ],
      correct: 1
    },
    {
      id: 8,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'O que é mineração de Bitcoin?',
      options: [
        'O processo de extrair componentes eletrônicos para fabricar hardwares especializados',
        'A compra de Bitcoin em uma exchange quando o preço está baixo',
        'O processo computacional de validar transações e adicionar novos blocos à blockchain, sendo recompensado com novos bitcoins',
        'A criação manual de novos bitcoins por desenvolvedores',
        'A extração de dados pessoais dos usuários da rede'
      ],
      correct: 2
    },
    {
      id: 9,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'O que é uma chave privada no contexto do Bitcoin?',
      options: [
        'A senha de acesso à sua conta na exchange',
        'Um código secreto que permite movimentar seus bitcoins — quem tem a chave, tem os bitcoins',
        'O endereço público que você compartilha para receber pagamentos',
        'O número de identificação da sua carteira física',
        'Um código enviado por SMS para confirmar transações'
      ],
      correct: 1
    },
    {
      id: 10,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'O que significa "auto-custódia" (self-custody)?',
      options: [
        'Deixar seus bitcoins em uma exchange regulamentada',
        'Pedir a um amigo de confiança que guarde suas chaves',
        'Guardar suas próprias chaves privadas, sem depender de terceiros para controlar seus bitcoins',
        'Ter um seguro contratado para proteger seus bitcoins',
        'Usar apenas carteiras aprovadas pelo governo'
      ],
      correct: 2
    },
    {
      id: 11,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'O que é a seed phrase (frase semente) de uma carteira Bitcoin?',
      options: [
        'A senha que você cria para abrir o aplicativo da carteira',
        'Uma sequência de 12 ou 24 palavras que permite recuperar todos os seus bitcoins caso perca o dispositivo',
        'O endereço público da sua carteira',
        'Um código QR que contém seu saldo de Bitcoin',
        'A frase que os mineradores usam para verificar transações'
      ],
      correct: 1
    },
    {
      id: 12,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'Quantos halvings já ocorreram no Bitcoin até hoje (2026)?',
      options: [
        '2',
        '3',
        '4',
        '5',
        '6'
      ],
      correct: 2
    },
    {
      id: 13,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'O que acontece se alguém perder sua chave privada e sua seed phrase?',
      options: [
        'O suporte do Bitcoin pode recuperar o acesso',
        'Os bitcoins são automaticamente transferidos para uma carteira de reserva',
        'Os bitcoins ficam permanentemente inacessíveis — não existe recuperação',
        'Após 1 ano, os bitcoins voltam para circulação',
        'A rede Bitcoin gera uma nova chave automaticamente'
      ],
      correct: 2
    },

    // ── DIFÍCIL (14-20): Lightning, On-chain, Técnico ─────────
    {
      id: 14,
      category: 'lightning',
      difficulty: 'hard',
      question: 'O que é a Lightning Network?',
      options: [
        'Uma versão mais rápida do Bitcoin que substitui a blockchain original',
        'Uma rede de segunda camada construída sobre o Bitcoin que permite pagamentos instantâneos e de baixo custo',
        'Uma criptomoeda concorrente do Bitcoin focada em velocidade',
        'O nome do novo algoritmo de mineração do Bitcoin',
        'Uma exchange descentralizada construída sobre a rede Bitcoin'
      ],
      correct: 1
    },
    {
      id: 15,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'O que é uma UTXO (Unspent Transaction Output)?',
      options: [
        'Um tipo de token criado na rede Bitcoin',
        'Um erro de transação que é registrado na blockchain',
        'A saída não gasta de uma transação anterior, que serve como "moeda" disponível para ser usada em uma nova transação',
        'O imposto cobrado sobre transações de Bitcoin',
        'Um tipo de endereço usado exclusivamente na Lightning Network'
      ],
      correct: 2
    },
    {
      id: 16,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'O que determina o valor da taxa (fee) de uma transação na rede Bitcoin?',
      options: [
        'O valor em dólares da transação — quanto maior o valor, maior a taxa',
        'A demanda por espaço nos blocos — quando muitas pessoas querem transacionar, as taxas sobem',
        'O país de origem do remetente',
        'A exchange que processou a transação',
        'Uma tabela fixa definida pelos desenvolvedores do Bitcoin'
      ],
      correct: 1
    },
    {
      id: 17,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'O que é um nó completo (full node) na rede Bitcoin?',
      options: [
        'Um minerador com o equipamento mais potente da rede',
        'Um computador que armazena uma cópia completa da blockchain e verifica independentemente todas as transações e regras do protocolo',
        'Uma carteira que contém mais de 1 bitcoin inteiro',
        'O servidor central que distribui as atualizações do software Bitcoin',
        'Um ponto de acesso à internet usado exclusivamente para transações Bitcoin'
      ],
      correct: 1
    },
    {
      id: 18,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'O que é o mempool do Bitcoin?',
      options: [
        'O espaço de armazenamento onde ficam os bitcoins minerados',
        'Um pool de mineração compartilhado entre vários mineradores',
        'A área de espera onde transações aguardam para ser incluídas em um bloco pelos mineradores',
        'Um tipo de carteira que armazena múltiplas criptomoedas',
        'O nome do banco de dados que registra os endereços de todos os usuários'
      ],
      correct: 2
    },
    {
      id: 19,
      category: 'halving_mining',
      difficulty: 'hard',
      question: 'O que é o ajuste de dificuldade na mineração de Bitcoin?',
      options: [
        'A mudança no preço mínimo para comprar 1 bitcoin',
        'Um mecanismo automático que recalibra a cada 2.016 blocos (~2 semanas) para manter o tempo médio de 10 minutos por bloco',
        'O aumento manual da dificuldade feito pelos desenvolvedores a cada halving',
        'A diferença de dificuldade entre minerar Bitcoin e outras criptomoedas',
        'Um teste que os novos mineradores precisam passar para entrar na rede'
      ],
      correct: 1
    },
    {
      id: 20,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'O que é o indicador MVRV (Market Value to Realized Value)?',
      options: [
        'Um indicador que mede o volume de transações na Lightning Network',
        'A razão entre o valor de mercado do Bitcoin e o valor realizado (custo médio de aquisição de todos os bitcoins), usado para identificar se o mercado está sobrevalorizado ou subvalorizado',
        'O número de carteiras ativas dividido pelo número total de carteiras criadas',
        'A taxa média de hash dividida pelo consumo de energia da rede',
        'Um indicador que mede a velocidade das transações na blockchain'
      ],
      correct: 1
    }
  ],

  en: [
    // ── EASY (1-6): Fundamentals ──────────────────────────────
    {
      id: 1,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'What is Bitcoin?',
      options: [
        'A digital currency issued by the United States government',
        'An open-source software that works as digital money without intermediaries',
        'A stock traded on the stock exchange',
        'An international digital bank',
        'A cryptocurrency created by a tech company'
      ],
      correct: 1
    },
    {
      id: 2,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'What is the maximum number of bitcoins that will ever exist?',
      options: [
        'There is no limit — new bitcoins are created indefinitely',
        '100 million',
        '21 million',
        '1 billion',
        '21 billion'
      ],
      correct: 2
    },
    {
      id: 3,
      category: 'fundamentals',
      difficulty: 'easy',
      question: "What is Bitcoin's blockchain?",
      options: [
        'The app used to buy Bitcoin',
        'A public and immutable record of all network transactions',
        'The central server that stores bitcoins',
        'A private database maintained by miners',
        "The name of Bitcoin's encryption algorithm"
      ],
      correct: 1
    },
    {
      id: 4,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'Who is Satoshi Nakamoto?',
      options: [
        "The CEO of the world's largest Bitcoin exchange",
        'A Japanese programmer who was arrested for creating Bitcoin',
        "The pseudonym of Bitcoin's creator (or creators), whose real identity remains unknown",
        'An economist who proposed Bitcoin to the US Federal Reserve',
        'The founder of Ethereum'
      ],
      correct: 2
    },
    {
      id: 5,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'What does it mean to say Bitcoin is "decentralized"?',
      options: [
        'That it only works outside major financial centers',
        'That no single entity controls the network — it is maintained by thousands of participants around the world',
        'That it can only be used in developing countries',
        'That transactions are processed by a single very powerful central computer',
        'That the price is set by an international committee'
      ],
      correct: 1
    },
    {
      id: 6,
      category: 'fundamentals',
      difficulty: 'easy',
      question: 'What is a satoshi?',
      options: [
        "Bitcoin's official wallet",
        "The name of Bitcoin's consensus algorithm",
        'The smallest unit of Bitcoin — 1 bitcoin = 100 million satoshis',
        'A special type of transaction on the Lightning Network',
        "The name of the first Bitcoin exchange"
      ],
      correct: 2
    },

    // ── MEDIUM (7-13): Halving, Mining, Custody ───────────────
    {
      id: 7,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'What is the Bitcoin halving?',
      options: [
        'The splitting of Bitcoin into two different cryptocurrencies',
        'The halving of the reward paid to miners, which occurs approximately every 4 years',
        'The 50% drop in Bitcoin price that occurs periodically',
        'The process of dividing a bitcoin into smaller units',
        'An emergency mechanism to shut down the Bitcoin network'
      ],
      correct: 1
    },
    {
      id: 8,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'What is Bitcoin mining?',
      options: [
        'The process of extracting electronic components to manufacture specialized hardware',
        'Buying Bitcoin on an exchange when the price is low',
        'The computational process of validating transactions and adding new blocks to the blockchain, being rewarded with new bitcoins',
        'The manual creation of new bitcoins by developers',
        "The extraction of personal data from the network's users"
      ],
      correct: 2
    },
    {
      id: 9,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'What is a private key in the context of Bitcoin?',
      options: [
        'The password to access your exchange account',
        'A secret code that allows you to move your bitcoins — whoever has the key, has the bitcoins',
        'The public address you share to receive payments',
        'The identification number of your hardware wallet',
        'A code sent via SMS to confirm transactions'
      ],
      correct: 1
    },
    {
      id: 10,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'What does "self-custody" mean?',
      options: [
        'Keeping your bitcoins on a regulated exchange',
        'Asking a trusted friend to hold your keys',
        'Holding your own private keys, without relying on third parties to control your bitcoins',
        'Having an insurance policy to protect your bitcoins',
        'Using only government-approved wallets'
      ],
      correct: 2
    },
    {
      id: 11,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'What is a Bitcoin wallet seed phrase?',
      options: [
        'The password you create to open the wallet app',
        'A sequence of 12 or 24 words that allows you to recover all your bitcoins if you lose your device',
        "Your wallet's public address",
        'A QR code that contains your Bitcoin balance',
        'The phrase that miners use to verify transactions'
      ],
      correct: 1
    },
    {
      id: 12,
      category: 'halving_mining',
      difficulty: 'medium',
      question: 'How many halvings have occurred in Bitcoin to date (2026)?',
      options: [
        '2',
        '3',
        '4',
        '5',
        '6'
      ],
      correct: 2
    },
    {
      id: 13,
      category: 'security_custody',
      difficulty: 'medium',
      question: 'What happens if someone loses their private key and seed phrase?',
      options: [
        'Bitcoin support can recover access',
        'The bitcoins are automatically transferred to a backup wallet',
        'The bitcoins become permanently inaccessible — there is no recovery',
        'After 1 year, the bitcoins return to circulation',
        'The Bitcoin network generates a new key automatically'
      ],
      correct: 2
    },

    // ── HARD (14-20): Lightning, On-chain, Technical ──────────
    {
      id: 14,
      category: 'lightning',
      difficulty: 'hard',
      question: 'What is the Lightning Network?',
      options: [
        'A faster version of Bitcoin that replaces the original blockchain',
        'A second-layer network built on top of Bitcoin that enables instant, low-cost payments',
        'A competing cryptocurrency focused on speed',
        "The name of Bitcoin's new mining algorithm",
        'A decentralized exchange built on the Bitcoin network'
      ],
      correct: 1
    },
    {
      id: 15,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'What is a UTXO (Unspent Transaction Output)?',
      options: [
        'A type of token created on the Bitcoin network',
        'A transaction error recorded on the blockchain',
        'The unspent output of a previous transaction, which serves as an available "coin" for use in a new transaction',
        'The tax charged on Bitcoin transactions',
        'A type of address used exclusively on the Lightning Network'
      ],
      correct: 2
    },
    {
      id: 16,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'What determines the fee of a Bitcoin transaction?',
      options: [
        'The dollar value of the transaction — the higher the value, the higher the fee',
        'The demand for block space — when many people want to transact, fees go up',
        "The sender's country of origin",
        'The exchange that processed the transaction',
        'A fixed table defined by Bitcoin developers'
      ],
      correct: 1
    },
    {
      id: 17,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'What is a full node on the Bitcoin network?',
      options: [
        'A miner with the most powerful equipment on the network',
        'A computer that stores a complete copy of the blockchain and independently verifies all transactions and protocol rules',
        'A wallet that holds more than 1 whole bitcoin',
        'The central server that distributes Bitcoin software updates',
        'An internet access point used exclusively for Bitcoin transactions'
      ],
      correct: 1
    },
    {
      id: 18,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: "What is Bitcoin's mempool?",
      options: [
        'The storage space where mined bitcoins are kept',
        'A mining pool shared among multiple miners',
        'The waiting area where transactions wait to be included in a block by miners',
        'A type of wallet that stores multiple cryptocurrencies',
        "The name of the database that records all users' addresses"
      ],
      correct: 2
    },
    {
      id: 19,
      category: 'halving_mining',
      difficulty: 'hard',
      question: 'What is the difficulty adjustment in Bitcoin mining?',
      options: [
        'The change in the minimum price to buy 1 bitcoin',
        'An automatic mechanism that recalibrates every 2,016 blocks (~2 weeks) to maintain an average time of 10 minutes per block',
        'The manual increase in difficulty made by developers at each halving',
        'The difference in difficulty between mining Bitcoin and other cryptocurrencies',
        'A test that new miners must pass to join the network'
      ],
      correct: 1
    },
    {
      id: 20,
      category: 'onchain_technical',
      difficulty: 'hard',
      question: 'What is the MVRV (Market Value to Realized Value) indicator?',
      options: [
        'An indicator that measures the volume of transactions on the Lightning Network',
        'The ratio between Bitcoin market value and realized value (average acquisition cost of all bitcoins), used to identify if the market is overvalued or undervalued',
        'The number of active wallets divided by the total number of wallets created',
        'The average hash rate divided by the network energy consumption',
        'An indicator that measures the speed of transactions on the blockchain'
      ],
      correct: 1
    }
  ]
};

// ============================================================
// Níveis de resultado
// ============================================================
const LEVELS = {
  pt: [
    { min: 0,  max: 5,  key: 'nocoiner',    name: 'Nocoiner',    icon: '🔴', description: 'Você ainda não caiu na toca do coelho. Mas calma, todo bitcoiner começou assim.' },
    { min: 6,  max: 10, key: 'curioso',      name: 'Curioso',     icon: '🔍', description: 'Você já ouviu falar de Bitcoin, mas tem muito a explorar. A jornada está só começando.' },
    { min: 11, max: 15, key: 'iniciante',    name: 'Iniciante',   icon: '🌱', description: 'Você já entende o básico e está no caminho certo. Hora de aprofundar.' },
    { min: 16, max: 18, key: 'bitcoiner',    name: 'Bitcoiner',   icon: '⚡', description: 'Você manja de Bitcoin. Poucos chegam a esse nível de conhecimento.' },
    { min: 19, max: 20, key: 'maximalista',  name: 'Maximalista', icon: '👑', description: 'Você é raiz. Satoshi ficaria orgulhoso.' }
  ],
  en: [
    { min: 0,  max: 5,  key: 'nocoiner',    name: 'Nocoiner',    icon: '🔴', description: "You haven't fallen down the rabbit hole yet. But don't worry, every bitcoiner started here." },
    { min: 6,  max: 10, key: 'curioso',      name: 'Curious',     icon: '🔍', description: "You've heard about Bitcoin, but there's a lot to explore. The journey is just beginning." },
    { min: 11, max: 15, key: 'iniciante',    name: 'Beginner',    icon: '🌱', description: "You understand the basics and you're on the right track. Time to go deeper." },
    { min: 16, max: 18, key: 'bitcoiner',    name: 'Bitcoiner',   icon: '⚡', description: 'You really know Bitcoin. Few reach this level of knowledge.' },
    { min: 19, max: 20, key: 'maximalista',  name: 'Maximalist',  icon: '👑', description: 'You are OG. Satoshi would be proud.' }
  ]
};

// ============================================================
// Categorias e recomendações de conteúdo
// ============================================================
const CATEGORIES = {
  pt: {
    fundamentals:      'Fundamentos do Bitcoin',
    halving_mining:    'Halving e Mineração',
    security_custody:  'Segurança e Auto-Custódia',
    lightning:         'Lightning Network',
    onchain_technical: 'Conceitos Técnicos (On-chain)'
  },
  en: {
    fundamentals:      'Bitcoin Fundamentals',
    halving_mining:    'Halving & Mining',
    security_custody:  'Security & Self-Custody',
    lightning:         'Lightning Network',
    onchain_technical: 'Technical Concepts (On-chain)'
  }
};

const RECOMMENDATIONS = {
  pt: {
    fundamentals: [
      { title: 'Aprendizados com o Bitcoin', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/aprendizados-com-o-bitcoin-b58ceeeec318' },
      { title: 'Canal Explica Bitcoin', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@ExplicaBitcoin' },
      { title: 'Compreendendo a Adoção Global do Bitcoin', type: 'podcast', source: 'Bipa Cast #36', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Compreendendo-a-Adoo-Global-do-Bitcoin---Caio-Leta---Bipa-Cast-36-e2r085j' }
    ],
    halving_mining: [
      { title: 'Mineração de Bitcoin e o argumento a favor do uso de mais energia', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/minera%C3%A7%C3%A3o-de-bitcoin-e-o-argumento-a-favor-do-uso-de-mais-energia-334880ff8aa0' },
      { title: 'O Halving está precificado?', type: 'podcast', source: 'Bipa Cast #03', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Bipa-Cast-003---O-Halving-est-precificado-e2hu787' },
      { title: 'Canal Bipa Podcasts', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@usebipa' }
    ],
    security_custody: [
      { title: 'Sobre auto-custódia', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/sobre-auto-cust%C3%B3dia-7e0913f98646' },
      { title: 'A custódia do Bitcoin — Rod Carraresi', type: 'podcast', source: 'Bipa Cast #14', url: 'https://creators.spotify.com/pod/show/bipa/episodes/A-custdia-do-Bitcoin---Rod-Carraresi--Bipa-Cast-014-e2l5el0' },
      { title: 'Autocustódia Segura — Rodrigo Carraresi', type: 'podcast', source: 'Bipa Cast #62', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Autocustdia-Segura-Proteja-Suas-Moedas-de-Bitcoin-com-Confiana---Rodrigo-Carraresi---Bipa-Cast-62-e32kep1' }
    ],
    lightning: [
      { title: 'A rede Lightning está dirigindo a explosão de adoção do Bitcoin', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/a-rede-lightning-est%C3%A1-dirigindo-a-atual-explos%C3%A3o-de-ado%C3%A7%C3%A3o-mainstream-em-bitcoin-e4000a9fec23' },
      { title: 'Canal Explica Bitcoin', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@ExplicaBitcoin' }
    ],
    onchain_technical: [
      { title: 'Precificando o Bitcoin', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/precificando-o-bitcoin-4a7b3acf6c2e' },
      { title: 'O Ecossistema Cripto — Bipa Macro #01', type: 'podcast', source: 'Bipa Macro', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/O-Ecossistema-Cripto-em-Fevereiro-de-2025---Bipa-Macro-01-e2v04rj' },
      { title: 'Termômetro Bitcoin — Indicadores On-chain', type: 'tool', source: 'Leta Build', url: 'https://letabuild.com/btc/' }
    ]
  },
  en: {
    fundamentals: [
      { title: 'Learnings from Bitcoin', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/aprendizados-com-o-bitcoin-b58ceeeec318' },
      { title: 'Explica Bitcoin Channel', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@ExplicaBitcoin' },
      { title: 'Understanding Global Bitcoin Adoption', type: 'podcast', source: 'Bipa Cast #36', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Compreendendo-a-Adoo-Global-do-Bitcoin---Caio-Leta---Bipa-Cast-36-e2r085j' }
    ],
    halving_mining: [
      { title: 'Bitcoin Mining and the case for using more energy', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/minera%C3%A7%C3%A3o-de-bitcoin-e-o-argumento-a-favor-do-uso-de-mais-energia-334880ff8aa0' },
      { title: 'Is the Halving priced in?', type: 'podcast', source: 'Bipa Cast #03', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Bipa-Cast-003---O-Halving-est-precificado-e2hu787' },
      { title: 'Bipa Podcasts Channel', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@usebipa' }
    ],
    security_custody: [
      { title: 'About self-custody', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/sobre-auto-cust%C3%B3dia-7e0913f98646' },
      { title: 'Bitcoin custody — Rod Carraresi', type: 'podcast', source: 'Bipa Cast #14', url: 'https://creators.spotify.com/pod/show/bipa/episodes/A-custdia-do-Bitcoin---Rod-Carraresi--Bipa-Cast-014-e2l5el0' },
      { title: 'Secure Self-Custody — Rodrigo Carraresi', type: 'podcast', source: 'Bipa Cast #62', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/Autocustdia-Segura-Proteja-Suas-Moedas-de-Bitcoin-com-Confiana---Rodrigo-Carraresi---Bipa-Cast-62-e32kep1' }
    ],
    lightning: [
      { title: 'The Lightning Network is driving the Bitcoin adoption explosion', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/a-rede-lightning-est%C3%A1-dirigindo-a-atual-explos%C3%A3o-de-ado%C3%A7%C3%A3o-mainstream-em-bitcoin-e4000a9fec23' },
      { title: 'Explica Bitcoin Channel', type: 'video', source: 'YouTube', url: 'https://www.youtube.com/@ExplicaBitcoin' }
    ],
    onchain_technical: [
      { title: 'Pricing Bitcoin', type: 'article', source: 'Explica Bitcoin', url: 'https://explicabitcoin.medium.com/precificando-o-bitcoin-4a7b3acf6c2e' },
      { title: 'The Crypto Ecosystem — Bipa Macro #01', type: 'podcast', source: 'Bipa Macro', url: 'https://creators.spotify.com/pod/profile/bipa/episodes/O-Ecossistema-Cripto-em-Fevereiro-de-2025---Bipa-Macro-01-e2v04rj' },
      { title: 'Bitcoin Thermometer — On-chain Indicators', type: 'tool', source: 'Leta Build', url: 'https://letabuild.com/btc/' }
    ]
  }
};

// ============================================================
// UI Strings (bilíngue)
// ============================================================
const UI = {
  pt: {
    title: 'Você Entende Bitcoin?',
    subtitle: 'Teste seus conhecimentos com 20 perguntas sobre Bitcoin — de conceitos básicos a análise on-chain.',
    meta: '20 perguntas \u00b7 5 níveis \u00b7 Descubra o seu',
    start: 'Começar Quiz',
    next: 'Próxima',
    prev: 'Anterior',
    finish: 'Ver Resultado',
    correct: 'Correto!',
    wrong: 'Incorreto',
    correctAnswer: 'Resposta correta:',
    questionOf: 'de',
    difficulty: { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' },
    result: {
      title: 'Seu Resultado',
      score: 'acertos',
      weakAreas: 'Temas para aprofundar',
      allCorrect: 'Você acertou tudo! Impressionante.',
      recommendations: 'Conteúdos recomendados',
      saveImage: 'Salvar Imagem',
      copyLink: 'Copiar Link',
      copied: 'Link copiado!',
      retake: 'Refazer Quiz',
      cta: 'Quer se aprofundar?',
      ctaButton: 'Fale comigo',
      ctaDesc: 'Consultoria personalizada sobre Bitcoin'
    },
    contentType: { article: 'Artigo', video: 'Vídeo', podcast: 'Podcast', tool: 'Ferramenta' },
    lang: 'EN',
    backHome: 'letabuild.com'
  },
  en: {
    title: 'Do You Understand Bitcoin?',
    subtitle: 'Test your knowledge with 20 questions about Bitcoin — from basic concepts to on-chain analysis.',
    meta: '20 questions \u00b7 5 levels \u00b7 Find out yours',
    start: 'Start Quiz',
    next: 'Next',
    prev: 'Previous',
    finish: 'See Result',
    correct: 'Correct!',
    wrong: 'Incorrect',
    correctAnswer: 'Correct answer:',
    questionOf: 'of',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    result: {
      title: 'Your Result',
      score: 'correct',
      weakAreas: 'Topics to explore',
      allCorrect: 'You got everything right! Impressive.',
      recommendations: 'Recommended content',
      saveImage: 'Save Image',
      copyLink: 'Copy Link',
      copied: 'Link copied!',
      retake: 'Retake Quiz',
      cta: 'Want to go deeper?',
      ctaButton: 'Talk to me',
      ctaDesc: 'Personalized Bitcoin consulting'
    },
    contentType: { article: 'Article', video: 'Video', podcast: 'Podcast', tool: 'Tool' },
    lang: 'PT',
    backHome: 'letabuild.com'
  }
};

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Armazenamento em memória e contador de IDs
let chamados = [];
let proximoId = 1;

// Valores válidos permitidos pelo domínio
const CATEGORIAS_VALIDAS = ['hardware', 'software', 'rede', 'acesso', 'outros'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'];
const SITUACOES_VALIDAS = ['aberto', 'em_andamento', 'resolvido'];

// Mapa de pesos para ordenação por prioridade
const PESO_PRIORIDADE = {
  baixa: 1,
  media: 2,
  alta: 3,
  urgente: 4,
};

// Função auxiliar de validação
function validarDadosChamado({ titulo, descricao, solicitante, categoria, prioridade, situacao }, isAtualizacao = false) {
  const erros = [];

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
    erros.push('O título é obrigatório e deve ter pelo menos 3 caracteres.');
  }

  if (!descricao || typeof descricao !== 'string' || descricao.trim().length < 5) {
    erros.push('A descrição é obrigatória e deve ter pelo menos 5 caracteres.');
  }

  if (!solicitante || typeof solicitante !== 'string' || solicitante.trim().length < 2) {
    erros.push('O solicitante é obrigatório.');
  }

  if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria.toLowerCase())) {
    erros.push(`Categoria inválida. Valores aceitos: ${CATEGORIAS_VALIDAS.join(', ')}.`);
  }

  if (!prioridade || !PRIORIDADES_VALIDAS.includes(prioridade.toLowerCase())) {
    erros.push(`Prioridade inválida. Valores aceitos: ${PRIORIDADES_VALIDAS.join(', ')}.`);
  }

  if (isAtualizacao) {
    if (!situacao || !SITUACOES_VALIDAS.includes(situacao.toLowerCase())) {
      erros.push(`Situação inválida. Valores aceitos: ${SITUACOES_VALIDAS.join(', ')}.`);
    }
  }

  return erros;
}

// 1. ROTA DE RESUMO / INDICADORES (Geralmente GET /chamados/resumo ou GET /resumo)
// Nota: Deve vir ANTES da rota GET /chamados/:id para não confundir "resumo" com um ID
app.get('/chamados/resumo', (req, res) => {
  const total = chamados.length;
  const aberto = chamados.filter((c) => c.situacao === 'aberto').length;
  const em_andamento = chamados.filter((c) => c.situacao === 'em_andamento').length;
  const resolvido = chamados.filter((c) => c.situacao === 'resolvido').length;

  return res.status(200).json({
    total,
    aberto,
    em_andamento,
    resolvido,
  });
});

// 2. LISTAR CHAMADOS COM BUSCA, FILTROS E ORDENAÇÃO (GET /chamados)
app.get('/chamados', (req, res) => {
  const { busca, situacao, categoria, prioridade, ordenar } = req.query;

  let resultado = [...chamados];

  // Busca por título ou solicitante (case-insensitive)
  if (busca && busca.trim() !== '') {
    const termo = busca.trim().toLowerCase();
    resultado = resultado.filter(
      (c) =>
        c.titulo.toLowerCase().includes(termo) ||
        c.solicitante.toLowerCase().includes(termo)
    );
  }

  // Filtros combinados
  if (situacao && situacao !== 'todas') {
    resultado = resultado.filter((c) => c.situacao === situacao.toLowerCase());
  }

  if (categoria && categoria !== 'todas') {
    resultado = resultado.filter((c) => c.categoria === categoria.toLowerCase());
  }

  if (prioridade && prioridade !== 'todas') {
    resultado = resultado.filter((c) => c.prioridade === prioridade.toLowerCase());
  }

  // Ordenação por data ou prioridade
  if (ordenar === 'prioridade') {
    resultado.sort((a, b) => (PESO_PRIORIDADE[b.prioridade] || 0) - (PESO_PRIORIDADE[a.prioridade] || 0));
  } else if (ordenar === 'data_asc') {
    resultado.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
  } else {
    // Padrão: mais recentes primeiro
    resultado.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  return res.status(200).json(resultado);
});

// 3. CONSULTAR CHAMADO INDIVIDUALMENTE (GET /chamados/:id)
app.get('/chamados/:id', (req, res) => {
  const id = Number(req.params.id);
  const chamado = chamados.find((c) => c.id === id);

  if (!chamado) {
    return res.status(404).json({ erro: 'Chamado não encontrado.' });
  }

  return res.status(200).json(chamado);
});

// 4. CADASTRAR NOVO CHAMADO (POST /chamados)
app.post('/chamados', (req, res) => {
  const { titulo, descricao, solicitante, categoria, prioridade } = req.body;

  const erros = validarDadosChamado({ titulo, descricao, solicitante, categoria, prioridade }, false);
  if (erros.length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
  }

  const novoChamado = {
    id: proximoId++,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    solicitante: solicitante.trim(),
    categoria: categoria.toLowerCase(),
    prioridade: prioridade.toLowerCase(),
    situacao: 'aberto', // Regra: todo novo chamado inicia como "aberto"
    criadoEm: new Date().toISOString(),
  };

  chamados.push(novoChamado);

  return res.status(201).json(novoChamado);
});

// 5. ATUALIZAR CHAMADO EXISTENTE (PUT /chamados/:id)
app.put('/chamados/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = chamados.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Chamado não encontrado.' });
  }

  const { titulo, descricao, solicitante, categoria, prioridade, situacao } = req.body;

  const erros = validarDadosChamado(
    { titulo, descricao, solicitante, categoria, prioridade, situacao },
    true
  );

  if (erros.length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
  }

  // Preserva o id e a data de criação originais
  const chamadoAtualizado = {
    ...chamados[index],
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    solicitante: solicitante.trim(),
    categoria: categoria.toLowerCase(),
    prioridade: prioridade.toLowerCase(),
    situacao: situacao.toLowerCase(),
  };

  chamados[index] = chamadoAtualizado;

  return res.status(200).json(chamadoAtualizado);
});

// 6. EXCLUIR CHAMADO (DELETE /chamados/:id)
app.delete('/chamados/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = chamados.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Chamado não encontrado.' });
  }

  // Regra: exclusão permitida somente para chamados resolvidos
  if (chamados[index].situacao !== 'resolvido') {
    return res.status(400).json({
      erro: 'Apenas chamados com situação "resolvido" podem ser excluídos.',
    });
  }

  chamados.splice(index, 1);

  return res.status(200).json({ mensagem: 'Chamado excluído com sucesso.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
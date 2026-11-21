const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

let tickets = [];
let nextId = 1;

const categorias = ['hardware', 'software', 'rede'];
const prioridades = ['baixa', 'media', 'alta'];
const situacoes = ['aberto', 'em_atendimento', 'resolvido'];
const pesoPrioridade = { baixa: 1, media: 2, alta: 3 };

function validarTicket(dados, checarSituacao = false) {
  if (!dados.title || dados.title.trim().length < 3) {
    return 'O título deve ter pelo menos 3 caracteres.';
  }
  if (!dados.description || dados.description.trim().length < 5) {
    return 'A descrição deve ter pelo menos 5 caracteres.';
  }
  if (!dados.requester || dados.requester.trim().length < 2) {
    return 'O solicitante é obrigatório.';
  }
  if (!categorias.includes(dados.category)) {
    return 'Categoria inválida.';
  }
  if (!prioridades.includes(dados.priority)) {
    return 'Prioridade inválida.';
  }
  if (checarSituacao && !situacoes.includes(dados.status)) {
    return 'Situação inválida.';
  }
  return null;
}

// Resumo geral
app.get('/api/summary', (req, res) => {
  res.json({
    total: tickets.length,
    aberto: tickets.filter((t) => t.status === 'aberto').length,
    em_atendimento: tickets.filter((t) => t.status === 'em_atendimento').length,
    resolvido: tickets.filter((t) => t.status === 'resolvido').length,
  });
});

// Listar com busca, filtros e ordenação
app.get('/api/tickets', (req, res) => {
  const { search, status, category, priority, sort } = req.query;
  let lista = [...tickets];

  if (search) {
    const termo = search.toLowerCase();
    lista = lista.filter(
      (t) =>
        t.title.toLowerCase().includes(termo) ||
        t.requester.toLowerCase().includes(termo)
    );
  }

  if (status) {
    lista = lista.filter((t) => t.status === status);
  }

  if (category) {
    lista = lista.filter((t) => t.category === category);
  }

  if (priority) {
    lista = lista.filter((t) => t.priority === priority);
  }

  if (sort === 'priority') {
    lista.sort((a, b) => pesoPrioridade[b.priority] - pesoPrioridade[a.priority]);
  } else {
    lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  res.json(lista);
});

// Consultar chamado por ID
app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.find((t) => t.id === Number(req.params.id));

  if (!ticket) {
    return res.status(404).json({ message: 'Chamado não encontrado.' });
  }

  res.json(ticket);
});

// Criar chamado
app.post('/api/tickets', (req, res) => {
  const erro = validarTicket(req.body);
  if (erro) {
    return res.status(400).json({ message: erro });
  }

  const novoTicket = {
    id: nextId++,
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    requester: req.body.requester.trim(),
    category: req.body.category,
    priority: req.body.priority,
    status: 'aberto',
    createdAt: new Date().toISOString(),
  };

  tickets.push(novoTicket);
  res.status(201).json(novoTicket);
});

// Atualizar chamado
app.put('/api/tickets/:id', (req, res) => {
  const index = tickets.findIndex((t) => t.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: 'Chamado não encontrado.' });
  }

  const erro = validarTicket(req.body, true);
  if (erro) {
    return res.status(400).json({ message: erro });
  }

  tickets[index] = {
    ...tickets[index],
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    requester: req.body.requester.trim(),
    category: req.body.category,
    priority: req.body.priority,
    status: req.body.status,
  };

  res.json(tickets[index]);
});

// Excluir chamado
app.delete('/api/tickets/:id', (req, res) => {
  const index = tickets.findIndex((t) => t.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: 'Chamado não encontrado.' });
  }

  if (tickets[index].status !== 'resolvido') {
    return res.status(400).json({ message: 'Apenas chamados resolvidos podem ser excluídos.' });
  }

  tickets.splice(index, 1);
  res.json({ message: 'Chamado excluído com sucesso.' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
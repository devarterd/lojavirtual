require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const uploadRoute = require("./upload");
const app = express();
const prisma = new PrismaClient();

const STATUS_VALIDOS = ["NOVO", "PAGO", "ENVIADO", "CANCELADO"];
const STATUS_COM_VENDA_CONFIRMADA = ["PAGO", "ENVIADO"];
const FORMAS_PAGAMENTO_VALIDAS = ["Pix", "Cartão", "À vista"];
const DURACAO_TOKEN_ADMIN_MS = 8 * 60 * 60 * 1000;
const FUSO_HORARIO_LOJA = process.env.LOJA_TIME_ZONE || "America/Manaus";
const SEGREDO_SESSAO_ADMIN = process.env.ADMIN_SESSION_SECRET ||
  (process.env.ADMIN_TOKEN && process.env.ADMIN_PASSWORD
    ? crypto
      .createHmac("sha256", process.env.ADMIN_TOKEN)
      .update(process.env.ADMIN_PASSWORD)
      .digest("base64url")
    : "");
const formatadorDoFuso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO_LOJA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const origensPadrao = ["https://ruanduarte777.github.io"];
const origensConfiguradas = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);

function origemPermitida(origem) {
  if (!origem) return true;
  if (origem === "null") return process.env.NODE_ENV !== "production";
  if ([...origensPadrao, ...origensConfiguradas].includes(origem)) return true;

  try {
    const hostname = new URL(origem).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function partesNoFuso(data) {
  return Object.fromEntries(
    formatadorDoFuso
      .formatToParts(data)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  );
}

function dataNoFusoParaUtc(ano, mes, dia, hora = 0, minuto = 0, segundo = 0) {
  const estimativa = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto, segundo));
  const partesExibidas = partesNoFuso(estimativa);
  const exibicaoComoUtc = Date.UTC(
    partesExibidas.year,
    partesExibidas.month - 1,
    partesExibidas.day,
    partesExibidas.hour,
    partesExibidas.minute,
    partesExibidas.second
  );

  return new Date(estimativa.getTime() - (exibicaoComoUtc - estimativa.getTime()));
}

function intervaloDeHojeNaLoja() {
  const hoje = partesNoFuso(new Date());
  const proximoDia = new Date(Date.UTC(hoje.year, hoje.month - 1, hoje.day + 1));

  return {
    inicio: dataNoFusoParaUtc(hoje.year, hoje.month, hoje.day),
    fim: dataNoFusoParaUtc(
      proximoDia.getUTCFullYear(),
      proximoDia.getUTCMonth() + 1,
      proximoDia.getUTCDate()
    ),
  };
}

function criarTokenAdmin() {
  const segredo = SEGREDO_SESSAO_ADMIN;
  if (!segredo) throw new Error("Segredo da sessão administrativa não configurado");

  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: Date.now() + DURACAO_TOKEN_ADMIN_MS })
  ).toString("base64url");
  const assinatura = crypto
    .createHmac("sha256", segredo)
    .update(payload)
    .digest("base64url");

  return `${payload}.${assinatura}`;
}

function tokenAdminValido(token) {
  const segredo = SEGREDO_SESSAO_ADMIN;
  if (!token || !segredo) return false;

  const partes = token.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return false;

  const [payloadCodificado, assinaturaRecebida] = partes;
  const assinaturaEsperada = crypto
    .createHmac("sha256", segredo)
    .update(payloadCodificado)
    .digest("base64url");

  const recebida = Buffer.from(assinaturaRecebida);
  const esperada = Buffer.from(assinaturaEsperada);
  if (
    recebida.length !== esperada.length ||
    !crypto.timingSafeEqual(recebida, esperada)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadCodificado, "base64url").toString("utf8")
    );
    return payload.role === "admin" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function exigirAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!tokenAdminValido(token)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  next();
}

app.use(
  cors({
    origin(origem, callback) {
      callback(null, origemPermitida(origem));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/admin/upload", exigirAdmin, uploadRoute);

// Serve imagens do seu projeto (pasta assets na raiz)
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API rodando!" });
});

// 🔹 LISTAR produtos (agora vem do BANCO)
app.get("/api/produtos", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { id: "asc" },
    });

    res.json(produtos);
  } catch (erro) {
    console.error("Erro /api/produtos:", erro);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// 🔹 Buscar 1 produto por ID (pra futura página produto)
app.get("/api/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de produto inválido" });
    }

    const produto = await prisma.produto.findFirst({
      where: { id, ativo: true },
    });

    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    res.json(produto);
  } catch (erro) {
    console.error("Erro /api/produtos/:id:", erro);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// 🔒 ADMIN - listar TODOS produtos (ativos e inativos)
app.get("/api/admin/produtos", exigirAdmin, async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      orderBy: { id: "asc" },
    });
    res.json(produtos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar produtos (admin)" });
  }
});

// 🔒 ADMIN - criar produto
app.post("/api/admin/produtos", exigirAdmin, async (req, res) => {
  try {
    const { nome, marca, volume, preco, imagem, descricao, ativo, categoria } = req.body;
    const precoNormalizado = preco === undefined ? 0 : Number(preco);

    if (!nome || !marca || !volume) {
      return res.status(400).json({ error: "nome, marca e volume são obrigatórios" });
    }
    if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    const produto = await prisma.produto.create({
      data: {
        nome: String(nome),
        marca: String(marca),
        volume: String(volume),
        preco: precoNormalizado,
        imagem: String(imagem || "/assets/img/perfume1.jpg"),
        descricao: String(descricao || ""),
        categoria: String(categoria || "perfumes").toLowerCase(), // 👈 AGORA SALVA A CATEGORIA
        ativo: ativo === undefined ? true : Boolean(ativo),
      },
    });

    res.status(201).json(produto);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

// 🔒 ADMIN - editar produto
app.patch("/api/admin/produtos/:id", exigirAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, marca, volume, preco, imagem, descricao, ativo, categoria } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de produto inválido" });
    }
    if (preco !== undefined && (!Number.isFinite(Number(preco)) || Number(preco) < 0)) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    const produto = await prisma.produto.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome: String(nome) } : {}),
        ...(marca !== undefined ? { marca: String(marca) } : {}),
        ...(volume !== undefined ? { volume: String(volume) } : {}),
        ...(preco !== undefined ? { preco: Number(preco) } : {}),
        ...(imagem !== undefined ? { imagem: String(imagem) } : {}),
        ...(descricao !== undefined ? { descricao: String(descricao) } : {}),
        ...(categoria !== undefined ? { categoria: String(categoria).toLowerCase() } : {}), // 👈 AGORA ATUALIZA A CATEGORIA
        ...(ativo !== undefined ? { ativo: Boolean(ativo) } : {}),
      },
    });

    res.json(produto);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// 🔒 ADMIN - listar pedidos (com filtro opcional)
app.get("/api/pedidos", exigirAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status && status !== "TODOS") {
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      where.status = status;
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      include: { itens: true }, // ✅ mantém "itens"
    });

    res.json(pedidos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});

// ✅ RESUMO (DASHBOARD) - métricas do admin
app.get("/api/admin/resumo", exigirAdmin, async (req, res) => {
  try {
    const { inicio: inicioHoje, fim: fimHoje } = intervaloDeHojeNaLoja();

    // Pedidos NOVOS (geral)
    const pedidosNovos = await prisma.pedido.count({
      where: { status: "NOVO" },
    });

    // Pedidos de hoje
    const pedidosHoje = await prisma.pedido.count({
      where: {
        criadoEm: {
          gte: inicioHoje,
          lt: fimHoje,
        },
      },
    });

    const vendasConfirmadas = { status: { in: STATUS_COM_VENDA_CONFIRMADA } };

    // Total vendido hoje (somente pedidos pagos ou enviados)
    const totalHojeAgg = await prisma.pedido.aggregate({
      _sum: { total: true },
      where: {
        ...vendasConfirmadas,
        criadoEm: {
          gte: inicioHoje,
          lt: fimHoje,
        },
      },
    });

    // Total geral vendido (somente pedidos pagos ou enviados)
    const totalGeralAgg = await prisma.pedido.aggregate({
      _sum: { total: true },
      where: vendasConfirmadas,
    });

    res.json({
      pedidosNovos,
      pedidosHoje,
      totalHoje: totalHojeAgg._sum.total || 0,
      totalGeral: totalGeralAgg._sum.total || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar resumo" });
  }
});

// ✅ CRIAR PEDIDO (cliente)
app.post("/api/pedidos", async (req, res) => {
  try {
    const { pagamento, nomeCliente, telefone, endereco, itens } = req.body;

    if (!FORMAS_PAGAMENTO_VALIDAS.includes(pagamento)) {
      return res.status(400).json({ error: "Forma de pagamento inválida" });
    }
    if (typeof endereco !== "string" || !endereco.trim()) {
      return res.status(400).json({ error: "Endereço de entrega é obrigatório" });
    }
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const camposOpcionais = [
      [nomeCliente, "Nome", 120],
      [telefone, "Telefone", 40],
      [endereco, "Endereço", 300],
    ];
    for (const [valor, campo, limite] of camposOpcionais) {
      if (valor != null && (typeof valor !== "string" || valor.trim().length > limite)) {
        return res.status(400).json({ error: `${campo} inválido` });
      }
    }

    const quantidadesPorProduto = new Map();
    for (const item of itens) {
      const produtoId = Number(item?.id);
      const quantidade = Number(item?.quantidade);

      if (!Number.isInteger(produtoId) || produtoId <= 0) {
        return res.status(400).json({ error: "Produto inválido no carrinho" });
      }
      if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > 99) {
        return res.status(400).json({ error: "Quantidade inválida" });
      }

      const quantidadeAtual = quantidadesPorProduto.get(produtoId) || 0;
      if (quantidadeAtual + quantidade > 99) {
        return res.status(400).json({ error: "Quantidade máxima por produto é 99" });
      }
      quantidadesPorProduto.set(produtoId, quantidadeAtual + quantidade);
    }

    const idsProdutos = [...quantidadesPorProduto.keys()];
    const produtos = await prisma.produto.findMany({
      where: { id: { in: idsProdutos }, ativo: true },
    });

    if (produtos.length !== idsProdutos.length) {
      return res.status(400).json({ error: "Um ou mais produtos não estão disponíveis" });
    }

    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
    const itensDoPedido = idsProdutos.map((produtoId) => {
      const produto = produtosPorId.get(produtoId);
      const quantidade = quantidadesPorProduto.get(produtoId);
      const precoEmCentavos = Math.round(Number(produto.preco) * 100);
      const subtotalEmCentavos = precoEmCentavos * quantidade;

      return {
        produtoId,
        nome: produto.nome,
        preco: precoEmCentavos / 100,
        quantidade,
        subtotal: subtotalEmCentavos / 100,
        subtotalEmCentavos,
      };
    });

    if (itensDoPedido.some((item) =>
      !Number.isFinite(item.subtotalEmCentavos) || item.subtotalEmCentavos < 0
    )) {
      return res.status(500).json({ error: "Preço de produto inválido" });
    }

    const totalFinal = itensDoPedido.reduce(
      (total, item) => total + item.subtotalEmCentavos,
      0
    ) / 100;

    const pedido = await prisma.pedido.create({
      data: {
        pagamento,
        total: totalFinal,
        nomeCliente: nomeCliente?.trim() || null,
        telefone: telefone?.trim() || null,
        endereco: endereco?.trim() || null,
        itens: {
          create: itensDoPedido.map(({ subtotalEmCentavos, ...item }) => item),
        },
      },
      include: { itens: true },
    });

    res.status(201).json({
      ...pedido,
      itens: pedido.itens.map((item) => ({
        ...item,
        volume: produtosPorId.get(item.produtoId)?.volume || null,
      })),
    });
  } catch (e) {
    console.error("Erro ao criar pedido:", e);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

// 🔒 ADMIN - atualizar status do pedido
app.patch("/api/pedidos/:id/status", exigirAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data: { status },
    });

    res.json(pedido);
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// 🔒 ADMIN - login
app.post("/api/admin/login", (req, res) => {
  const { senha } = req.body;

  if (!senha) return res.status(400).json({ error: "Senha obrigatória" });

  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Senha incorreta" });
  }

  res.json({ token: criarTokenAdmin() });
});

app.get("/api/promocao", async (req, res) => {
  const promocao = await prisma.promocao.findFirst({
    where: { ativo: true }
  });
  res.json(promocao);
});

app.post("/api/promocao", exigirAdmin, async (req, res) => {

const { titulo, descricao, botao, link } = req.body

const campos = [
  [titulo, "Título", 120],
  [descricao, "Descrição", 500],
  [botao, "Texto do botão", 60],
  [link, "Link", 500],
];

for (const [valor, campo, limite] of campos) {
  if (typeof valor !== "string" || !valor.trim() || valor.trim().length > limite) {
    return res.status(400).json({ error: `${campo} inválido` });
  }
}

const linkNormalizado = link.trim();
try {
  const destino = new URL(linkNormalizado, "https://lojavirtual.local");
  const linkRelativo = destino.origin === "https://lojavirtual.local";
  if (!linkRelativo && !["https:", "http:"].includes(destino.protocol)) {
    return res.status(400).json({ error: "Link inválido" });
  }
} catch {
  return res.status(400).json({ error: "Link inválido" });
}

const promocao = await prisma.promocao.upsert({

where: { id: 1 },

 update: { titulo: titulo.trim(), descricao: descricao.trim(), botao: botao.trim(), link: linkNormalizado },

create: {
 titulo: titulo.trim(),
 descricao: descricao.trim(),
 botao: botao.trim(),
 link: linkNormalizado
}

})

res.json(promocao)

})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});




// ✅ Base correta para imagens no GitHub Pages
const SITE_BASE = window.location.hostname.includes("github.io")
  ? `https://${window.location.host}/lojavirtual`
  : "";

const grid = document.querySelector("#productGrid");

// Variável para guardar todos os produtos carregados da API
let todosOsProdutos = [];

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isUrlCompleta(s) {
  return typeof s === "string" && (s.startsWith("http://") || s.startsWith("https://"));
}

function resolverImagem(img) {
  if (!img) return "";

  // Cloudinary / URL completa
  if (isUrlCompleta(img)) return img;

  let path = img.trim();

  // Remove "./"
  if (path.startsWith("./")) path = path.slice(2);

  // Garante que começa com "/"
  if (!path.startsWith("/")) path = "/" + path;

  // GitHub Pages: precisa de /lojavirtual na frente
  if (window.location.hostname.includes("github.io")) {
    return `https://${window.location.host}/lojavirtual${path}`;
  }

  // Local
  return path;
}

// 1. Função responsável apenas por DESENHAR os cards na tela
function renderizarProdutos(listaDeProdutos) {
  grid.innerHTML = "";

  if (listaDeProdutos.length === 0) {
    grid.innerHTML = `<p class="muted">Nenhum produto encontrado nesta categoria.</p>`;
    return;
  }

  listaDeProdutos.forEach((produto) => {
    const card = document.createElement("article");
    card.classList.add("produto-card");

    const imgUrl = resolverImagem(produto.imagem);

    card.innerHTML = `
      <img class="produto-img" src="${imgUrl}" alt="${produto.nome || "Produto"}" loading="lazy">

      <div class="produto-body">
        <div class="produto-top">
          <div>
            <div class="produto-nome">${produto.nome || ""}</div>
            <div class="produto-meta">${produto.marca || ""} • <span class="badge-volume">${produto.volume || ""}</span></div>
          </div>
          <div class="produto-preco">${formatarPreco(produto.preco)}</div>
        </div>

        <div class="produto-actions">
          <a href="produto.html?id=${produto.id}" class="produto-btn produto-btn-outline">
            Ver produto
          </a>

          <button class="produto-btn">
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    `;

    const botao = card.querySelector("button");
    botao.addEventListener("click", () => {
      adicionarAoCarrinho(produto);
      animarBotaoAdicionado(botao);
    });

    grid.appendChild(card);
  });
}

// 2. Função que busca os produtos na API
async function carregarProdutos() {
  try {
    const response = await fetch(`${window.API_URL}/api/produtos`);
    todosOsProdutos = await response.json();

    // 🔍 NOVO: Mostra no F12 como os produtos vieram do banco
    console.log("Produtos do Banco:", todosOsProdutos);

    // Renderiza todos assim que carrega
    renderizarProdutos(todosOsProdutos);

    // Ativa a lógica dos botões de filtro
    configurarFiltros();
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    grid.innerHTML = `<p class="muted">Erro ao carregar catálogo. Tente novamente.</p>`;
  }
}

// 3. Função de filtros inteligente
function configurarFiltros() {
  const botoesFiltro = document.querySelectorAll(".filter-btn");

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", (e) => {
      // Remove a classe 'active' de todos os botões e adiciona no clicado
      botoesFiltro.forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");

      const categoriaSelecionada = e.target.getAttribute("data-categoria").toLowerCase();

      if (categoriaSelecionada === "todos") {
        renderizarProdutos(todosOsProdutos);
      } else if (categoriaSelecionada === "perfumes") {
        // Se clicar em Perfumes: pega quem tem categoria 'perfume' OU quem não tem categoria cadastrada
        const filtrados = todosOsProdutos.filter((p) => {
          const catProduto = (p.categoria || "").toLowerCase();
          return catProduto.includes("perfume") || catProduto === "";
        });
        renderizarProdutos(filtrados);
      } else {
        // Para Camisas, Garrafas, Variedades: pega apenas os produtos com a categoria cadastrada
        const filtrados = todosOsProdutos.filter((p) => {
          const catProduto = (p.categoria || "").toLowerCase();
          return catProduto.includes(categoriaSelecionada);
        });
        renderizarProdutos(filtrados);
      }
    });
  });
}

function animarBotaoAdicionado(btn) {
  const txtOriginal = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = "0.85";
  btn.textContent = "Adicionado ✓";

  setTimeout(() => {
    btn.textContent = txtOriginal;
    btn.disabled = false;
    btn.style.opacity = "1";
  }, 900);
}

carregarProdutos();

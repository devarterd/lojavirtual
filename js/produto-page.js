const SITE_BASE = window.location.hostname.includes("github.io")
  ? `https://${window.location.host}/lojavirtual/`
  : "";

function isUrlCompleta(s) {
  return typeof s === "string" && (s.startsWith("http://") || s.startsWith("https://"));
}

function resolverImagem(img) {
  if (!img) return "";
  if (isUrlCompleta(img)) return img; // Cloudinary etc.

  // normaliza
  let path = img.trim();

  // remove "./"
  if (path.startsWith("./")) path = path.slice(2);

  // Se for "assets/..." (sem barra), no GitHub Pages precisa virar ".../lojavirtual/assets/..."
  if (window.location.hostname.includes("github.io")) {
    // se já vier "/assets/..." tira a barra pra não quebrar a concatenação
    if (path.startsWith("/")) path = path.slice(1);
    return `${SITE_BASE}${path}`;
  }

  // local: devolve como está
  return img;
}

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

function formatBRL(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarProduto() {
  try {
    if (!id) {
      alert("Produto inválido.");
      window.location.href = "catalogo.html";
      return;
    }

    const res = await fetch(`${window.API_URL}/api/produtos/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const p = await res.json();

    // Render
    document.getElementById("produtoNome").innerText = p.nome || "";
    document.getElementById("produtoDesc").innerText = p.descricao || "Perfume importado original.";
    document.getElementById("produtoPreco").innerText = formatBRL(p.preco);

    const img = document.getElementById("produtoImg");
    img.src = resolverImagem(p.imagem);
    img.alt = p.nome || "Produto";

    // SEO básico dinâmico
    const titulo = `${p.nome} | Fábia D'Lux`;
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.innerText = titulo;
    document.title = titulo;

    const desc = (p.descricao || `Compre ${p.nome} com segurança e finalize pelo WhatsApp.`).slice(0, 150);
    const metaDesc = document.getElementById("metaDesc");
    if (metaDesc) metaDesc.setAttribute("content", desc);

    // Botões
    const btnAdd = document.getElementById("btnAddCarrinho");
    if (btnAdd) {
      btnAdd.onclick = () => {
        adicionarAoCarrinho(p);
        alert("Adicionado ao carrinho!");
      };
    }

    const whats = document.getElementById("btnWhats");
    if (whats) {
      const msg = `Olá! Quero comprar *${p.nome}* por ${formatBRL(p.preco)}.`;
      whats.href = `https://wa.me/5597991758603?text=${encodeURIComponent(msg)}`;
    }

  } catch (err) {
    console.log("Erro ao carregar produto:", err);
    alert("Não foi possível carregar este produto. Tente novamente.");
    window.location.href = "catalogo.html";
  }
}

carregarProduto();

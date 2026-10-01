// URL da API: backend local no desenvolvimento e Railway em produção.
const emDesenvolvimento = !window.location.hostname ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
window.API_URL = emDesenvolvimento
  ? "http://localhost:3000"
  : "https://lojavirtual-production.up.railway.app";

console.log("✅ shared.js carregado");

window.escaparHtml = function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>'"]/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  }[caractere]));
};

function getCarrinho() {
  return JSON.parse(localStorage.getItem("carrinho")) || [];
}

function atualizarContadorCarrinho() {
  const countEl = document.querySelector("#cartCount");
  if (!countEl) return;

  const carrinho = getCarrinho();
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  countEl.textContent = totalItens;
}

atualizarContadorCarrinho();

// Atualiza quando mudar o localStorage (outra aba) e também quando voltar pra página
window.addEventListener("storage", atualizarContadorCarrinho);
window.addEventListener("focus", atualizarContadorCarrinho);
function adicionarAoCarrinho(produto) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  const itemExistente = carrinho.find(item => item.id === produto.id);

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({
      ...produto,
      quantidade: 1
    });
  }

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarContadorCarrinho();
}
(function mostrarLinksAdminSeLogado() {
  const token = localStorage.getItem("admin_token");
  document.querySelectorAll(".adminOnly").forEach((el) => {
    el.style.display = token ? "inline-block" : "none";
  });
})();

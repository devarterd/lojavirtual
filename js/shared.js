// URL da API (local ou produção)
// URL da API (Forçada para o Railway em dev local e produção)
window.API_URL = "https://lojavirtual-production.up.railway.app";

console.log("✅ shared.js carregado");
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
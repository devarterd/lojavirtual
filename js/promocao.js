function linkPromocaoSeguro(link) {
  if (typeof link !== "string" || !link.trim()) return "catalogo.html";

  try {
    const destino = new URL(link, window.location.href);
    return ["https:", "http:"].includes(destino.protocol) ? link : "catalogo.html";
  } catch {
    return "catalogo.html";
  }
}

async function carregarPromocao() {
  try {
    const res = await fetch(`${window.API_URL}/api/promocao`);
    const promo = await res.json();

    if (!promo) return;

    document.getElementById("promoTitulo").innerText =
      promo.titulo || "Ofertas selecionadas";

    document.getElementById("promoDescricao").innerText =
      promo.descricao || "";

    const botao = document.getElementById("promoBotao");

    botao.innerText = promo.botao || "Conferir agora";
    botao.href = linkPromocaoSeguro(promo.link);

  } catch (err) {
    console.log("Erro ao carregar promoção:", err);
  }
}

carregarPromocao();

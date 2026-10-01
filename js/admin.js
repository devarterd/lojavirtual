const API_URL = window.API_URL;
const token = localStorage.getItem("admin_token");
if (!token) {
  window.location.replace("login.html");
}

const listaEl = document.querySelector("#pedidosLista");
const reloadBtn = document.querySelector("#reloadBtn");
const statNovos = document.querySelector("#statNovos");
const statHoje = document.querySelector("#statHoje");
const statTotalHoje = document.querySelector("#statTotalHoje");
const statTotalGeral = document.querySelector("#statTotalGeral");
const filtersEl = document.querySelector("#adminFilters");
let filtroAtual = "TODOS";
let ultimaSolicitacaoPedidos = 0;

function encerrarSessao() {
  localStorage.removeItem("admin_token");
  window.location.replace("login.html");
}

async function requisicaoAdmin(url, opcoes = {}) {
  const headers = new Headers(opcoes.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const resposta = await fetch(url, { ...opcoes, headers });
  if (resposta.status === 401) {
    encerrarSessao();
    const erro = new Error("Sua sessão expirou.");
    erro.sessaoExpirada = true;
    throw erro;
  }

  return resposta;
}

async function carregarResumo(){
  try{
    const resp = await requisicaoAdmin(`${API_URL}/api/admin/resumo`, {
  headers: { Authorization: `Bearer ${token}` }
});
    if(!resp.ok) throw new Error("Falha ao buscar resumo");

    const dados = await resp.json();

    statNovos.textContent = dados.pedidosNovos;
    statHoje.textContent = dados.pedidosHoje;
    statTotalHoje.textContent = formatarPreco(dados.totalHoje);
    statTotalGeral.textContent = formatarPreco(dados.totalGeral);

  } catch(e){
    if (e.sessaoExpirada) return;
    console.error(e);
  }
}

function formatarPreco(valor){
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso){
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Data indisponível" : d.toLocaleString("pt-BR");
}

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>'\"]/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  }[caractere]));
}

function criarCardPedido(pedido){
  const totalItens = (pedido.itens || []).reduce((acc, i) => acc + (i.quantidade || 0), 0);
  const statusAtual = pedido.status || "NOVO";

  const div = document.createElement("div");
  div.className = "adminCard";

  div.innerHTML = `
    <div class="adminRow">
      <div>
        <div class="adminTitle">Pedido #${pedido.id}</div>
        <div class="muted">${formatarData(pedido.criadoEm)} • ${totalItens} item(ns)</div>
      </div>

      <div class="adminRight">
        <select class="adminSelect" data-status="${pedido.id}">
          <option value="NOVO" ${statusAtual==="NOVO"?"selected":""}>NOVO</option>
          <option value="PAGO" ${statusAtual==="PAGO"?"selected":""}>PAGO</option>
          <option value="ENVIADO" ${statusAtual==="ENVIADO"?"selected":""}>ENVIADO</option>
          <option value="CANCELADO" ${statusAtual==="CANCELADO"?"selected":""}>CANCELADO</option>
        </select>

        <button class="btn btn--small adminSave" data-save="${pedido.id}">Salvar</button>

        <div class="adminTotal">${formatarPreco(pedido.total)}</div>
        <div class="muted">${escaparHtml(pedido.pagamento)}</div>
      </div>
    </div>

    <button class="btn btn--outline btn--small adminToggle">Ver itens</button>
    <div class="adminItens" style="display:none;"></div>
  `;

  // Ver itens
  const toggleBtn = div.querySelector(".adminToggle");
  const itensEl = div.querySelector(".adminItens");

  toggleBtn.addEventListener("click", () => {
    const aberto = itensEl.style.display === "block";
    itensEl.style.display = aberto ? "none" : "block";
    toggleBtn.textContent = aberto ? "Ver itens" : "Ocultar itens";

    if (!aberto) {
      itensEl.innerHTML = (pedido.itens || []).map(item => `
        <div class="adminItemRow">
          <div>
            <strong>${escaparHtml(item.nome)}</strong>
            <div class="muted">${item.quantidade}x • ${formatarPreco(item.preco)}</div>
          </div>
          <div class="adminItemSubtotal">${formatarPreco(item.subtotal)}</div>
        </div>
      `).join("");
    }
  });

  // Salvar status
  const saveBtn = div.querySelector(".adminSave");
  const selectEl = div.querySelector(".adminSelect");

  saveBtn.addEventListener("click", async () => {
    
    try {
      saveBtn.disabled = true;
      const textoOriginal = saveBtn.textContent;
      saveBtn.textContent = "Salvando...";

      const resp = await requisicaoAdmin(`${API_URL}/api/pedidos/${pedido.id}/status`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ status: selectEl.value }),
});

      if(!resp.ok){
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao atualizar status");
      }

      saveBtn.textContent = "Salvo ✅";
      await Promise.all([carregarResumo(), carregarPedidos(filtroAtual)]);

    } catch (e) {
      if (!e.sessaoExpirada) {
        alert(e.message);
        saveBtn.textContent = "Salvar";
      }
    } finally {
      saveBtn.disabled = false;
    }
  });

  return div;
}

async function carregarPedidos(status = "TODOS"){
  const solicitacaoAtual = ++ultimaSolicitacaoPedidos;
  try{
    listaEl.innerHTML = `<p class="muted">Carregando...</p>`;

    const resp = await requisicaoAdmin(`${API_URL}/api/pedidos?status=${encodeURIComponent(status)}`, {
  headers: { Authorization: `Bearer ${token}` }
});
    if(!resp.ok) throw new Error("Falha ao buscar pedidos");

    const pedidos = await resp.json();
    if (solicitacaoAtual !== ultimaSolicitacaoPedidos) return;

    if(!pedidos.length){
      listaEl.innerHTML = `<p class="muted">Nenhum pedido nesse filtro.</p>`;
      return;
    }

    listaEl.innerHTML = "";
    pedidos.forEach(p => listaEl.appendChild(criarCardPedido(p)));

  } catch(e){
    if (e.sessaoExpirada || solicitacaoAtual !== ultimaSolicitacaoPedidos) return;
    console.error(e);
    listaEl.innerHTML = `<p class="muted">Não foi possível carregar os pedidos. Tente atualizar a página.</p>`;
  }
}
function aplicarFiltro(novoFiltro){
  filtroAtual = novoFiltro;

  // Atualiza classe ativa
  document.querySelectorAll(".filterBtn").forEach(btn => {
    btn.classList.toggle("filterBtn--active", btn.dataset.filter === filtroAtual);
  });

  carregarPedidos(filtroAtual);
}

if (filtersEl) {
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".filterBtn");
    if (!btn) return;
    aplicarFiltro(btn.dataset.filter);
  });
}

reloadBtn.addEventListener("click", () => {

  carregarResumo();
  carregarPedidos(filtroAtual);
});
carregarResumo();
carregarPedidos(filtroAtual);
const logoutBtn = document.querySelector("#logoutBtn");
logoutBtn.addEventListener("click", encerrarSessao);

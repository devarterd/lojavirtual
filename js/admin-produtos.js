// Usa a API_URL vinda do shared.js
const API_URL = window.API_URL;

const token = localStorage.getItem("admin_token");
if (!token) window.location.href = "login.html";

const tbody = document.getElementById("produtosTbody");
const reloadBtn = document.getElementById("reloadBtn");
const novoBtn = document.getElementById("novoBtn");

const buscaEl = document.getElementById("busca");
const filtroAtivoEl = document.getElementById("filtroAtivo");

const formBox = document.getElementById("formBox");
const formTitle = document.getElementById("formTitle");
const formMsg = document.getElementById("formMsg");

const f_nome = document.getElementById("f_nome");
const f_marca = document.getElementById("f_marca");
const f_volume = document.getElementById("f_volume");
const f_preco = document.getElementById("f_preco");
const f_categoria = document.getElementById("f_categoria");

// ✅ NOVO: input file (substitui f_imagem)
const f_imagemFile = document.getElementById("f_imagemFile");

const f_desc = document.getElementById("f_desc");
const f_ativo = document.getElementById("f_ativo");

// ✅ Preview (aceita os 2 ids pra não quebrar seu HTML)
const previewImg =
  document.getElementById("previewImg") || document.getElementById("imgPreview");

const salvarBtn = document.getElementById("salvarBtn");
const cancelarBtn = document.getElementById("cancelarBtn");

const logoutBtn = document.getElementById("logoutBtn");

let produtosCache = [];
let editId = null;
let imagemAtual = "/assets/img/perfume1.jpg";

function headersAuth() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isUrlCompleta(s) {
  return typeof s === "string" && (s.startsWith("http://") || s.startsWith("https://"));
}

// Se for /assets/... usa do próprio GitHub Pages; se for URL completa, usa como está.
function resolverImagem(img) {
  if (!img) return "";
  if (isUrlCompleta(img)) return img;

  // GitHub Pages: precisa do /lojavirtual
  if (window.location.hostname.includes("github.io")) {
    const repo = window.location.pathname.split("/")[1] || "lojavirtual";
    return `https://${window.location.host}/${repo}${img}`;
  }

  return img;
}

// ✅ Preview do arquivo escolhido (upload)
function atualizarPreviewArquivo() {
  const file = f_imagemFile?.files?.[0];

  if (!previewImg) return;

  if (!file) {
    previewImg.style.display = "none";
    previewImg.src = "";
    return;
  }

  previewImg.src = URL.createObjectURL(file);
  previewImg.style.display = "block";
}

// ✅ Upload para Cloudinary via backend
async function uploadImagem(file) {
  const formData = new FormData();
  formData.append("imagem", file);

  const resp = await fetch(`${API_URL}/api/admin/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Erro ao enviar imagem");

  return data.url;
}

function abrirFormNovo() {
  editId = null;
  formTitle.textContent = "Novo produto";
  formMsg.textContent = "";
  formBox.style.display = "block";

  f_nome.value = "";
  f_marca.value = "";
  f_volume.value = "100ml";
  f_preco.value = "0";
  if (f_categoria) f_categoria.value = "perfumes";
  f_desc.value = "";
  f_ativo.value = "true";

  // ✅ limpa arquivo e preview
  if (f_imagemFile) f_imagemFile.value = "";
  if (previewImg) {
    previewImg.style.display = "none";
    previewImg.src = "";
  }
}

function abrirFormEditar(p) {
  console.log("Produto clicado para editar:", p); // 👈 ADICIONA ESSA LINHA PARA A GENTE VER O BANCO
  editId = p.id;
  formTitle.textContent = `Editar produto #${p.id}`;
  formMsg.textContent = "";
  formBox.style.display = "block";

  f_nome.value = p.nome || "";
  f_marca.value = p.marca || "";
  f_volume.value = p.volume || "";
  f_preco.value = String(p.preco ?? 0);
  if (f_categoria) f_categoria.value = (p.categoria || "perfumes").toLowerCase();
  f_desc.value = p.descricao || "";
  f_ativo.value = String(!!p.ativo);

  // ✅ guarda a imagem atual pra não trocar sem querer
  imagemAtual = p.imagem || "/assets/img/perfume1.jpg";

  // ✅ mostra imagem atual do produto no preview
  if (previewImg) {
    const url = resolverImagem(p.imagem || "");
    if (url) {
      previewImg.src = url;
      previewImg.style.display = "block";
    } else {
      previewImg.style.display = "none";
      previewImg.src = "";
    }
  }

  // ✅ limpa arquivo selecionado (se trocar, vai subir nova)
  if (f_imagemFile) f_imagemFile.value = "";
}

function fecharForm() {
  formBox.style.display = "none";
  formMsg.textContent = "";
}

async function carregarProdutosAdmin() {
  const resp = await fetch(`${API_URL}/api/admin/produtos`, { headers: headersAuth() });
  const data = await resp.json().catch(() => ([]));
  if (!resp.ok) throw new Error(data.error || "Erro ao carregar produtos");
  produtosCache = data;
  render();
}

function aplicarFiltros(lista) {
  const termo = (buscaEl.value || "").trim().toLowerCase();
  const filtro = filtroAtivoEl.value;

  return lista.filter((p) => {
    const okTexto =
      !termo ||
      (p.nome || "").toLowerCase().includes(termo) ||
      (p.marca || "").toLowerCase().includes(termo);

    const okAtivo =
      filtro === "TODOS" ||
      (filtro === "ATIVOS" && p.ativo) ||
      (filtro === "INATIVOS" && !p.ativo);

    return okTexto && okAtivo;
  });
}

function render() {
  const lista = aplicarFiltros(produtosCache);
  tbody.innerHTML = "";

  if (!lista.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted" style="padding:12px;">Nenhum produto encontrado.</td>`;
    tbody.appendChild(tr);
    return;
  }

  lista.forEach((p) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid rgba(255,255,255,0.08)";

tr.addEventListener("mouseenter", () => {
  tr.style.background = "rgba(255,255,255,0.04)";
});

tr.addEventListener("mouseleave", () => {
  tr.style.background = "transparent";
});
    tr.innerHTML = `
      <td style="padding:12px 14px;">${p.id}</td>
      <td style="padding:12px 14px;">
        <img src="${resolverImagem(p.imagem)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:10px;border:1px solid #333;">
      </td>
      <td style="padding:12px 14px;">
        <div><strong>${p.nome}</strong></div>
        <div class="muted">${p.marca} • ${p.volume}</div>
      </td>
      <td style="padding:12px 14px;">${formatarPreco(p.preco)}</td>
      <td style="padding:12px 14px;;">${p.ativo ? "SIM" : "NÃO"}</td>
      <td style="padding:12px 14px;; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn--outline btn--small" data-edit="${p.id}">Editar</button>
        <button class="btn btn--outline btn--small" data-price="${p.id}">Preço</button>
        <button class="btn btn--outline btn--small" data-toggle="${p.id}">
          ${p.ativo ? "Desativar" : "Ativar"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);

    tr.querySelector(`[data-edit="${p.id}"]`).addEventListener("click", () => abrirFormEditar(p));
    tr.querySelector(`[data-price="${p.id}"]`).addEventListener("click", () => editarPrecoRapido(p));
    tr.querySelector(`[data-toggle="${p.id}"]`).addEventListener("click", () => toggleAtivo(p));
  });
}

async function editarPrecoRapido(p) {
  const novo = prompt(`Novo preço para "${p.nome}"`, String(p.preco ?? 0));
  if (novo === null) return;

  const preco = Number(String(novo).replace(",", "."));
  if (!Number.isFinite(preco) || preco < 0) {
    alert("Preço inválido.");
    return;
  }

  const resp = await fetch(`${API_URL}/api/admin/produtos/${p.id}`, {
    method: "PATCH",
    headers: headersAuth(),
    body: JSON.stringify({ preco }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Erro ao atualizar preço");

  await carregarProdutosAdmin();
}

async function toggleAtivo(p) {
  const resp = await fetch(`${API_URL}/api/admin/produtos/${p.id}`, {
    method: "PATCH",
    headers: headersAuth(),
    body: JSON.stringify({ ativo: !p.ativo }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Erro ao alterar ativo");

  await carregarProdutosAdmin();
}

async function salvarProduto() {
  formMsg.textContent = "";
  setSalvarLoading(true, "Salvando...");

  try {
    // ✅ se o admin selecionou um arquivo, sobe pro Cloudinary primeiro
    let imagemUrl = null;
    const file = f_imagemFile?.files?.[0];

    if (file) {
      setSalvarLoading(true, "Enviando imagem...");
      imagemUrl = await uploadImagem(file);
      setSalvarLoading(true, "Salvando...");
    }

    const payload = {
      nome: f_nome.value.trim(),
      marca: f_marca.value.trim(),
      volume: f_volume.value.trim(),
      categoria: f_categoria ? f_categoria.value : "perfumes", // 👈 LINHA ADICIONADA AQUI
      preco: Number(String(f_preco.value).replace(",", ".")),
      imagem: imagemUrl || imagemAtual,
      descricao: f_desc.value.trim(),
      ativo: f_ativo.value === "true",
    };

    if (!payload.nome) throw new Error("Nome é obrigatório.");
    if (!payload.marca) throw new Error("Marca é obrigatória.");
    if (!payload.volume) throw new Error("Volume é obrigatório.");
    if (!Number.isFinite(payload.preco)) throw new Error("Preço inválido.");

    const url = editId
      ? `${API_URL}/api/admin/produtos/${editId}`
      : `${API_URL}/api/admin/produtos`;

    const method = editId ? "PATCH" : "POST";

    const resp = await fetch(url, {
      method,
      headers: headersAuth(),
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || "Erro ao salvar");

    fecharForm();
    await carregarProdutosAdmin();
  } finally {
    setSalvarLoading(false);
  }
}
function setSalvarLoading(isLoading, texto = "Salvar") {
  if (!salvarBtn) return;

  salvarBtn.disabled = isLoading;
  salvarBtn.style.opacity = isLoading ? "0.7" : "1";
  salvarBtn.textContent = isLoading ? texto : "Salvar";
}
// eventos
reloadBtn.addEventListener("click", () => {
  carregarProdutosAdmin().catch((e) => {
    console.error(e);
    alert(e.message || "Erro ao atualizar produtos");
  });
});

novoBtn.addEventListener("click", () => abrirFormNovo());
cancelarBtn.addEventListener("click", fecharForm);

salvarBtn.addEventListener("click", () => {
  salvarProduto().catch((e) => {
    console.error(e);
    formMsg.textContent = e.message || "Erro ao salvar produto";
  });
});

buscaEl.addEventListener("input", render);
filtroAtivoEl.addEventListener("change", render);

f_imagemFile?.addEventListener("change", atualizarPreviewArquivo);

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("admin_token");
  window.location.href = "index.html";
});

carregarProdutosAdmin().catch((e) => {
  console.error(e);
  alert(e.message || "Erro ao carregar painel admin");
});
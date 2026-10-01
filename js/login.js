const API_URL = window.API_URL;
const senhaEl = document.querySelector("#senha");
const loginBtn = document.querySelector("#loginBtn");
const msgEl = document.querySelector("#msg");

loginBtn.addEventListener("click", async () => {
  try {
    msgEl.textContent = "";

    const senha = senhaEl.value.trim();
    if (!senha) {
      msgEl.textContent = "Digite a senha.";
      return;
    }

    const resp = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      msgEl.textContent = data.error || "Erro no login";
      return;
    }

    localStorage.setItem("admin_token", data.token);
    window.location.href = "admin.html";

  } catch (e) {
    console.error(e);
    msgEl.textContent = "Erro. Tente novamente.";
  }
});

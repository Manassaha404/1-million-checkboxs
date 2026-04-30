const CLIENT_ID = "2abdaf3d1ffba3b2d37bb8f9c29c6237";
const AUTH_URL = "http://localhost:8080";
const API_URL = "http://localhost:8000/api/v1";

//all localStorage operations here
const store = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem("tokens"));
    } catch {
      return null;
    }
  },
  set: (v) => localStorage.setItem("tokens", JSON.stringify(v)),
  clear: () => localStorage.removeItem("tokens"),
};

// refresh token
async function refreshTokens(refreshToken) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const fresh = await res.json();

  const tokens = fresh.data.data ?? fresh;
  store.set(tokens);
  return tokens;
}

//ui features
function showAuth() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("auth-overlay").classList.add("visible");
}

function showUser(info) {
  document.getElementById("user-name").textContent =
    `${info.given_name} ${info.family_name}`;
  document.getElementById("user-row").classList.add("visible");
}

function toast(html) {
  const rack = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = html;
  rack.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove());
  }, 3000);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Login
document.getElementById("login-btn").addEventListener("click", () => {
  window.location.href = `${AUTH_URL}/login?clientId=${CLIENT_ID}`;
});

// Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  store.clear();
  window.location.reload();
});

// main function
(async () => {
  // get the code when we first time login
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  // tokens from localStorage
  let tokens = store.get();

  // 1st case -> tokens not stored but login complete so code is there
  if (!tokens && code) {
    window.history.replaceState({}, "", window.location.pathname);
    try {
      // call backend for token exchange: [code] -> [accessToken, refreshToken, id_token]
      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      tokens = body.data.data;

      // store tokens to localStorage
      store.set(tokens);
    } catch {
      showAuth();
      return;
    }
  }

  // if tokens and code are both undefined, user should login
  if (!tokens) {
    showAuth();
    return;
  }

  let userInfo;
  try {
    // get userinfo by id_token
    let res = await fetch(`${API_URL}/auth/info`, {
      headers: { Authorization: `Bearer ${tokens.id_token}` },
    });

    // if id_token expired, try refreshing tokens
    if (res.status === 401) {
      const fresh = await refreshTokens(tokens.refreshToken);
      tokens = fresh; // ✅ refreshTokens() already returns unwrapped tokens

      res = await fetch(`${API_URL}/auth/info`, {
        headers: { Authorization: `Bearer ${tokens.id_token}` },
      });
    }

    if (!res.ok) throw new Error(`Auth info failed: ${res.status}`);

    const body = await res.json();
    userInfo = body.data ?? body;
  } catch (err) {
    // if refreshToken also expires, user should log in
    store.clear();
    showAuth();
    return;
  }

  // user info fetched successfully, show user name
  showUser(userInfo);

  const me = {
    id: userInfo.sub,
    name: `${userInfo.given_name} ${userInfo.family_name}`,
  };

  let checkboxs;
  try {
    // fetching checkboxes with accessToken
    let checkboxRes = await fetch(`${API_URL}/checkbox`, { 
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    // if accessToken expired, try refreshing tokens
    if (checkboxRes.status === 401) {
      const fresh = await refreshTokens(tokens.refreshToken);
      tokens = fresh; 

      checkboxRes = await fetch(`${API_URL}/checkbox`, { 
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
    }

    if (!checkboxRes.ok) throw new Error();
    const rawData = await checkboxRes.json();
    checkboxs = rawData.data;

  } catch {
    document.getElementById("loading").textContent =
      "failed to load. is the server running?";
    return;
  }

  const grid = document.getElementById("grid");
  const fragment = document.createDocumentFragment();
  let checked = 0;

  const socket = io({ auth: { token: store.get()?.accessToken } });

  checkboxs.forEach((value, index) => {
    // create checkboxes
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `cb-${index}`;
    cb.checked = value;
    if (value) checked++;

    // emit event
    cb.addEventListener("change", (e) => {
      socket.emit("client:checkbox:event", {
        isChecked: e.target.checked,
        index,
        userId: me.id,
        displayName: me.name,
      });
    });

    // add to fragment
    fragment.appendChild(cb);
  });

  grid.appendChild(fragment);
  document.getElementById("loading").style.display = "none";
  grid.classList.add("ready");
  document.getElementById("count").textContent =
    `checked: ${checked.toLocaleString()}`;

  // server socket response handler
  socket.on(
    "server:checkbox:event",
    ({ isChecked, index, userId, displayName }) => {
      const cb = document.getElementById(`cb-${index}`);
      if (!cb) return;

      cb.checked = isChecked;
      checked += isChecked ? 1 : -1; // handle total checked counter
      document.getElementById("count").textContent =
        `checked: ${checked.toLocaleString()}`;

      // show realtime who clicked checkboxes
      if (userId !== me.id) {
        toast(
          `<span class="name">${esc(displayName)}</span> ${isChecked ? "☑" : "☐"} #${index + 1}`,
        );
      }
    },
  );
})();
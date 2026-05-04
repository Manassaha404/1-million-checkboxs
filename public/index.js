const CLIENT_ID = "2abdaf3d1ffba3b2d37bb8f9c29c6237";
const AUTH_URL = "http://localhost:8080";
const API_URL = "http://localhost:8000/api/v1";

import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
} from "https://esm.sh/@tanstack/virtual-core";

//localstorage operations
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

// generate fresh Tokens with refreshTokens
async function refreshTokens(rt) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const fresh = await res.json();
  const tokens = fresh.data?.data ?? fresh;
  store.set(tokens);
  return tokens;
}

// <-----------------------------UI----------------------------------------->
//show auth
function showAuth() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("auth-overlay").classList.add("visible");
}

//user information
function showUser(info) {
  document.getElementById("user-name").textContent =
    `${info.given_name} ${info.family_name}`;
  document.getElementById("user-row").classList.add("visible");
}

function esc(s) {
  return s.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function toast(html) {
  const rack = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = html;
  rack.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 3000);
}

document.getElementById("login-btn").onclick = () => {
  window.location.href = `${AUTH_URL}/login?clientId=${CLIENT_ID}`;
};
document.getElementById("logout-btn").onclick = () => {
  store.clear();
  location.reload();
};

// <-----------------------------------MAIN-------------------------------------->
(async () => {
  //get code and tokens
  const code = new URLSearchParams(location.search).get("code");
  let tokens = store.get();
  //conditions
  if (!tokens && code) {
    history.replaceState({}, "", location.pathname);
    try {
      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();
      tokens = body.data.data;
      store.set(tokens);
    } catch {
      showAuth();
      return;
    }
  }
  if (!tokens) return showAuth();

  //set user info
  let userInfo;
  try {
    let res = await fetch(`${API_URL}/auth/info`, {
      headers: { Authorization: `Bearer ${tokens.id_token}` },
    });
    if (res.status === 401) {
      tokens = await refreshTokens(tokens.refreshToken);
      res = await fetch(`${API_URL}/auth/info`, {
        headers: { Authorization: `Bearer ${tokens.id_token}` },
      });
    }
    const body = await res.json();
    userInfo = body.data ?? body;
  } catch {
    store.clear();
    return showAuth();
  }

  showUser(userInfo);
  const me = {
    id: userInfo.sub,
    name: `${userInfo.given_name} ${userInfo.family_name}`,
  };

  // get checkboxs data
  let checkboxes;
  try {
    let res = await fetch(`${API_URL}/checkbox`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (res.status === 401) {
      tokens = await refreshTokens(tokens.refreshToken);
      res = await fetch(`${API_URL}/checkbox`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
    }
    checkboxes = (await res.json()).data;
  } catch {
    document.getElementById("loading").textContent = "failed to load";
    return;
  }

  const socket = io();

  // get grid
  const grid = document.getElementById("grid");
  const loading = document.getElementById("loading");
  const countEl = document.getElementById("count");
  // <-----------------------------VIRTUAL SCROLLING------------------------------->
  loading.style.display = "none";
  grid.classList.add("ready");

  const TOTAL = checkboxes.length;
  const CB_SIZE = 20;
  const CB_GAP = 8;
  const PADDING = 32;
  const ROW_HEIGHT = CB_SIZE + CB_GAP; // 28px
  const COLS = Math.max(
    1,
    Math.floor((grid.clientWidth - PADDING + CB_GAP) / (CB_SIZE + CB_GAP)),
  );
  const ROWS = Math.ceil(TOTAL / COLS);

  let checked = checkboxes.filter(Boolean).length;
  countEl.textContent = `checked: ${checked.toLocaleString()}`;

  const inner = document.createElement("div");
  inner.style.cssText = "position:relative;";
  grid.appendChild(inner);

  /* PERF: row map avoids querySelector on every render tick */
  const rowMap = new Map(); // rowIndex → <div>

  /* PERF: label map lets socket handler update DOM in O(1) */
  const labelMap = new Map(); // checkbox index → <span>.cb-box

  /* ---------------- VIRTUALIZER ---------------- */
  const virt = new Virtualizer({
    count: ROWS,
    getScrollElement: () => grid,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5, // back to 5 — 10 was overkill
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: () => render(),
  });
  const cleanup = virt._didMount();

  function render() {
    const items = virt.getVirtualItems();
    inner.style.height = virt.getTotalSize() + "px";
    const visible = new Set(items.map((v) => v.index));
    for (const [idx, el] of rowMap) {
      if (!visible.has(idx)) {
        for (const label of el.querySelectorAll(".cb-box")) {
          labelMap.delete(Number(label.dataset.index));
        }
        inner.removeChild(el);
        rowMap.delete(idx);
      }
    }

   
    for (const vr of items) {
      let row = rowMap.get(vr.index);

      if (!row) {
        row = document.createElement("div");
        row.style.cssText = `position:absolute;left:0;display:flex;gap:${CB_GAP}px;align-items:center;height:${ROW_HEIGHT}px;`;
        const frag = document.createDocumentFragment();
        for (let c = 0; c < COLS; c++) {
          const i = vr.index * COLS + c;
          if (i >= TOTAL) break;
          const label = document.createElement("label");
          label.className = "cb-wrap";

          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = checkboxes[i];
          input.dataset.index = i;

          const box = document.createElement("span");
          box.className = "cb-box" + (checkboxes[i] ? " is-checked" : "");
          box.dataset.index = i; // used by socket handler via labelMap

          label.appendChild(input);
          label.appendChild(box);
          frag.appendChild(label);

          labelMap.set(i, box); // O(1) lookup later
        }
        row.appendChild(frag);
        inner.appendChild(row);
        rowMap.set(vr.index, row);
      }
      row.style.top = vr.start + "px";
    }
  }

  virt._willUpdate();
  render();

  /* ---------------- INTERACTION ---------------- */
  inner.addEventListener("change", (e) => {
    const input = e.target;
    if (input.type !== "checkbox") return;

    const i = Number(input.dataset.index);
    const val = input.checked;

    checkboxes[i] = val;
    checked += val ? 1 : -1;
    countEl.textContent = `checked: ${checked.toLocaleString()}`;

    /* toggle class only — no reflow, no offsetWidth trick */
    const box = input.nextElementSibling;
    if (box) box.classList.toggle("is-checked", val);

    socket.emit("client:checkbox:event", {
      isChecked: val,
      index: i,
      userId: me.id,
      displayName: me.name,
    });
  });

  //<-----------------------------Socket Logic-------------------------------->
  socket.on(
    "server:checkbox:event",
    ({ isChecked, index, userId, displayName }) => {
      checkboxes[index] = isChecked;
      checked += isChecked ? 1 : -1;
      countEl.textContent = `checked: ${checked.toLocaleString()}`;
      const box = labelMap.get(index);
      if (box) {
        box.classList.toggle("is-checked", isChecked);
        if (userId !== me.id) {
          box.classList.remove("remote-flash");

          requestAnimationFrame(() => box.classList.add("remote-flash"));
        }
      }
      if (userId !== me.id) {
        toast(
          `<span class="name">${esc(displayName)}</span> ${isChecked ? "☑" : "☐"} #${index + 1}`,
        );
      }
    },
  );

  window.addEventListener("beforeunload", cleanup);
})();

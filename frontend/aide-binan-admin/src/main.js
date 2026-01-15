import { firebaseConfig } from "./firebaseConfig.js";
console.log("WEB FIREBASE:", firebaseConfig.projectId, firebaseConfig.authDomain);

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

// ✅ init apps safely (no duplicate app error during reload)
const defaultApp = getApps().find(a => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);
const secondaryApp = getApps().find(a => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");

const auth = getAuth(defaultApp);
const secondaryAuth = getAuth(secondaryApp);
const db = getFirestore(defaultApp);

const USERS_COLLECTION = "users";
const ALLOWED_TASK_ROLES = ["processor", "validator", "inspector"];

const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove("hidden");
const hide = (el) => el?.classList.add("hidden");

const viewHome = $("viewHome");
const viewLogin = $("viewLogin");
const viewDashboard = $("viewDashboard");

function showView(name) {
  hide(viewHome); hide(viewLogin); hide(viewDashboard);
  if (name === "home") show(viewHome);
  if (name === "login") show(viewLogin);
  if (name === "dashboard") show(viewDashboard);
}

function normalizeRole(r = "") {
  return String(r || "").trim().toLowerCase();
}

function isAdminRole(roleNorm) {
  return roleNorm === "admin" || roleNorm === "superadmin";
}
function isSuperAdminRole(roleNorm) {
  return roleNorm === "superadmin";
}

async function fetchUserDoc(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? snap.data() : null;
}

function updateTopbar(email, roleText) {
  const badge = $("userBadge");
  const logoutBtn = $("btnLogout");
  $("userEmail").textContent = email || "";
  $("userRole").textContent = roleText || "";

  if (!email || !roleText) {
    hide(badge);
    hide(logoutBtn);
    return;
  }
  show(badge);
  show(logoutBtn);
}

function setMsg(el, text, ok = false) {
  el.textContent = text;
  el.classList.toggle("border-emerald-200", ok);
  el.classList.toggle("text-emerald-900", ok);
  show(el);
}

/* ==============================
   ✅ NEW: Friendly login errors + pop-out message
   ============================== */
function friendlyAuthError(err) {
  const code = err?.code || "";

  // Most common login errors
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "Wrong email or password. Please try again.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error. Please check your internet connection.";
  }

  return "Login failed. Please try again.";
}

function resetInlineMsg(el) {
  if (!el) return;
  el.textContent = "";
  el.style.transform = "";
  el.style.opacity = "";
  el.style.transition = "";
  hide(el);
}

function popInlineMsg(el, text) {
  if (!el) return;
  el.textContent = text;
  show(el);

  // pop-out animation (no extra CSS needed)
  el.style.transition = "transform 160ms ease, opacity 160ms ease";
  el.style.transform = "translateY(-2px) scale(0.985)";
  el.style.opacity = "0.85";

  requestAnimationFrame(() => {
    el.style.transform = "translateY(0) scale(1)";
    el.style.opacity = "1";
  });
}

// ---------- Navigation ----------
$("goLogin")?.addEventListener("click", () => showView("login"));
$("backHome")?.addEventListener("click", () => showView("home"));
$("goDashboard")?.addEventListener("click", () => (currentUser ? showView("dashboard") : showView("login")));

$("btnLogout")?.addEventListener("click", async () => {
  stopRiderMonitoring();
  await signOut(auth);
  currentUser = null;
  currentRoleNorm = null;
  updateTopbar(null, null);
  showView("home");
});

// ---------- Login ----------
$("btnLogin")?.addEventListener("click", async () => {
  const msg = $("loginMsg");
  resetInlineMsg(msg);

  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value;

  if (!email || !pass) {
    popInlineMsg(msg, "Please enter email and password.");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const userData = await fetchUserDoc(cred.user.uid);
    const roleNorm = normalizeRole(userData?.role);

    if (!isAdminRole(roleNorm)) {
      await signOut(auth);
      popInlineMsg(msg, "Access denied. Admin / Super Admin only.");
      return;
    }

    showView("dashboard");
  } catch (e) {
    // ✅ NOW shows friendly message (not raw Firebase error)
    popInlineMsg(msg, friendlyAuthError(e));
  }
});

// ---------- Tabs ----------
const tabPanels = {
  riders: $("tabRiders"),
  admins: $("tabAdmins"),
  create: $("tabCreate"),
};

function setActiveTab(tabKey) {
  // buttons
  document.querySelectorAll(".tabBtn[data-tab]").forEach((btn) => {
    const active = btn.dataset.tab === tabKey;
    btn.classList.toggle("bg-slate-900", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("border-transparent", active);
    btn.classList.toggle("hover:bg-slate-800", active);

    if (!active) {
      btn.classList.add("border", "border-slate-200", "bg-white", "hover:bg-slate-50");
      btn.classList.remove("bg-slate-900", "text-white", "border-transparent", "hover:bg-slate-800");
    }
  });

  // panels
  Object.values(tabPanels).forEach(hide);
  show(tabPanels[tabKey]);
}

document.querySelectorAll(".tabBtn[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

// refresh
$("btnRefresh")?.addEventListener("click", async () => {
  await loadAdmins();
  applyRiderFilters();
});

// ---------- Admin list ----------
async function loadAdmins() {
  const rows = $("adminRows");
  rows.innerHTML = "";
  hide($("adminsEmpty"));

  // ✅ support both Admin/admin + superadmin
  const qAdmins = query(
    collection(db, USERS_COLLECTION),
    where("role", "in", ["Admin", "admin", "superadmin", "SuperAdmin"])
  );

  const snap = await getDocs(qAdmins);
  $("adminCount").textContent = snap.size;

  if (snap.empty) {
    show($("adminsEmpty"));
    return;
  }

  snap.forEach((d) => {
    const u = d.data() || {};
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "(No name)";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4 font-semibold">${name}</td>
      <td class="py-2 pr-4">${u.email || ""}</td>
      <td class="py-2 pr-4">${u.role || ""}</td>
      <td class="py-2 pr-4">${u.position || ""}</td>
    `;
    rows.appendChild(tr);
  });
}

// ---------- Riders realtime ----------
let unsubRiders = null;
let allRiders = [];

function renderRiders(list) {
  const rows = $("riderRows");
  rows.innerHTML = "";
  $("riderCount").textContent = list.length;

  if (!list.length) {
    show($("ridersEmpty"));
    return;
  }
  hide($("ridersEmpty"));

  list.forEach((u) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "(No name)";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4 font-semibold">${name}</td>
      <td class="py-2 pr-4">${u.email || ""}</td>
      <td class="py-2 pr-4">${u.contactNumber || u.phone || ""}</td>
      <td class="py-2 pr-4">${u.plateNumber || u.plateNo || ""}</td>
      <td class="py-2 pr-4">${u.status || "Active"}</td>
    `;
    rows.appendChild(tr);
  });
}

function normalizeText(str = "") {
  return String(str || "").toLowerCase().trim();
}

function applyRiderFilters() {
  const text = normalizeText($("riderSearch").value);
  const statusFilter = $("riderStatus").value;

  const filtered = allRiders.filter((u) => {
    const fullName = normalizeText([u.firstName, u.lastName].filter(Boolean).join(" "));
    const email = normalizeText(u.email || "");
    const plate = normalizeText(u.plateNumber || u.plateNo || "");
    const st = u.status || "Active";

    const okText = !text || fullName.includes(text) || email.includes(text) || plate.includes(text);
    const okStatus = statusFilter === "ALL" || st === statusFilter;
    return okText && okStatus;
  });

  renderRiders(filtered);
}

function startRiderMonitoring() {
  if (unsubRiders) unsubRiders();

  // ✅ support Rider/rider
  const qRiders = query(
    collection(db, USERS_COLLECTION),
    where("role", "in", ["Rider", "rider"])
  );

  unsubRiders = onSnapshot(qRiders, (snap) => {
    allRiders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    applyRiderFilters();
  });
}

function stopRiderMonitoring() {
  if (unsubRiders) unsubRiders();
  unsubRiders = null;
  allRiders = [];
}

$("riderSearch")?.addEventListener("input", applyRiderFilters);
$("riderStatus")?.addEventListener("change", applyRiderFilters);

// ---------- Create Admin (Super Admin only) ----------
$("btnClearCreate")?.addEventListener("click", () => {
  ["caFirst","caLast","caEmail","caPass","caPos"].forEach((id) => ($(`${id}`).value = ""));
  $("caTaskRole").value = "processor";
  hide($("createMsg"));
});

let currentUser = null;
let currentRoleNorm = null;

$("btnCreateAdmin")?.addEventListener("click", async () => {
  const msg = $("createMsg");
  hide(msg);

  if (!isSuperAdminRole(currentRoleNorm)) {
    return setMsg(msg, "Access denied. Only Super Admin can create admin accounts.");
  }

  const firstName = $("caFirst").value.trim();
  const lastName = $("caLast").value.trim();
  const email = $("caEmail").value.trim().toLowerCase();
  const pass = $("caPass").value;
  const position = $("caPos").value.trim();
  const adminTaskRole = ($("caTaskRole").value || "processor").toLowerCase();

  if (!firstName || !lastName || !email || !pass) {
    return setMsg(msg, "Please fill First Name, Last Name, Email, and Password.");
  }
  if (pass.length < 6) return setMsg(msg, "Password must be at least 6 characters.");
  if (!ALLOWED_TASK_ROLES.includes(adminTaskRole)) return setMsg(msg, "Invalid task role selected.");

  try {
    const newCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const newUid = newCred.user.uid;

    // ✅ IMPORTANT: role must be "Admin" for your mobile AdminLoginPage
    await setDoc(doc(db, USERS_COLLECTION, newUid), {
      uid: newUid,
      firstName,
      lastName,
      email,
      role: "Admin",
      adminTaskRole, // ✅ processor | validator | inspector
      position: position || adminTaskRole, // optional
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    }, { merge: true });

    await signOut(secondaryAuth);

    setMsg(msg, `✅ Admin created: ${email} (${adminTaskRole})`, true);
    await loadAdmins();
    setActiveTab("admins");
  } catch (e) {
    try { await signOut(secondaryAuth); } catch {}
    setMsg(msg, e?.message || "Failed to create admin.");
  }
});

// ---------- Auth watcher ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    currentRoleNorm = null;
    updateTopbar(null, null);
    stopRiderMonitoring();
    showView("home");
    return;
  }

  currentUser = user;

  const userData = await fetchUserDoc(user.uid);
  currentRoleNorm = normalizeRole(userData?.role);

  if (!isAdminRole(currentRoleNorm)) {
    stopRiderMonitoring();
    await signOut(auth);
    alert("Access denied. Admin portal only.");
    showView("home");
    return;
  }

  updateTopbar(user.email, userData?.role || currentRoleNorm);

  // show create admin tab only for superadmin
  if (isSuperAdminRole(currentRoleNorm)) show($("tabCreateAdmin"));
  else hide($("tabCreateAdmin"));

  startRiderMonitoring();
  await loadAdmins();

  showView("dashboard");
  setActiveTab("riders");
});

// start
showView("home");

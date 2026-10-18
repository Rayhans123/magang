document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const u = document.getElementById("username").value.trim(),
    p = document.getElementById("password").value;
  if (u === "admin" && p === "admin123") {
    localStorage.setItem(STORAGE_KEYS.session, "admin");
    location.href = "dashboard.html";
  } else
    document.getElementById("loginError").textContent =
      "Username atau password salah.";
});
if (isLoggedIn()) location.href = "dashboard.html";

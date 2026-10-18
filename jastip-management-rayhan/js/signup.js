document.getElementById("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fullname = document.getElementById("fullname").value.trim(),
    email = document.getElementById("email").value.trim(),
    username = document.getElementById("username").value.trim(),
    password = document.getElementById("password").value;
  
  if (password.length < 6) {
    document.getElementById("signupError").textContent =
      "Password minimal 6 karakter.";
    return;
  }
  
  // Demo: Just redirect to login after successful signup
  alert("Akun berhasil dibuat! Silakan login dengan username: " + username);
  location.href = "index.html";
});

if (localStorage.getItem(STORAGE_KEYS.session) === "admin") {
  location.href = "dashboard.html";
}

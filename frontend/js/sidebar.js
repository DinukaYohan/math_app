function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const expanded = document.getElementById("sidebar-expanded");

    sidebar.classList.toggle("expanded");
    expanded.classList.toggle("d-none");
}

function newChat() {
    window.location.href = "index.html";
}

function goToHistory() {
    window.location.href = "history.html";
}

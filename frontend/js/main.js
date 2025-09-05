document.getElementById("newChatBtn").addEventListener("click", () => {
    // Clear the prompt input
    document.getElementById("promptInput").value = "";

    // Reset filters (optional)
    document.getElementById("country").selectedIndex = 0;
    document.getElementById("language").selectedIndex = 0;
    document.getElementById("grade").selectedIndex = 0;
    document.getElementById("model").selectedIndex = 0;

    // Clear the output box
    document.getElementById("responseText").textContent =
        "New chat started. Your generated question will appear here...";
});

const trigger = document.getElementById("dimension-trigger");
const options = document.getElementById("dimension-options");
const dimensionDisplay = document.getElementById("selected-dimension");

trigger.addEventListener("click", () => {
  const isOpen = options.classList.toggle("show");
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

document.querySelectorAll(".custom-option").forEach(option => {
  option.addEventListener("click", () => {
    const value = option.dataset.value;
    const label = option.textContent.trim();
    const icon = option.querySelector("img").src;

    trigger.innerHTML = `<img src="${icon}" alt="" class="custom-icon" /> ${label}`;
    options.classList.remove("show");
    trigger.setAttribute("aria-expanded", "false");

    // Update dimension display
    if (dimensionDisplay) {
      dimensionDisplay.textContent = label;
    }

    // Hier kannst du das Dropdown-Event weiterreichen:
    // console.log("Selected dimension:", value);
    // z.B. updateMap(value) o. ä.
  });
});

// Optional: Dropdown schließen bei Klick außerhalb
document.addEventListener("click", (e) => {
  if (!document.getElementById("dimension-select-wrapper").contains(e.target)) {
    options.classList.remove("show");
    trigger.setAttribute("aria-expanded", "false");
  }
});

// // Update selection
// Fix?
// customOptions.forEach(option => {
//   option.addEventListener("click", () => {
//     const value = option.dataset.value;
//     const label = option.textContent.trim();
//     const iconSrc = option.querySelector("img")?.src;

//     // Update trigger display
//     trigger.innerHTML = `<img src="${iconSrc}" alt="" class="custom-icon" /> ${label}`;
//     trigger.setAttribute("aria-expanded", "false");
//     options.classList.remove("open");

//     // Call any handler that was previously using the native select
//     handleDimensionChange(value);  // <--- Diese Funktion musst du definieren
//   });
// });
// ===== Sample Medicines Data =====
const medicines = [
  {
    id: 1,
    name: "Aspirin",
    category: "Tablet",
    description:
      "Used to reduce pain, fever, or inflammation. Often used for headaches and cardiovascular health.",
    image: "images/aspirin.png",
  },
  {
    id: 2,
    name: "Benzyl Penicillin",
    category: "Injection",
    description: "Antibiotic used for bacterial infections.",
    image: "images/benzene.png",
  },
  {
    id: 3,
    name: "Paracetamol",
    category: "Tablet",
    description: "Pain reliever and fever reducer.",
    image: "images/paracetamol.png",
  },
  {
    id: 4,
    name: "Amoxicillin",
    category: "Capsule",
    description: "Antibiotic used to treat a variety of infections.",
    image: "images/amoxicillin.png",
  },
  {
    id: 5,
    name: "Ibuprofen",
    category: "Tablet",
    description: "Reduces fever and treats pain or inflammation.",
    image: "images/ibuprofen.png",
  },
  {
    id: 6,
    name: "Cetirizine",
    category: "Tablet",
    description: "Antihistamine used to relieve allergy symptoms.",
    image: "images/cetirizine.png",
  },
  {
    id: 7,
    name: "Doxycycline",
    category: "Capsule",
    description: "Antibiotic for respiratory tract infections and more.",
    image: "images/doxycycline.png",
  },
  {
    id: 8,
    name: "Metformin",
    category: "Tablet",
    description: "Used to treat type 2 diabetes.",
    image: "images/metmormin.png",
  },
];

// ===== Hamburger menu toggle =====
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector("nav");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }
});

// ===== Global Search Bar Handler =====
document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.querySelector(".search-bar");
  const searchInput = document.querySelector(".search-bar input");

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length > 0) {
        localStorage.setItem("medidexSearchQuery", query);
        window.location.href = "medicines.html";
      }
    });
  }
});

// ===== Medicines page script =====
function renderMedicines(meds) {
  const grid = document.querySelector(".medicine-grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (meds.length === 0) {
    grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; font-weight: bold;">No medicines found.</p>`;
    return;
  }

  meds.forEach((med) => {
    const card = document.createElement("div");
    card.classList.add("medicine-card");
    card.innerHTML = `
      <div class="img-wrap">
        <img src="${med.image}" alt="${med.name}" />
      </div>
      <h3><a href="medicine-details.html?id=${med.id}">${med.name}</a></h3>
      <p><strong>Category:</strong> ${med.category}</p>
      <p>${med.description.substring(0, 80)}...</p>
    `;

    // Make entire card clickable
    card.addEventListener("click", () => {
      window.location.href = `medicine-details.html?id=${med.id}`;
    });

    grid.appendChild(card);
  });
}

function filterMedicinesByQuery(query) {
  const lower = query.toLowerCase();
  return medicines.filter((med) => med.name.toLowerCase().includes(lower));
}

function filterMedicinesByLetter(letter) {
  return medicines.filter(
    (med) => med.name.charAt(0).toLowerCase() === letter.toLowerCase()
  );
}

// ===== Alphabet filter click handler =====
function setupAlphabetFilter() {
  const alphabetContainer = document.querySelector(".alphabet-filter");
  if (!alphabetContainer) return;

  alphabetContainer.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const letter = e.target.textContent;
      const filtered = filterMedicinesByLetter(letter);
      renderMedicines(filtered);
      highlightActiveLetter(letter);
    }
  });
}

function highlightActiveLetter(letter) {
  const buttons = document.querySelectorAll(".alphabet-filter button");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.textContent === letter);
  });
}

// ===== On medicines.html page load =====
function onMedicinesPageLoad() {
  if (!document.querySelector(".medicine-grid")) return;

  setupAlphabetFilter();

  let query = localStorage.getItem("medidexSearchQuery") || "";
  localStorage.removeItem("medidexSearchQuery");

  const searchInput = document.querySelector(".search-bar input");
  if (query) {
    searchInput.value = query;
    const filtered = filterMedicinesByQuery(query);
    renderMedicines(filtered);
  } else {
    renderMedicines(medicines);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  onMedicinesPageLoad();
});

// ===== Autocomplete suggestions for search bar =====
document.addEventListener("DOMContentLoaded", () => {
  const searchInputElem = document.querySelector(".search-bar input");
  const suggestionsBox = document.querySelector(".search-bar .suggestions");

  if (!searchInputElem || !suggestionsBox) return;

  searchInputElem.addEventListener("input", () => {
    const query = searchInputElem.value.trim().toLowerCase();

    if (!query) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("active");
      return;
    }

    const matches = medicines.filter((med) =>
      med.name.toLowerCase().startsWith(query)
    );

    if (matches.length === 0) {
      suggestionsBox.innerHTML = "<div>No matches found</div>";
      suggestionsBox.classList.add("active");
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 5)
      .map(
        (med) =>
          `<div tabindex="0" role="option" aria-selected="false">${med.name}</div>`
      )
      .join("");
    suggestionsBox.classList.add("active");
  });

  // Click a suggestion to fill input
  suggestionsBox.addEventListener("click", (e) => {
    if (e.target.tagName === "DIV") {
      searchInputElem.value = e.target.textContent;
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("active");
      searchInputElem.focus();
    }
  });

  // Keyboard navigation inside suggestions
  suggestionsBox.addEventListener("keydown", (e) => {
    const active = suggestionsBox.querySelector(".active");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!active) {
        suggestionsBox.firstChild.focus();
        suggestionsBox.firstChild.classList.add("active");
      } else {
        active.classList.remove("active");
        if (active.nextSibling) {
          active.nextSibling.focus();
          active.nextSibling.classList.add("active");
        } else {
          suggestionsBox.firstChild.focus();
          suggestionsBox.firstChild.classList.add("active");
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!active) {
        suggestionsBox.lastChild.focus();
        suggestionsBox.lastChild.classList.add("active");
      } else {
        active.classList.remove("active");
        if (active.previousSibling) {
          active.previousSibling.focus();
          active.previousSibling.classList.add("active");
        } else {
          suggestionsBox.lastChild.focus();
          suggestionsBox.lastChild.classList.add("active");
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active) {
        searchInputElem.value = active.textContent;
        suggestionsBox.innerHTML = "";
        suggestionsBox.classList.remove("active");
        searchInputElem.form.requestSubmit();
      }
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !searchInputElem.contains(e.target) &&
      !suggestionsBox.contains(e.target)
    ) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("active");
    }
  });
});

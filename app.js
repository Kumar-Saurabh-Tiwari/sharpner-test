const STORAGE_KEY = "simple-feedback";
const ratings = [1, 2, 3, 4, 5];

const form = document.querySelector("#feedback-form");
const list = document.querySelector("#feedback-list");
const statusBox = document.querySelector("#status-message");
const submitButton = document.querySelector("#submit-button");
const nameInput = document.querySelector("#feedback-name");
const ratingInput = document.querySelector("#feedback-rating");
const cancelButton = document.querySelector("#cancel-edit");

let feedback = loadFeedback();
let editingId = null;

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.dataset.error = String(isError);
}

function loadFeedback() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveFeedback() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
}

function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render() {
  if (!feedback.length) {
    list.innerHTML = '<p class="text-secondary mb-0 py-3">No feedback yet.</p>';
    return;
  }

  list.innerHTML = feedback.map((item, index) => {
    const name = escapeHtml(item.name || "Anonymous");
    const rating = Number(item.rating);

    return `
      <article class="list-group-item d-flex justify-content-between align-items-center gap-3">
        <div class="min-w-0">
          <p class="mb-1 fw-semibold text-break">${name}</p>
          <span class="feedback-item-rating">${ratings.includes(rating) ? stars(rating) : "No rating"}</span>
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-index="${index}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-index="${index}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function resetForm() {
  editingId = null;
  form.reset();
  ratingInput.value = "5";
  submitButton.textContent = "Submit";
  cancelButton.hidden = true;
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = feedback[Number(button.dataset.index)];
  if (!item) return;

  if (button.dataset.action === "edit") {
    editingId = item.id;
    nameInput.value = item.name || "";
    ratingInput.value = String(item.rating || 5);
    submitButton.textContent = "Save";
    cancelButton.hidden = false;
    nameInput.focus();
    return;
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete feedback from ${item.name || "Anonymous"}?`)) {
      return;
    }

    feedback = feedback.filter((record) => record.id !== item.id);
    saveFeedback();
    render();

    if (editingId === item.id) {
      resetForm();
    }

    showStatus("Feedback deleted.");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = String(new FormData(form).get("name") || "").trim();
  const rating = Number(new FormData(form).get("rating"));

  if (!name || !ratings.includes(rating)) {
    showStatus("Please enter your name and choose a rating.", true);
    return;
  }

  if (editingId) {
    feedback = feedback.map((item) => item.id === editingId ? { ...item, name, rating } : item);
    showStatus("Feedback updated.");
  } else {
    feedback.unshift({
      id: Date.now().toString(),
      name,
      rating,
    });
    showStatus("Thanks for your feedback!");
  }

  saveFeedback();
  resetForm();
  render();
});

cancelButton.addEventListener("click", resetForm);

render();

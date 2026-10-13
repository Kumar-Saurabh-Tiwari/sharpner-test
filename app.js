const apiUrl = "https://crudcrud.com/api/720fcf35ae7441dbb335eb2449e8ae99/feedback";
const ratings = [1, 2, 3, 4, 5];

const form = document.querySelector("#feedback-form");
const list = document.querySelector("#feedback-list");
const statusBox = document.querySelector("#status-message");
const submitButton = document.querySelector("#submit-button");
const nameInput = document.querySelector("#feedback-name");
const ratingInput = document.querySelector("#feedback-rating");
const cancelButton = document.querySelector("#cancel-edit");

let feedback = [];
let editingId = null;

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.dataset.error = String(isError);
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

async function request(url, method = "GET", data) {
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text || "Bad request"}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
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

async function loadFeedback() {
  try {
    const records = await request(apiUrl);
    feedback = Array.isArray(records) ? records : [];
    render();
  } catch (error) {
    showStatus(`Could not load feedback: ${error.message}`, true);
  }
}

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = feedback[Number(button.dataset.index)];
  if (!item) return;

  if (button.dataset.action === "edit") {
    editingId = item._id;
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

    try {
      await request(`${apiUrl}/${encodeURIComponent(item._id)}`, "DELETE");
      feedback = feedback.filter((record) => record._id !== item._id);

      if (editingId === item._id) {
        resetForm();
      }

      render();
      showStatus("Feedback deleted.");
    } catch (error) {
      showStatus(`Could not delete feedback: ${error.message}`, true);
    }
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const rating = Number(formData.get("rating"));

  if (!name || !ratings.includes(rating)) {
    showStatus("Please enter your name and choose a rating.", true);
    return;
  }

  try {
    if (editingId) {
      await request(`${apiUrl}/${encodeURIComponent(editingId)}`, "PUT", { name, rating });
      feedback = feedback.map((item) => item._id === editingId ? { ...item, name, rating } : item);
      showStatus("Feedback updated.");
    } else {
      const created = await request(apiUrl, "POST", { name, rating });
      if (!created || !created._id) {
        throw new Error("CRUDCrud did not return a valid ID.");
      }

      feedback.unshift(created);
      showStatus("Thanks for your feedback!");
    }

    resetForm();
    render();
  } catch (error) {
    showStatus(`Could not save feedback: ${error.message}`, true);
  }
});

cancelButton.addEventListener("click", resetForm);

loadFeedback();

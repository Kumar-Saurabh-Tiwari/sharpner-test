const apiUrl = "https://crudcrud.com/api/474caf54558b421d84facf259991c399/feedback";
const ratings = [1, 2, 3, 4, 5];

const form = document.querySelector("#feedback-form");
const list = document.querySelector("#feedback-list");
const statusBox = document.querySelector("#status-message");
const submitButton = document.querySelector("#submit-button");
const nameInput = document.querySelector("#feedback-name");
const ratingInput = document.querySelector("#feedback-rating");
const cancelButton = document.querySelector("#cancel-edit");

let feedback = [];
let editingId = "";
let isBusy = false;

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

async function request(path = "", method = "GET", data) {
  const response = await fetch(apiUrl + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function renderSummary() {
  const total = feedback.length;
  const summary = document.querySelector("#rating-summary");

  if (!total) {
    summary.textContent = "No ratings yet";
    document.querySelector("#rating-breakdown").innerHTML = "";
    return;
  }

  const totalScore = feedback.reduce((sum, item) => sum + Number(item.rating || 0), 0);
  const average = totalScore / total;

  summary.textContent = `${average.toFixed(1)} / 5 average · ${total} ${total === 1 ? "rating" : "ratings"}`;

  const breakdown = ratings.slice().reverse().map((rating) => {
    const count = feedback.filter((item) => Number(item.rating) === rating).length;
    const width = (count / total) * 100;

    return `
      <div class="rating-row">
        <span class="rating-stars">${stars(rating)}</span>
        <div class="rating-track">
          <div class="rating-fill" style="width:${width}%"></div>
        </div>
        <span class="rating-count">${count}</span>
      </div>
    `;
  }).join("");

  document.querySelector("#rating-breakdown").innerHTML = breakdown;
}

function renderList() {
  const count = feedback.length;
  document.querySelector("#feedback-count").textContent = count;

  if (!count) {
    list.innerHTML = '<p class="text-secondary mb-0 py-3">No feedback yet.</p>';
    return;
  }

  list.innerHTML = feedback.map((item, index) => {
    const name = escapeHtml(item.name || "Anonymous");
    const rating = Number(item.rating);
    const disabled = isBusy || !item._id ? "disabled" : "";

    return `
      <article class="list-group-item d-flex justify-content-between align-items-center gap-3">
        <div class="min-w-0">
          <p class="mb-1 fw-semibold text-break">${name}</p>
          <span class="feedback-item-rating">${ratings.includes(rating) ? stars(rating) : "No rating"}</span>
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-index="${index}" ${disabled}>Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-index="${index}" ${disabled}>Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function render() {
  renderSummary();
  renderList();
}

function setBusy(value) {
  isBusy = value;
  submitButton.disabled = value;
  nameInput.disabled = value;
  ratingInput.disabled = value;
  cancelButton.disabled = value;
  render();
}

function resetForm() {
  editingId = "";
  form.reset();
  ratingInput.value = "5";
  submitButton.textContent = "Submit";
  cancelButton.hidden = true;
}

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || isBusy) return;

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

  if (!window.confirm(`Delete feedback from ${item.name || "Anonymous"}?`)) {
    return;
  }

  setBusy(true);

  try {
    await request(`/${encodeURIComponent(item._id)}`, "DELETE");
    feedback = feedback.filter((record) => record._id !== item._id);

    if (editingId === item._id) {
      resetForm();
    }

    showStatus("Feedback deleted.");
  } catch (error) {
    showStatus(`Could not delete feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isBusy) return;

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const rating = Number(formData.get("rating"));

  if (!name || !ratings.includes(rating)) {
    showStatus("Enter your name and choose a rating.", true);
    return;
  }

  const record = { name, rating };

  setBusy(true);

  try {
    if (editingId) {
      await request(`/${encodeURIComponent(editingId)}`, "PUT", record);
      feedback = feedback.map((item) => item._id === editingId ? { ...record, _id: editingId } : item);
      showStatus("Feedback updated.");
    } else {
      const created = await request("", "POST", record);
      if (!created?._id) {
        throw new Error("CrudCrud did not return the new feedback ID.");
      }

      feedback.unshift(created);
      showStatus("Thanks for your feedback!");
    }

    resetForm();
  } catch (error) {
    showStatus(`Could not save feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
});

cancelButton.addEventListener("click", resetForm);

async function loadFeedback() {
  setBusy(true);

  try {
    const records = await request();
    if (!Array.isArray(records)) {
      throw new Error("CrudCrud returned an invalid feedback list.");
    }

    feedback = records.filter((item) => item && typeof item === "object");
  } catch (error) {
    showStatus(`Could not load feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
}

loadFeedback();

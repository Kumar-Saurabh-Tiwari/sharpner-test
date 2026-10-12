const $ = (selector) => document.querySelector(selector);
const apiUrl = "https://crudcrud.com/api/474caf54558b421d84facf259991c399/feedback";
const ratings = [1, 2, 3, 4, 5];
const form = $("#feedback-form");
const list = $("#feedback-list");
let feedback = [];
let editingId = "";
let busy = false;

function status(message, error = false) {
  $("#status-message").textContent = message;
  $("#status-message").dataset.error = error;
}

function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

async function request(path = "", method = "GET", data) {
  const response = await fetch(apiUrl + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function render() {
  const counts = ratings.map((rating) =>
    feedback.filter((item) => Number(item.rating) === rating).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const average = total ? counts.reduce((sum, count, i) => sum + count * (i + 1), 0) / total : 0;

  $("#rating-summary").textContent = total
    ? `${average.toFixed(1)} / 5 average · ${total} ${total === 1 ? "rating" : "ratings"}`
    : "No ratings yet";
  $("#rating-breakdown").innerHTML = ratings.slice().reverse().map((rating) => {
    const count = counts[rating - 1];
    return `<div class="rating-row"><span class="rating-stars">${stars(rating)}</span><div class="rating-track"><div class="rating-fill" style="width:${total ? count / total * 100 : 0}%"></div></div><span class="rating-count">${count}</span></div>`;
  }).join("");

  $("#feedback-count").textContent = feedback.length;
  list.innerHTML = feedback.length ? feedback.map((item, index) => {
    const name = String(item.name || "Anonymous").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    const rating = Number(item.rating);
    const disabled = busy || !item._id ? "disabled" : "";
    return `<article class="list-group-item d-flex justify-content-between align-items-center gap-3"><div class="min-w-0"><p class="mb-1 fw-semibold text-break">${name}</p><span class="feedback-item-rating">${ratings.includes(rating) ? stars(rating) : "No rating"}</span></div><div class="d-flex gap-2 flex-shrink-0"><button class="btn btn-sm btn-outline-primary" data-action="edit" data-index="${index}" ${disabled}>Edit</button><button class="btn btn-sm btn-outline-danger" data-action="delete" data-index="${index}" ${disabled}>Delete</button></div></article>`;
  }).join("") : '<p class="text-secondary mb-0 py-3">No feedback yet.</p>';
}

function setBusy(value) {
  busy = value;
  $("#submit-button").disabled = value;
  $("#feedback-name").disabled = value;
  $("#feedback-rating").disabled = value;
  $("#cancel-edit").disabled = value;
  render();
}

function resetForm() {
  editingId = "";
  form.reset();
  $("#feedback-rating").value = "5";
  $("#submit-button").textContent = "Submit";
  $("#cancel-edit").hidden = true;
}

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const item = feedback[button.dataset.index];
  if (!item) return;

  if (button.dataset.action === "edit") {
    editingId = item._id;
    $("#feedback-name").value = item.name || "";
    $("#feedback-rating").value = String(item.rating || 5);
    $("#submit-button").textContent = "Save";
    $("#cancel-edit").hidden = false;
    $("#feedback-name").focus();
    return;
  }

  if (!window.confirm(`Delete feedback from ${item.name || "Anonymous"}?`)) return;
  setBusy(true);
  try {
    await request(`/${encodeURIComponent(item._id)}`, "DELETE");
    feedback = feedback.filter((record) => record._id !== item._id);
    if (editingId === item._id) resetForm();
    status("Feedback deleted.");
  } catch (error) {
    status(`Could not delete feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  const values = new FormData(form);
  const record = { name: values.get("name").trim(), rating: Number(values.get("rating")) };
  if (!record.name || !ratings.includes(record.rating)) return status("Enter your name and choose a rating.", true);

  setBusy(true);
  try {
    if (editingId) {
      await request(`/${encodeURIComponent(editingId)}`, "PUT", record);
      feedback = feedback.map((item) => item._id === editingId ? { ...record, _id: editingId } : item);
      status("Feedback updated.");
    } else {
      const created = await request("", "POST", record);
      if (!created?._id) throw new Error("CrudCrud did not return the new feedback ID.");
      feedback.unshift(created);
      status("Thanks for your feedback!");
    }
    resetForm();
  } catch (error) {
    status(`Could not save feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
});

$("#cancel-edit").addEventListener("click", resetForm);

async function loadFeedback() {
  setBusy(true);
  try {
    const records = await request();
    if (!Array.isArray(records)) throw new Error("CrudCrud returned an invalid feedback list.");
    feedback = records.filter((item) => item && typeof item === "object");
  } catch (error) {
    status(`Could not load feedback: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
}

loadFeedback();

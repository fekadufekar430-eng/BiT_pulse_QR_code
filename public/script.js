// Frontend behavior for the Bahir Dar University Feedback Desk.
const API_URL = "/api/feedback"; // Change this if your frontend and backend use different origins.

const form = document.querySelector("#feedback-form");
const categoryInput = document.querySelector("#category");
const ratingInput = document.querySelector("#rating");
const ratingLabel = document.querySelector("#rating-label");
const stars = [...document.querySelectorAll(".star")];
const categoryButtons = [...document.querySelectorAll(".category-chip")];
const messageInput = document.querySelector("#message");
const charCount = document.querySelector("#char-count");
const formError = document.querySelector("#form-error");
const formStatus = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");
const submitLabel = document.querySelector("#submit-label");

document.querySelector("#year").textContent = new Date().getFullYear();

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    categoryInput.value = button.dataset.category;
  });
});

function updateStars(value) {
  stars.forEach((star) => {
    const selected = Number(star.dataset.rating) <= value;
    star.classList.toggle("selected", selected);
    star.setAttribute("aria-pressed", String(Number(star.dataset.rating) === value));
  });
  ratingLabel.textContent = value ? `${value} out of 5` : "Select rating";
}

stars.forEach((star) => {
  star.addEventListener("click", () => {
    ratingInput.value = star.dataset.rating;
    updateStars(Number(ratingInput.value));
  });
  star.addEventListener("mouseenter", () => {
    stars.forEach((item) => item.classList.toggle("hovered", Number(item.dataset.rating) <= Number(star.dataset.rating)));
  });
  star.addEventListener("mouseleave", () => stars.forEach((item) => item.classList.remove("hovered")));
});

messageInput.addEventListener("input", () => {
  charCount.textContent = `${messageInput.value.length}/1000`;
  formError.textContent = "";
});

function showStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`;
  formStatus.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  formStatus.hidden = true;

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) {
    formError.textContent = "Please enter your name and feedback message.";
    (!name ? document.querySelector("#name") : messageInput).focus();
    return;
  }
  if (email && !document.querySelector("#email").checkValidity()) {
    formError.textContent = "Please enter a valid email address, or leave the email field empty.";
    document.querySelector("#email").focus();
    return;
  }

  const payload = {
    name,
    email: email || undefined,
    category: categoryInput.value,
    rating: ratingInput.value ? Number(ratingInput.value) : undefined,
    message
  };

  submitButton.disabled = true;
  submitLabel.textContent = "Sending feedback…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let result = {};
    try { result = await response.json(); } catch { /* A non-JSON error is handled below. */ }

    if (!response.ok) {
      throw new Error(result.error || result.message || `Submission failed (HTTP ${response.status}).`);
    }

    showStatus(result.message || "Thank you. Your feedback has been submitted successfully.", "success");
    form.reset();
    categoryInput.value = "General";
    ratingInput.value = "";
    categoryButtons.forEach((button) => {
      const selected = button.dataset.category === "General";
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateStars(0);
    charCount.textContent = "0/1000";
  } catch (error) {
    showStatus(
      `${error.message || "We couldn't submit your feedback."} Please check your connection and try again.`,
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = "Send Feedback";
  }
});

updateStars(0);

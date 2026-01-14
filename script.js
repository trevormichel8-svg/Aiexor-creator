// Client-side logic for the AI image generator
// This file adds interactivity to the page, handling prompt submission
// and displaying generated images. It uses the Fetch API to talk to
// the backend endpoint (see api/generate.js). All network requests
// are asynchronous and errors are surfaced to the user.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-form");
  const input = document.getElementById("prompt-input");
  const output = document.getElementById("output");
  const clearBtn = document.getElementById("clear-btn");
  const createBtn = document.getElementById("btn-create-image");

  // Focus the input when the Create image tile is clicked
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      input.focus();
    });
  }

  // Clear output on plus button click
  clearBtn.addEventListener("click", () => {
    output.innerHTML = "";
    input.value = "";
    input.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    output.innerHTML = `<p class="loading">Generating...</p>`;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }
      // Expecting Replicate style response: { output: [url] }
      if (Array.isArray(data.output) && data.output.length > 0) {
        const imgUrl = data.output[0];
        output.innerHTML = `<img src="${imgUrl}" alt="Generated image" />`;
      } else {
        output.innerHTML = `<p class="loading">No image returned.</p>`;
      }
    } catch (err) {
      output.innerHTML = `<p class="loading">${err.message}</p>`;
    }
  });
});
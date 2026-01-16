// Client-side logic for the AI image generator
// This file adds interactivity to the page, handling prompt submission
// and displaying generated images. It uses the Fetch API to talk to
// the backend endpoint (see api/generate.js). All network requests
// are asynchronous and errors are surfaced to the user.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-form");
  const input = document.getElementById("prompt-input");
  const output = document.getElementById("output");
  const sidebar = document.getElementById("sidebar");
  const styleBtn = document.getElementById("style-btn");
  const styleMenu = document.getElementById("style-menu");
  const generateBtn = document.getElementById("generate-btn");
  // Removed the global download button. Downloads are now handled per image.
  const downloadBtn = null;
  const hamburger = document.querySelector(".hamburger");
  const signInBtn = document.getElementById("sign-in-btn");
  const closeSidebarBtn = document.getElementById("close-sidebar");

  // Empty state containing the call-to-action and preset prompts. It will be
  // hidden once the user generates their first image or selects a preset.
  const emptyState = document.getElementById("empty-state");
  // Collection of preset prompt buttons. Clicking these will populate the
  // prompt input and begin generation automatically.
  const presetButtons = document.querySelectorAll(".preset-btn");

  // Track the most recently generated image URL so the download button
  // always downloads the last image that was created. Initialized to null.
  let lastGeneratedImageUrl = null;

  // Disable the download button initially until an image has been
  // successfully generated. This avoids confusion when no image is
  // available to download.
  // With no global download button, there is nothing to disable here.

  // Populate art styles into the style menu
  const styles = [
    "Abstract", "Impressionism", "Cubism", "Futurism", "Surrealism", "Expressionism", "Baroque", "Renaissance",
    "Pop Art", "Art Deco", "Minimalism", "Modernism", "Bauhaus", "Dadaism", "Conceptual", "Street Art",
    "Graffiti", "Anime", "Manga", "Pixel Art", "8-bit", "Steampunk", "Cyberpunk", "Fantasy", "Sci-Fi",
    "Noir", "Gothic", "Nature", "Wildlife", "Portrait", "Landscape", "Seascape", "Cityscape", "Caricature",
    "Watercolor", "Oil Painting", "Acrylic", "Ink Drawing", "Charcoal", "Pastel", "Geometric", "Kawaii", "Retro",
    "Vintage", "Psychedelic", "Horror", "Dark Fantasy", "Ukiyo-e", "Rococo", "Folk Art", "Symbolism", "Art Nouveau",
    "Realism", "Photorealism", "Pointillism", "Mosaic", "Stained Glass", "Vector Art", "Chibi", "Mandalas", "Tribal",
    "Futuristic", "Ancient", "Mythological", "Mythic", "Botanical", "Steampunk Fantasy", "Cyberpunk Neon", "Ghibli",
    "Disney", "Pixar", "Dreamy", "Whimsical", "Glitch", "Abstract Expressionism", "Op Art", "Macro Photography",
    "Microcosm", "Surreal Collage", "Vintage Collage", "Neon Portrait", "Neon Landscape", "Neon Abstract", "Space Art",
    "Galaxy", "Cosmic", "Astral", "Monochrome", "Sepia", "Black & White", "Polaroid", "Impressionist Landscape",
    "Graffiti Portrait", "Retro Futurism", "Double Exposure", "Indigenous", "Coloring Book", "Stencil", "Comic Book", 
    "Highly Detailed"
  ]
  // Ensure at least 100 styles by adding numbered styles if necessary
  while (styles.length < 100) {
    styles.push(`Style ${styles.length + 1}`);
  }
  // Render style list
  styleMenu.innerHTML = styles
    .map((style) => `<li class="style-item" data-style="${style}">${style}</li>`)
    .join("");

  // Toggle sidebar
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Close sidebar when the close button is clicked
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
    });
  }

  // Toggle style menu
  styleBtn.addEventListener("click", () => {
    styleMenu.classList.toggle("open");
  });
  // Clicking a style inserts it into the prompt input. Instead of overwriting
  // the existing prompt, append the selected style to whatever has already
  // been typed. This preserves any existing text and allows multiple
  // styles to be combined, separated by commas.
  styleMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.dataset.style) {
      const style = target.dataset.style;
      const current = input.value.trim();
      input.value = current ? `${current}, ${style}` : style;
      styleMenu.classList.remove("open");
      input.focus();
    }
  });

  // Sign in via Google: open Google sign-in page (placeholder implementation)
  signInBtn.addEventListener("click", () => {
    // Attempt to initiate Google OAuth sign-in. If a client ID is
    // configured in the HTML meta tag, open Google's OAuth endpoint in a
    // new popup window. Otherwise, alert the user to configure a client ID.
    const meta = document.querySelector('meta[name="google-client-id"]');
    const clientId = meta ? meta.getAttribute("content") : "";
    if (clientId) {
      const redirectUri = window.location.origin;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=profile%20email&prompt=select_account`;
      // Open in a popup window
      window.open(
        authUrl,
        "googleSignIn",
        "width=500,height=600,menubar=no,toolbar=no,status=no"
      );
    } else {
      alert(
        'Google sign-in is not configured. Please add your OAuth client ID in the <meta name="google-client-id"> tag.'
      );
    }
  });

  // Generate image function
  async function generateImage() {
    const prompt = input.value.trim();
    if (!prompt) return;
    // Hide the empty state once the user starts generating an image
    if (emptyState) {
      emptyState.style.display = "none";
    }
    // Append a loading message at the end of the output list
    const loadingEl = document.createElement("p");
    loadingEl.className = "loading";
    loadingEl.textContent = "Generating...";
    output.appendChild(loadingEl);
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
      // Remove the loading element
      output.removeChild(loadingEl);
      if (Array.isArray(data.output) && data.output.length > 0) {
        const imgUrl = data.output[0];
        // Track last generated image for potential future use
        lastGeneratedImageUrl = imgUrl;
        // Create a container for the image and its controls
        const containerEl = document.createElement("div");
        containerEl.className = "image-container";
        // Store the prompt on the container so the remix button can reuse it
        containerEl.dataset.prompt = prompt;
        // Create the image element
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "Generated image";
        containerEl.appendChild(img);
        // Create a controls bar to sit at the bottom right of the card
        const controls = document.createElement("div");
        controls.className = "image-controls";
        // Remix / variant button
        const remixBtn = document.createElement("button");
        remixBtn.className = "image-remix-btn";
        remixBtn.setAttribute("aria-label", "Remix image");
        remixBtn.innerHTML = `\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n            <polyline points="23 4 23 10 17 10" />\n            <polyline points="1 20 1 14 7 14" />\n            <path d="M3.51 9a9 9 0 0114.13-3.36l5.36 5.36" />\n            <path d="M20.49 15a9 9 0 01-14.13 3.36L1 13" />\n          </svg>\n        `;
        // Per-card download button
        const cardDownloadBtn = document.createElement("button");
        cardDownloadBtn.className = "image-download-btn";
        cardDownloadBtn.setAttribute("aria-label", "Download image");
        cardDownloadBtn.innerHTML = `\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n            <path d="M12 5v12" />\n            <polyline points="5 13 12 20 19 13" />\n            <path d="M5 19h14" />\n          </svg>\n        `;
        // Remix button handler: generate a new variant and replace the image within this card
        remixBtn.addEventListener("click", async () => {
          const cardPrompt = containerEl.dataset.prompt || input.value.trim();
          if (!cardPrompt) return;
          // Show a loading message while generating
          const loadingText = document.createElement("p");
          loadingText.className = "loading";
          loadingText.textContent = "Generating...";
          containerEl.replaceChild(loadingText, img);
          try {
            const resp = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: cardPrompt }),
            });
            const json = await resp.json();
            if (!resp.ok) {
              throw new Error(json.error || "Failed to generate image");
            }
            if (Array.isArray(json.output) && json.output.length > 0) {
              const newUrl = json.output[0];
              lastGeneratedImageUrl = newUrl;
              img.src = newUrl;
              containerEl.replaceChild(img, loadingText);
            } else {
              loadingText.textContent = "No image returned.";
            }
          } catch (e) {
            loadingText.textContent = e.message;
          }
        });
        // Download button handler: download the image currently displayed in this card
        cardDownloadBtn.addEventListener("click", () => {
          const url = img.src;
          if (!url) return;
          const link = document.createElement("a");
          link.href = url;
          link.download = "generated-image.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
        // Append buttons to controls bar
        controls.appendChild(remixBtn);
        controls.appendChild(cardDownloadBtn);
        containerEl.appendChild(controls);
        // Append the card to the output
        output.appendChild(containerEl);
        // Scroll to the bottom to show the newly added card
        output.scrollTop = output.scrollHeight;
      } else {
        const errorEl = document.createElement("p");
        errorEl.className = "loading";
        errorEl.textContent = "No image returned.";
        output.appendChild(errorEl);
      }
    } catch (err) {
      // Remove the loading element if it still exists
      if (output.contains(loadingEl)) {
        output.removeChild(loadingEl);
      }
      const errorEl = document.createElement("p");
      errorEl.className = "loading";
      errorEl.textContent = err.message;
      output.appendChild(errorEl);
    }
  }

  // Download image function
  function downloadImage() {
    // Use the last generated image URL so the user always downloads the latest
    if (!lastGeneratedImageUrl) return;
    const link = document.createElement("a");
    link.href = lastGeneratedImageUrl;
    link.download = "generated-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Bind generate button
  generateBtn.addEventListener("click", () => {
    generateImage();
  });
  // Bind download button
  // There is no global download button anymore; downloads are handled by per-image controls.
  // Generate on form submit (pressing enter)
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generateImage();
  });

  // Handle clicks on preset prompt buttons. When a preset is selected,
  // populate the prompt input with the preset text, hide the empty state
  // and immediately trigger image generation.
  if (presetButtons) {
    presetButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const presetPrompt = btn.dataset.prompt || btn.textContent.trim();
        input.value = presetPrompt;
        if (emptyState) {
          emptyState.style.display = "none";
        }
        generateImage();
      });
    });
  }
});

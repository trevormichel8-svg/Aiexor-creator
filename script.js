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
  const downloadBtn = document.getElementById("download-btn");
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
  if (downloadBtn) {
    downloadBtn.disabled = true;
  }

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
    "Graffiti Portrait", "Retro Futurism"
  ];
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
    /*
     * Google authentication integration placeholder.
     *
     * A full Google OAuth flow requires an OAuth client ID, redirect URI
     * and additional configuration. Without this configuration the
     * application cannot perform an actual sign-in. To avoid opening a
     * blank or blocked window, we display a message instead.
     */
    alert("Google sign-in is not configured in this demo. Please add OAuth settings.");
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
        // Track last generated image for downloading
        lastGeneratedImageUrl = imgUrl;
        // Wrap the image in a container that adds a visible left border and
        // padding. This ensures the image edges stand out against the
        // background and are not obscured by overlays. See CSS
        // .image-container for styling.
        const containerEl = document.createElement("div");
        containerEl.className = "image-container";
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "Generated image";
        containerEl.appendChild(img);
        output.appendChild(containerEl);
        // Enable the download button now that we have an image
        if (downloadBtn) {
          downloadBtn.disabled = false;
        }
        // Scroll to the bottom of the output to show the new image
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
  downloadBtn.addEventListener("click", () => {
    downloadImage();
  });
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
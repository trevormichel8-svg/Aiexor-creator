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

  // Toggle style menu
  styleBtn.addEventListener("click", () => {
    styleMenu.classList.toggle("open");
  });
  // Clicking a style inserts it into the prompt input
  styleMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.dataset.style) {
      input.value = target.dataset.style;
      styleMenu.classList.remove("open");
      input.focus();
    }
  });

  // Sign in via Google: open Google sign-in page (placeholder implementation)
  signInBtn.addEventListener("click", () => {
    window.open("https://accounts.google.com/signin/v2/identifier", "_blank");
  });

  // Generate image function
  async function generateImage() {
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
      if (Array.isArray(data.output) && data.output.length > 0) {
        const imgUrl = data.output[0];
        output.innerHTML = `<img id="generated-image" src="${imgUrl}" alt="Generated image" />`;
      } else {
        output.innerHTML = `<p class="loading">No image returned.</p>`;
      }
    } catch (err) {
      output.innerHTML = `<p class="loading">${err.message}</p>`;
    }
  }

  // Download image function
  function downloadImage() {
    const img = document.querySelector("#generated-image");
    if (!img) return;
    const link = document.createElement("a");
    link.href = img.src;
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
});
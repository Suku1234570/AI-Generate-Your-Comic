const $ = (id) => document.getElementById(id);

const storyIdea = $("storyIdea");
const genre = $("genre");
const panelCount = $("panelCount");

const storyTitle = $("storyTitle");
const storySummary = $("storySummary");
const charactersList = $("charactersList");
const panelsContainer = $("comicGrid");

const generateButton =
  $("generateBtn") ||
  $("generateDemoBtn") ||
  document.querySelector("button");


// ========================================
// GENERATE STORY
// ========================================

async function generateStory() {

  const idea =
    storyIdea?.value.trim() ||
    "Two school friends discover a magical book";

  const selectedGenre =
    genre?.value || "Fantasy";

  const count =
    Number(panelCount?.value) || 6;

  if (generateButton) {
    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
  }

  try {

    // ====================================
    // GENERATE STORY
    // ====================================

    const response = await fetch(
      "http://localhost:3000/api/generate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          idea: idea,
          genre: selectedGenre,
          panels: count
        })
      }
    );

    const data = await response.json();

    console.log("FULL DATA:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Story generation failed"
      );
    }

    const story = data.story;

    console.log("STORY:", story);
    console.log("CHARACTERS:", story.characters);
    console.log("PANELS:", story.panels);

    // Show story first
    displayStory(story);

    // ====================================
    // GENERATE AI IMAGES
    // ====================================

  } catch (error) {

    console.error("Generate Error:", error);

    alert(
      "Generation failed. Check the terminal."
    );

  } finally {

    if (generateButton) {
      generateButton.disabled = false;
      generateButton.textContent = "Generate Story";
    }

  }
}


// ========================================
// DISPLAY STORY
// ========================================

function displayStory(story) {

  console.log("Displaying story:", story);


  // ======================================
  // TITLE
  // ======================================

  if (storyTitle) {

    storyTitle.textContent =
      story.title || "Untitled Comic";

  }


  // ======================================
  // SUMMARY
  // ======================================

  if (storySummary) {

    storySummary.textContent =
      story.summary ||
      "No summary available.";

  }


  // ======================================
  // CHARACTERS
  // ======================================

  if (charactersList) {

    charactersList.innerHTML = "";

    if (
      story.characters &&
      Array.isArray(story.characters)
    ) {

      story.characters.forEach(
        function (character) {

          const li =
            document.createElement("li");

          li.textContent = character;

          charactersList.appendChild(li);

        }
      );

    } else {

      charactersList.innerHTML =
        "<li>No characters found.</li>";

    }

  }


  // ======================================
  // PANELS
  // ======================================

  if (panelsContainer) {

    panelsContainer.innerHTML = "";

    if (
      story.panels &&
      Array.isArray(story.panels)
    ) {

      story.panels.forEach(
        function (panel, index) {

          const card =
            document.createElement("div");

          card.className = "comic-panel";

          const number =
            panel.number || index + 1;

          const scene =
            panel.scene ||
            "No scene description.";

          const dialogue =
            panel.dialogue ||
            "No dialogue.";


          card.innerHTML = `

            <div class="panel-card">

              <h3>
                Panel ${number}
              </h3>

              <div class="panel-image"
                   id="image-panel-${index}">

                <div class="placeholder-image">

                  <div class="image-icon">
                    🎨
                  </div>

                  <div>
                    Generating AI Image...
                  </div>

                </div>

              </div>

              <div class="panel-content">

                <p>
                  <strong>Scene:</strong>
                  ${escapeHTML(scene)}
                </p>

                <p>
                  <strong>Dialogue:</strong>
                  ${escapeHTML(dialogue)}
                </p>

              </div>

            </div>

          `;

          panelsContainer.appendChild(card);

        }
      );

    } else {

      panelsContainer.innerHTML =
        "<p>No panels found.</p>";

    }

  }


  // ======================================
  // SHOW COMIC SECTION
  // ======================================

  const comicSection = $("comicSection");

  if (comicSection) {
    comicSection.classList.remove("hidden");
  }

}


// ========================================
// GENERATE AI IMAGE FOR EACH PANEL
// ========================================

async function generatePanelImages(panels) {

  if (!panels || !Array.isArray(panels)) {
    return;
  }

  console.log(
    "Starting AI image generation for panels..."
  );


  // Generate one image at a time
  // This avoids sending many requests simultaneously.

  for (let i = 0; i < panels.length; i++) {

    const panel = panels[i];

    const imageContainer =
      document.getElementById(
        `image-panel-${i}`
      );

    if (!imageContainer) {
      continue;
    }


    imageContainer.innerHTML = `

      <div class="placeholder-image">

        <div class="image-icon">
          🎨
        </div>

        <div>
          Generating Panel ${i + 1}...
        </div>

      </div>

    `;


    try {

      console.log(
        `Generating image for Panel ${i + 1}`
      );


      const response = await fetch(
        "http://localhost:3000/api/generate-image",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            scene: panel.scene
          })
        }
      );


      const data =
        await response.json();


      console.log(
        `Image response Panel ${i + 1}:`,
        data
      );


      if (
        !response.ok ||
        !data.success ||
        !data.image
      ) {

        throw new Error(
          data.message ||
          "Image generation failed"
        );

      }


      // ==================================
      // SHOW GENERATED IMAGE
      // ==================================

      imageContainer.innerHTML = `

        <img
          src="data:image/png;base64,${data.image}"
          alt="AI Comic Panel ${i + 1}"
          class="ai-comic-image"
        />

      `;


      console.log(
        `Panel ${i + 1} image generated successfully`
      );


    } catch (error) {

      console.error(
        `Panel ${i + 1} image error:`,
        error
      );


      imageContainer.innerHTML = `

        <div class="placeholder-image">

          <div class="image-icon">
            ⚠️
          </div>

          <div>
            Image generation failed
          </div>

        </div>

      `;

    }

  }


  console.log(
    "All panel image generation completed."
  );

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    String(text);

  return div.innerHTML;

}


// ========================================
// BUTTON
// ========================================

if (generateButton) {

  generateButton.addEventListener(
    "click",
    generateStory
  );

}
// ========================================
// PDF EXPORT
// ========================================

const pdfButton = $("pdfBtn");

if (pdfButton) {

  pdfButton.addEventListener("click", exportPDF);

}


function exportPDF() {

  if (!window.jspdf) {

    alert("PDF library is not loaded.");

    return;

  }


  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF("p", "mm", "a4");


  // ======================================
  // GET STORY DATA
  // ======================================

  const title =
    storyTitle?.textContent ||
    "My Comic";

  const summary =
    storySummary?.textContent ||
    "";


  // ======================================
  // TITLE
  // ======================================

  pdf.setFontSize(24);

  pdf.text(
    title,
    20,
    25
  );


  pdf.setFontSize(12);

  pdf.text(
    "ComicCraft - AI Comic Story Creator",
    20,
    34
  );


  // ======================================
  // SUMMARY
  // ======================================

  pdf.setFontSize(11);

  const summaryLines =
    pdf.splitTextToSize(
      summary,
      170
    );

  pdf.text(
    summaryLines,
    20,
    48
  );


  let y = 65;


  // ======================================
  // CHARACTERS
  // ======================================

  pdf.setFontSize(15);

  pdf.text(
    "Characters",
    20,
    y
  );

  y += 8;

  pdf.setFontSize(10);

  if (
    charactersList &&
    charactersList.children.length > 0
  ) {

    Array.from(
      charactersList.children
    ).forEach((li) => {

      const character =
        li.textContent;

      const lines =
        pdf.splitTextToSize(
          "• " + character,
          170
        );

      pdf.text(
        lines,
        20,
        y
      );

      y +=
        lines.length * 5;

    });

  }


  y += 8;


  // ======================================
  // PANELS
  // ======================================

  const panels =
    panelsContainer?.querySelectorAll(
      ".panel-card"
    );


  if (!panels || panels.length === 0) {

    alert(
      "Please generate a comic first."
    );

    return;

  }


  panels.forEach(
    (panel, index) => {

      // New page
      pdf.addPage();

      let panelY = 25;


      // Panel heading
      pdf.setFontSize(18);

      pdf.text(
        `Panel ${index + 1}`,
        20,
        panelY
      );

      panelY += 12;


      // Find scene
      const paragraphs =
        panel.querySelectorAll(
          ".panel-content p"
        );


      paragraphs.forEach(
        (p) => {

          const text =
            p.textContent.trim();

          const lines =
            pdf.splitTextToSize(
              text,
              170
            );

          pdf.setFontSize(11);

          pdf.text(
            lines,
            20,
            panelY
          );

          panelY +=
            lines.length * 6 + 5;

        }
      );

    }
  );


  // ======================================
  // SAVE PDF
  // ======================================

  const safeTitle =
    title
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 40);


  pdf.save(
    `${safeTitle}_ComicCraft.pdf`
  );


  console.log(
    "PDF exported successfully"
  );

}
//========================================
// SAVE COMIC
// ========================================

const saveButton = $("saveBtn");

if (saveButton) {
  saveButton.addEventListener("click", saveComic);
}

async function saveComic() {

  const title =
    storyTitle?.textContent || "Untitled Comic";

  const summary =
    storySummary?.textContent || "";

  const characters = [];

  if (charactersList) {

    charactersList
      .querySelectorAll("li")
      .forEach((li) => {
        characters.push(li.textContent);
      });

  }

  const panels = [];

  if (panelsContainer) {

    panelsContainer
      .querySelectorAll(".panel-card")
      .forEach((panel, index) => {

        const paragraphs =
          panel.querySelectorAll(
            ".panel-content p"
          );

        let scene = "";
        let dialogue = "";

        if (paragraphs[0]) {
          scene =
            paragraphs[0].textContent
              .replace("Scene:", "")
              .trim();
        }

        if (paragraphs[1]) {
          dialogue =
            paragraphs[1].textContent
              .replace("Dialogue:", "")
              .trim();
        }

        panels.push({
          number: index + 1,
          scene: scene,
          dialogue: dialogue
        });

      });

  }

  try {

    const response = await fetch(
      "http://localhost:3000/api/comics",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          title: title,
          summary: summary,
          characters: characters,
          panels: panels
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok || !data.success) {

      throw new Error(
        data.message ||
        "Could not save comic."
      );

    }

    alert(
      "Comic saved to database! 💾🎉"
    );

    console.log(
      "Saved Comic ID:",
      data.comicId
    );
    displaySavedComics();

  } catch (error) {

    console.error(
      "Save Comic Error:",
      error
    );

    alert(error.message);

  }

}

  alert("Comic saved successfully! 💾");


  // Show saved comics

  displaySavedComics();


// ========================================
// DISPLAY SAVED COMICS
// ========================================
async function displaySavedComics() {

  const savedList = $("savedList");

  if (!savedList) {
    return;
  }

  try {

    const response =
      await fetch(
        "http://localhost:3000/api/comics"
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {

      savedList.innerHTML =
        '<p class="muted">Please login to view your saved comics.</p>';

      return;
    }

    const savedComics =
      data.comics || [];

    if (savedComics.length === 0) {

      savedList.innerHTML =
        '<p class="muted">No comics saved yet.</p>';

      return;
    }

    savedList.innerHTML = "";

    savedComics.forEach((comic) => {

      const card =
        document.createElement("div");

      card.className =
        "saved-comic-card";

     card.innerHTML = `
  <h3>
    ${escapeHTML(comic.title)}
  </h3>

  <p>
    ${escapeHTML(comic.summary)}
  </p>

  <small>
    Saved: ${escapeHTML(comic.createdAt)}
  </small>

  <br><br>

  <button
    class="btn small"
    onclick="deleteDatabaseComic(${comic.id})"
  >
    🗑️ Delete
  </button>
`;

      savedList.appendChild(card);

    });

  } catch (error) {

    console.error(
      "Load Saved Comics Error:",
      error
    );

    savedList.innerHTML =
      '<p class="muted">Could not load saved comics.</p>';

  }

}


// ========================================
// DELETE SAVED COMIC
// ========================================

function deleteSavedComic(id) {

  const savedComics =
    JSON.parse(
      localStorage.getItem("comicCraftComics") ||
      "[]"
    );


  const updatedComics =
    savedComics.filter(
      (comic) => comic.id !== id
    );


  localStorage.setItem(
    "comicCraftComics",
    JSON.stringify(updatedComics)
  );


  displaySavedComics();

}
async function deleteDatabaseComic(id) {

  const confirmDelete =
    confirm(
      "Are you sure you want to delete this comic?"
    );

  if (!confirmDelete) {
    return;
  }

  try {

    const response =
      await fetch(
        `http://localhost:3000/api/comics/${id}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {

      throw new Error(
        data.message ||
        "Could not delete comic."
      );

    }

    alert(
      "Comic deleted successfully! 🗑️"
    );

    displaySavedComics();

  } catch (error) {

    console.error(
      "Delete Comic Error:",
      error
    );

    alert(error.message);

  }

}

// ========================================
// LOAD SAVED COMICS
// ========================================

displaySavedComics();
// ========================================
// LOGIN & REGISTER
// ========================================

const loginForm = $("loginForm");
const registerBtn = $("registerBtn");
const loginSection = $("loginSection");
const logoutBtn = $("logoutBtn");


// LOGIN
if (loginForm) {

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username =
      $("username").value.trim();

    const password =
      $("password").value;

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {

      const response = await fetch(
        "http://localhost:3000/api/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            username: username,
            password: password
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Login failed."
        );
      }

      alert(
        "Welcome to ComicCraft, " +
        data.username +
        "! 🎨"
      );

      localStorage.setItem(
        "comicCraftUser",
        data.username
      );

      loginSection.classList.add("hidden");

      if (logoutBtn) {
        logoutBtn.classList.remove("hidden");
      }

    } catch (error) {

      console.error(
        "Login Error:",
        error
      );

      alert(error.message);

    }

  });

}


// REGISTER
if (registerBtn) {

  registerBtn.addEventListener(
    "click",
    async function () {

      const username =
        $("username").value.trim();

      const password =
        $("password").value;

      if (!username || !password) {

        alert(
          "Enter username and password first."
        );

        return;
      }

      try {

        const response =
          await fetch(
            "http://localhost:3000/api/register",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                username: username,
                password: password
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok || !data.success) {

          throw new Error(
            data.message ||
            "Registration failed."
          );

        }

        alert(
          "Account created successfully! 🎉"
        );

        localStorage.setItem(
          "comicCraftUser",
          data.username
        );

        loginSection.classList.add("hidden");

        if (logoutBtn) {
          logoutBtn.classList.remove("hidden");
        }

      } catch (error) {

        console.error(
          "Register Error:",
          error
        );

        alert(error.message);

      }

    }
  );

}


// LOGOUT
if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    function () {

      localStorage.removeItem(
        "comicCraftUser"
      );

      loginSection.classList.remove(
        "hidden"
      );

      logoutBtn.classList.add(
        "hidden"
      );

      alert("Logged out successfully.");

    }
  );

}
const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const cookieSession = require("cookie-session");

dotenv.config();

const app = express();
const PORT = 3000;
// ========================================
// DATABASE
// ========================================

const db = new Database("comiccraft.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();
// ========================================
// COMICS TABLE
// ========================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS comics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    characters TEXT,
    panels TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

// ========================================
// SESSION
// ========================================

app.use(
  cookieSession({
    name: "comiccraft_session",
    keys: [
      process.env.SESSION_SECRET || "comiccraft-secret-key"
    ],
    maxAge: 24 * 60 * 60 * 1000
  })
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());
app.use(express.static(__dirname));


// ========================================
// TEST API
// ========================================

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "ComicCraft Backend is working!"
  });
});
// ========================================
// REGISTER
// ========================================

app.post("/api/register", async (req, res) => {

  const username =
    String(req.body.username || "").trim();

  const password =
    String(req.body.password || "");

  if (!username || !password) {

    return res.status(400).json({
      success: false,
      message: "Username and password are required."
    });

  }

  try {

    const existingUser =
      db.prepare(
        "SELECT id FROM users WHERE username = ?"
      ).get(username);

    if (existingUser) {

      return res.status(409).json({
        success: false,
        message: "Username already exists."
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result =
      db.prepare(`
        INSERT INTO users (username, password)
        VALUES (?, ?)
      `).run(username, hashedPassword);

    req.session.userId = result.lastInsertRowid;
    req.session.username = username;

    res.json({
      success: true,
      message: "Registration successful.",
      username: username
    });

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Registration failed."
    });

  }

});


// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

  const username =
    String(req.body.username || "").trim();

  const password =
    String(req.body.password || "");

  if (!username || !password) {

    return res.status(400).json({
      success: false,
      message: "Username and password are required."
    });

  }

  try {

    const user =
      db.prepare(
        "SELECT * FROM users WHERE username = ?"
      ).get(username);

    if (!user) {

      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });

    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {

      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });

    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      message: "Login successful.",
      username: user.username
    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Login failed."
    });

  }

});
// ========================================
// SAVE COMIC TO DATABASE
// ========================================

app.post("/api/comics", (req, res) => {

  if (!req.session || !req.session.userId) {

    return res.status(401).json({
      success: false,
      message: "Please login first."
    });

  }

  const {
    title,
    summary,
    characters,
    panels
  } = req.body;

  try {

    const result = db.prepare(`
      INSERT INTO comics
      (user_id, title, summary, characters, panels)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.session.userId,
      title || "Untitled Comic",
      summary || "",
      JSON.stringify(characters || []),
      JSON.stringify(panels || [])
    );

    res.json({
      success: true,
      message: "Comic saved to database.",
      comicId: result.lastInsertRowid
    });

  } catch (error) {

    console.error(
      "SAVE COMIC ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Could not save comic."
    });

  }

});

// ========================================
// GENERATE STORY
// ========================================

app.post("/api/generate", async (req, res) => {

  console.log("GENERATE API CALLED");

  const idea =
    req.body.idea ||
    "Two school friends discover a magical book";

  const genre =
    req.body.genre ||
    "Fantasy";

  const panels =
    Number(req.body.panels) || 6;

  const prompt = `
Create a comic story.

Story idea:
${idea}

Genre:
${genre}

Create exactly ${panels} comic panels.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.

Use this exact structure:

{
  "title": "Comic title",
  "genre": "Comic genre",
  "summary": "Short story summary",
  "characters": [
    "Character 1 - description",
    "Character 2 - description"
  ],
  "panels": [
    {
      "number": 1,
      "scene": "Visual scene description",
      "dialogue": "Character dialogue"
    }
  ]
}

Make the story creative and suitable for a comic.
`;

  try {

    console.log("Trying Gemini model: gemini-3.8-flash");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });


    // ==================================
    // GET TEXT FROM GEMINI RESPONSE
    // ==================================

    const textPart =
      response.candidates?.[0]?.content?.parts?.find(
        part => typeof part.text === "string"
      );

    let text = textPart?.text || "";

    console.log("Gemini Raw Response:");
    console.log(text);


    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }


    // ==================================
    // REMOVE CODE FENCES
    // ==================================

    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();


    // ==================================
    // CONVERT JSON
    // ==================================

    const story = JSON.parse(text);


    console.log("STORY GENERATION SUCCESS");


    return res.json({
      success: true,
      story: story
    });


  } catch (error) {

    console.error(
      "STORY GENERATION ERROR:",
      error.message
    );


    return res.status(503).json({

      success: false,

      message:
        "Gemini story generation failed. Please try again later.",

      error:
        error.message

    });

  }

});


// ========================================
// GENERATE AI COMIC IMAGE
// ========================================

app.post("/api/generate-image", async (req, res) => {

  console.log("IMAGE GENERATION API CALLED");

  const scene =
    req.body.scene ||
    "A student discovering a magical book";

  try {

    const interaction = await ai.interactions.create({

      model: "gemini-3.1-flash-image",

      input: `
Create a single comic panel image.

Scene:
${scene}

Style:
Colorful modern comic book illustration,
clean line art,
vibrant colors,
expressive characters,
cinematic lighting,
detailed background,
family-friendly.

Do not add text.
Do not add speech bubbles.
Create only the visual scene.
      `,

      response_format: {
        type: "image",
        aspect_ratio: "4:3",
        image_size: "1K"
      }

    });


    const generatedImage =
      interaction.output_image;


    if (!generatedImage) {

      throw new Error(
        "No image was returned by Gemini."
      );

    }


    console.log(
      "IMAGE GENERATION SUCCESS"
    );


    res.json({

      success: true,

      image: generatedImage.data

    });


  } catch (error) {

    console.error(
      "IMAGE GENERATION ERROR:",
      error.message
    );


    res.status(500).json({

      success: false,

      message:
        "AI image generation failed.",

      error:
        error.message

    });

  }

});
// ========================================
// GET SAVED COMICS
// ========================================

app.get("/api/comics", (req, res) => {

  if (!req.session || !req.session.userId) {

    return res.status(401).json({
      success: false,
      message: "Please login first."
    });

  }

  try {

    const comics = db.prepare(`
      SELECT
        id,
        title,
        summary,
        characters,
        panels,
        created_at
      FROM comics
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.session.userId);

    const formattedComics =
      comics.map((comic) => {

        return {
          id: comic.id,
          title: comic.title,
          summary: comic.summary,

          characters:
            JSON.parse(
              comic.characters || "[]"
            ),

          panels:
            JSON.parse(
              comic.panels || "[]"
            ),

          createdAt:
            comic.created_at
        };

      });

    res.json({
      success: true,
      comics: formattedComics
    });

  } catch (error) {

    console.error(
      "GET COMICS ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Could not load comics."
    });

  }

});
// ========================================
// DELETE SAVED COMIC
// ========================================

app.delete("/api/comics/:id", (req, res) => {

  if (!req.session || !req.session.userId) {

    return res.status(401).json({
      success: false,
      message: "Please login first."
    });

  }

  const comicId =
    Number(req.params.id);

  try {

    const result = db.prepare(`
      DELETE FROM comics
      WHERE id = ? AND user_id = ?
    `).run(
      comicId,
      req.session.userId
    );

    if (result.changes === 0) {

      return res.status(404).json({
        success: false,
        message: "Comic not found."
      });

    }

    res.json({
      success: true,
      message: "Comic deleted successfully."
    });

  } catch (error) {

    console.error(
      "DELETE COMIC ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Could not delete comic."
    });

  }

});
// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

  console.log(
    `ComicCraft server running at http://localhost:${PORT}`
  );

});

import "dotenv/config";
import path from "path";
import express from "express";
import examsRouter from "./routes/exams";
import importRouter from "./routes/import";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Exam HTML exports can be a few hundred KB, so bump the default JSON limit.
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/exams/import", importRouter);
app.use("/api/exams", examsRouter);

// Fallback 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Na Lata quiz app running at http://localhost:${PORT}`);
});
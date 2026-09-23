import path from "path";
import express from "express";
import examsRouter from "./routes/exams";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api/exams", examsRouter);

// Fallback 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Na Lata quiz app running at http://localhost:${PORT}`);
});

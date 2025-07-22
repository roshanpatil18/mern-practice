const express = require("express");
const router = express.Router();
const axios = require("axios");

const Transaction = require("../models/transectionModel"); // ✅ Match the file name

// Helper Functions
async function avgExpense(userId) {
  const res = await Transaction.aggregate([
    { $match: { expenseAppUserId: userId, type: "expense" } },
    { $group: { _id: null, avg: { $avg: "$amount" } } },
  ]);
  return res[0]?.avg ?? 0;
}

async function incomeExpenseRatio(userId) {
  const [inc, exp] = await Promise.all([
    Transaction.aggregate([
      { $match: { expenseAppUserId: userId, type: "income" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { expenseAppUserId: userId, type: "expense" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const i = inc[0]?.total ?? 0,
        e = exp[0]?.total ?? 0;
  return e === 0 ? null : i / e;
}

async function summary(userId) {
  return await Transaction.find({ expenseAppUserId: userId })
    .sort({ date: -1 })
    .limit(10)
    .select("type category amount date -_id");
}

// Updated callGemini function
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage?key=${process.env.GEMINI_API_KEY}`;

  const resp = await axios.post(url, {
    prompt: {
      messages: [{ author: "user", content: prompt }],
    },
    temperature: 0.2,
    maxOutputTokens: 256,
  });

  return resp.data.candidates[0].content;
}

// Chat endpoint
router.post("/chat", async (req, res) => {
  try {
    const { userId, message } = req.body;

    const decidePrompt = `You are an expense-tracker assistant. Decide whether to call one of these functions for user ${userId}:
    \u2022 avgExpense(userId)
    \u2022 incomeExpenseRatio(userId)
    \u2022 summary(userId)
Respond with EXACTLY:\n  CALL avgExpense\nor\n  CALL incomeExpenseRatio\nor\n  CALL summary\nor\n  NO_CALL\nUser says: "${message}"`;

    let decision = await callGemini(decidePrompt);
    decision = decision.trim();

    if (decision.startsWith("CALL ")) {
      const fnName = decision.slice(5).trim();
      let fnResult;
      if (fnName === "avgExpense") fnResult = await avgExpense(userId);
      if (fnName === "incomeExpenseRatio") fnResult = await incomeExpenseRatio(userId);
      if (fnName === "summary") fnResult = await summary(userId);

      const answerPrompt = `The result of ${fnName} is ${JSON.stringify(fnResult)}.\nPlease reply to the user in friendly, concise language (do NOT include JSON).`;
      const replyText = await callGemini(answerPrompt);
      return res.json({ reply: replyText.trim() });
    }

    const normalReply = await callGemini(message);
    res.json({ reply: normalReply.trim() });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

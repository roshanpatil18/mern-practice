// routes/chatbotRoutes.js
const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const transectionModel = require("../models/transectionModel");
const userModel = require("../models/userModel");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware to verify JWT token
const authMiddleware = require("../middleware/userAuth");

// Helper function to get user's expense data
const getUserExpenseData = async (userId) => {
  try {
    const transactions = await transectionModel.find({ userid: userId });
    const user = await userModel.findById(userId);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpense;
    
    // Get category-wise breakdown
    const categoryBreakdown = transactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { income: 0, expense: 0 };
      }
      acc[t.category][t.type] += t.amount;
      return acc;
    }, {});
    
    // Recent transactions
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    return {
      user: {
        name: user.name,
        email: user.email
      },
      summary: {
        totalIncome,
        totalExpense,
        balance,
        transactionCount: transactions.length
      },
      categoryBreakdown,
      recentTransactions,
      allTransactions: transactions
    };
  } catch (error) {
    console.error("Error fetching user expense data:", error);
    throw error;
  }
};

// Function to generate context for AI
const generateExpenseContext = (expenseData) => {
  return `
You are an AI assistant for an expense tracking application. You have access to the user's financial data.

User Information:
- Name: ${expenseData.user.name}
- Email: ${expenseData.user.email}

Financial Summary:
- Total Income: $${expenseData.summary.totalIncome}
- Total Expenses: $${expenseData.summary.totalExpense}
- Current Balance: $${expenseData.summary.balance}
- Total Transactions: ${expenseData.summary.transactionCount}

Category Breakdown:
${Object.entries(expenseData.categoryBreakdown).map(([category, amounts]) => 
  `- ${category}: Income $${amounts.income}, Expenses $${amounts.expense}`
).join('\n')}

Recent Transactions:
${expenseData.recentTransactions.map(t => 
  `- ${t.date}: ${t.type} of $${t.amount} in ${t.category} (${t.description})`
).join('\n')}

Please provide helpful insights, answer questions about their finances, and give financial advice based on this data. Be conversational and supportive.
`;
};

// POST route for chatbot interaction
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    // Get user's expense data
    const expenseData = await getUserExpenseData(userId);
    
    // Generate context for AI
    const context = generateExpenseContext(expenseData);
    
    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create the prompt with context and user message
    const prompt = `${context}\n\nUser Question: ${message}\n\nPlease provide a helpful response based on the user's financial data.`;
    
    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    res.status(200).json({
      success: true,
      message: "Response generated successfully",
      data: {
        userMessage: message,
        aiResponse: aiResponse,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating response",
      error: error.message
    });
  }
});

// GET route to get expense summary for chatbot
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseData = await getUserExpenseData(userId);
    
    res.status(200).json({
      success: true,
      message: "Expense summary retrieved successfully",
      data: expenseData
    });
    
  } catch (error) {
    console.error("Error fetching expense summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expense summary",
      error: error.message
    });
  }
});

module.exports = router;
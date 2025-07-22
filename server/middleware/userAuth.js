// middleware/userAuth.js
const GoogleAuthUserModel = require("../models/model.user.googleAuth");
const userModel           = require("../models/userModel");
const jwt                 = require("jsonwebtoken");

const checkUserAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer")) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: No token provided, login again...!",
    });
  }

  try {
    // 1) Extract & verify token
    const token = authorization.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRETE_KEY);
    const expenseAppUserId = payload.expenseAppUserId;

    // 2) Find user in either collection
    let user = await userModel
      .findOne({ expenseAppUserId })
      .select("-password")
      .lean();

    if (!user) {
      user = await GoogleAuthUserModel
        .findOne({ expenseAppUserId })
        .select("-googleId")
        .lean();
    }

    if (!user) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized: User not found, login again...!",
      });
    }

    // 3) Attach a normalized `id` along with the rest of the user doc
    //    downstream code expects `req.user.id`
    req.user = {
      ...user,
      id: expenseAppUserId,      // now req.user.id is defined
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: Invalid or expired token, login again...!",
    });
  }
};

module.exports = checkUserAuth;

const authService =
require("../services/authService");

const register = async (req, res, next) => {

  try {

    const result =
      await authService.registerUser(
        req.body
      );

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {

    next(error);

  }

};

const login = async (req, res, next) => {

  try {

    const { email, password } = req.body;

    const result =
      await authService.loginUser(
        email,
        password
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {

    next(error);

  }

};

const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await authService.updateAvatar(userId, avatarUrl);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  uploadAvatar
};
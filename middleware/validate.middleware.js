const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    // Check if it is a ZodError
    if (err?.issues) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join("."), // field name, e.g., "price"
        message: issue.message, // validation message
      }));
      return res.status(400).json({ errors });
    }
  }
};
module.exports = validate;

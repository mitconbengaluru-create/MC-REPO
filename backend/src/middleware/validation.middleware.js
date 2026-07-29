/**
 * Express middleware routing schemas to Zod validation parsing.
 * Enforces unified parameters matching, throwing error contexts caught by the central middleware.
 * 
 * @param {import('zod').ZodSchema} schema - Zod validator object
 * @returns {import('express').RequestHandler} Route validation middleware
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Assign validated/sanitized schema outputs back to express objects
    // NOTE: req.query and req.params are read-only getters on Node's IncomingMessage
    // — use Object.assign to mutate in-place instead of direct reassignment.
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) Object.assign(req.query, parsed.query);
    if (parsed.params) Object.assign(req.params, parsed.params);
    
    next();
  } catch (error) {
    next(error);
  }
};

export default validate;

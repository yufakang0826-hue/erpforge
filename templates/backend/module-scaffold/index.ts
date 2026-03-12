/**
 * Module Entry Point Template
 *
 * Replace {{MODULE}} and {{module}} with your module name.
 *
 * Exports:
 * - Router for HTTP endpoint registration
 * - Public API for inter-module communication
 */
import { Router } from 'express';
import { register{{MODULE}}Routes } from './routes.js';

// Create and configure router
export const {{module}}Router = Router();
register{{MODULE}}Routes({{module}}Router);

// Re-export public API for other modules
// Uncomment and define as needed:
// export { get{{MODULE}}ById } from './service.js';

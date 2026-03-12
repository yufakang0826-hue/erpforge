/**
 * Module Routes Template — Express CRUD Routes
 *
 * Replace {{MODULE}} and {{module}} with your module name.
 *
 * Features:
 * - Full CRUD: list (paginated) / get / create / update / delete
 * - Zod validation on request body and query params
 * - tenantId extracted from authenticated request
 * - Consistent error handling
 */
import { Router, type Request, type Response } from 'express';
import * as service from './service.js';
import {
  create{{MODULE}}Schema,
  update{{MODULE}}Schema,
  list{{MODULE}}sFilterSchema,
} from './types.js';

export function register{{MODULE}}Routes(router: Router): void {

  // ─── GET /  — List (paginated + filtered) ──────────────

  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const filters = list{{MODULE}}sFilterSchema.parse(req.query);
      const result = await service.list{{MODULE}}s(tenantId, filters);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error });
      }
      console.error('List {{module}}s error:', error);
      res.status(500).json({ error: 'Failed to list {{module}}s' });
    }
  });

  // ─── GET /:id — Get by ID ─────────────────────────────

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const item = await service.get{{MODULE}}ById(tenantId, req.params.id);
      if (!item) {
        return res.status(404).json({ error: '{{MODULE}} not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Get {{module}} error:', error);
      res.status(500).json({ error: 'Failed to get {{module}}' });
    }
  });

  // ─── POST / — Create ──────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const input = create{{MODULE}}Schema.parse(req.body);
      const created = await service.create{{MODULE}}(tenantId, input, req.user?.id);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error });
      }
      console.error('Create {{module}} error:', error);
      res.status(500).json({ error: 'Failed to create {{module}}' });
    }
  });

  // ─── PUT /:id — Update ────────────────────────────────

  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const input = update{{MODULE}}Schema.parse(req.body);
      const updated = await service.update{{MODULE}}(tenantId, req.params.id, input);
      if (!updated) {
        return res.status(404).json({ error: '{{MODULE}} not found' });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error });
      }
      console.error('Update {{module}} error:', error);
      res.status(500).json({ error: 'Failed to update {{module}}' });
    }
  });

  // ─── DELETE /:id — Soft Delete ─────────────────────────

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const deleted = await service.delete{{MODULE}}(tenantId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: '{{MODULE}} not found' });
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete {{module}} error:', error);
      res.status(500).json({ error: 'Failed to delete {{module}}' });
    }
  });
}

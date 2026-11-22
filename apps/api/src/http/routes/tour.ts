import type { FastifyInstance } from 'fastify';
import type { Db } from '../../db/client.js';
import { getTourProgress } from '../../demo/tour/tour.service.js';

export function registerTour(app: FastifyInstance, db: Db): void {
  app.get('/demo/tour', { preHandler: app.requireSession }, (request) =>
    getTourProgress(db, request.demoSession!.actor.scopeId),
  );
}

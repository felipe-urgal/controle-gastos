// app/lib/inngest.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'controle-gastos',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local',
  signingKey: process.env.INNGEST_SIGNING_KEY || 'local'
});
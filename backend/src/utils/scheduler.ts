import cron from 'node-cron';
import { BackupService } from '../services/backup-service';

export function initScheduler(): void {
  const schedule = process.env.GMAIL_SYNC_CRON ?? '0 */4 * * *';

  if (!cron.validate(schedule)) {
    console.warn(`[Scheduler] GMAIL_SYNC_CRON inválido: "${schedule}". Scheduler desactivado.`);
    return;
  }

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Scheduler] GMAIL_EMAIL / GMAIL_APP_PASSWORD no configurados. Scheduler de backups desactivado.');
    return;
  }

  cron.schedule(schedule, async () => {
    console.log('[Scheduler] Iniciando sync de backups...');
    try {
      const result = await BackupService.sync();
      console.log(`[Scheduler] Sync OK — importados: ${result.imported}, omitidos: ${result.skipped}, sin match: ${result.unmatched.length}`);
      if (result.unmatched.length > 0) {
        console.warn('[Scheduler] Clientes sin match:', result.unmatched.join(', '));
      }
    } catch (err) {
      console.error('[Scheduler] Error en sync:', err);
    }
  });

  console.log(`[Scheduler] Sync de backups programado (${schedule})`);
}

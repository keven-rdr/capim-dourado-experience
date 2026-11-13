import type { Floor, Mission, MissionWithProgress } from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { weekStart } from '../../shared/dates.js';
import type { CheckinRepository } from '../checkin/repository.js';
import type { HuntsRepository } from '../hunts/repository.js';
import type { MissionRewardSource } from '../points/rewarder.js';
import type { GrantItem, PointsService } from '../points/service.js';
import type { QrRepository, ScanRecord } from '../qr/repository.js';
import type { StoresRepository } from '../stores/repository.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import { MISSION_SOURCES, type ProgressSource, periodKey } from './progress.js';
import type { MissionsRepository } from './repository.js';

export interface MissionsServiceDeps {
  missions: MissionsRepository;
  users: UsersRepository;
  checkins: CheckinRepository;
  qr: QrRepository;
  hunts: HuntsRepository;
  stores: StoresRepository;
  points: PointsService;
  clock: Clock;
}

/**
 * Missões diárias, semanais e de temporada (RF07). O progresso é derivado dos
 * eventos já gravados (check-ins, leituras de QR e caça); a recompensa entra uma vez por período.
 */
export class MissionsService implements MissionRewardSource {
  constructor(private readonly deps: MissionsServiceDeps) {}

  async listMissions(userId: string): Promise<MissionWithProgress[]> {
    await requireProfile(this.deps.users, userId);
    const today = this.deps.points.today();
    const missions = await this.deps.missions.list();
    const context = new ProgressContext(this.deps, userId, today);
    return Promise.all(
      missions.map(async (mission) => {
        const current = Math.min(await context.measure(mission), mission.target);
        const completed =
          current >= mission.target ||
          (await this.deps.missions.isCompleted(userId, mission.id, periodKey(mission, today)));
        return { ...mission, current, completed };
      }),
    );
  }

  /** Marca as missões recém-concluídas e devolve as recompensas a creditar. */
  async collect(userId: string, today: string): Promise<GrantItem[]> {
    const missions = await this.deps.missions.list();
    const context = new ProgressContext(this.deps, userId, today);
    const items: GrantItem[] = [];
    for (const mission of missions) {
      const source = MISSION_SOURCES[mission.id];
      if (!source || source.type === 'hunt') continue;
      if ((await context.measure(mission)) < mission.target) continue;
      const period = periodKey(mission, today);
      const at = this.deps.clock.now().toISOString();
      if (!(await this.deps.missions.tryComplete(userId, mission.id, period, at))) continue;
      items.push({
        action: 'mission',
        label: `Missão concluída: ${mission.title}`,
        reward: { ...mission.reward },
        dedupeKey: `mission:${mission.id}:${period}`,
      });
    }
    return items;
  }
}

/** Calcula as métricas sob demanda, com cache por requisição. */
class ProgressContext {
  private weekScans: Promise<ScanRecord[]> | null = null;

  constructor(
    private readonly deps: MissionsServiceDeps,
    private readonly userId: string,
    private readonly today: string,
  ) {}

  async measure(mission: Mission): Promise<number> {
    const source: ProgressSource | undefined = MISSION_SOURCES[mission.id];
    if (!source) return 0;
    switch (source.type) {
      case 'checkin_today':
        return (await this.deps.checkins.hasCheckedIn(this.userId, this.today)) ? 1 : 0;
      case 'stores_week': {
        const scans = await this.scansThisWeek();
        return new Set(scans.filter((s) => s.kind === 'store').map((s) => s.refId)).size;
      }
      case 'secrets':
        return this.deps.qr.countAllScans(this.userId, 'secret');
      case 'hunt':
        return (await this.deps.hunts.getProgress(this.userId, source.huntId)).solved;
      case 'floors_week': {
        const floors = await this.floorsThisWeek();
        return source.floors.filter((floor) => floors.has(floor)).length;
      }
    }
  }

  private scansThisWeek(): Promise<ScanRecord[]> {
    this.weekScans ??= this.deps.qr.listScansSince(this.userId, weekStart(this.today));
    return this.weekScans;
  }

  private async floorsThisWeek(): Promise<Set<Floor>> {
    const floors = new Set<Floor>();
    for (const scan of await this.scansThisWeek()) {
      const floor = await this.floorOf(scan);
      if (floor) floors.add(floor);
    }
    return floors;
  }

  private async floorOf(scan: ScanRecord): Promise<Floor | null> {
    switch (scan.kind) {
      case 'store':
        return (await this.deps.stores.findById(scan.refId))?.floor ?? null;
      case 'secret':
        return (await this.deps.qr.findSecret(scan.refId))?.floor ?? null;
      case 'clue': {
        const separator = scan.refId.lastIndexOf(':');
        const hunt = await this.deps.hunts.findById(scan.refId.slice(0, separator));
        const order = Number(scan.refId.slice(separator + 1));
        return hunt?.clues.find((clue) => clue.order === order)?.floor ?? null;
      }
      default:
        return null;
    }
  }
}

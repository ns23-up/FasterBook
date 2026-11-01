import { StatsNotReadyError, isFinalError } from "@/lib/stats";

/**
 * Копит время и слова, которые пользователь реально прочитал, и отдаёт их порциями.
 * Без React: часы и отправка передаются снаружи, поэтому класс легко проверить.
 *
 * Главные правила честного учёта:
 * - время копится только между start() и stop();
 * - каждый шаг учёта не длиннее MAX_TICK_MS: если вкладка «заснула», время не додумывается;
 * - отправленное сразу вычитается из накопленного, поэтому дважды не засчитается;
 * - пока идёт отправка, вторая не стартует.
 */

/** Один шаг учёта не может быть длиннее */
export const MAX_TICK_MS = 2_000;
/** Сколько секунд максимум принимает сервер за один запрос */
export const MAX_SEND_SECONDS = 120;

export type SendFn = (seconds: number, words: number) => Promise<void>;

export class ReadingTracker {
  private pendingMs = 0;
  private pendingWords = 0;
  private lastTick = 0;
  private counting = false;
  private sending = false;
  /** Статистика не настроена в базе: дальше не пытаемся */
  private disabled = false;

  constructor(
    private readonly send: SendFn,
    private readonly now: () => number = () => performance.now(),
  ) {}

  get isCounting(): boolean {
    return this.counting;
  }

  /** Начать считать время (читает и вкладка видна) */
  start(): void {
    if (!this.counting) {
      this.counting = true;
      this.lastTick = this.now();
    }
  }

  /** Перестать считать: пауза, выход, вкладка скрыта. Прошедшее до этого момента сохраняется. */
  stop(): void {
    this.tick();
    this.counting = false;
  }

  /** Добавляет к накопленному время, прошедшее с прошлого шага */
  tick(): void {
    if (!this.counting) {
      return;
    }
    const now = this.now();
    this.pendingMs += Math.min(Math.max(now - this.lastTick, 0), MAX_TICK_MS);
    this.lastTick = now;
  }

  /** Засчитать слова. Когда счёт остановлен, слова игнорируются. */
  addWords(count: number): void {
    if (this.counting && count > 0) {
      this.pendingWords += count;
    }
  }

  /** Отправить накопленное. Безопасно вызывать сколько угодно раз. */
  async flush(): Promise<void> {
    if (this.disabled || this.sending) {
      return;
    }
    this.tick();
    const seconds = Math.min(Math.floor(this.pendingMs / 1000), MAX_SEND_SECONDS);
    if (seconds < 1) {
      return;
    }
    const words = this.pendingWords;
    // Забираем отправляемое сразу: так оно не засчитается дважды
    this.pendingMs -= seconds * 1000;
    this.pendingWords = 0;
    this.sending = true;
    try {
      await this.send(seconds, words);
    } catch (error) {
      if (error instanceof StatsNotReadyError) {
        this.disabled = true;
      } else if (!isFinalError(error)) {
        // Нет связи: возвращаем порцию, она уйдёт со следующей попыткой
        this.pendingMs = Math.min(this.pendingMs + seconds * 1000, MAX_SEND_SECONDS * 1000);
        this.pendingWords += words;
      }
    } finally {
      this.sending = false;
    }
  }
}

import { DeviceTelemetry, SoundMode, BatteryState } from '@perzent/shared-types';

export type TelemetryListener = (telemetry: DeviceTelemetry) => void;

export class DeviceTelemetryService {
  private static telemetryState: DeviceTelemetry = {
    battery_level: 88,
    battery_status: 'CHARGING',
    battery_health: 'GOOD',
    battery_temperature: 31.8,
    battery_power_save: false,

    sound_volume: 75,
    sound_mode: 'NORMAL',

    brightness_level: 80,
    brightness_auto: true,

    storage_used_gb: 58.4,
    storage_total_gb: 128.0,
    storage_free_gb: 69.6,
    storage_free_pct: 54.4,

    ram_used_gb: 4.6,
    ram_total_gb: 8.0,
    ram_usage_pct: 57.5,

    updated_at: new Date().toISOString(),
  };

  private static listeners: Set<TelemetryListener> = new Set();
  private static liveInterval: any = null;

  public static getTelemetry(): DeviceTelemetry {
    return { ...this.telemetryState };
  }

  public static subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());

    if (!this.liveInterval) {
      this.startLiveSimulation();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.liveInterval) {
        clearInterval(this.liveInterval);
        this.liveInterval = null;
      }
    };
  }

  private static notify(): void {
    const current = this.getTelemetry();
    this.listeners.forEach((fn) => fn(current));
  }

  // Sound Tracking
  public static setSoundVolume(volume: number): void {
    this.telemetryState.sound_volume = Math.max(0, Math.min(100, volume));
    if (this.telemetryState.sound_volume === 0) {
      this.telemetryState.sound_mode = 'SILENT';
    } else if (this.telemetryState.sound_mode === 'SILENT') {
      this.telemetryState.sound_mode = 'NORMAL';
    }
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  public static setSoundMode(mode: SoundMode): void {
    this.telemetryState.sound_mode = mode;
    if (mode === 'SILENT') {
      this.telemetryState.sound_volume = 0;
    } else if (this.telemetryState.sound_volume === 0) {
      this.telemetryState.sound_volume = 65;
    }
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  // Brightness Tracking
  public static setBrightnessLevel(brightness: number): void {
    this.telemetryState.brightness_level = Math.max(5, Math.min(100, brightness));
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  public static toggleAutoBrightness(): void {
    this.telemetryState.brightness_auto = !this.telemetryState.brightness_auto;
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  // Battery Tracking
  public static setBatteryLevel(level: number): void {
    this.telemetryState.battery_level = Math.max(0, Math.min(100, level));
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  public static toggleBatteryCharging(): void {
    this.telemetryState.battery_status =
      this.telemetryState.battery_status === 'CHARGING' ? 'DISCHARGING' : 'CHARGING';
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  public static togglePowerSave(): void {
    this.telemetryState.battery_power_save = !this.telemetryState.battery_power_save;
    if (this.telemetryState.battery_power_save) {
      this.telemetryState.brightness_level = Math.min(this.telemetryState.brightness_level, 40);
    }
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  // RAM Simulation / Optimization
  public static optimizeRam(): void {
    const minRam = 2.8;
    this.telemetryState.ram_used_gb = minRam;
    this.telemetryState.ram_usage_pct = Number(((minRam / this.telemetryState.ram_total_gb) * 100).toFixed(1));
    this.telemetryState.updated_at = new Date().toISOString();
    this.notify();
  }

  // Background Live Fluctuation Simulation (Real-time tracking effect)
  private static startLiveSimulation(): void {
    this.liveInterval = setInterval(() => {
      // Small realistic fluctuations in RAM (running background tasks)
      const ramDelta = (Math.random() - 0.48) * 0.15;
      const newRam = Math.max(2.5, Math.min(6.8, this.telemetryState.ram_used_gb + ramDelta));
      this.telemetryState.ram_used_gb = Number(newRam.toFixed(2));
      this.telemetryState.ram_usage_pct = Number(
        ((newRam / this.telemetryState.ram_total_gb) * 100).toFixed(1)
      );

      // Temperature slight fluctuation
      const tempDelta = (Math.random() - 0.5) * 0.2;
      this.telemetryState.battery_temperature = Number(
        Math.max(28, Math.min(42, (this.telemetryState.battery_temperature || 31.5) + tempDelta)).toFixed(1)
      );

      this.telemetryState.updated_at = new Date().toISOString();
      this.notify();
    }, 4000);
  }
}
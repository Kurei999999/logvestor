import { GalleryFilterPreset } from '@/types/gallery';
import { ElectronFileService } from './electron/electron-file-service';
import path from 'path';

export class GalleryPresetService {
  private electronService: ElectronFileService;
  private presetsDirectory: string = '';

  constructor() {
    this.electronService = new ElectronFileService();
  }

  /**
   * Initialize the service and set up presets directory
   */
  async initialize(): Promise<void> {
    const configResult = await this.electronService.getConfig();
    if (configResult.success && configResult.data) {
      // Create hidden .presets folder in data directory
      this.presetsDirectory = path.join(configResult.data.dataDirectory, '.presets');
      
      // Ensure presets directory exists
      const existsResult = await window.electronAPI.fs.exists(this.presetsDirectory);
      if (!existsResult.data) {
        await window.electronAPI.fs.createDir(this.presetsDirectory);
      }
    }
  }

  /**
   * Get path to presets file
   */
  private getPresetsFilePath(): string {
    return path.join(this.presetsDirectory, 'gallery-presets.json');
  }

  /**
   * Load all presets from file
   */
  async loadPresets(): Promise<{ success: boolean; data?: GalleryFilterPreset[]; error?: string }> {
    try {
      if (!this.presetsDirectory) {
        await this.initialize();
      }

      const presetsFilePath = this.getPresetsFilePath();
      const existsResult = await window.electronAPI.fs.exists(presetsFilePath);
      
      if (!existsResult.data) {
        // File doesn't exist, return empty array
        return { success: true, data: [] };
      }

      const readResult = await window.electronAPI.fs.readFile(presetsFilePath);
      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      const presets = JSON.parse(readResult.data || '[]') as GalleryFilterPreset[];
      return { success: true, data: presets };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load presets' 
      };
    }
  }

  /**
   * Save preset to file
   */
  async savePreset(preset: GalleryFilterPreset): Promise<{ success: boolean; error?: string }> {
    try {
      const loadResult = await this.loadPresets();
      if (!loadResult.success) {
        return { success: false, error: loadResult.error };
      }

      const presets = loadResult.data || [];
      const existingIndex = presets.findIndex(p => p.id === preset.id);
      
      if (existingIndex >= 0) {
        // Update existing preset
        presets[existingIndex] = { ...preset, updatedAt: new Date().toISOString() };
      } else {
        // Add new preset
        presets.push({ ...preset, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      const presetsFilePath = this.getPresetsFilePath();
      const writeResult = await window.electronAPI.fs.writeFile(
        presetsFilePath, 
        JSON.stringify(presets, null, 2)
      );

      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save preset' 
      };
    }
  }

  /**
   * Delete preset from file
   */
  async deletePreset(presetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const loadResult = await this.loadPresets();
      if (!loadResult.success) {
        return { success: false, error: loadResult.error };
      }

      const presets = loadResult.data || [];
      const filteredPresets = presets.filter(p => p.id !== presetId);

      const presetsFilePath = this.getPresetsFilePath();
      const writeResult = await window.electronAPI.fs.writeFile(
        presetsFilePath, 
        JSON.stringify(filteredPresets, null, 2)
      );

      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete preset' 
      };
    }
  }

  /**
   * Update existing preset
   */
  async updatePreset(preset: GalleryFilterPreset): Promise<{ success: boolean; error?: string }> {
    return this.savePreset(preset);
  }
}

// Export singleton instance
export const galleryPresetService = new GalleryPresetService();
export interface GalleryFilterPreset {
  id: string;
  name: string;
  searchTerm: string;
  selectedTicker: string;
  selectedTags: string[];
  sortBy: 'date' | 'ticker';
  sortOrder: 'asc' | 'desc';
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPresetService {
  loadPresets(): Promise<{ success: boolean; data?: GalleryFilterPreset[]; error?: string }>;
  savePreset(preset: GalleryFilterPreset): Promise<{ success: boolean; error?: string }>;
  deletePreset(presetId: string): Promise<{ success: boolean; error?: string }>;
  updatePreset(preset: GalleryFilterPreset): Promise<{ success: boolean; error?: string }>;
}
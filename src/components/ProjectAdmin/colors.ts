export const PROJECT_COLOR_PRESETS = [
  '#6366F1',
  '#E86B5F',
  '#F4A442',
  '#6BCB8B',
  '#A78BFA',
  '#38BDF8',
  '#F472B6',
  '#34D399',
] as const;

const COLOR_BG_CLASS: Record<string, string> = {
  '#6366F1': 'bg-[#6366F1]',
  '#E86B5F': 'bg-[#E86B5F]',
  '#F4A442': 'bg-[#F4A442]',
  '#6BCB8B': 'bg-[#6BCB8B]',
  '#A78BFA': 'bg-[#A78BFA]',
  '#38BDF8': 'bg-[#38BDF8]',
  '#F472B6': 'bg-[#F472B6]',
  '#34D399': 'bg-[#34D399]',
};

export function colorBgClass(color: string): string {
  return COLOR_BG_CLASS[color] ?? 'bg-slate-400';
}

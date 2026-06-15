// Font files live in android/app/src/main/assets/fonts/
// On Android, fontFamily = filename without .ttf extension.
// Space Grotesk is a variable font — one file, weight set via fontWeight.
// Inter uses static files per weight.

export const Fonts = {
  // Space Grotesk — headings, buttons, labels, tab text
  grotesk: {
    medium:   { fontFamily: 'SpaceGrotesk', fontWeight: '500' as const },
    semiBold: { fontFamily: 'SpaceGrotesk', fontWeight: '600' as const },
    bold:     { fontFamily: 'SpaceGrotesk', fontWeight: '700' as const },
  },
  // Inter — body text, captions, metadata
  inter: {
    regular:  'Inter-Regular',
    medium:   'Inter-Medium',
    semiBold: 'Inter-SemiBold',
  },
} as const;
